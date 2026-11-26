"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

export type Theme = "retro" | "cherry" | "sea";

const colors = {
  retro: { background: 0x160d18, road: 0x241e26, accent: 0xf59e0b, particles: 0xffb703 },
  cherry: { background: 0x190b18, road: 0x2b1929, accent: 0xf472b6, particles: 0xfbcfe8 },
  sea: { background: 0x051324, road: 0x0a2540, accent: 0x38bdf8, particles: 0x7dd3fc },
};

export default function Scene({ theme, walking, speed, direction }: {
  theme: Theme;
  walking: boolean;
  speed: number;
  direction: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const controls = useRef({ walking, speed, direction });
  const [error, setError] = useState(false);

  useEffect(() => {
    controls.current = { walking, speed, direction };
  }, [walking, speed, direction]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "low-power" });
    } catch {
      setError(true);
      return;
    }
    setError(false);
    const palette = colors[theme];
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(palette.background);
    scene.fog = new THREE.FogExp2(palette.background, 0.023);
    const camera = new THREE.PerspectiveCamera(65, 1, 0.1, 200);
    camera.position.set(0, 2.2, 5);
    scene.add(new THREE.AmbientLight(0xffffff, 1.2));
    const light = new THREE.DirectionalLight(0xffeedd, 1.5);
    light.position.set(5, 15, 10);
    scene.add(light);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(7.5, 160),
      new THREE.MeshStandardMaterial({ color: palette.road, roughness: 0.5 }),
    );
    road.rotation.x = -Math.PI / 2;
    road.position.z = -70;
    scene.add(road);
    const railGeometry = new THREE.BoxGeometry(0.13, 0.13, 160);
    const accent = new THREE.MeshBasicMaterial({ color: palette.accent });
    for (const x of [-3.4, 3.4]) {
      const rail = new THREE.Mesh(railGeometry, accent);
      rail.position.set(x, 0.1, -70);
      scene.add(rail);
    }

    const objects = new THREE.Group();
    scene.add(objects);
    for (let i = 0; i < 24; i++) {
      const group = new THREE.Group();
      group.position.z = -i * 6.5;
      if (theme === "cherry") {
        const arch = new THREE.Mesh(new THREE.TorusGeometry(4.2, 0.15, 8, 28, Math.PI), accent);
        arch.position.y = 0.5;
        group.add(arch);
      } else {
        const geometry = theme === "retro"
          ? new THREE.BoxGeometry(0.23, 5, 0.23)
          : new THREE.CylinderGeometry(0.2, 0.3, 5, 12);
        for (const x of [-3.8, 3.8]) {
          const pillar = new THREE.Mesh(geometry, accent);
          pillar.position.set(x, 2.5, 0);
          group.add(pillar);
        }
        if (theme === "retro") {
          const sign = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.7, 0.25), accent);
          sign.position.set(i % 2 ? 3.1 : -3.1, 3.2, 0);
          group.add(sign);
        }
      }
      objects.add(group);
    }
    const positions = new Float32Array(400 * 3);
    for (let i = 0; i < positions.length; i += 3) {
      positions[i] = (Math.random() - 0.5) * 18;
      positions[i + 1] = Math.random() * 8 + 0.3;
      positions[i + 2] = -Math.random() * 130 + 8;
    }
    const particlesGeometry = new THREE.BufferGeometry();
    particlesGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const particles = new THREE.Points(
      particlesGeometry,
      new THREE.PointsMaterial({ color: palette.particles, size: 0.2, transparent: true, opacity: 0.8 }),
    );
    scene.add(particles);

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
    const animate = (time: number) => {
      frame = requestAnimationFrame(animate);
      const delta = previous ? Math.min((time - previous) / 1000, 0.1) : 0;
      previous = time;
      const current = controls.current;
      if (current.walking) {
        const movement = current.speed * delta;
        objects.children.forEach((item) => {
          item.position.z += movement;
          if (item.position.z > 8) item.position.z -= 24 * 6.5;
        });
        for (let i = 2; i < positions.length; i += 3) {
          positions[i] += movement * 0.8;
          if (positions[i] > 8) positions[i] = -120;
        }
        particlesGeometry.attributes.position.needsUpdate = true;
      }
      camera.position.x += (current.direction * 1.1 - camera.position.x) * Math.min(delta * 4, 1);
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
          materials.forEach((material) => material.dispose());
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [theme]);

  return (
    <div ref={containerRef} className="art-scene" role="img" aria-label="가상 미디어아트 산책 풍경">
      {error && <p className="art-scene-error" role="alert">3D 화면을 표시할 수 없습니다. 다른 브라우저나 기기에서 다시 시도해 주세요.</p>}
    </div>
  );
}
