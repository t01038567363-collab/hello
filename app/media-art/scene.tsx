"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { createRouteStrip, createWalkingRoute, sampleRoute } from "@/lib/walking-route";
import { createParkScenery } from "./park-scenery";
import { createThemedScenery } from "./themed-scenery";

export type Theme = "park" | "retro" | "cherry" | "sea";

const themes = {
  park: { sky: 0x9dcdec, road: 0xd8d1b8, edge: 0xbeb9a3, label: "초록 공원길" },
  retro: { sky: 0xc3d1c9, road: 0x8a8680, edge: 0xd8c9ae, label: "8090 추억길" },
  cherry: { sky: 0xb5d5e7, road: 0xc8b7a9, edge: 0xe7d2c8, label: "진해 벚꽃길" },
  sea: { sky: 0xadd7e8, road: 0xc5ac88, edge: 0xe8dbc4, label: "통영 바다길" },
};

export default function Scene({ theme, walking, direction, friendVisible }: {
  theme: Theme;
  walking: boolean;
  direction: number;
  friendVisible: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const controls = useRef({ walking, direction, friendVisible });
  const travel = useRef(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    controls.current = { walking, direction, friendVisible };
  }, [walking, direction, friendVisible]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "low-power" });
    } catch {
      setError("3D 화면을 표시할 수 없습니다. 다른 브라우저나 기기에서 다시 시도해 주세요.");
      return;
    }
    setError(null);
    const scene = new THREE.Scene();
    const palette = themes[theme];
    scene.background = new THREE.Color(palette.sky);
    scene.fog = new THREE.FogExp2(palette.sky, 0.009);
    const camera = new THREE.PerspectiveCamera(65, 1, 0.1, 200);
    camera.position.set(0, 2.2, 5);
    scene.add(camera);
    scene.add(new THREE.AmbientLight(0xffffff, 1.2));
    const light = new THREE.DirectionalLight(0xffeedd, 1.5);
    light.position.set(5, 15, 10);
    scene.add(light);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.setAttribute("role", "img");
    renderer.domElement.setAttribute("aria-label", `가상의 3D ${palette.label} 산책 풍경`);
    container.appendChild(renderer.domElement);

    const route = createWalkingRoute();
    try {
      scene.add(theme === "park" ? createParkScenery(route) : createThemedScenery(theme, route));
    } catch (cause) {
      console.error("산책 풍경을 만들 수 없습니다.", cause);
      setError("산책 풍경을 만들 수 없습니다. 다른 브라우저나 기기에서 다시 시도해 주세요.");
      renderer.dispose();
      renderer.domElement.remove();
      return;
    }
    scene.add(new THREE.Mesh(
      createRouteStrip(route, -3.75, 3.75),
      new THREE.MeshStandardMaterial({ color: palette.road, roughness: 0.8 }),
    ));
    const accent = new THREE.MeshBasicMaterial({ color: palette.edge });
    for (const offset of [-3.4, 3.4]) {
      const rail = new THREE.Mesh(createRouteStrip(route, offset - 0.07, offset + 0.07, 0.02), accent);
      scene.add(rail);
    }

    const friend = new THREE.Group();
    const skin = new THREE.MeshStandardMaterial({ color: 0xf3c8a9 });
    const clothes = new THREE.MeshStandardMaterial({ color: 0x6bb5c3 });
    const trousers = new THREE.MeshStandardMaterial({ color: 0x3f5069 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 12), skin);
    head.position.y = 1.65;
    friend.add(head);
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.33, 0.55, 4, 10), clothes);
    body.position.y = 0.95;
    friend.add(body);
    for (const x of [-0.2, 0.2]) {
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.5, 4, 8), trousers);
      leg.position.set(x, 0.37, 0);
      friend.add(leg);
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.5, 4, 8), clothes);
      arm.position.set(x * 2.2, 1.05, 0);
      friend.add(arm);
    }
    friend.visible = false;
    scene.add(friend);

    const resize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();
    let frame = 0;
    let previous = 0;
    let lateral = 0;
    let friendDistance = 18;
    const animate = (time: number) => {
      frame = requestAnimationFrame(animate);
      const delta = previous ? Math.min((time - previous) / 1000, 0.1) : 0;
      previous = time;
      const current = controls.current;
      if (current.walking) {
        travel.current += 2 * delta;
        if (current.friendVisible) friendDistance = Math.max(5, friendDistance - 8 * delta);
      }
      lateral += (current.direction * 1.1 - lateral) * Math.min(delta * 4, 1);
      const currentPoint = sampleRoute(route, travel.current);
      const ahead = sampleRoute(route, travel.current + 7);
      camera.position.copy(currentPoint.position).addScaledVector(currentPoint.right, lateral);
      camera.position.y = 2.2;
      const target = ahead.position.addScaledVector(ahead.right, lateral);
      target.y = 1.7;
      camera.lookAt(target);

      friend.visible = current.friendVisible;
      if (current.friendVisible) {
        const friendPoint = sampleRoute(route, travel.current + friendDistance);
        friend.position.copy(friendPoint.position).addScaledVector(friendPoint.right, 1.2);
        friend.rotation.y = Math.atan2(friendPoint.tangent.x, friendPoint.tangent.z);
      } else {
        friendDistance = 18;
      }
      renderer.render(scene, camera);
    };
    frame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => {
            if (material instanceof THREE.MeshBasicMaterial) material.map?.dispose();
            material.dispose();
          });
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [theme]);

  return (
    <div ref={containerRef} className="art-scene">
      {error && <p className="art-scene-error" role="alert">{error}</p>}
    </div>
  );
}
