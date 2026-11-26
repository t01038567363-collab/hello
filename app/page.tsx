"use client";

import {
  FilesetResolver,
  PoseLandmarker,
  type NormalizedLandmark,
} from "@mediapipe/tasks-vision";
import {
  createSession,
  completeDemoMission,
  finishSession,
  getStableBaseline,
  getSessionSummary,
  isCentered,
  nextMission,
  processPose,
  startSession,
  type Direction,
  type PoseSample,
  type Session,
} from "@/lib/session";
import { useCallback, useEffect, useRef, useState } from "react";

type Place = {
  id: string;
  name: string;
  region: string;
  description: string;
  theme: "harbor" | "river";
};

const PLACES: Place[] = [
  {
    id: "sacheon-harbor",
    name: "삼천포 항구",
    region: "경남 사천",
    description: "바닷바람과 항구 풍경을 떠올리는 산책길",
    theme: "harbor",
  },
  {
    id: "jinju-river",
    name: "진주 남강",
    region: "경남 진주",
    description: "남강을 따라 천천히 걷는 산책길",
    theme: "river",
  },
];

type Screen = "places" | "ready" | "calibrating" | "walking" | "result";

function getShoulderSample(
  landmarks: NormalizedLandmark[] | undefined,
): PoseSample | null {
  const left = landmarks?.[11];
  const right = landmarks?.[12];
  if (!left || !right || (left.visibility ?? 0) < 0.55 || (right.visibility ?? 0) < 0.55) {
    return null;
  }

  const leftX = 1 - left.x;
  const rightX = 1 - right.x;
  const width = Math.abs(rightX - leftX);
  if (!Number.isFinite(width) || width < 0.05) return null;

  return { centerX: (leftX + rightX) / 2, width };
}

function formatDuration(milliseconds: number) {
  const seconds = Math.floor(milliseconds / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(
    seconds % 60,
  ).padStart(2, "0")}`;
}

function PlaceScene({
  theme,
  label,
}: {
  theme: Place["theme"];
  label: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const width = canvas.clientWidth * window.devicePixelRatio;
    const height = canvas.clientHeight * window.devicePixelRatio;
    canvas.width = width;
    canvas.height = height;
    context.scale(window.devicePixelRatio, window.devicePixelRatio);

    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const sky = context.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, theme === "harbor" ? "#9cc9d0" : "#b5d8d1");
    sky.addColorStop(1, theme === "harbor" ? "#e8d5b1" : "#e7dfbd");
    context.fillStyle = sky;
    context.fillRect(0, 0, w, h);

    context.fillStyle = "#f3d795";
    context.beginPath();
    context.arc(w * 0.78, h * 0.2, Math.min(w, h) * 0.075, 0, Math.PI * 2);
    context.fill();

    if (theme === "harbor") {
      context.fillStyle = "#668d84";
      context.beginPath();
      context.moveTo(0, h * 0.53);
      context.lineTo(w * 0.16, h * 0.34);
      context.lineTo(w * 0.34, h * 0.51);
      context.lineTo(w * 0.52, h * 0.32);
      context.lineTo(w * 0.7, h * 0.52);
      context.lineTo(w, h * 0.39);
      context.lineTo(w, h * 0.72);
      context.lineTo(0, h * 0.72);
      context.closePath();
      context.fill();
      context.fillStyle = "#6ba7aa";
      context.fillRect(0, h * 0.57, w, h * 0.28);
      context.fillStyle = "#d8c29a";
      context.fillRect(0, h * 0.83, w, h * 0.17);
      context.fillStyle = "#f1e4c6";
      context.fillRect(w * 0.12, h * 0.42, w * 0.12, h * 0.14);
      context.fillRect(w * 0.28, h * 0.46, w * 0.1, h * 0.1);
      context.fillStyle = "#58736d";
      context.fillRect(w * 0.1, h * 0.39, w * 0.16, h * 0.035);
      context.fillRect(w * 0.27, h * 0.43, w * 0.12, h * 0.03);
      context.fillStyle = "#735846";
      context.fillRect(w * 0.53, h * 0.48, w * 0.035, h * 0.18);
      context.fillRect(w * 0.6, h * 0.45, w * 0.035, h * 0.21);
    } else {
      context.fillStyle = "#6b9480";
      context.beginPath();
      context.moveTo(0, h * 0.55);
      context.lineTo(w * 0.18, h * 0.31);
      context.lineTo(w * 0.37, h * 0.55);
      context.lineTo(w * 0.58, h * 0.36);
      context.lineTo(w * 0.78, h * 0.55);
      context.lineTo(w, h * 0.39);
      context.lineTo(w, h * 0.75);
      context.lineTo(0, h * 0.75);
      context.closePath();
      context.fill();
      context.fillStyle = "#74aaa5";
      context.beginPath();
      context.moveTo(0, h * 0.66);
      context.quadraticCurveTo(w * 0.32, h * 0.57, w * 0.55, h * 0.68);
      context.quadraticCurveTo(w * 0.8, h * 0.8, w, h * 0.63);
      context.lineTo(w, h);
      context.lineTo(0, h);
      context.closePath();
      context.fill();
      context.fillStyle = "#d9c99d";
      context.beginPath();
      context.moveTo(0, h * 0.82);
      context.quadraticCurveTo(w * 0.37, h * 0.73, w * 0.61, h * 0.84);
      context.lineTo(w, h * 0.78);
      context.lineTo(w, h);
      context.lineTo(0, h);
      context.closePath();
      context.fill();
    }
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      className="scene-canvas"
      role="img"
      aria-label={`${label} 풍경을 그린 사전 제작 일러스트`}
    />
  );
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("places");
  const [selectedPlace, setSelectedPlace] = useState<Place>(PLACES[0]);
  const [safetyConfirmed, setSafetyConfirmed] = useState(false);
  const [cameraConsent, setCameraConsent] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [cameraStatus, setCameraStatus] = useState("카메라 연결 전");
  const [cameraError, setCameraError] = useState("");
  const [sample, setSample] = useState<PoseSample | null>(null);
  const [now, setNow] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const animationRef = useRef<number | null>(null);
  const calibrationSamplesRef = useRef<PoseSample[]>([]);
  const sessionRef = useRef<Session | null>(null);

  const updateSession = useCallback((update: (current: Session) => Session) => {
    const current = sessionRef.current;
    if (!current) return;
    const next = update(current);
    sessionRef.current = next;
    setSession(next);
  }, []);

  const stopCamera = useCallback(() => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    landmarkerRef.current?.close();
    landmarkerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  useEffect(() => {
    if (screen !== "walking" || session?.mode !== "webcam") return;
    const timer = window.setInterval(() => setNow(performance.now()), 250);
    return () => window.clearInterval(timer);
  }, [screen, session?.mode]);

  const handlePose = useCallback(
    (poseSample: PoseSample | null, timestamp: number) => {
      setSample(poseSample);
      if (poseSample) {
        calibrationSamplesRef.current = [
          ...calibrationSamplesRef.current.slice(-11),
          poseSample,
        ];
      } else {
        calibrationSamplesRef.current = [];
      }
      updateSession((current) => processPose(current, poseSample, timestamp));
    },
    [updateSession],
  );

  const connectCamera = async () => {
    setCameraError("");
    setSample(null);
    calibrationSamplesRef.current = [];
    setCameraStatus("카메라와 자세 인식 모델을 준비하고 있어요.");
    setScreen("calibrating");

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("이 브라우저에서는 카메라를 사용할 수 없습니다. Chrome에서 다시 시도해 주세요.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (!videoRef.current) throw new Error("카메라 화면을 준비하지 못했습니다.");
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      const vision = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
      const landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "/models/pose_landmarker_lite.task",
          delegate: "CPU",
        },
        runningMode: "VIDEO",
        numPoses: 1,
        minPoseDetectionConfidence: 0.55,
        minPosePresenceConfidence: 0.55,
        minTrackingConfidence: 0.55,
      });
      landmarkerRef.current = landmarker;
      setCameraStatus("양쪽 어깨가 화면에 보이도록 편안하게 서거나 앉아 주세요.");

      let lastDetectionAt = 0;
      const detect = (frameTime: number) => {
        const video = videoRef.current;
        if (
          video &&
          video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
          frameTime - lastDetectionAt >= 100
        ) {
          lastDetectionAt = frameTime;
          const timestamp = performance.now();
          const result = landmarker.detectForVideo(video, timestamp);
          handlePose(getShoulderSample(result.landmarks?.[0]), timestamp);
        }
        animationRef.current = requestAnimationFrame(detect);
      };
      animationRef.current = requestAnimationFrame(detect);
    } catch (error) {
      stopCamera();
      const message =
        error instanceof Error ? error.message : "카메라를 시작하지 못했습니다.";
      setCameraError(
        message.includes("pose_landmarker_lite.task")
          ? "자세 인식 모델 파일을 찾지 못했어요. 터미널에서 npm run setup:model을 실행한 뒤 다시 시작하거나 대체 시연을 선택해 주세요."
          : message,
      );
      setCameraStatus("웹캠 모드를 시작하지 못했습니다.");
      setScreen("ready");
    }
  };

  const startWebcamSession = () => {
    const baseline = getStableBaseline(calibrationSamplesRef.current);
    if (!baseline) {
      setCameraError("중앙 자세를 잠시 유지해 양쪽 어깨를 안정적으로 인식해 주세요.");
      return;
    }
    const started = startSession(createSession(selectedPlace.id, "webcam"), baseline, performance.now());
    if (!started) {
      setCameraError("중앙 자세를 잡을 수 없어요. 양쪽 어깨가 보이도록 위치를 조정해 주세요.");
      return;
    }
    sessionRef.current = started;
    setSession(started);
    setNow(performance.now());
    setScreen("walking");
  };

  const startDemoSession = () => {
    stopCamera();
    const started = startSession(
      createSession(selectedPlace.id, "demo"),
      { centerX: 0.5, width: 0.3 },
      performance.now(),
    );
    sessionRef.current = started;
    setSession(started);
    setNow(performance.now());
    setCameraError("");
    setScreen("walking");
  };

  const stopActivity = () => {
    if (!sessionRef.current) {
      stopCamera();
      setSample(null);
      setScreen("ready");
      return;
    }
    updateSession((current) => finishSession(current, performance.now()));
    stopCamera();
    setScreen("result");
  };

  const cancelCameraSetup = () => {
    stopCamera();
    setSample(null);
    setCameraStatus("카메라 연결 전");
    setScreen("ready");
  };

  const goToNextMission = () => {
    if (!session) return;
    const next = nextMission(session, sample, performance.now());
    if (!next) return;
    sessionRef.current = next;
    setSession(next);
    if (next.phase === "result") {
      stopCamera();
      setScreen("result");
    }
  };

  const finishDemoMission = (success: boolean) => {
    if (!session) return;
    const next = completeDemoMission(session, success, performance.now());
    sessionRef.current = next;
    setSession(next);
  };

  const leaveResult = () => {
    stopCamera();
    sessionRef.current = null;
    setSession(null);
    setSafetyConfirmed(false);
    setCameraConsent(false);
    setSample(null);
    setNow(0);
    setCameraError("");
    setScreen("places");
  };

  const summary = session ? getSessionSummary(session, now) : null;
  const currentMission =
    session && session.currentIndex !== null
      ? session.missions[session.currentIndex]
      : null;
  const centered = session?.mode === "demo" || isCentered(session?.baseline ?? null, sample);
  const isWalking = screen === "walking";

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="추억 산책 홈">
          <span className="brand-mark" aria-hidden="true">산</span>
          <span>추억 산책</span>
        </a>
        <span className="topbar-note">경남 어르신을 위한 산책 경험</span>
      </header>

      <section className="app-content" aria-live="polite">
        {screen === "places" && (
          <section className="panel intro-panel">
            <p className="eyebrow">천천히, 편안하게</p>
            <h1>오늘은 어디를<br />함께 걸어볼까요?</h1>
            <p className="lead">
              익숙한 경남의 풍경을 고르고, 화면의 움직임 미션을 가볍게 경험해 보세요.
            </p>
            <div className="place-grid" role="group" aria-label="산책 장소 선택">
              {PLACES.map((place) => (
                <button
                  type="button"
                  className={`place-card ${selectedPlace.id === place.id ? "is-selected" : ""}`}
                  key={place.id}
                  aria-pressed={selectedPlace.id === place.id}
                  onClick={() => setSelectedPlace(place)}
                >
                  <span className={`place-art ${place.theme}`}>
                    <span className="art-sun" />
                    <span className="art-hill art-hill-one" />
                    <span className="art-hill art-hill-two" />
                    <span className="art-water" />
                  </span>
                  <span className="place-copy">
                    <span className="place-region">{place.region}</span>
                    <span className="place-name">{place.name}</span>
                    <span className="place-description">{place.description}</span>
                  </span>
                  <span className="radio-indicator" aria-hidden="true">
                    {selectedPlace.id === place.id ? "✓" : ""}
                  </span>
                </button>
              ))}
            </div>
            <div className="info-note">
              <span className="info-icon" aria-hidden="true">i</span>
              <p>이번 시연은 미리 준비된 경남 장소로 진행합니다. 원하는 국내외 여행지와 추억 장소는 향후 확장 목표입니다.</p>
            </div>
            <button type="button" className="button button-primary button-wide" onClick={() => setScreen("ready")}>
              이 장소에서 시작하기 <span aria-hidden="true">→</span>
            </button>
          </section>
        )}

        {screen === "ready" && (
          <section className="panel ready-panel">
            <button type="button" className="back-button" onClick={() => setScreen("places")}>
              <span aria-hidden="true">←</span> 장소 선택으로
            </button>
            <div className="ready-heading">
              <p className="eyebrow">시작 전 안내</p>
              <h1>편안하고 안전하게<br />준비해 주세요</h1>
              <p className="lead">선택한 장소: <strong>{selectedPlace.name}</strong></p>
            </div>
            <div className="safety-card">
              <span className="safety-icon" aria-hidden="true">!</span>
              <div>
                <h2>안전을 먼저 확인해요</h2>
                <p>편안한 자세로 참여하고, 불편하거나 어지러우면 바로 멈추세요. 진행자와 안전한 공간에서 시연해 주세요.</p>
              </div>
            </div>
            <label className="check-row">
              <input
                type="checkbox"
                checked={safetyConfirmed}
                onChange={(event) => setSafetyConfirmed(event.target.checked)}
              />
              <span>안내를 확인했고, 불편하면 언제든 중단하겠습니다.</span>
            </label>
            <label className="check-row camera-consent">
              <input
                type="checkbox"
                checked={cameraConsent}
                onChange={(event) => setCameraConsent(event.target.checked)}
              />
              <span>웹캠 사용에 동의합니다. 영상과 어깨 좌표는 이 기기에서만 처리하며 저장하거나 전송하지 않습니다.</span>
            </label>
            {cameraError && <p className="error-message" role="alert">{cameraError}</p>}
            <div className="button-stack">
              <button
                type="button"
                className="button button-primary button-wide"
                disabled={!safetyConfirmed || !cameraConsent}
                onClick={connectCamera}
              >
                웹캠으로 시작하기
              </button>
              <button
                type="button"
                className="button button-secondary button-wide"
                disabled={!safetyConfirmed}
                onClick={startDemoSession}
              >
                웹캠 없이 대체 시연하기
              </button>
            </div>
            <p className="privacy-caption">대체 시연은 개발용 입력이며 웹캠 인식 성능을 보여주지 않습니다.</p>
          </section>
        )}

        {screen === "calibrating" && (
          <section className="panel calibrate-panel">
            <p className="eyebrow">카메라 준비</p>
            <h1>양쪽 어깨가<br />화면에 보이도록 해주세요</h1>
            <p className="lead">{cameraStatus}</p>
            <div className="camera-frame">
              <div className="camera-guide" aria-hidden="true">
                <span className="guide-dot" />
                <span className="guide-line" />
                <span className="guide-label">어깨를 화면 가운데에 맞춰 주세요</span>
              </div>
              <span className={`camera-state ${sample ? "camera-state-ready" : ""}`}>
                <span className="status-dot" />
                {sample ? "양쪽 어깨 인식 중" : "어깨를 찾고 있어요"}
              </span>
            </div>
            <div className="notice-card">
              <strong>몸을 무리해서 움직이지 마세요.</strong>
              <span>
                {getStableBaseline(calibrationSamplesRef.current)
                  ? "어깨가 안정적으로 보여요. 편안한 자세에서 기준을 잡을 수 있습니다."
                  : "중앙에서 편안한 자세를 유지해 주세요. 상체 움직임만 인식하며 체중 이동이나 균형을 측정하지 않습니다."}
              </span>
            </div>
            <div className="button-stack">
              <button
                type="button"
                className="button button-primary button-wide"
                disabled={!getStableBaseline(calibrationSamplesRef.current)}
                onClick={startWebcamSession}
              >
                편안한 자세로 기준 잡기
              </button>
              {cameraError && <p className="error-message" role="alert">{cameraError}</p>}
              <button type="button" className="button button-secondary button-wide" onClick={cancelCameraSetup}>
                중단하기
              </button>
            </div>
          </section>
        )}

        {isWalking && session && session.currentIndex !== null && currentMission && (
          <section className="walk-layout">
            <div className="walk-header">
              <div>
                <p className="eyebrow">{session.mode === "demo" ? "대체 시연 모드" : "화면 움직임 미션"}</p>
                <h1>{selectedPlace.name}</h1>
              </div>
              <button type="button" className="button button-stop" onClick={stopActivity}>
                <span aria-hidden="true">■</span> 중단하기
              </button>
            </div>
            <div className="walk-card">
              <div className="scene-wrap">
                <PlaceScene theme={selectedPlace.theme} label={selectedPlace.name} />
                <div className="scene-shade" />
                <div className="scene-caption">
                  <span className="live-pill"><span /> 산책 중</span>
                  <span>{selectedPlace.region}</span>
                </div>
                {currentMission.status === "active" && (
                  <div className={`target-card target-${currentMission.direction}`}>
                    <span className="target-arrow" aria-hidden="true">
                      {currentMission.direction === "right" ? "→" : "←"}
                    </span>
                    <span>{currentMission.direction === "right" ? "오른쪽" : "왼쪽"}으로 천천히</span>
                  </div>
                )}
                {currentMission.status === "success" && (
                  <div className="result-overlay success-overlay">
                    <span className="overlay-icon" aria-hidden="true">✓</span>
                    <strong>잘하셨어요</strong>
                    <span>화면 목표를 선택했어요</span>
                  </div>
                )}
                {currentMission.status === "timed_out" && (
                  <div className="result-overlay">
                    <span className="overlay-icon" aria-hidden="true">↻</span>
                    <strong>이번 미션은 여기까지예요</strong>
                    <span>천천히 다음 미션을 준비해요</span>
                  </div>
                )}
                {session.phase === "tracking_lost" && (
                  <div className="tracking-overlay" role="status">
                    양쪽 어깨가 보이도록 위치를 조정해 주세요
                  </div>
                )}
              </div>
              <div className="mission-content">
                <div className="mission-progress">
                  <span>미션 {session.currentIndex + 1} / {session.missions.length}</span>
                  <span>{summary?.successCount ?? 0}회 성공</span>
                </div>
                <div className="progress-track" aria-label="미션 진행">
                  <span style={{ width: `${((session.currentIndex + (currentMission.status === "success" || currentMission.status === "timed_out" ? 1 : 0)) / session.missions.length) * 100}%` }} />
                </div>
                <h2 className="mission-prompt">
                  {currentMission.status === "active"
                    ? `${currentMission.direction === "right" ? "상체를 오른쪽" : "상체를 왼쪽"}으로 천천히 움직여 보세요`
                    : currentMission.status === "success"
                      ? "중앙으로 돌아와 주세요"
                      : "편안한 자세로 잠시 쉬어 주세요"}
                </h2>
                <p className="mission-subtitle">
                  {session.mode === "webcam"
                    ? "화면 속 어깨 움직임으로 목표를 선택합니다. 실제 체중 이동을 측정하지 않아요."
                    : "개발용 입력으로 미션 흐름을 확인 중입니다."}
                </p>
                {session.mode === "webcam" && (
                  <div className="camera-mini">
                    <span className={`status-dot ${sample ? "status-dot-on" : ""}`} />
                    {session.phase === "tracking_lost"
                      ? "인식이 잠시 멈췄어요"
                      : centered
                        ? "카메라가 움직임을 인식하고 있어요"
                        : "중앙 자세로 돌아오면 다음 미션을 시작할 수 있어요"}
                  </div>
                )}
                {session.mode === "demo" && currentMission.status === "active" && (
                  <div className="demo-controls">
                    <button type="button" className="button button-primary" onClick={() => finishDemoMission(true)}>
                      개발용 성공 입력
                    </button>
                    <button type="button" className="button button-secondary" onClick={() => finishDemoMission(false)}>
                      개발용 미완료 입력
                    </button>
                  </div>
                )}
                {(currentMission.status === "success" || currentMission.status === "timed_out") && (
                  <button
                    type="button"
                    className="button button-primary button-wide next-button"
                    disabled={!centered}
                    onClick={goToNextMission}
                  >
                    {session.currentIndex === session.missions.length - 1
                      ? "결과 보기"
                      : "중앙 자세에서 다음 미션"}
                  </button>
                )}
              </div>
            </div>
            <p className="medical-disclaimer">
              이 활동은 산책 경험을 위한 시제품입니다. 의료 진단이나 균형·인지 기능 평가가 아닙니다.
            </p>
          </section>
        )}

        {screen === "result" && session && summary && (
          <section className="panel result-panel">
            <div className="result-mark" aria-hidden="true">✓</div>
            <p className="eyebrow">산책 기록</p>
            <h1>{session.mode === "demo" ? "대체 시연을 마쳤어요" : "산책을 마쳤어요"}</h1>
            <p className="lead">{selectedPlace.name}에서 함께한 시간이에요.</p>
            {session.mode === "demo" && (
              <div className="demo-banner">개발용 대체 입력으로 기록한 결과입니다. 웹캠 인식 성능을 나타내지 않습니다.</div>
            )}
            <div className="summary-grid">
              <div className="summary-card">
                <span>활동 시간</span>
                <strong>{formatDuration(summary.durationMs)}</strong>
              </div>
              <div className="summary-card">
                <span>미션 성공</span>
                <strong>{summary.successCount}<small> / {summary.startedCount}회</small></strong>
              </div>
            </div>
            {summary.startedCount === 0 && <p className="empty-result">수행한 미션이 없습니다.</p>}
            <p className="result-disclaimer">
              이 기록은 게임 활동 결과이며 건강 진단이나 체중 이동·균형 능력 측정이 아닙니다.
            </p>
            <button type="button" className="button button-primary button-wide" onClick={leaveResult}>
              처음으로
            </button>
          </section>
        )}
      </section>

      <footer className="footer">
        <span>10조벌자</span>
        <span>불편하면 언제든 멈추고 진행자에게 알려 주세요.</span>
      </footer>
      <video
        ref={videoRef}
        className={`video-source ${screen === "calibrating" || (session?.mode === "webcam" && screen === "walking") ? "video-source-visible" : ""}`}
        autoPlay
        muted
        playsInline
        aria-label="움직임 인식을 위한 카메라 미리보기"
      />
    </main>
  );
}
