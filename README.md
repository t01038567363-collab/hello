# hello

## 추억 산책 프로토타입

TRD를 바탕으로 만든 경남 지역 산책 미션 웹 시제품입니다. Google Maps API를 설정하면 삼천포 항구·진주 남강 주변의 Street View 사진을 표시하고 미션 성공 시 연결된 다음 사진으로 이동합니다. 사진은 연속 영상이 아니며, 제공 지역과 연결 경로는 Google의 데이터에 따라 달라집니다. 사용할 수 없으면 사전 제작 일러스트로 표시합니다. 해외 여행지 생성, 음성 인식, 의료·균형 평가는 구현 범위가 아닙니다.

`/media-art`는 별도의 3D 미디어아트 시연입니다. 추억길·벚꽃길·바다길 테마와 수동 화면 이동을 제공하며, 산책 중 무작위 간격으로 가상의 친구가 다가와 질문합니다. 질문이 나오면 화면이 멈추고, 답변 또는 건너뛰기 후 직접 산책을 재개할 수 있습니다. 표시된 거리는 가상 값이며 실제 보행, 센서, 압력중심, 낙상 위험 또는 건강 상태를 측정하지 않습니다. 이 화면은 웹캠이나 Google API 키 없이 사용할 수 있습니다.

### 실행

필요 환경: Node.js 22 LTS, npm, 웹캠이 연결된 노트북/데스크톱의 최신 Chrome. 카메라는 `localhost` 또는 HTTPS에서만 사용할 수 있습니다.

```bash
npm ci
npm run setup:model
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 엽니다. `setup:model`은 공식 MediaPipe Pose Landmarker Lite 모델을 `public/models/pose_landmarker_lite.task`로 내려받습니다. 네트워크나 파일 다운로드가 차단된 환경에서는 공식 배포처에서 내려받아 같은 경로에 직접 넣으세요. 모델 파일은 Git에 포함하지 않습니다.

WASM 파일은 `npm ci`의 `postinstall` 단계에서 설치된 `@mediapipe/tasks-vision` 패키지로부터 `public/mediapipe/wasm`에 복사됩니다. 거리 사진을 사용할 때는 브라우저에서 Google Maps에 접속합니다. 카메라 영상과 좌표는 앱에서 전송하지 않고 로컬에서 처리하며, Google 지도 코드는 카메라 권한이 없는 격리된 프레임에서 실행합니다. Google에 장소 및 접속 정보가 전달될 수 있습니다.

모델이 준비되지 않아 웹캠 모드를 시작할 수 없는 경우 앱은 오류를 안내하며 개발용 대체 시연을 제공합니다. 대체 시연은 웹캠 인식 성능을 입증하지 않습니다.

### Vercel 배포

GitHub 저장소를 Vercel에 연결하면 `vercel.json`에 지정된 빌드 명령이 공식 Pose 모델을 내려받은 뒤 앱을 빌드합니다. 모델 다운로드가 실패하면 웹캠 모델이 빠진 배포본을 만들지 않도록 빌드가 실패합니다. 배포 후 시연 기기에서 HTTPS 접속, 카메라 권한과 실제 인식 성능을 확인해야 합니다.

### Google 거리 사진 설정

1. [Google Cloud Console](https://console.cloud.google.com/)에서 프로젝트를 만들고 결제 계정을 연결한 후 **Maps JavaScript API**를 사용 설정합니다. 사용량에 따라 비용이 발생할 수 있으므로 [요금](https://mapsplatform.google.com/pricing/)과 예산 알림을 확인하세요.
2. **API 및 서비스 → 사용자 인증 정보**에서 API 키를 생성합니다. 키 제한은 **웹사이트(HTTP 리퍼러)**로 선택해 배포 사이트의 정확한 주소와 필요한 경우 `http://localhost:3000/*`만 허용하고, API 제한은 **Maps JavaScript API**로 설정합니다. Preview와 Production의 주소가 다르면 각각 추가합니다.
3. Vercel 프로젝트의 **Settings → Environment Variables**에서 이름 `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`에 키를 입력하고 Preview와 필요한 환경을 선택해 저장합니다. 브라우저에 공개되는 키이므로 제한 설정이 필수입니다. 키를 저장소나 채팅에 올리지 마세요.
4. Vercel에서 새 배포를 실행합니다. 이 환경 변수는 빌드할 때 적용되므로 저장만 해서는 기존 배포에 반영되지 않습니다. 로컬에서는 `.env.local`에 같은 이름으로 설정하고 개발 서버를 재시작합니다.
5. 실제 배포 주소에서 각 장소의 거리 사진과 미션 성공 후 이동을 확인합니다. 데이터가 없거나 인증·네트워크에 문제가 있으면 이유와 함께 일러스트가 표시됩니다. 거리 사진의 장소는 지정 좌표 주변 최대 1km에서 검색하므로 선택한 장소와 정확히 같지 않을 수 있습니다.

### 확인 명령

```bash
npm test
npx tsc --noEmit
npm run build
```

웹캠 인식 확인은 시연 기기에서 카메라와 조명을 고정한 뒤 진행합니다. 목표는 좌우 각 5회 중 8회 이상 올바른 방향 인식과 중앙 자세 10초 동안 오인식 없음입니다. 이 목표는 아직 검증 결과가 아닙니다.
