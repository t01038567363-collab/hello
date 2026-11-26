export type Direction = "left" | "right";
export type SessionMode = "webcam" | "demo";
export type MissionStatus =
  | "pending"
  | "active"
  | "success"
  | "timed_out"
  | "interrupted";
export type SessionPhase =
  | "calibrating"
  | "running"
  | "tracking_lost"
  | "between_missions"
  | "result";

export type PoseSample = {
  centerX: number;
  width: number;
};

export type Mission = {
  direction: Direction;
  status: MissionStatus;
  trackedMs: number;
  holdMs: number;
};

export type Session = {
  placeId: string;
  mode: SessionMode;
  phase: SessionPhase;
  baseline: PoseSample | null;
  missions: Mission[];
  currentIndex: number | null;
  startedAtMs: number | null;
  endedAtMs: number | null;
  lastFrameAtMs: number | null;
};

export type SessionSummary = {
  successCount: number;
  startedCount: number;
  durationMs: number;
};

export const TARGET_RATIO = 0.2;
export const TARGET_HOLD_MS = 1000;
export const MISSION_LIMIT_MS = 10_000;
export const CENTER_RETURN_RATIO = 0.07;

const MISSION_DIRECTIONS: Direction[] = ["right", "left", "right", "left"];

export function getStableBaseline(samples: PoseSample[]): PoseSample | null {
  if (samples.length < 8 || samples.some((sample) => !validSample(sample))) return null;
  const centers = samples.map((sample) => sample.centerX);
  const widths = samples.map((sample) => sample.width);
  const centerX = centers.reduce((sum, value) => sum + value, 0) / centers.length;
  const width = widths.reduce((sum, value) => sum + value, 0) / widths.length;
  const centerRange = Math.max(...centers) - Math.min(...centers);
  const widthRange = Math.max(...widths) - Math.min(...widths);

  if (centerRange > width * 0.1 || widthRange > width * 0.25) return null;
  return { centerX, width };
}

export function createSession(placeId: string, mode: SessionMode): Session {
  return {
    placeId,
    mode,
    phase: "calibrating",
    baseline: null,
    missions: MISSION_DIRECTIONS.map((direction) => ({
      direction,
      status: "pending",
      trackedMs: 0,
      holdMs: 0,
    })),
    currentIndex: null,
    startedAtMs: null,
    endedAtMs: null,
    lastFrameAtMs: null,
  };
}

function validSample(sample: PoseSample | null): sample is PoseSample {
  return Boolean(
    sample &&
      Number.isFinite(sample.centerX) &&
      Number.isFinite(sample.width) &&
      sample.width >= 0.05,
  );
}

export function isCentered(
  baseline: PoseSample | null,
  sample: PoseSample | null,
): boolean {
  if (!baseline || !validSample(sample)) return false;
  return Math.abs(sample.centerX - baseline.centerX) <= baseline.width * CENTER_RETURN_RATIO;
}

export function startSession(
  session: Session,
  baseline: PoseSample,
  now: number,
): Session | null {
  if (session.phase !== "calibrating" || !validSample(baseline)) return null;
  const first = session.missions[0];
  if (!first) return null;
  return {
    ...session,
    phase: "running",
    baseline,
    currentIndex: 0,
    startedAtMs: now,
    lastFrameAtMs: session.mode === "webcam" ? now : null,
    missions: session.missions.map((mission, index) =>
      index === 0 ? { ...mission, status: "active" } : mission,
    ),
  };
}

export function processPose(
  session: Session,
  sample: PoseSample | null,
  now: number,
): Session {
  if (
    session.mode !== "webcam" ||
    (session.phase !== "running" && session.phase !== "tracking_lost") ||
    session.currentIndex === null
  ) {
    return session;
  }

  const index = session.currentIndex;
  const mission = session.missions[index];
  if (!mission || mission.status !== "active") return session;

  if (!validSample(sample)) {
    return {
      ...session,
      phase: "tracking_lost",
      lastFrameAtMs: null,
      missions: session.missions.map((item, itemIndex) =>
        itemIndex === index ? { ...item, holdMs: 0 } : item,
      ),
    };
  }

  if (session.phase === "tracking_lost" || session.lastFrameAtMs === null) {
    return { ...session, phase: "running", lastFrameAtMs: now };
  }

  const deltaMs = Math.max(0, Math.min(now - session.lastFrameAtMs, 250));
  const baseline = session.baseline;
  if (!baseline) return session;
  const displacement =
    mission.direction === "right"
      ? sample.centerX - baseline.centerX
      : baseline.centerX - sample.centerX;
  const reachedTarget = displacement >= baseline.width * TARGET_RATIO;
  const holdMs = reachedTarget ? mission.holdMs + deltaMs : 0;
  const trackedMs = mission.trackedMs + deltaMs;

  let status: MissionStatus = "active";
  if (holdMs >= TARGET_HOLD_MS) status = "success";
  else if (trackedMs >= MISSION_LIMIT_MS) status = "timed_out";

  const nextMissionState = { ...mission, trackedMs, holdMs, status };
  return {
    ...session,
    phase: status === "active" ? "running" : "between_missions",
    lastFrameAtMs: now,
    missions: session.missions.map((item, itemIndex) =>
      itemIndex === index ? nextMissionState : item,
    ),
  };
}

export function completeDemoMission(
  session: Session,
  success: boolean,
  now: number,
): Session {
  if (
    session.mode !== "demo" ||
    session.phase !== "running" ||
    session.currentIndex === null
  ) {
    return session;
  }
  const index = session.currentIndex;
  return {
    ...session,
    phase: "between_missions",
    lastFrameAtMs: now,
    missions: session.missions.map((mission, missionIndex) =>
      missionIndex === index
        ? { ...mission, status: success ? "success" : "timed_out" }
        : mission,
    ),
  };
}

export function nextMission(
  session: Session,
  sample: PoseSample | null,
  now: number,
): Session | null {
  if (session.phase !== "between_missions" || session.currentIndex === null) return null;
  if (session.mode === "webcam" && !isCentered(session.baseline, sample)) return null;

  const nextIndex = session.missions.findIndex((mission) => mission.status === "pending");
  if (nextIndex === -1) {
    return { ...session, phase: "result", endedAtMs: now, lastFrameAtMs: null };
  }
  return {
    ...session,
    phase: "running",
    currentIndex: nextIndex,
    lastFrameAtMs: session.mode === "webcam" ? now : null,
    missions: session.missions.map((mission, index) =>
      index === nextIndex ? { ...mission, status: "active" } : mission,
    ),
  };
}

export function finishSession(session: Session, now: number): Session {
  if (session.phase === "result") return session;
  const missions: Mission[] =
    session.currentIndex === null
      ? session.missions
      : session.missions.map((mission, index) =>
          index === session.currentIndex && mission.status === "active"
            ? { ...mission, status: "interrupted" }
            : mission,
        );
  return {
    ...session,
    phase: "result",
    endedAtMs: now,
    lastFrameAtMs: null,
    missions,
  };
}

export function getSessionSummary(session: Session, now: number): SessionSummary {
  const endedAt = session.endedAtMs ?? now;
  const durationMs =
    session.startedAtMs === null ? 0 : Math.max(0, endedAt - session.startedAtMs);
  return {
    successCount: session.missions.filter((mission) => mission.status === "success").length,
    startedCount: session.missions.filter((mission) => mission.status !== "pending").length,
    durationMs,
  };
}
