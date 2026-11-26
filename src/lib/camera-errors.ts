export type CameraStage = "camera" | "video" | "model" | "tracking";

export function cameraErrorMessage(error: unknown, stage: CameraStage): string {
  const name = error instanceof Error ? error.name : "";
  if (stage === "camera") {
    if (name === "NotAllowedError" || name === "SecurityError") {
      return "카메라 권한이 거부되었어요. 브라우저 주소창의 사이트 설정에서 카메라를 허용한 뒤 다시 시도해 주세요.";
    }
    if (name === "NotFoundError" || name === "OverconstrainedError") {
      return "사용할 카메라를 찾지 못했어요. 카메라 연결을 확인한 뒤 다시 시도해 주세요.";
    }
    if (name === "NotReadableError" || name === "AbortError") {
      return "카메라를 사용할 수 없어요. 다른 앱의 카메라 사용을 종료한 뒤 다시 시도해 주세요.";
    }
    return "카메라를 시작하지 못했어요. HTTPS 또는 localhost의 Chrome에서 카메라 설정을 확인한 뒤 다시 시도해 주세요.";
  }
  if (stage === "model") {
    return "자세 인식 모델을 불러오지 못했어요. 인터넷과 모델 파일을 확인한 뒤 다시 시도하거나 대체 시연을 선택해 주세요.";
  }
  if (stage === "tracking") {
    return "카메라 연결 또는 자세 인식이 중단되었어요. 중단하기를 눌러 결과를 확인하고 카메라 연결을 확인한 뒤 다시 시작해 주세요.";
  }
  return "카메라 화면을 준비하지 못했어요. 카메라 연결을 확인한 뒤 다시 시도해 주세요.";
}
