import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { STREET_VIEW_DOCUMENT } from "./street-view-document";

function createFrame(available: boolean) {
  const messages: { type: string; message?: string }[] = [];
  const parent = { postMessage: (message: { type: string; message?: string }) => messages.push(message) };
  let handler: (event: { source: object; data: object }) => void = () => {};
  let linksChanged: () => void = () => {};
  const moved: string[] = [];
  const panorama = {
    getLinks: () => moved.length === 0
      ? [{ pano: "back", heading: 270 }, { pano: "forward", heading: 90 }]
      : [{ pano: "start", heading: 90 }, { pano: "onward", heading: 110 }],
    getPov: () => ({ heading: 90 }),
    getPano: () => moved.at(-1) ?? "start",
    setPov: () => {},
    setPano: (pano: string) => { moved.push(pano); },
    addListener: (_name: string, callback: () => void) => { linksChanged = callback; },
  };
  const window = {
    addEventListener: (_name: string, callback: typeof handler) => { handler = callback; },
  };
  const context = vm.createContext({
    window, parent, URLSearchParams,
    setTimeout: () => 1,
    clearTimeout: () => {},
    document: {
      createElement: () => ({}),
      head: { appendChild: () => {} },
      getElementById: () => ({}),
    },
    google: { maps: {
      StreetViewService: class {
        getPanorama(_request: object, callback: (data: object | null, status: string) => void) {
          callback(available ? { location: { pano: "start" } } : null, available ? "OK" : "ZERO_RESULTS");
        }
      },
      StreetViewPanorama: class { constructor() { return panorama; } },
      StreetViewStatus: { OK: "OK" },
      StreetViewSource: { OUTDOOR: "outdoor" },
    } },
  });
  const script = STREET_VIEW_DOCUMENT.match(/<script>([\s\S]*)<\/script>/)?.[1];
  assert.ok(script);
  vm.runInContext(script, context);
  handler({ source: parent, data: { type: "initialize", key: "test", location: {}, heading: 90 } });
  (window as { initWalkStreetView?: () => void }).initWalkStreetView?.();
  return { messages, moved, linksChanged: () => linksChanged(), advance: () => handler({ source: parent, data: { type: "advance" } }) };
}

test("success advances to a forward panorama once and avoids immediate backtracking", () => {
  const frame = createFrame(true);
  frame.linksChanged();
  assert.equal(frame.messages[0].type, "ready");
  frame.advance();
  assert.deepEqual(frame.moved, ["forward"]);
  frame.linksChanged();
  frame.advance();
  assert.deepEqual(frame.moved, ["forward", "onward"]);
});

test("missing Street View coverage reports an error instead of success", () => {
  const frame = createFrame(false);
  assert.equal(frame.messages[0].type, "error");
  assert.match(frame.messages[0].message ?? "", /찾지 못했어요/);
  assert.deepEqual(frame.moved, []);
});
