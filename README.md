# hello

## 추억 산책 프로토타입

TRD를 바탕으로 만든 경남 지역 산책 미션 웹 시제품입니다. 구현 범위는 사전 제작된 삼천포 항구·진주 남강 일러스트, 화면상 상체 좌우 움직임 인식, 활동 결과와 개발용 대체 시연입니다. 해외 여행지 생성, 음성 인식, 의료·균형 평가는 구현 범위가 아닙니다.

### 실행

필요 환경: Node.js 22 LTS, npm, 웹캠이 연결된 노트북/데스크톱의 최신 Chrome. 카메라는 `localhost` 또는 HTTPS에서만 사용할 수 있습니다.

```bash
npm ci
npm run setup:model
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 엽니다. `setup:model`은 공식 MediaPipe Pose Landmarker Lite 모델을 `public/models/pose_landmarker_lite.task`로 내려받습니다. 네트워크나 파일 다운로드가 차단된 환경에서는 공식 배포처에서 내려받아 같은 경로에 직접 넣으세요. 모델 파일은 Git에 포함하지 않습니다.

WASM 파일은 `npm ci`의 `postinstall` 단계에서 설치된 `@mediapipe/tasks-vision` 패키지로부터 `public/mediapipe/wasm`에 복사됩니다. 콘텐츠 보안 정책은 앱과 로컬 자산 외의 연결을 막아 MediaPipe 진단 전송을 포함한 외부 요청을 차단합니다. 따라서 모델과 WASM 파일을 준비한 후에도 실제 오프라인 동작은 시연 기기에서 별도로 시험해야 합니다.

모델이 준비되지 않아 웹캠 모드를 시작할 수 없는 경우 앱은 오류를 안내하며 개발용 대체 시연을 제공합니다. 대체 시연은 웹캠 인식 성능을 입증하지 않습니다.

### Vercel 배포

GitHub 저장소를 Vercel에 연결하면 `vercel.json`에 지정된 빌드 명령이 공식 Pose 모델을 내려받은 뒤 앱을 빌드합니다. 모델 다운로드가 실패하면 웹캠 모델이 빠진 배포본을 만들지 않도록 빌드가 실패합니다. 배포 후 시연 기기에서 HTTPS 접속, 카메라 권한과 실제 인식 성능을 확인해야 합니다.

### 확인 명령

```bash
npm test
npx tsc --noEmit
npm run build
```

웹캠 인식 확인은 시연 기기에서 카메라와 조명을 고정한 뒤 진행합니다. 목표는 좌우 각 5회 중 8회 이상 올바른 방향 인식과 중앙 자세 10초 동안 오인식 없음입니다. 이 목표는 아직 검증 결과가 아닙니다.
