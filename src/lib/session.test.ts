import assert from "node:assert/strict";
import test from "node:test";
import {
  completeDemoMission,
  createSession,
  finishSession,
  getStableBaseline,
  getSessionSummary,
  nextMission,
  processPose,
  startSession,
  type PoseSample,
} from "./session";

const baseline: PoseSample = { centerX: 0.5, width: 0.3 };

test("requires a valid centered pose before starting", () => {
  const session = createSession("sacheon-harbor", "webcam");
  assert.equal(startSession(session, { centerX: 0.5, width: 0.02 }, 100), null);
  assert.ok(startSession(session, baseline, 100));
});

test("calibration only accepts a stable sequence of shoulder samples", () => {
  const stable = Array.from({ length: 8 }, (_, index) => ({
    centerX: 0.5 + index * 0.001,
    width: 0.3,
  }));
  assert.deepEqual(getStableBaseline(stable), {
    centerX: 0.5035,
    width: 0.3,
  });
  assert.equal(getStableBaseline(stable.slice(0, 7)), null);
  assert.equal(
    getStableBaseline(stable.map((sample, index) => ({
      ...sample,
      centerX: sample.centerX + (index === 7 ? 0.05 : 0),
    }))),
    null,
  );
});

test("success requires reaching the target and holding for one second", () => {
  let session = startSession(createSession("place", "webcam"), baseline, 0)!;
  session = processPose(session, { centerX: 0.56, width: 0.3 }, 250);
  assert.equal(session.missions[0].status, "active");
  for (let timestamp = 350; timestamp <= 1250; timestamp += 100) {
    session = processPose(session, { centerX: 0.56, width: 0.3 }, timestamp);
  }
  assert.equal(session.missions[0].status, "success");
});

test("tracking loss pauses mission time and resets the hold timer", () => {
  let session = startSession(createSession("place", "webcam"), baseline, 0)!;
  session = processPose(session, { centerX: 0.56, width: 0.3 }, 500);
  const trackedBeforeLoss = session.missions[0].trackedMs;
  session = processPose(session, null, 600);
  assert.equal(session.phase, "tracking_lost");
  assert.equal(session.missions[0].holdMs, 0);
  session = processPose(session, { centerX: 0.56, width: 0.3 }, 10_000);
  assert.equal(session.missions[0].trackedMs, trackedBeforeLoss);
});

test("mission times out at the tracked-time boundary", () => {
  let session = startSession(createSession("place", "webcam"), baseline, 0)!;
  for (let timestamp = 100; timestamp <= 10_000; timestamp += 100) {
    session = processPose(session, baseline, timestamp);
  }
  assert.equal(session.missions[0].trackedMs, 10_000);
  assert.equal(session.missions[0].status, "timed_out");
});

test("success wins when the hold and timeout limits are reached together", () => {
  let session = startSession(createSession("place", "webcam"), baseline, 0)!;
  for (let timestamp = 100; timestamp < 9_000; timestamp += 100) {
    session = processPose(session, baseline, timestamp);
  }
  for (let timestamp = 9_000; timestamp <= 10_000; timestamp += 100) {
    session = processPose(session, { centerX: 0.56, width: 0.3 }, timestamp);
  }
  assert.equal(session.missions[0].status, "success");
});

test("requires returning to center before starting the next webcam mission", () => {
  let session = startSession(createSession("place", "webcam"), baseline, 0)!;
  for (let timestamp = 100; timestamp <= 1100; timestamp += 100) {
    session = processPose(session, { centerX: 0.56, width: 0.3 }, timestamp);
  }
  const awayFromCenter = { centerX: 0.56, width: 0.3 };
  assert.equal(nextMission(session, awayFromCenter, 1200), null);
  assert.ok(nextMission(session, baseline, 1200));
});

test("demo inputs update the result without claiming camera detection", () => {
  let session = startSession(createSession("place", "demo"), baseline, 100)!;
  session = completeDemoMission(session, true, 500);
  assert.equal(session.phase, "between_missions");
  assert.equal(session.missions[0].status, "success");
  session = nextMission(session, null, 600)!;
  assert.equal(session.currentIndex, 1);
  assert.equal(session.missions[1].status, "active");
});

test("interruption counts the active mission but never marks it successful", () => {
  let session = startSession(createSession("place", "webcam"), baseline, 100)!;
  session = finishSession(session, 1500);
  const summary = getSessionSummary(session, 1500);
  assert.equal(summary.startedCount, 1);
  assert.equal(summary.successCount, 0);
  assert.equal(summary.durationMs, 1400);
});

test("starting over with a new session does not retain prior results", () => {
  const previous = startSession(createSession("place", "demo"), baseline, 0)!;
  const summary = getSessionSummary(createSession("place", "demo"), 5000);
  assert.equal(previous.missions[0].status, "active");
  assert.equal(summary.startedCount, 0);
  assert.equal(summary.durationMs, 0);
});
