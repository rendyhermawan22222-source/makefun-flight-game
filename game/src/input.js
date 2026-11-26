// makeFlightInput — keyboard + mouse. Arrows/WASD fly the plane, W/S is the
// throttle, mouse drag steers, C swaps chase/cockpit, 1–4 pick a mission,
// R resets, M mutes, P pauses.
export function makeFlightInput() {
  const keys = new Set();
  const input = {
    throttleUp: false, throttleDown: false,
    pitchUp: false, pitchDown: false,
    bankLeft: false, bankRight: false,
    brake: false,
    mouseSteer: 0, mousePitch: 0,
  };
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  const pressed = new Set();

  function refresh() {
    input.throttleUp = keys.has('KeyW');
    input.throttleDown = keys.has('KeyS');
    input.pitchUp = keys.has('ArrowDown');
    input.pitchDown = keys.has('ArrowUp');
    input.bankLeft = keys.has('ArrowLeft') || keys.has('KeyA');
    input.bankRight = keys.has('ArrowRight') || keys.has('KeyD');
    input.brake = keys.has('KeyB');
  }

  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    keys.add(e.code);
    pressed.add(e.code);
    refresh();
  });
  window.addEventListener('keyup', (e) => {
    keys.delete(e.code);
    refresh();
  });
  window.addEventListener('blur', () => { keys.clear(); refresh(); });

  const canvas = document.getElementById('scene');
  canvas.addEventListener('mousedown', (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; });
  window.addEventListener('mouseup', () => { dragging = false; input.mouseSteer = 0; input.mousePitch = 0; });
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    input.mouseSteer = Math.max(-1, Math.min(1, (e.clientX - lastX) / 120));
    input.mousePitch = Math.max(-1, Math.min(1, (e.clientY - lastY) / 120));
  });

  return {
    input,
    // One-shot key presses, consumed by the main loop each frame.
    consume(code) {
      if (pressed.has(code)) { pressed.delete(code); return true; }
      return false;
    },
  };
}
