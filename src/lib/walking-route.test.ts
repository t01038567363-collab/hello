import assert from "node:assert/strict";
import test from "node:test";
import { createRouteStrip, createWalkingRoute, sampleRoute } from "./walking-route";

test("the winding route loops smoothly and changes direction", () => {
  const route = createWalkingRoute();
  const length = route.getLength();
  const start = sampleRoute(route, 0);
  const end = sampleRoute(route, length);
  assert.ok(start.position.distanceTo(end.position) < 0.001);
  assert.ok(start.tangent.dot(end.tangent) > 0.999);
  assert.ok(start.tangent.dot(sampleRoute(route, length * 0.25).tangent) < 0.7);
  assert.ok(start.tangent.dot(sampleRoute(route, length * 0.5).tangent) < 0.7);
});

test("the road strip follows the route at a consistent width", () => {
  const route = createWalkingRoute();
  const geometry = createRouteStrip(route, -3.75, 3.75);
  const positions = geometry.getAttribute("position");
  for (let i = 0; i < positions.count; i += 40) {
    const width = Math.hypot(
      positions.getX(i + 1) - positions.getX(i),
      positions.getZ(i + 1) - positions.getZ(i),
    );
    assert.ok(Math.abs(width - 7.5) < 0.001);
  }
  geometry.dispose();
});
