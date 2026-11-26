// buildTerrain — the Nusantara archipelago: dawn sea, volcanic islands,
// beaches, palm-dotted hills, runways and drifting clouds. The islands are
// low-poly heightfield discs, so the mesh and the ground-height query the
// physics uses are the same surface — a runway carves a flat shelf into
// the hillside instead of floating above it.
import { ISLANDS, RUNWAYS, WORLD } from './config.js';
import { makeRng, range } from './rng.js';

const SAND = 0xe8d29a;

// Runway strip the point lies on, or null. A runway's heading uses the same
// convention as the plane: forward = (sin h, cos h).
export function runwayAtPoint(x, z) {
  for (const rw of RUNWAYS) {
    const a = (rw.heading * Math.PI) / 180;
    const dx = x - rw.x, dz = z - rw.z;
    const along = dx * Math.sin(a) + dz * Math.cos(a);
    const across = dx * Math.cos(a) - dz * Math.sin(a);
    if (Math.abs(along) < rw.length / 2 && Math.abs(across) < rw.width / 2) return rw;
  }
  return null;
}

function islandProfile(x, z) {
  let h = 0;
  for (const isl of ISLANDS) {
    const d = Math.hypot(x - isl.x, z - isl.z);
    if (d < isl.r) {
      const t = 1 - d / isl.r;
      h = Math.max(h, isl.h * t * t * (0.75 + 0.25 * Math.sin(d * 0.05)));
    }
  }
  return h;
}

// Height of the ground at (x, z). Runways are flattened to their strip level.
export function groundHeightAt(x, z) {
  if (runwayAtPoint(x, z)) return 6;
  return islandProfile(x, z);
}

function heightColor(h) {
  if (h < 4) return [0.91, 0.82, 0.60];   // sand
  if (h < 55) return [0.24, 0.56, 0.35];  // jungle green
  if (h < 120) return [0.30, 0.48, 0.30]; // dark hills
  return [0.55, 0.50, 0.46];              // rock / ash
}

function makeIslandMesh(isl, rng) {
  const group = new THREE.Group();
  // Heightfield disc: rings from the centre out to the shore.
  const rings = 12, segments = 18;
  const positions = [];
  const colors = [];
  const indices = [];
  const R = isl.r * 1.05;
  for (let ri = 0; ri <= rings; ri += 1) {
    const r = (ri / rings) * R;
    for (let si = 0; si < segments; si += 1) {
      const a = (si / segments) * Math.PI * 2;
      const wx = isl.x + Math.cos(a) * r;
      const wz = isl.z + Math.sin(a) * r;
      const h = groundHeightAt(wx, wz);
      positions.push(wx - isl.x, h, wz - isl.z);
      const c = heightColor(h);
      // Slight per-vertex jitter so facets read as low-poly.
      const j = 0.92 + rng() * 0.16;
      colors.push(c[0] * j, c[1] * j, c[2] * j);
    }
  }
  for (let ri = 0; ri < rings; ri += 1) {
    for (let si = 0; si < segments; si += 1) {
      const a = ri * segments + si;
      const b = ri * segments + ((si + 1) % segments);
      const c = (ri + 1) * segments + si;
      const d = (ri + 1) * segments + ((si + 1) % segments);
      indices.push(a, c, b, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, flatShading: true }),
  );
  group.add(mesh);
  // Skirt down to the sea so the shore has no gap.
  const skirt = new THREE.Mesh(
    new THREE.CylinderGeometry(R, R * 1.06, 6, segments, 1, true),
    new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0, color: 0x8a6f4d }),
  );
  skirt.position.y = -2;
  group.add(skirt);
  if (isl.volcano) {
    const smoke = new THREE.Mesh(
      new THREE.SphereGeometry(26, 8, 6),
      new THREE.MeshStandardMaterial({ roughness: 1, color: 0xcfc8c0, transparent: true, opacity: 0.75 }),
    );
    smoke.position.y = isl.h + 26;
    smoke.name = 'volcanoSmoke';
    group.add(smoke);
  }
  // Palm trees on the lower slopes.
  for (let i = 0; i < 14; i += 1) {
    const ang = rng() * Math.PI * 2;
    const dist = isl.r * (0.35 + rng() * 0.55);
    const px = Math.cos(ang) * dist;
    const pz = Math.sin(ang) * dist;
    const py = groundHeightAt(isl.x + px, isl.z + pz);
    if (py < 4 || py > 60) continue;
    const palm = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 2, 14, 5),
      new THREE.MeshStandardMaterial({ roughness: 1, color: 0x7a5230 }),
    );
    trunk.position.y = 7;
    trunk.rotation.z = 0.15;
    palm.add(trunk);
    for (let f = 0; f < 5; f += 1) {
      const frond = new THREE.Mesh(
        new THREE.ConeGeometry(2.2, 12, 4),
        new THREE.MeshStandardMaterial({ roughness: 1, color: 0x2f7d4f, flatShading: true }),
      );
      frond.position.y = 15;
      frond.rotation.z = 1.1;
      frond.rotation.y = (f / 5) * Math.PI * 2;
      frond.translateX(4);
      palm.add(frond);
    }
    palm.position.set(px, py, pz);
    group.add(palm);
  }
  group.position.set(isl.x, 0, isl.z);
  return group;
}

function makeRunwayMesh(rw) {
  const group = new THREE.Group();
  const strip = new THREE.Mesh(
    new THREE.BoxGeometry(rw.length, 1.5, rw.width),
    new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0, color: 0x3a3f46 }),
  );
  strip.position.y = 5.5;
  group.add(strip);
  const dashMat = new THREE.MeshStandardMaterial({ roughness: 0.8, color: 0xf5f0dc });
  for (let d = -rw.length / 2 + 24; d < rw.length / 2 - 10; d += 32) {
    const dash = new THREE.Mesh(new THREE.BoxGeometry(16, 0.4, 2), dashMat);
    dash.position.set(d, 6.5, 0);
    group.add(dash);
  }
  for (const end of [-1, 1]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(10, 0.4, rw.width - 4), dashMat);
    bar.position.set(end * (rw.length / 2 - 12), 6.5, 0);
    group.add(bar);
  }
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 0.6, 14, 6),
    new THREE.MeshStandardMaterial({ roughness: 0.8, color: 0xd8d8d8 }),
  );
  pole.position.set(-rw.length / 2 - 12, 12, rw.width / 2 + 8);
  group.add(pole);
  const sock = new THREE.Mesh(
    new THREE.ConeGeometry(2.4, 9, 6),
    new THREE.MeshStandardMaterial({ roughness: 0.8, color: 0xff7a1a }),
  );
  sock.rotation.z = Math.PI / 2;
  sock.position.set(-rw.length / 2 - 6, 18, rw.width / 2 + 8);
  group.add(sock);
  group.position.set(rw.x, 0, rw.z);
  group.rotation.y = -(rw.heading * Math.PI) / 180;
  return group;
}

export function buildTerrain(scene) {
  const rng = makeRng(20261126);
  scene.background = new THREE.Color(0x9fc8e8);
  scene.fog = new THREE.Fog(0xa8c6e0, 900, 3800);
  const sun = new THREE.DirectionalLight(0xffe0b3, 1.15);
  sun.position.set(-900, 700, -600);
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0xbfd9ee, 0.75));
  scene.add(new THREE.HemisphereLight(0xcfe8ff, 0x3a6b4f, 0.5));

  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.size * 2.4, WORLD.size * 2.4),
    new THREE.MeshLambertMaterial({ color: 0x1e6f8e }),
  );
  sea.rotation.x = -Math.PI / 2;
  scene.add(sea);

  const islands = new THREE.Group();
  for (const isl of ISLANDS) islands.add(makeIslandMesh(isl, rng));
  scene.add(islands);

  const runways = new THREE.Group();
  for (const rw of RUNWAYS) runways.add(makeRunwayMesh(rw));
  scene.add(runways);

  const clouds = new THREE.Group();
  const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.88 });
  for (let i = 0; i < 26; i += 1) {
    const puff = new THREE.Group();
    const n = 3 + Math.floor(rng() * 3);
    for (let j = 0; j < n; j += 1) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(range(rng, 22, 46), 7, 6), cloudMat);
      s.position.set(range(rng, -50, 50), range(rng, -6, 8), range(rng, -22, 22));
      s.scale.y = 0.45;
      puff.add(s);
    }
    puff.position.set(range(rng, -1900, 1900), range(rng, 260, 520), range(rng, -1900, 1900));
    puff.userData.drift = range(rng, 1.5, 4);
    clouds.add(puff);
  }
  scene.add(clouds);
  return { clouds, groundHeightAt };
}
