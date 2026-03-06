// Web Audio API Synthesizer - Clean, instant UI sounds without bloated MP3s!

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

export const playSuccessDing = () => {
    if (audioCtx.state === 'suspended') audioCtx.resume();

    // Create a smooth, glass-like Sine oscillator
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.type = 'sine';
    // Play a high C major chord sequentially for a satisfying "level up" ding
    osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
    osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.1); // Up to A5

    // Volume envelope (fade out beautifully like a physical bell)
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.5);
};

export const playErrorBuzzer = () => {
    if (audioCtx.state === 'suspended') audioCtx.resume();

    // Create a harsh Sawtooth oscillator for the error buzzer
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, audioCtx.currentTime); // Deep buzzing frequency

    // Quick, flat volume envelope
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.02);
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime + 0.2);
    gainNode.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
};
