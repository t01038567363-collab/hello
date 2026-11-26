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
import { cameraErrorMessage, type CameraStage } from "@/lib/camera-errors";
import { useCallback, useEffect, useRef, useState } from "react";
import { PLACES, type Place } from "./places";
import {
  CalibratingScreen,
  PlacesScreen,
  ReadyScreen,
  ResultScreen,
  WalkingScreen,
} from "./walk-screens";

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
  const [streetViewVisible, setStreetViewVisible] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const animationRef = useRef<number | null>(null);
  const calibrationSamplesRef = useRef<PoseSample[]>([]);
  const sessionRef = useRef<Session | null>(null);
  const cameraRequestRef = useRef(0);

  const updateSession = useCallback((update: (current: Session) => Session) => {
    const current = sessionRef.current;
    if (!current) return;
    const next = update(current);
    sessionRef.current = next;
    setSession(next);
  }, []);

  const stopCamera = useCallback(() => {
    cameraRequestRef.current++;
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
    stopCamera();
    const request = cameraRequestRef.current;
    const isCurrent = () => cameraRequestRef.current === request;
    let stage: CameraStage = "camera";
    setCameraError("");
    setSample(null);
    calibrationSamplesRef.current = [];
    setCameraStatus("카메라와 자세 인식 모델을 준비하고 있어요.");
    setScreen("calibrating");

    const trackingFailed = (error: unknown) => {
      if (!isCurrent()) return;
      console.error("카메라 추적이 중단되었습니다.", error);
      stopCamera();
      handlePose(null, performance.now());
      if (sessionRef.current) {
        setCameraError(cameraErrorMessage(error, "tracking"));
      } else {
        setCameraError(cameraErrorMessage(error, "video"));
        setCameraStatus("웹캠 모드를 시작하지 못했습니다.");
        setScreen("ready");
      }
    };

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("이 브라우저에서는 카메라를 사용할 수 없습니다. Chrome에서 다시 시도해 주세요.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      if (!isCurrent()) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      stream.getVideoTracks().forEach((track) => {
        track.addEventListener("ended", () => trackingFailed(new Error("Camera track ended")), { once: true });
      });
      stage = "video";
      if (!videoRef.current) throw new Error("카메라 화면을 준비하지 못했습니다.");
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      if (!isCurrent()) return;

      stage = "model";
      const vision = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
      if (!isCurrent()) return;
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
      if (!isCurrent()) {
        landmarker.close();
        return;
      }
      landmarkerRef.current = landmarker;
      setCameraStatus("양쪽 어깨가 화면에 보이도록 편안하게 서거나 앉아 주세요.");

      let lastDetectionAt = 0;
      const detect = (frameTime: number) => {
        if (!isCurrent()) return;
        const video = videoRef.current;
        if (
          video &&
          video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
          frameTime - lastDetectionAt >= 100
        ) {
          lastDetectionAt = frameTime;
          const timestamp = performance.now();
          try {
            const result = landmarker.detectForVideo(video, timestamp);
            handlePose(getShoulderSample(result.landmarks?.[0]), timestamp);
          } catch (error) {
            trackingFailed(error);
            return;
          }
        }
        animationRef.current = requestAnimationFrame(detect);
      };
      animationRef.current = requestAnimationFrame(detect);
    } catch (error) {
      if (!isCurrent()) return;
      console.error("카메라를 시작하지 못했습니다.", error);
      stopCamera();
      setCameraError(cameraErrorMessage(error, stage));
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
    setStreetViewVisible(false);
    setSession(started);
    setNow(performance.now());
    setScreen("walking");
  };

  const startDemoSession = () => {
    stopCamera();
    setStreetViewVisible(false);
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
  const currentMission = session?.currentIndex === null || session?.currentIndex === undefined
    ? null
    : session.missions[session.currentIndex] ?? null;
  const centered = session?.mode === "demo" || isCentered(session?.baseline ?? null, sample);

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
          <PlacesScreen
            selectedPlace={selectedPlace}
            onSelectPlace={setSelectedPlace}
            onContinue={() => setScreen("ready")}
          />
        )}

        {screen === "ready" && (
          <ReadyScreen
            place={selectedPlace}
            safetyConfirmed={safetyConfirmed}
            cameraConsent={cameraConsent}
            error={cameraError}
            onSafetyChange={setSafetyConfirmed}
            onCameraConsentChange={setCameraConsent}
            onConnectCamera={connectCamera}
            onStartDemo={startDemoSession}
            onBack={() => setScreen("places")}
          />
        )}

        {screen === "calibrating" && (
          <CalibratingScreen
            status={cameraStatus}
            sample={sample}
            hasStableBaseline={Boolean(getStableBaseline(calibrationSamplesRef.current))}
            error={cameraError}
            onStart={startWebcamSession}
            onCancel={cancelCameraSetup}
          />
        )}

        {screen === "walking" && session && summary && currentMission && (
          <WalkingScreen
            place={selectedPlace}
            session={session}
            mission={currentMission}
            summary={summary}
            sample={sample}
            centered={centered}
            error={cameraError}
            streetViewVisible={streetViewVisible}
            onStop={stopActivity}
            onStreetViewVisibleChange={setStreetViewVisible}
            onDemoMission={finishDemoMission}
            onNextMission={goToNextMission}
          />
        )}

        {screen === "result" && session && summary && (
          <ResultScreen place={selectedPlace} session={session} summary={summary} onHome={leaveResult} />
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
