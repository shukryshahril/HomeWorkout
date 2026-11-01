import type { Cue } from "./session";

// Play a short tone when a step changes, plus vibration where the browser supports it.
let audio: AudioContext | null = null;

// Browsers only allow audio after a tap, so call this from the button that starts a session.
export function unlockAudio() {
  try {
    audio ??= new AudioContext();
    if (audio.state === "suspended") void audio.resume();
  } catch {
    audio = null;
  }
}

function tone(frequency: number, start: number, length: number, volume: number) {
  if (!audio) return;
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  const at = audio.currentTime + start;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(volume, at + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
  oscillator.connect(gain).connect(audio.destination);
  oscillator.start(at);
  oscillator.stop(at + length + 0.02);
}

export function playCue(cue: Cue) {
  if (cue === "work") {
    tone(880, 0, 0.18, 0.25);
    navigator.vibrate?.(60);
  } else if (cue === "light") {
    tone(660, 0, 0.12, 0.15);
    navigator.vibrate?.(20);
  } else {
    tone(660, 0, 0.14, 0.2);
    tone(880, 0.14, 0.14, 0.2);
    tone(1175, 0.28, 0.3, 0.2);
    navigator.vibrate?.([40, 60, 40]);
  }
}
