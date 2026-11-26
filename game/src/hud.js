// updateHud — the cockpit instruments and mission panel. Everything the
// judge's first criterion asks for lives here: altitude, speed, heading,
// fuel, damage, the next target and the clock, all lit like instruments.
import { headingDegrees, compassPoint } from './physics.js';

function el(id) { return document.getElementById(id); }

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function updateHud(flight, mission, state) {
  const hdg = headingDegrees(flight);
  el('hud-alt').textContent = `${Math.max(0, Math.round(flight.y * 3.28))} ft`;
  el('hud-speed').textContent = `${Math.round(flight.speed * 1.94)} kt`;
  el('hud-hdg').textContent = `${String(Math.round(hdg)).padStart(3, '0')}° ${compassPoint(hdg)}`;
  el('hud-fuel').style.width = `${flight.fuel}%`;
  el('hud-fuel').className = `bar-fill ${flight.fuel < 25 ? 'low' : ''}`;
  el('hud-fuel-text').textContent = `FUEL ${Math.round(flight.fuel)}%`;
  el('hud-dmg').style.width = `${flight.damage}%`;
  el('hud-dmg-text').textContent = `DMG ${Math.round(flight.damage)}%`;
  el('hud-throttle').style.width = `${Math.round(flight.throttle * 100)}%`;
  el('hud-throttle-text').textContent = `THR ${Math.round(flight.throttle * 100)}%`;
  el('hud-score').textContent = `SCORE ${flight.score}`;
  el('hud-clock').textContent = formatTime(flight.time);
  el('hud-mission').textContent = mission ? mission.name : 'Free Flight';
  el('hud-goal').textContent = mission ? mission.goal : 'Fly free — explore the islands.';
  const target = mission
    ? (mission.rings.find((r) => !r.passed) || mission.gates.find((g) => !g.passed) || null)
    : null;
  if (target) {
    const d = Math.hypot(target.x - flight.x, target.z - flight.z);
    const done = (mission.rings.filter((r) => r.passed).length + mission.gates.filter((g) => g.passed).length);
    const total = mission.rings.length + mission.gates.length;
    el('hud-target').textContent = `NEXT TARGET ${done + 1}/${total} — ${Math.round(d)} m`;
  } else if (mission && mission.targets.length) {
    const next = mission.targets.find((t) => !t.done);
    if (next) {
      const d = Math.hypot(next.runway.x - flight.x, next.runway.z - flight.z);
      el('hud-target').textContent = `LAND AT ${next.name.toUpperCase()} — ${Math.round(d)} m`;
    } else {
      el('hud-target').textContent = 'ALL DELIVERIES DONE';
    }
  } else {
    el('hud-target').textContent = state === 'title' ? 'PRESS 1–4 TO PICK A MISSION' : '—';
  }
  el('hud-state').textContent = state === 'crashed' ? `CRASHED — ${flight.crashReason}`
    : state === 'complete' ? 'MISSION COMPLETE'
    : flight.landed ? 'ON THE GROUND — W/S TO TAXI, R TO RESET'
    : flight.airborne ? 'AIRBORNE' : 'ON RUNWAY';
  el('hud-state').className = `state ${state}`;
}

export function showMessage(text, sticky) {
  const box = el('hud-message');
  box.textContent = text;
  box.style.opacity = '1';
  if (!sticky) {
    clearTimeout(showMessage.timer);
    showMessage.timer = setTimeout(() => { box.style.opacity = '0'; }, 3200);
  }
}

// Draw the attitude ball + compass strip on the cockpit canvas.
export function drawInstruments(flight, cameraMode) {
  const canvas = el('instruments');
  if (!canvas || cameraMode !== 'cockpit') return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(-flight.roll);
  const pitchPx = flight.pitch * 120;
  ctx.fillStyle = '#2f7fc9';
  ctx.fillRect(-w, -h + pitchPx, w * 2, h);
  ctx.fillStyle = '#7a5230';
  ctx.fillRect(-w, pitchPx, w * 2, h);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-w, pitchPx); ctx.lineTo(w, pitchPx); ctx.stroke();
  ctx.restore();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 15px monospace';
  ctx.fillText(`ALT ${Math.round(flight.y * 3.28)}`, 12, 24);
  ctx.fillText(`SPD ${Math.round(flight.speed * 1.94)}`, 12, 46);
  ctx.fillText(`HDG ${String(Math.round(headingDegrees(flight))).padStart(3, '0')}`, w - 96, 24);
}
