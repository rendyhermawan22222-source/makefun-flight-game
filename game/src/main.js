// Nusantara Skies — main loop: scene, cameras, mission flow, storm weather,
// landings and crashes. The game opens on the home runway at dawn; pick a
// mission with 1–4, throttle up with W, fly with the arrow keys or mouse.
import { buildTerrain } from './terrain.js';
import { buildAircraft, animateAircraft } from './aircraft.js';
import { freshFlight, stepFlight, runwayAt, nearRunway } from './physics.js';
import { buildMissions, ringScore, landingScore, medalFor } from './missions.js';
import { updateHud, showMessage, drawInstruments } from './hud.js';
import { makeFlightAudio } from './audio.js';
import { makeFlightInput } from './input.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') || 1);

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.5, 8000);

const { clouds } = buildTerrain(scene);
const plane = buildAircraft();
scene.add(plane);

const missions = buildMissions();
let flight = freshFlight();
let mission = null;
let state = 'title'; // title | flying | complete | crashed
let cameraMode = 'chase';
let muted = false;
let paused = false;
let stormOn = false;
let rain = null;
const audio = makeFlightAudio();
const controls = makeFlightInput();

// Ring and gate meshes: gold torus for rings, grey-green for storm gates.
// Each ring faces along the course (its plane is perpendicular to the
// tangent of the circle it sits on), so you fly through it, not past it.
const ringMeshes = new Map();
function ringMeshFor(list, color, center) {
  for (const target of list) {
    const mesh = new THREE.Mesh(
      new THREE.TorusGeometry(target.r, 2.2, 10, 40),
      new THREE.MeshBasicMaterial({ color }),
    );
    mesh.position.set(target.x, target.y, target.z);
    const r = Math.hypot(target.x - center.x, target.z - center.z) || 1;
    mesh.rotation.y = Math.atan2(-(target.z - center.z) / r, (target.x - center.x) / r);
    scene.add(mesh);
    ringMeshes.set(target, mesh);
  }
}
ringMeshFor(missions.rings.rings, 0xffb300, { x: 0, z: 0 });
ringMeshFor(missions.storm.gates, 0x7fb069, { x: -400, z: 300 });

// Storm rain: a sheet of falling streaks around the plane.
function buildRain() {
  const count = 900;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = (Math.random() - 0.5) * 300;
    positions[i * 3 + 1] = Math.random() * 120;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 300;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({ color: 0xbfd4e6, size: 3.2, transparent: true, opacity: 0.9 });
  const points = new THREE.Points(geo, mat);
  points.visible = false;
  scene.add(points);
  return points;
}
rain = buildRain();

function setStorm(on) {
  stormOn = on;
  rain.visible = on;
  scene.fog = new THREE.Fog(on ? 0x5a6b7a : 0xa8c6e0, on ? 300 : 900, on ? 1800 : 3800);
  scene.background = new THREE.Color(on ? 0x5a6b7a : 0x9fc8e8);
}

const weather = {
  gust(t) {
    if (!stormOn) return 0;
    return Math.sin(t * 1.7) * 0.9 + Math.sin(t * 3.1) * 0.4;
  },
};

function pickMission(id) {
  mission = missions[id];
  flight = freshFlight();
  state = 'flying';
  setStorm(id === 'storm');
  showMessage(`${mission.name} — ${mission.goal}`, true);
  document.getElementById('title-card').style.display = 'none';
}

function missionComplete(resultText) {
  state = 'complete';
  const medal = mission ? medalFor(mission, { time: flight.time, score: flight.score }) : 'BRONZE';
  const best = mission && mission.best;
  if (mission && (!best || flight.score > (best.score || 0) || (mission.id !== 'landing' && mission.id !== 'hop' && flight.time < (best.time || 1e9)))) {
    mission.best = { time: flight.time, score: flight.score, medal };
  }
  showMessage(`MISSION COMPLETE — ${medal} — ${resultText}`, true);
  audio.complete();
}

function checkTargets() {
  if (!mission || state !== 'flying') return;
  const list = mission.rings.length ? mission.rings : mission.gates;
  for (const target of list) {
    if (target.passed) continue;
    const d = Math.hypot(target.x - flight.x, target.y - flight.y, target.z - flight.z);
    if (d < target.r + 6) {
      target.passed = true;
      const pts = ringScore(flight);
      flight.score += pts;
      ringMeshes.get(target).material.color.set(0x2fbf71);
      audio.ring();
      const done = list.filter((t) => t.passed).length;
      if (done >= list.length) {
        missionComplete(`all ${list.length} targets in ${flight.time.toFixed(1)}s — score ${flight.score}`);
      } else {
        showMessage(`Target ${done}/${list.length} — +${pts} points`);
      }
    }
  }
  if (mission.targets.length && flight.landed && !flight.crashed) {
    const rw = nearRunway(flight.x, flight.z);
    const next = mission.targets.find((t) => !t.done);
    if (rw && next && rw.island === next.runway.island) {
      next.done = true;
      const pts = landingScore(flight, rw);
      flight.score += pts;
      audio.land();
      if (mission.targets.every((t) => t.done)) {
        missionComplete(`score ${flight.score} — soft landings all round`);
      } else {
        showMessage(`Delivered at ${next.name} — +${pts} points. Next: ${mission.targets.find((t) => !t.done).name}`);
        flight.landed = false;
        flight.airborne = false;
      }
    }
  }
}

function updateCamera(dt) {
  const f = flight;
  const forward = new THREE.Vector3(Math.sin(f.heading), 0, Math.cos(f.heading));
  if (cameraMode === 'cockpit') {
    plane.visible = false;
    document.getElementById('instruments').style.display = 'block';
    const pos = new THREE.Vector3(f.x, f.y + 1.6, f.z);
    camera.position.copy(pos);
    const look = new THREE.Vector3(
      f.x + Math.sin(f.heading) * Math.cos(f.pitch) * 60,
      f.y + Math.sin(f.pitch) * 60 + 1.6,
      f.z + Math.cos(f.heading) * Math.cos(f.pitch) * 60,
    );
    camera.up.set(Math.sin(f.roll) * -1, Math.cos(f.roll), 0);
    camera.lookAt(look);
  } else {
    plane.visible = true;
    document.getElementById('instruments').style.display = 'none';
    const back = forward.clone().multiplyScalar(-26 - f.speed * 0.12);
    const desired = new THREE.Vector3(f.x + back.x, f.y + 9 + f.speed * 0.03, f.z + back.z);
    camera.position.lerp(desired, Math.min(1, dt * 5));
    camera.up.set(0, 1, 0);
    camera.lookAt(f.x + forward.x * 40, f.y + 1, f.z + forward.z * 40);
  }
}

function updatePlaneMesh() {
  plane.position.set(flight.x, flight.y, flight.z);
  plane.rotation.order = 'YXZ';
  plane.rotation.y = flight.heading + Math.PI;
  plane.rotation.x = flight.pitch;
  plane.rotation.z = flight.roll;
  animateAircraft(plane, flight.throttle, flight.time);
}

// Screenshot staging: fly the real sim, then hold the frame still.
if (shotName) {
  const staged = stageShot(shotName, missions);
  flight = staged.flight;
  mission = staged.mission;
  cameraMode = staged.camera;
  if (shotName === 'chase') {
    // The staged flight flew through the first ring: mark it passed so
    // the HUD points at the next one, and tint its mesh green.
    const first = missions.rings.rings[0];
    const d = Math.hypot(first.x - flight.x, first.y - flight.y, first.z - flight.z);
    if (d < first.r + 6 || flight.time > 7.5) {
      first.passed = true;
      ringMeshes.get(first).material.color.set(0x2fbf71);
    }
  }
  if (staged.storm) setStorm(true);
  state = 'flying';
  document.getElementById('title-card').style.display = 'none';
  updatePlaneMesh();
  updateCamera(1);
  updateHud(flight, mission, state);
  drawInstruments(flight, cameraMode);
  renderer.render(scene, camera);
  window.__game = { flight, mission, state, ready: true };
} else {
  window.__game = { flight, mission, state, ready: true };
}

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (paused) { renderer.render(scene, camera); return; }

  // One-shot keys.
  if (controls.consume('Digit1')) pickMission('rings');
  if (controls.consume('Digit2')) pickMission('hop');
  if (controls.consume('Digit3')) pickMission('landing');
  if (controls.consume('Digit4')) pickMission('storm');
  if (controls.consume('KeyC')) {
    cameraMode = cameraMode === 'chase' ? 'cockpit' : 'chase';
    showMessage(cameraMode === 'cockpit' ? 'Cockpit view' : 'Chase view');
  }
  if (controls.consume('KeyM')) { muted = !muted; showMessage(muted ? 'Sound off' : 'Sound on'); }
  if (controls.consume('KeyP')) { paused = !paused; showMessage(paused ? 'Paused' : 'Resumed'); }
  if (controls.consume('KeyR')) {
    flight = freshFlight();
    if (mission) { mission.rings.forEach((r) => { r.passed = false; ringMeshes.get(r).material.color.set(0xffb300); }); mission.gates.forEach((g) => { g.passed = false; ringMeshes.get(g).material.color.set(0x7fb069); }); mission.targets.forEach((t) => { t.done = false; }); }
    state = mission ? 'flying' : 'title';
    document.getElementById('title-card').style.display = mission ? 'none' : 'block';
    showMessage('Back on the runway — throttle up with W');
  }

  if (!shotName) {
    if (state === 'title' && flight.throttle > 0.05) state = 'flying';
    if (state === 'flying' || state === 'title') {
      const input = { ...controls.input };
      if (input.mouseSteer) input.bankRight = input.mouseSteer > 0.15, input.bankLeft = input.mouseSteer < -0.15;
      if (input.mousePitch) input.pitchUp = input.mousePitch > 0.15, input.pitchDown = input.mousePitch < -0.15;
      const wasAirborne = flight.airborne;
      stepFlight(flight, input, dt, weather);
      if (!wasAirborne && flight.airborne) showMessage('Airborne! Mind your speed — stall below 50 kt.');
      if (flight.crashed && state !== 'crashed') {
        state = 'crashed';
        audio.crash();
        showMessage(`CRASHED — ${flight.crashReason} Press R to try again.`, true);
      }
      if (flight.landed && !flight.crashed) checkTargets();
      else checkTargets();
    }
    if (flight.fuel <= 0 && state === 'flying') showMessage('Fuel empty — gliding. Find a runway!');
    audio.start();
    if (!muted) audio.update(flight);
  }

  // Clouds drift; volcano smoke puffs.
  for (const cloud of clouds.children) {
    cloud.position.x += cloud.userData.drift * dt;
    if (cloud.position.x > 2100) cloud.position.x = -2100;
  }
  if (rain.visible) {
    rain.position.set(flight.x, flight.y - 40, flight.z);
    const pos = rain.geometry.attributes.position;
    for (let i = 0; i < pos.count; i += 1) {
      let y = pos.getY(i) - 90 * dt;
      if (y < 0) y = 120;
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
  }

  updatePlaneMesh();
  updateCamera(dt);
  updateHud(flight, mission, state);
  drawInstruments(flight, cameraMode);
  renderer.render(scene, camera);
  window.__game = { flight, mission, state, ready: true };
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

if (!shotName) requestAnimationFrame(frame);
