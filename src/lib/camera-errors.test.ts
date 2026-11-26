import assert from "node:assert/strict";
import test from "node:test";
import { cameraErrorMessage } from "./camera-errors";

test("camera permission, missing device, and busy device errors have actionable guidance", () => {
  assert.match(cameraErrorMessage(new DOMException("", "NotAllowedError"), "camera"), /권한.*허용/);
  assert.match(cameraErrorMessage(new DOMException("", "NotFoundError"), "camera"), /연결.*확인/);
  assert.match(cameraErrorMessage(new DOMException("", "NotReadableError"), "camera"), /다른 앱/);
});

test("model and tracking failures explain how to recover", () => {
  assert.match(cameraErrorMessage(new Error("network"), "model"), /모델.*다시 시도.*대체 시연/);
  assert.match(cameraErrorMessage(new Error("disconnected"), "tracking"), /중단하기.*다시 시작/);
});
