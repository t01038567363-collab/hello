import * as THREE from "three";
import { createRouteStrip, sampleRoute } from "@/lib/walking-route";

type PhotoTheme = "retro" | "cherry" | "sea";

function ground(color: number) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(500, 500),
    new THREE.MeshStandardMaterial({ color, roughness: 1 }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -0.07;
  return mesh;
}

function makeSign(text: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("간판을 표시할 수 없습니다.");
  context.fillStyle = "#f4e3ba";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#513a2d";
  context.font = "bold 64px sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, 256, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createRetro(route: THREE.CatmullRomCurve3) {
  const group = new THREE.Group();
  group.add(ground(0xbbb19a));
  const length = route.getLength();
  const count = Math.ceil(length / 11);
  const roadPoints = Array.from({ length: 600 }, (_, i) => sampleRoute(route, i * length / 600).position);
  const walls = [0xd9c8a9, 0xc1bba8, 0xd7b5a0, 0xc5cdbd].map(
    (color) => new THREE.MeshStandardMaterial({ color, roughness: 1 }),
  );
  const roof = new THREE.MeshStandardMaterial({ color: 0x61524d, roughness: 1 });
  const window = new THREE.MeshStandardMaterial({ color: 0x425658, roughness: 0.6 });
  const awnings = [0xad5143, 0x507d73, 0x9c7945].map(
    (color) => new THREE.MeshStandardMaterial({ color, roughness: 1 }),
  );
  const buildingGeometry = new THREE.BoxGeometry(8, 5, 9.5);
  const roofGeometry = new THREE.BoxGeometry(8.3, 0.3, 9.8);
  const windowGeometry = new THREE.BoxGeometry(0.08, 2, 4.8);
  const awningGeometry = new THREE.BoxGeometry(1.2, 0.22, 6);
  const signGeometry = new THREE.PlaneGeometry(4.5, 1.1);
  const signs = ["전파사", "다방", "사진관", "구멍가게"].map(
    (text) => new THREE.MeshBasicMaterial({ map: makeSign(text), side: THREE.DoubleSide }),
  );

  for (let i = 0; i < count; i++) {
    const { position, tangent, right } = sampleRoute(route, i * length / count);
    for (const side of [-1, 1]) {
      const shop = new THREE.Group();
      shop.position.copy(position).addScaledVector(right, side * 9.5);
      if (roadPoints.some((point) => {
        const dx = point.x - shop.position.x;
        const dz = point.z - shop.position.z;
        return Math.abs(dx * right.x + dz * right.z) < 8.7
          && Math.abs(dx * tangent.x + dz * tangent.z) < 9.6;
      })) continue;
      shop.rotation.y = Math.atan2(-tangent.x, -tangent.z);
      const building = new THREE.Mesh(buildingGeometry, walls[(i + (side + 1) / 2) % walls.length]);
      building.position.y = 2.5;
      shop.add(building);
      const top = new THREE.Mesh(roofGeometry, roof);
      top.position.y = 5.1;
      shop.add(top);
      const front = new THREE.Mesh(windowGeometry, window);
      front.position.set(-side * 4.02, 1.8, 0);
      shop.add(front);
      const awning = new THREE.Mesh(awningGeometry, awnings[i % awnings.length]);
      awning.position.set(-side * 4.35, 3.1, 0);
      shop.add(awning);
      const sign = new THREE.Mesh(signGeometry, signs[(i + (side + 1) / 2) % signs.length]);
      sign.position.set(-side * 4.05, 4.1, 0);
      sign.rotation.y = -side * Math.PI / 2;
      shop.add(sign);
      group.add(shop);
    }
  }
  return group;
}

function createCherry(route: THREE.CatmullRomCurve3) {
  const group = new THREE.Group();
  group.add(ground(0x9eae77));
  const trunkGeometry = new THREE.CylinderGeometry(0.18, 0.34, 3.4, 8);
  const blossomGeometry = new THREE.IcosahedronGeometry(1, 1);
  const trunk = new THREE.MeshStandardMaterial({ color: 0x705349, roughness: 1 });
  const blossoms = [0xf8cada, 0xf3b5ce, 0xffe2e8, 0xe9a7c3].map(
    (color) => new THREE.MeshStandardMaterial({ color, roughness: 1 }),
  );
  const length = route.getLength();
  const count = Math.ceil(length / 8);
  for (let i = 0; i < count; i++) {
    const { position, right } = sampleRoute(route, i * length / count);
    for (const side of [-1, 1]) {
      const tree = new THREE.Group();
      tree.position.copy(position).addScaledVector(right, side * (5.5 + (i % 3) * 0.35));
      const stem = new THREE.Mesh(trunkGeometry, trunk);
      stem.position.y = 1.7;
      tree.add(stem);
      for (const [j, cluster] of [[0, 4.3, 0, 2.1], [-1, 4, 0.3, 1.5], [1, 4.2, -0.3, 1.6], [0.2, 5.3, 0, 1.5]].entries()) {
        const [x, y, z, size] = cluster;
        const bloom = new THREE.Mesh(blossomGeometry, blossoms[(i + j + (side + 1) / 2) % blossoms.length]);
        bloom.position.set(x, y, z);
        bloom.scale.set(size, size * 0.8, size);
        tree.add(bloom);
      }
      group.add(tree);
    }
  }
  return group;
}

function createSea(route: THREE.CatmullRomCurve3) {
  const group = new THREE.Group();
  group.add(ground(0x70b6c4));
  const shore = new THREE.Mesh(
    createRouteStrip(route, -7, 7, -0.03),
    new THREE.MeshStandardMaterial({ color: 0xd9c9a4, roughness: 1 }),
  );
  group.add(shore);
  const postGeometry = new THREE.BoxGeometry(0.18, 1.3, 0.18);
  const postMaterial = new THREE.MeshStandardMaterial({ color: 0xf2eee3, roughness: 0.8 });
  const railMaterial = new THREE.MeshStandardMaterial({ color: 0xf2eee3, roughness: 0.8 });
  for (const height of [0.6, 1.25]) {
    group.add(new THREE.Mesh(createRouteStrip(route, 4.85, 5.03, height), railMaterial));
  }
  const length = route.getLength();
  const count = Math.ceil(length / 3);
  for (let i = 0; i < count; i++) {
    const { position, right } = sampleRoute(route, i * length / count);
    const post = new THREE.Mesh(postGeometry, postMaterial);
    post.position.copy(position).addScaledVector(right, 4.94);
    post.position.y = 0.65;
    group.add(post);
  }
  const islandMaterial = new THREE.MeshStandardMaterial({ color: 0x83a59b, roughness: 1 });
  const islandGeometry = new THREE.SphereGeometry(1, 16, 8);
  for (const [x, z, size] of [[-120, -110, 30], [130, -95, 25], [-120, 110, 35], [130, 120, 28]]) {
    const island = new THREE.Mesh(islandGeometry, islandMaterial);
    island.position.set(x, -1, z);
    island.scale.set(size, size * 0.25, size * 0.65);
    group.add(island);
  }
  return group;
}

export function createThemedScenery(theme: PhotoTheme, route: THREE.CatmullRomCurve3) {
  if (theme === "retro") return createRetro(route);
  if (theme === "cherry") return createCherry(route);
  return createSea(route);
}
