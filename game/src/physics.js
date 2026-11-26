// stepFlight — the flight model: throttle sets target speed, pitch trades
// speed for altitude, bank turns the nose, and the wing only flies above
// stall speed. Fuel, damage, terrain strikes and landings all live here.
import { WORLD, RUNWAYS } from './config.js';
import { groundHeightAt, runwayAtPoint } from './terrain.js';

export function freshFlight() {
  return {
    x: 240, y: 8.4, z: 100,    // parked on the home runway, ready to roll east
    heading: Math.PI / 2,      // runway heading: east
    pitch: 0, roll: 0,
    speed: 0, throttle: 0,
    verticalSpeed: 0,
    fuel: 100, damage: 0,
    airborne: false, crashed: false, landed: false,
    crashReason: '', touchdownRate: 0,
    score: 0, ringsPassed: 0,
    time: 0, distance: 0,
  };
}

// input: { throttleUp, throttleDown, pitchUp, pitchDown, bankLeft, bankRight, brake }
export function stepFlight(f, input, dt, weather) {
  if (f.crashed) return f;
  f.time += dt;
  const gust = weather ? weather.gust(f.time) : 0;

  // Throttle.
  if (input.throttleUp) f.throttle = Math.min(1, f.throttle + dt * 0.55);
  if (input.throttleDown) f.throttle = Math.max(0, f.throttle - dt * 0.7);
  if (f.fuel <= 0) f.throttle = 0;

  // Speed chases the throttle target; drag grows with speed squared.
  const target = f.throttle * WORLD.maxSpeed;
  const drag = 0.25 + 0.00012 * f.speed * f.speed;
  f.speed += (target - f.speed) * Math.min(1, drag * dt * 3);
  if (input.brake && !f.airborne) f.speed = Math.max(0, f.speed - 26 * dt);

  // Pitch: only bites when the wing is flying; on the ground it just waits.
  // (A fast takeoff roll rotates gently on its own unless the pilot holds
  // the nose down, so holding W alone still gets you airborne.)
  const pitchAuthority = f.airborne ? 1 : (f.speed > WORLD.takeoffSpeed ? 0.6 : 0);
  if (input.pitchUp) f.pitch = Math.min(0.45, f.pitch + 0.5 * pitchAuthority * dt);
  if (input.pitchDown) f.pitch = Math.max(-0.4, f.pitch - 0.5 * pitchAuthority * dt);
  if (!input.pitchUp && !input.pitchDown) f.pitch *= Math.max(0, 1 - dt * 1.2);
  if (!f.airborne && f.speed > WORLD.takeoffSpeed && f.throttle > 0.5 && !input.pitchDown) {
    f.pitch = Math.min(0.15, f.pitch + 0.3 * dt);
  }

  // Bank and turn: heading rate grows with bank and speed — but only in
  // the air; on the ground the plane rolls straight down the strip.
  if (input.bankLeft) f.roll = Math.max(-0.9, f.roll - 1.6 * dt);
  if (input.bankRight) f.roll = Math.min(0.9, f.roll + 1.6 * dt);
  if (!input.bankLeft && !input.bankRight) f.roll *= Math.max(0, 1 - dt * 1.8);
  const turnRate = f.airborne ? f.roll * 0.55 * Math.min(1, f.speed / 45) : 0;
  f.heading += turnRate * dt + gust * dt * 0.12;

  // Vertical motion: climb from pitch while flying, sink when slow. The
  // plane is only "airborne" once it has actually left the ground, so a
  // fast takeoff roll never steers or crashes like a flying plane.
  const groundNow = groundHeightAt(f.x, f.z);
  const offGround = f.y > groundNow + 3;
  const lifting = f.speed > WORLD.takeoffSpeed && f.pitch > 0.05;
  const flying = f.airborne || lifting || (offGround && f.speed > WORLD.stallSpeed);
  if (flying) {
    f.verticalSpeed = Math.sin(f.pitch) * f.speed;
    if (f.speed < WORLD.stallSpeed) f.verticalSpeed -= (WORLD.stallSpeed - f.speed) * 0.35;
    if (offGround) { f.airborne = true; f.landed = false; }
  } else {
    f.verticalSpeed = 0;
  }
  f.x += Math.sin(f.heading) * Math.cos(f.pitch) * f.speed * dt;
  f.z += Math.cos(f.heading) * Math.cos(f.pitch) * f.speed * dt;
  f.y += f.verticalSpeed * dt;
  f.distance += f.speed * dt;

  // Fuel: thirsty at full throttle, sips at cruise.
  f.fuel = Math.max(0, f.fuel - (0.12 + f.throttle * WORLD.fuelBurn) * dt);

  // Ground contact. A touchdown only counts when the plane was actually
  // flying and descending onto the ground; rolling along the strip after
  // landing (or before takeoff) is not a new touchdown every step.
  const ground = groundHeightAt(f.x, f.z);
  if (f.y <= ground + 2.4) {
    f.y = ground + 2.4;
    const sink = -f.verticalSpeed;
    if (f.airborne && sink > 0.5) {
      f.touchdownRate = sink;
      const onRunway = isOnRunway(f.x, f.z);
      if (sink > 7 || f.speed > 62) {
        f.damage += WORLD.damageHardLanding;
        f.crashReason = sink > 7 ? 'Hard landing — the gear gave way.' : 'Too fast on touchdown.';
        if (f.damage >= 100) { f.crashed = true; return f; }
      } else if (!onRunway && f.speed > 30) {
        // Rough-field touchdown: survivable but it hurts.
        f.damage += 18;
        f.crashReason = 'Rough-field landing — the airframe is bent.';
        if (f.damage >= 100) { f.crashed = true; return f; }
      }
      f.landed = true;
      f.airborne = false;
      f.verticalSpeed = 0;
      f.pitch = 0;
    } else if (f.airborne) {
      // Level flight into the ground: a gentle kiss on a runway is a
      // landing, anywhere else at speed is a terrain strike.
      if (isOnRunway(f.x, f.z)) {
        f.landed = true;
        f.touchdownRate = Math.max(0, sink);
        f.airborne = false;
      } else if (f.speed > 30) {
        f.damage = 100;
        f.crashed = true;
        f.crashReason = 'Terrain strike — flew into the hillside.';
        return f;
      } else {
        f.airborne = false;
      }
      if (f.verticalSpeed < 0) f.verticalSpeed = 0;
    } else {
      f.airborne = false;
      if (f.verticalSpeed < 0) f.verticalSpeed = 0;
    }
  }
  // Terrain strike: flew into a hillside while airborne.
  if (f.airborne && f.y < groundHeightAt(f.x, f.z) + 2.4) {
    f.damage = 100;
    f.crashed = true;
    f.crashReason = 'Terrain strike — flew into the hillside.';
  }
  if (f.damage >= 100) { f.crashed = true; if (!f.crashReason) f.crashReason = 'Airframe failure.'; }
  return f;
}

export function isOnRunway(x, z) {
  return runwayAtPoint(x, z) !== null;
}

export function runwayAt(x, z) { return runwayAtPoint(x, z); }

// A runway, or one nearby on its extended centreline (the overrun and the
// short final): landing a little long or a little short of the paint
// still counts as using the strip, just with a lower centreline score.
export function nearRunway(x, z) {
  for (const rw of RUNWAYS) {
    const a = (rw.heading * Math.PI) / 180;
    const dx = x - rw.x, dz = z - rw.z;
    const along = dx * Math.sin(a) + dz * Math.cos(a);
    const across = dx * Math.cos(a) - dz * Math.sin(a);
    if (Math.abs(along) < rw.length / 2 + 80 && Math.abs(across) < rw.width / 2 + 15) return rw;
  }
  return null;
}

export function headingDegrees(f) {
  const deg = ((f.heading * 180) / Math.PI) % 360;
  return (deg + 360) % 360;
}

export function compassPoint(deg) {
  const points = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return points[Math.round(deg / 45) % 8];
}
