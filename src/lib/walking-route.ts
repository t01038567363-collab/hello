import * as THREE from "three";

export function createWalkingRoute() {
  const points = [
    [0, 0], [0, -34], [9, -49], [30, -52], [49, -42],
    [56, -22], [44, -8], [28, 1], [29, 22], [50, 37],
    [53, 56], [35, 67], [10, 59], [-9, 43], [-26, 34],
    [-39, 18], [-36, -4], [-20, -10],
  ].map(([x, z]) => new THREE.Vector3(x, 0, z));
  const route = new THREE.CatmullRomCurve3(points, true, "centripetal");
  route.arcLengthDivisions = 2000;
  return route;
}

export function sampleRoute(route: THREE.CatmullRomCurve3, distance: number) {
  const length = route.getLength();
  const progress = ((distance % length) + length) % length / length;
  const position = route.getPointAt(progress);
  const tangent = route.getTangentAt(progress).normalize();
  const right = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
  return { position, tangent, right };
}

export function createRouteStrip(
  route: THREE.CatmullRomCurve3,
  leftOffset: number,
  rightOffset: number,
  height = 0,
) {
  const segments = 600;
  const vertices: number[] = [];
  const indices: number[] = [];
  const length = route.getLength();
  for (let i = 0; i <= segments; i++) {
    const { position, right } = sampleRoute(route, (i / segments) * length);
    for (const offset of [leftOffset, rightOffset]) {
      vertices.push(position.x + right.x * offset, height, position.z + right.z * offset);
    }
    if (i < segments) {
      const start = i * 2;
      indices.push(start, start + 1, start + 2, start + 1, start + 3, start + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
