// buildMissions — four sorties with different goals, each with its own
// rings/gates, scoring and best result. Progress, medals and the route guide.
import { RUNWAYS } from './config.js';

function ringPositions(cx, cz, radius, count, altitude, startAngle) {
  const rings = [];
  for (let i = 0; i < count; i += 1) {
    const a = startAngle + (i / count) * Math.PI * 2;
    rings.push({ x: cx + Math.cos(a) * radius, z: cz + Math.sin(a) * radius, y: altitude + Math.sin(i * 1.3) * 25, r: 26, passed: false });
  }
  return rings;
}

export function buildMissions() {
  return {
    rings: {
      id: 'rings', name: 'Ring Time Trial',
      goal: 'Thread all 8 sky rings. Each ring: +250. Finish under 3:00 for gold.',
      rings: ringPositions(0, 0, 900, 8, 130, 0.4),
      gates: [], targets: [],
      par: 180, best: null,
    },
    hop: {
      id: 'hop', name: 'Island Hop Delivery',
      goal: 'Deliver cargo: land on Karang, then on Kabut. Gentle touchdowns score.',
      rings: [],
      gates: [],
      targets: [
        { runway: RUNWAYS[1], name: 'Pulau Karang', done: false },
        { runway: RUNWAYS[2], name: 'Pulau Kabut', done: false },
      ],
      par: 0, best: null,
    },
    landing: {
      id: 'landing', name: 'Short Strip Landing',
      goal: 'Land on Kabut’s 210 m strip. Scored on softness, centreline and speed.',
      rings: [],
      gates: [],
      targets: [{ runway: RUNWAYS[2], name: 'Pulau Kabut', done: false }],
      par: 0, best: null,
    },
    storm: {
      id: 'storm', name: 'Storm Front Run',
      goal: 'Six storm gates in rain and gusts. Watch the fuel — no second chances.',
      rings: [],
      gates: ringPositions(-400, 300, 1100, 6, 150, 2.2).map((g) => ({ ...g, r: 34 })),
      targets: [],
      par: 240, best: null,
    },
  };
}

export function nextRingTarget(mission) {
  return mission.rings.find((r) => !r.passed) || null;
}

export function nextGateTarget(mission) {
  return mission.gates.find((g) => !g.passed) || null;
}

// Score a ring pass: faster flying and cleaner lines pay more.
export function ringScore(flight) {
  const speedBonus = Math.round(Math.max(0, flight.speed - 30) * 2);
  return 250 + speedBonus;
}

export function landingScore(flight, runway) {
  const soft = Math.max(0, 100 - Math.round(flight.touchdownRate * 9));
  let centre = 40;
  if (runway) {
    const a = (runway.heading * Math.PI) / 180;
    const across = Math.abs((flight.x - runway.x) * Math.cos(a) - (flight.z - runway.z) * Math.sin(a));
    centre = Math.max(0, 100 - Math.round(across * 4));
  }
  const speedOk = flight.speed < 45 ? 100 : Math.max(0, 100 - Math.round((flight.speed - 45) * 4));
  return Math.round((soft + centre + speedOk) / 3);
}

export function medalFor(mission, result) {
  if (mission.id === 'rings' || mission.id === 'storm') {
    if (result.time <= mission.par) return 'GOLD';
    if (result.time <= mission.par * 1.4) return 'SILVER';
    return 'BRONZE';
  }
  if (result.score >= 85) return 'GOLD';
  if (result.score >= 65) return 'SILVER';
  return 'BRONZE';
}
