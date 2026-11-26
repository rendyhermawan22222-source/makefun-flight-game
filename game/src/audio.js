// makeFlightAudio — every sound is synthesised in code with WebAudio:
// engine hum, wind rush, a ring chime, a landing thud and a crash.
// No audio files, no network.
export function makeFlightAudio() {
  let ctx = null;
  let engineOsc = null;
  let engineGain = null;
  let windGain = null;
  let windSrc = null;
  let started = false;

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    engineOsc = ctx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 55;
    const engineFilter = ctx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 420;
    engineGain = ctx.createGain();
    engineGain.gain.value = 0;
    engineOsc.connect(engineFilter).connect(engineGain).connect(ctx.destination);
    engineOsc.start();
    // Wind: looped filtered noise.
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
    windSrc = ctx.createBufferSource();
    windSrc.buffer = buf;
    windSrc.loop = true;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 500;
    windGain = ctx.createGain();
    windGain.gain.value = 0;
    windSrc.connect(windFilter).connect(windGain).connect(ctx.destination);
    windSrc.start();
    return ctx;
  }

  function tone(freq, dur, type, vol, when = 0) {
    if (!ctx) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  return {
    start() {
      if (started) return;
      started = true;
      ensure();
      if (ctx && ctx.state === 'suspended') ctx.resume();
    },
    update(flight) {
      if (!ctx) return;
      const target = flight.crashed ? 0 : 0.03 + flight.throttle * 0.05;
      engineGain.gain.setTargetAtTime(target, ctx.currentTime, 0.1);
      engineOsc.frequency.setTargetAtTime(48 + flight.throttle * 70 + flight.speed * 0.4, ctx.currentTime, 0.1);
      windGain.gain.setTargetAtTime(Math.min(0.12, flight.speed * 0.0012), ctx.currentTime, 0.15);
    },
    ring() { tone(880, 0.25, 'sine', 0.16); tone(1318, 0.4, 'sine', 0.14, 0.09); },
    land() { tone(140, 0.3, 'sine', 0.2); tone(90, 0.4, 'sine', 0.16, 0.05); },
    crash() { tone(70, 0.7, 'sawtooth', 0.25); tone(45, 0.9, 'sine', 0.25, 0.1); },
    complete() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.35, 'triangle', 0.15, i * 0.12)); },
  };
}
