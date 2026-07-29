"use client";

// Web Audio API context
let audioCtx: AudioContext | null = null;

const initAudio = () => {
  if (typeof window === "undefined") return;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
};

const playTone = (frequency: number, type: OscillatorType, duration: number, volume: number = 0.1) => {
  try {
    initAudio();
    if (!audioCtx) return;

    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);

    // Fade out to prevent clicking sounds
    gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + duration);
  } catch (e) {
    console.error("Audio error", e);
  }
};

export const playPop = () => {
  playTone(400, "sine", 0.1, 0.1);
  setTimeout(() => playTone(600, "sine", 0.15, 0.05), 50);
};

export const playSuccess = () => {
  playTone(523.25, "sine", 0.1, 0.1); // C5
  setTimeout(() => playTone(659.25, "sine", 0.1, 0.1), 100); // E5
  setTimeout(() => playTone(783.99, "sine", 0.3, 0.1), 200); // G5
};

export const playError = () => {
  playTone(200, "sawtooth", 0.2, 0.05);
  setTimeout(() => playTone(150, "sawtooth", 0.3, 0.05), 100);
};

// Haptics Helper
export const triggerHaptic = (pattern: number | number[] = 50) => {
  if (typeof window !== "undefined" && navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      // Ignore
    }
  }
};

export const triggerHeavyHaptic = () => {
  triggerHaptic([100, 50, 100]);
};
