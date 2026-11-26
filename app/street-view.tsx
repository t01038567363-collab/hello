"use client";

import { useEffect, useRef, useState } from "react";
import { STREET_VIEW_DOCUMENT } from "@/lib/street-view-document";

type Props = {
  location: { lat: number; lng: number };
  heading: number;
  successes: number;
  onVisibleChange: (visible: boolean) => void;
};

const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export function StreetView({ location, heading, successes, onVisibleChange }: Props) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const lastSuccesses = useRef(0);
  const [message, setMessage] = useState(
    apiKey
      ? "거리 사진을 불러오고 있어요."
      : "거리 사진이 아직 설정되지 않아 일러스트로 보여드려요.",
  );
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source !== frameRef.current?.contentWindow || event.data?.source !== "walk-street-view") return;
      if (event.data.type === "ready") {
        setVisible(true);
        onVisibleChange(true);
        setMessage("Google 거리 사진 · 미션 성공 시 한 걸음 이동해요.");
      } else if (event.data.type === "error") {
        setVisible(false);
        onVisibleChange(false);
        setMessage(`${event.data.message} 일러스트로 계속할 수 있어요.`);
      } else if (event.data.type === "notice") {
        setMessage(event.data.message);
      }
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [onVisibleChange]);

  useEffect(() => {
    if (!visible) return;
    while (lastSuccesses.current < successes) {
      frameRef.current?.contentWindow?.postMessage({ type: "advance" }, "*");
      lastSuccesses.current++;
    }
  }, [successes, visible]);

  return (
    <>
      {apiKey && (
        <iframe
          ref={frameRef}
          className={`street-view-frame ${visible ? "is-visible" : ""}`}
          title="실제 거리 사진"
          sandbox="allow-scripts"
          allow="camera 'none'; microphone 'none'; geolocation 'none'"
          srcDoc={STREET_VIEW_DOCUMENT}
          onLoad={() => frameRef.current?.contentWindow?.postMessage(
            { type: "initialize", key: apiKey, location, heading },
            "*",
          )}
        />
      )}
      <p className="street-view-status" role="status">{message}</p>
    </>
  );
}
