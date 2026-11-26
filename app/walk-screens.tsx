"use client";

import type { Mission, Session, SessionSummary, PoseSample } from "@/lib/session";
import { PlaceScene } from "./place-scene";
import { PLACES, type Place } from "./places";
import { StreetView } from "./street-view";

export function PlacesScreen({
  selectedPlace,
  onSelectPlace,
  onContinue,
}: {
  selectedPlace: Place;
  onSelectPlace: (place: Place) => void;
  onContinue: () => void;
}) {
  return (
    <section className="panel intro-panel">
      <p className="eyebrow">천천히, 편안하게</p>
      <h1>오늘은 어디를<br />함께 걸어볼까요?</h1>
      <p className="lead">경남의 장소를 고르고, 화면의 움직임 미션을 가볍게 경험해 보세요.</p>
      <div className="place-grid" role="group" aria-label="산책 장소 선택">
        {PLACES.map((place) => (
            <button
              type="button"
              className={`place-card ${selectedPlace.id === place.id ? "is-selected" : ""}`}
              key={place.id}
              aria-pressed={selectedPlace.id === place.id}
              onClick={() => onSelectPlace(place)}
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
        <p>이번 시연은 경남 장소로 진행합니다. 설정된 경우 Google 거리 사진을 사용하며, 사용할 수 없으면 일러스트로 보여드립니다. 국내외 여행지와 추억 장소는 향후 확장 목표입니다.</p>
      </div>
      <button type="button" className="button button-primary button-wide" onClick={onContinue}>
        이 장소에서 시작하기 <span aria-hidden="true">→</span>
      </button>
      <p className="privacy-caption"><a href="/media-art">3D 미디어아트 산책 체험하기 →</a></p>
    </section>
  );
}

export function ReadyScreen({
  place,
  safetyConfirmed,
  cameraConsent,
  error,
  onSafetyChange,
  onCameraConsentChange,
  onConnectCamera,
  onStartDemo,
  onBack,
}: {
  place: Place;
  safetyConfirmed: boolean;
  cameraConsent: boolean;
  error: string;
  onSafetyChange: (confirmed: boolean) => void;
  onCameraConsentChange: (confirmed: boolean) => void;
  onConnectCamera: () => void;
  onStartDemo: () => void;
  onBack: () => void;
}) {
  return (
    <section className="panel ready-panel">
      <button type="button" className="back-button" onClick={onBack}><span aria-hidden="true">←</span> 장소 선택으로</button>
      <div className="ready-heading">
        <p className="eyebrow">시작 전 안내</p>
        <h1>편안하고 안전하게<br />준비해 주세요</h1>
        <p className="lead">선택한 장소: <strong>{place.name}</strong></p>
      </div>
      <div className="safety-card">
        <span className="safety-icon" aria-hidden="true">!</span>
        <div>
          <h2>안전을 먼저 확인해요</h2>
          <p>편안한 자세로 참여하고, 불편하거나 어지러우면 바로 멈추세요. 진행자와 안전한 공간에서 시연해 주세요.</p>
        </div>
      </div>
      <label className="check-row">
        <input type="checkbox" checked={safetyConfirmed} onChange={(event) => onSafetyChange(event.target.checked)} />
        <span>안내를 확인했고, 불편하면 언제든 중단하겠습니다.</span>
      </label>
      <label className="check-row camera-consent">
        <input type="checkbox" checked={cameraConsent} onChange={(event) => onCameraConsentChange(event.target.checked)} />
        <span>웹캠 사용에 동의합니다. 영상과 어깨 좌표는 이 기기에서만 처리하며 저장하거나 전송하지 않습니다.</span>
      </label>
      {error && <p className="error-message" role="alert">{error}</p>}
      <div className="button-stack">
        <button type="button" className="button button-primary button-wide" disabled={!safetyConfirmed || !cameraConsent} onClick={onConnectCamera}>
          웹캠으로 시작하기
        </button>
        <button type="button" className="button button-secondary button-wide" disabled={!safetyConfirmed} onClick={onStartDemo}>
          웹캠 없이 대체 시연하기
        </button>
      </div>
      <p className="privacy-caption">대체 시연은 개발용 입력이며 웹캠 인식 성능을 보여주지 않습니다.</p>
      <p className="privacy-caption">거리 사진 사용 시 Google에 장소와 접속 정보가 전달될 수 있습니다. 웹캠 영상은 이 기기에서 처리합니다.</p>
    </section>
  );
}

export function CalibratingScreen({
  status,
  sample,
  hasStableBaseline,
  error,
  onStart,
  onCancel,
}: {
  status: string;
  sample: PoseSample | null;
  hasStableBaseline: boolean;
  error: string;
  onStart: () => void;
  onCancel: () => void;
}) {
  return (
    <section className="panel calibrate-panel">
      <p className="eyebrow">카메라 준비</p>
      <h1>양쪽 어깨가<br />화면에 보이도록 해주세요</h1>
      <p className="lead">{status}</p>
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
          {hasStableBaseline
            ? "어깨가 안정적으로 보여요. 편안한 자세에서 기준을 잡을 수 있습니다."
            : "중앙에서 편안한 자세를 유지해 주세요. 상체 움직임만 인식하며 체중 이동이나 균형을 측정하지 않습니다."}
        </span>
      </div>
      <div className="button-stack">
        <button type="button" className="button button-primary button-wide" disabled={!hasStableBaseline} onClick={onStart}>
          편안한 자세로 기준 잡기
        </button>
        {error && <p className="error-message" role="alert">{error}</p>}
        <button type="button" className="button button-secondary button-wide" onClick={onCancel}>중단하기</button>
      </div>
    </section>
  );
}

export function WalkingScreen({
  place,
  session,
  mission,
  summary,
  sample,
  centered,
  error,
  streetViewVisible,
  onStop,
  onStreetViewVisibleChange,
  onDemoMission,
  onNextMission,
}: {
  place: Place;
  session: Session;
  mission: Mission;
  summary: SessionSummary;
  sample: PoseSample | null;
  centered: boolean;
  error: string;
  streetViewVisible: boolean;
  onStop: () => void;
  onStreetViewVisibleChange: (visible: boolean) => void;
  onDemoMission: (success: boolean) => void;
  onNextMission: () => void;
}) {
  const index = session.currentIndex;
  if (index === null) return null;

  const completed = mission.status === "success" || mission.status === "timed_out";
  const progress = ((index + (completed ? 1 : 0)) / session.missions.length) * 100;
  return (
    <section className="walk-layout">
      <div className="walk-header">
        <div>
          <p className="eyebrow">{session.mode === "demo" ? "대체 시연 모드" : "화면 움직임 미션"}</p>
          <h1>{place.name}</h1>
        </div>
        <button type="button" className="button button-stop" onClick={onStop}><span aria-hidden="true">■</span> 중단하기</button>
      </div>
      {error && <p className="error-message" role="alert">{error}</p>}
      <div className="walk-card">
        <div className="scene-wrap">
          <PlaceScene theme={place.theme} label={place.name} />
          <StreetView location={place.location} heading={place.heading} successes={summary.successCount} onVisibleChange={onStreetViewVisibleChange} />
          {!streetViewVisible && <div className="scene-shade" />}
          {!streetViewVisible && (
            <div className="scene-caption">
              <span className="live-pill"><span /> 산책 중</span>
              <span>{place.region}</span>
            </div>
          )}
          {mission.status === "active" && (
            <div className={`target-card target-${mission.direction}`}>
              <span className="target-arrow" aria-hidden="true">{mission.direction === "right" ? "→" : "←"}</span>
              <span>{mission.direction === "right" ? "오른쪽" : "왼쪽"}으로 천천히</span>
            </div>
          )}
          {mission.status === "success" && (
            <div className="result-overlay success-overlay">
              <span className="overlay-icon" aria-hidden="true">✓</span>
              <strong>잘하셨어요</strong>
              <span>화면 목표를 선택했어요</span>
            </div>
          )}
          {mission.status === "timed_out" && (
            <div className="result-overlay">
              <span className="overlay-icon" aria-hidden="true">↻</span>
              <strong>이번 미션은 여기까지예요</strong>
              <span>천천히 다음 미션을 준비해요</span>
            </div>
          )}
          {session.phase === "tracking_lost" && (
            <div className="tracking-overlay" role="status">양쪽 어깨가 보이도록 위치를 조정해 주세요</div>
          )}
        </div>
        <div className="mission-content">
          <div className="mission-progress">
            <span>미션 {index + 1} / {session.missions.length}</span>
            <span>{summary.successCount}회 성공</span>
          </div>
          <div className="progress-track" aria-label="미션 진행"><span style={{ width: `${progress}%` }} /></div>
          <h2 className="mission-prompt">
            {mission.status === "active"
              ? `상체를 ${mission.direction === "right" ? "오른쪽" : "왼쪽"}으로 천천히 움직여 보세요`
              : mission.status === "success" ? "중앙으로 돌아와 주세요" : "편안한 자세로 잠시 쉬어 주세요"}
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
                : centered ? "카메라가 움직임을 인식하고 있어요" : "중앙 자세로 돌아오면 다음 미션을 시작할 수 있어요"}
            </div>
          )}
          {session.mode === "demo" && mission.status === "active" && (
            <div className="demo-controls">
              <button type="button" className="button button-primary" onClick={() => onDemoMission(true)}>개발용 성공 입력</button>
              <button type="button" className="button button-secondary" onClick={() => onDemoMission(false)}>개발용 미완료 입력</button>
            </div>
          )}
          {completed && (
            <button type="button" className="button button-primary button-wide next-button" disabled={!centered} onClick={onNextMission}>
              {index === session.missions.length - 1 ? "결과 보기" : "중앙 자세에서 다음 미션"}
            </button>
          )}
        </div>
      </div>
      <p className="medical-disclaimer">이 활동은 산책 경험을 위한 시제품입니다. 의료 진단이나 균형·인지 기능 평가가 아닙니다.</p>
    </section>
  );
}

export function ResultScreen({
  place,
  session,
  summary,
  onHome,
}: {
  place: Place;
  session: Session;
  summary: SessionSummary;
  onHome: () => void;
}) {
  const durationSeconds = Math.floor(summary.durationMs / 1000);
  const duration = `${String(Math.floor(durationSeconds / 60)).padStart(2, "0")}:${String(durationSeconds % 60).padStart(2, "0")}`;
  return (
    <section className="panel result-panel">
      <div className="result-mark" aria-hidden="true">✓</div>
      <p className="eyebrow">산책 기록</p>
      <h1>{session.mode === "demo" ? "대체 시연을 마쳤어요" : "산책을 마쳤어요"}</h1>
      <p className="lead">{place.name}에서 함께한 시간이에요.</p>
      {session.mode === "demo" && <div className="demo-banner">개발용 대체 입력으로 기록한 결과입니다. 웹캠 인식 성능을 나타내지 않습니다.</div>}
      <div className="summary-grid">
        <div className="summary-card"><span>활동 시간</span><strong>{duration}</strong></div>
        <div className="summary-card"><span>미션 성공</span><strong>{summary.successCount}<small> / {summary.startedCount}회</small></strong></div>
      </div>
      {summary.startedCount === 0 && <p className="empty-result">수행한 미션이 없습니다.</p>}
      <p className="result-disclaimer">이 기록은 게임 활동 결과이며 건강 진단이나 체중 이동·균형 능력 측정이 아닙니다.</p>
      <button type="button" className="button button-primary button-wide" onClick={onHome}>처음으로</button>
    </section>
  );
}
