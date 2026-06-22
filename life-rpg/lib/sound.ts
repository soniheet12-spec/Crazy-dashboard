// Lightweight WebAudio sound effects (no asset files) + haptics.

export type Fx = "complete" | "levelup" | "loot" | "boss";

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    if (!ctx) ctx = new AC();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, dur: number, gain = 0.05) {
  const ac = getCtx();
  if (!ac) return;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0, ac.currentTime + start);
  g.gain.linearRampToValueAtTime(gain, ac.currentTime + start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + start + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(ac.currentTime + start);
  osc.stop(ac.currentTime + start + dur + 0.02);
}

const SEQUENCES: Record<Fx, [number, number, number][]> = {
  // [freq, startOffset, duration]
  complete: [[660, 0, 0.12]],
  levelup: [[523, 0, 0.12], [659, 0.1, 0.12], [784, 0.2, 0.18]],
  loot: [[880, 0, 0.1], [1175, 0.09, 0.14]],
  boss: [[392, 0, 0.16], [523, 0.14, 0.16], [784, 0.28, 0.26]],
};

export function playFx(kind: Fx) {
  const ac = getCtx();
  if (!ac) return;
  if (ac.state === "suspended") ac.resume().catch(() => {});
  for (const [freq, start, dur] of SEQUENCES[kind]) tone(freq, start, dur);
}

export function vibrate(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* ignore */
    }
  }
}
