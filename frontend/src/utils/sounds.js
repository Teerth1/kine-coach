let audioContext = null;
let isMuted = false;

function getContext() {
  if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
  return audioContext;
}

export function setMuted(muted) { isMuted = muted; }
export function getMuted() { return isMuted; }

export function playRepComplete() {
  if (isMuted) return;
  // Short ascending two-tone chime: 440Hz->660Hz, 80ms each, sine wave, gain 0.3
  const ctx = getContext();
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(440, now);
  osc.frequency.setValueAtTime(660, now + 0.08);
  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.16);
}

export function playMilestone() {
  if (isMuted) return;
  // Three-tone ascending chime: 440->554->659Hz, 100ms each
  const ctx = getContext();
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(440, now);
  osc.frequency.setValueAtTime(554, now + 0.1);
  osc.frequency.setValueAtTime(659, now + 0.2);
  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.3);
}

export function playWorkoutComplete() {
  if (isMuted) return;
  // Triumphant five-note phrase
  const ctx = getContext();
  const now = ctx.currentTime;
  const notes = [523.25, 659.25, 783.99, 659.25, 1046.50]; // C5, E5, G5, E5, C6

  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + i * 0.12);
    gain.gain.setValueAtTime(0, now + i * 0.12);
    gain.gain.linearRampToValueAtTime(0.3, now + i * 0.12 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.12 + 0.12);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + i * 0.12);
    osc.stop(now + i * 0.12 + 0.12);
  });
}
