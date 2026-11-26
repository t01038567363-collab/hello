import * as THREE from "three";
import { sampleRoute } from "@/lib/walking-route";

export function createParkScenery(route: THREE.CatmullRomCurve3) {
  const park = new THREE.Group();
  const grass = new THREE.Mesh(
    new THREE.PlaneGeometry(500, 500),
    new THREE.MeshStandardMaterial({ color: 0x8eaa64, roughness: 1 }),
  );
  grass.rotation.x = -Math.PI / 2;
  grass.position.y = -0.07;
  park.add(grass);

  const trunkGeometry = new THREE.CylinderGeometry(0.16, 0.3, 3.3, 8);
  const foliageGeometry = new THREE.IcosahedronGeometry(1, 1);
  const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x675341, roughness: 1 });
  const foliageMaterials = [0x568b3c, 0x6da34b, 0x86b45c, 0x719b43].map(
    (color) => new THREE.MeshStandardMaterial({ color, roughness: 1 }),
  );
  const benchWood = new THREE.MeshStandardMaterial({ color: 0x845d39, roughness: 1 });
  const benchMetal = new THREE.MeshStandardMaterial({ color: 0x4a514c, roughness: 1 });
  const benchSeat = new THREE.BoxGeometry(1.7, 0.12, 0.55);
  const benchBack = new THREE.BoxGeometry(1.7, 0.55, 0.1);
  const benchLeg = new THREE.BoxGeometry(0.1, 0.55, 0.45);
  const routeLength = route.getLength();
  const count = Math.ceil(routeLength / 8);

  for (let i = 0; i < count; i++) {
    const { position, tangent, right } = sampleRoute(route, i * routeLength / count);
    for (const side of [-1, 1]) {
      const tree = new THREE.Group();
      const offset = side * (5.4 + (i % 3) * 0.5);
      tree.position.copy(position).addScaledVector(right, offset);
      const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
      trunk.position.y = 1.65;
      tree.add(trunk);
      const clusters = [
        [0, 3.9, 0, 2.0], [-1, 3.7, 0.4, 1.45],
        [1.0, 4.0, -0.3, 1.5], [0.2, 5.0, 0, 1.55],
      ];
      for (let j = 0; j < clusters.length; j++) {
        const [x, y, z, size] = clusters[j];
        const foliage = new THREE.Mesh(foliageGeometry, foliageMaterials[(i + j + (side + 1) / 2) % foliageMaterials.length]);
        foliage.position.set(x, y, z);
        foliage.scale.set(size, size * 0.85, size);
        tree.add(foliage);
      }
      park.add(tree);
    }
    if (i % 4 === 2) {
      const bench = new THREE.Group();
      bench.position.copy(position).addScaledVector(right, 4.5);
      bench.rotation.y = Math.atan2(-tangent.x, -tangent.z);
      const seat = new THREE.Mesh(benchSeat, benchWood);
      seat.position.y = 0.56;
      bench.add(seat);
      const back = new THREE.Mesh(benchBack, benchWood);
      back.position.set(0, 0.9, -0.25);
      bench.add(back);
      for (const x of [-0.65, 0.65]) {
        const leg = new THREE.Mesh(benchLeg, benchMetal);
        leg.position.set(x, 0.28, 0);
        bench.add(leg);
      }
      park.add(bench);
    }
  }

  const buildings = [
    { x: 70, z: -85, width: 14, height: 39, color: 0x9dbdc3 },
    { x: -72, z: -45, width: 11, height: 29, color: 0xc3d1c9 },
    { x: 88, z: 50, width: 12, height: 32, color: 0xa2bec2 },
  ];
  for (const building of buildings) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(building.width, building.height, 10),
      new THREE.MeshStandardMaterial({ color: building.color, roughness: 0.75 }),
    );
    mesh.position.set(building.x, building.height / 2, building.z);
    park.add(mesh);
  }

  return park;
}
