/**
 * Discrete sound feedback using Web Audio API — no external files needed.
 * All sounds are synthesized programmatically and kept subtle (low gain).
 *
 * Usage:
 *   import { playSound } from "@/lib/sounds";
 *   playSound("success");
 */

type SoundName =
  | "toast_success"   // generic success notification
  | "toast_danger"    // error/danger toast
  | "toast_info"      // info / neutral toast
  | "toast_xp"        // XP gained
  | "toast_levelup"   // level up fanfare
  | "paid"            // mark as paid (✓)
  | "add_expense"     // new expense added
  | "streak"          // streak flame increased
  | "quest_claim"     // quest reward claimed
  | "heartbeat"       // HP heartbeat pulse
  | "achievement";    // achievement unlocked

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  // Resume if suspended (browser autoplay policy)
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
  return ctx;
}

/** Low-level helper: play a single oscillator tone */
function tone(
  ac: AudioContext,
  freq: number,
  type: OscillatorType,
  startTime: number,
  duration: number,
  gainPeak: number,
  attackTime = 0.01,
  releaseTime = 0.06
) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);

  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(gainPeak, startTime + attackTime);
  gain.gain.setValueAtTime(gainPeak, startTime + duration - releaseTime);
  gain.gain.linearRampToValueAtTime(0, startTime + duration);

  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.01);
}

/** Chord of tones played together */
function chord(
  ac: AudioContext,
  freqs: number[],
  type: OscillatorType,
  startTime: number,
  duration: number,
  gainPeak: number
) {
  freqs.forEach((f) => tone(ac, f, type, startTime, duration, gainPeak));
}

// ── Sound definitions ──────────────────────────────────────────────────────────

function sound_toast_success(ac: AudioContext) {
  const t = ac.currentTime;
  tone(ac, 523.25, "sine", t,        0.12, 0.06);  // C5
  tone(ac, 659.25, "sine", t + 0.07, 0.14, 0.07);  // E5
  tone(ac, 783.99, "sine", t + 0.14, 0.18, 0.07);  // G5
}

function sound_toast_danger(ac: AudioContext) {
  const t = ac.currentTime;
  tone(ac, 220, "sawtooth", t,       0.10, 0.04, 0.005, 0.09);
  tone(ac, 180, "sawtooth", t + 0.1, 0.12, 0.04, 0.005, 0.10);
}

function sound_toast_info(ac: AudioContext) {
  const t = ac.currentTime;
  tone(ac, 440, "sine", t,        0.12, 0.05);  // A4
  tone(ac, 554, "sine", t + 0.08, 0.10, 0.08);  // C#5
}

function sound_toast_xp(ac: AudioContext) {
  // Rising sparkle arpeggio
  const t = ac.currentTime;
  const notes = [392, 523, 659, 784];
  notes.forEach((f, i) => tone(ac, f, "sine", t + i * 0.055, 0.12, 0.05, 0.01, 0.08));
}

function sound_toast_levelup(ac: AudioContext) {
  // Mini fanfare
  const t = ac.currentTime;
  chord(ac, [261.63, 329.63, 392], "triangle", t,        0.15, 0.05);
  chord(ac, [329.63, 415.30, 523], "triangle", t + 0.15, 0.15, 0.06);
  chord(ac, [392, 493.88, 587.33, 783.99], "sine", t + 0.32, 0.30, 0.07);
}

function sound_paid(ac: AudioContext) {
  // Soft double-click confirm
  const t = ac.currentTime;
  tone(ac, 600, "sine", t,        0.08, 0.04, 0.005, 0.06);
  tone(ac, 900, "sine", t + 0.07, 0.10, 0.06, 0.005, 0.07);
}

function sound_add_expense(ac: AudioContext) {
  // Cash register style: coin drop
  const t = ac.currentTime;
  tone(ac, 880, "sine",     t,        0.06, 0.05, 0.005, 0.05);
  tone(ac, 440, "triangle", t + 0.05, 0.12, 0.04, 0.01,  0.10);
}

function sound_streak(ac: AudioContext) {
  // Upward swoosh
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(300, t);
  osc.frequency.exponentialRampToValueAtTime(1200, t + 0.25);
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.06, t + 0.05);
  gain.gain.linearRampToValueAtTime(0, t + 0.25);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(t);
  osc.stop(t + 0.28);
}

function sound_quest_claim(ac: AudioContext) {
  // Treasure chest jingle
  const t = ac.currentTime;
  const notes = [523, 659, 783, 1046];
  notes.forEach((f, i) => tone(ac, f, "sine", t + i * 0.07, 0.15, 0.06, 0.01, 0.08));
  // Trailing shimmer
  tone(ac, 1318, "sine", t + 0.32, 0.20, 0.04, 0.02, 0.18);
}

function sound_heartbeat(ac: AudioContext) {
  // Soft two-thump (lub-dub)
  const t = ac.currentTime;
  const thump = (start: number, freq: number, vol: number) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, start);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.5, start + 0.08);
    gain.gain.setValueAtTime(vol, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.09);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(start);
    osc.stop(start + 0.1);
  };
  thump(t, 100, 0.07);
  thump(t + 0.13, 80, 0.05);
}

function sound_achievement(ac: AudioContext) {
  // Full achievement fanfare — same as levelup but brighter
  const t = ac.currentTime;
  tone(ac, 523, "sine", t,        0.12, 0.06);
  tone(ac, 659, "sine", t + 0.09, 0.12, 0.06);
  tone(ac, 783, "sine", t + 0.18, 0.12, 0.06);
  chord(ac, [523, 659, 783, 1046], "sine", t + 0.30, 0.35, 0.055);
}

// ── Public API ─────────────────────────────────────────────────────────────────

const SOUND_MAP: Record<SoundName, (ac: AudioContext) => void> = {
  toast_success:  sound_toast_success,
  toast_danger:   sound_toast_danger,
  toast_info:     sound_toast_info,
  toast_xp:       sound_toast_xp,
  toast_levelup:  sound_toast_levelup,
  paid:           sound_paid,
  add_expense:    sound_add_expense,
  streak:         sound_streak,
  quest_claim:    sound_quest_claim,
  heartbeat:      sound_heartbeat,
  achievement:    sound_achievement,
};

/**
 * Play a named sound. Safe to call from any component — silently no-ops if
 * Web Audio API is unavailable or the browser blocks it.
 */
export function playSound(name: SoundName): void {
  try {
    const ac = getCtx();
    if (!ac) return;
    SOUND_MAP[name](ac);
  } catch {
    // Never throw — sounds are enhancement only
  }
}
