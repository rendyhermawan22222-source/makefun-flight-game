// stageShot — deterministic screenshot scenes. Each one flies the real
// simulation forward from a fresh flight with a simple autopilot (full
// throttle, steer toward the next target, flare before the runway), so the
// frame is what a short game really looks like. Same seed, same frame.
import { freshFlight, stepFlight } from './physics.js';

const STEP = 1 / 60;

function autopilotInput(flight, target, cap) {
  const input = {
    throttleUp: flight.throttle < (cap ?? 0.85), throttleDown: false,
    pitchUp: false, pitchDown: false, bankLeft: false, bankRight: false, brake: false,
  };
  if (!target) return input;
  const dx = target.x - flight.x;
  const dz = target.z - flight.z;
  const wantHeading = Math.atan2(dx, dz);
  let diff = wantHeading - flight.heading;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  // Proportional banking: aim the roll at the heading error so the turn
  // settles instead of oscillating from one full bank to the other.
  const desiredRoll = Math.max(-0.6, Math.min(0.6, diff * 1.4));
  if (flight.roll < desiredRoll - 0.05) input.bankRight = true;
  else if (flight.roll > desiredRoll + 0.05) input.bankLeft = true;
  const wantAlt = target.y || 60;
  const dist = Math.hypot(target.x - flight.x, target.z - flight.z);
  // Far out, hold a shallow glide altitude instead of diving at the strip.
  const glideAlt = dist > 250 ? Math.max(wantAlt, 30) : wantAlt;
  if (flight.y < glideAlt - 25 && flight.speed > 34) input.pitchUp = true;
  if (flight.y > glideAlt + 25) input.pitchDown = true;
  return input;
}

function flyForward(flight, seconds, targetFn, weather, cap) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    const target = targetFn ? targetFn(flight) : null;
    stepFlight(flight, autopilotInput(flight, target, cap), STEP, weather);
    if (flight.crashed) break;
  }
  return flight;
}

export function stageShot(shot, missions) {
  const flight = freshFlight();
  const calm = { gust: () => 0 };
  if (shot === 'chase') {
    // Take off, climb, and close on the first ring — chase view, rings ahead.
    flight.throttle = 1;
    flyForward(flight, 7, () => missions.rings.rings[0], calm);
    // Just through the ring's gate, level, the next ring ahead.
    flyForward(flight, 1, () => ({ x: 1536, z: 650, y: 138 }), calm);
    return { flight, mission: missions.rings, camera: 'chase' };
  }
  if (shot === 'cockpit') {
    // Low over the home runway on final approach from the sea, heading
    // west — cockpit view, strip ahead, instruments lit.
    flight.x = 900; flight.z = 100; flight.y = 60; flight.heading = (3 * Math.PI) / 2;
    flight.speed = 55; flight.throttle = 0.45; flight.airborne = true; flight.pitch = -0.06;
    flyForward(flight, 3, () => ({ x: 420, z: 100, y: 12 }), calm);
    return { flight, mission: missions.landing, camera: 'cockpit' };
  }
  if (shot === 'landing') {
    // Touchdown moment on the short Kabut strip: on final from the sea,
    // over the beach and onto the 210 m strip.
    flight.x = -1248; flight.z = 1697; flight.y = 55; flight.heading = (160 * Math.PI) / 180;
    flight.speed = 46; flight.throttle = 0.32; flight.airborne = true; flight.pitch = -0.08;
    flyForward(flight, 8, () => ({ x: -1060, z: 1180, y: 8 }), calm, 0.45);
    return { flight, mission: missions.landing, camera: 'chase' };
  }
  // storm: inside the front, a gate looming ahead through the rain.
  flight.x = -1020; flight.z = 800; flight.y = 160; flight.heading = -0.2;
  flight.speed = 62; flight.throttle = 0.8; flight.airborne = true;
  flyForward(flight, 3, () => missions.storm.gates[0], { gust: (t) => Math.sin(t * 2) * 0.5 });
  return { flight, mission: missions.storm, camera: 'chase', storm: true };
}
