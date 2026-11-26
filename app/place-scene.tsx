"use client";

import { useEffect, useRef } from "react";
import type { Place } from "./places";

export function PlaceScene({ theme, label }: { theme: Place["theme"]; label: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const pixelRatio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth * pixelRatio;
    const height = canvas.clientHeight * pixelRatio;
    canvas.width = width;
    canvas.height = height;
    context.scale(pixelRatio, pixelRatio);

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
