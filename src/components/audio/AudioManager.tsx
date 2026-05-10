"use client";

import { useState, useEffect, useCallback } from "react";

/* ────────────────────────────────────────────
   Audio Manager — Procedural Web Audio
   
   All sounds are synthesized at runtime:
   - Ocean ambience (LFO-modulated low sine waves)
   - XP collect (rising chirp)
   - Quiz success (major arpeggio)
   - Quiz fail (descending sawtooth)
   - Level-up (triumphant fanfare)
   - Achievement (sparkle chime)
   - UI click (quick tap)
   
   No audio files needed.
   ──────────────────────────────────────────── */

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let oceanNodes: OscillatorNode[] = [];
let oceanGain: GainNode | null = null;
let isOceanPlaying = false;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    try {
      audioCtx = new AudioContext();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = 0.3;
      masterGain.connect(audioCtx.destination);
    } catch {
      return null;
    }
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/* ─────────── Ambient Ocean ─────────── */

export function startOceanAmbience() {
  if (isOceanPlaying) return;
  const ctx = getCtx();
  if (!ctx || !masterGain) return;

  oceanGain = ctx.createGain();
  oceanGain.gain.value = 0;
  oceanGain.connect(masterGain);

  /* Deep hum + mid rumble */
  const osc1 = ctx.createOscillator();
  osc1.type = "sine";
  osc1.frequency.value = 55;
  const g1 = ctx.createGain();
  g1.gain.value = 0.15;

  const osc2 = ctx.createOscillator();
  osc2.type = "sine";
  osc2.frequency.value = 110;
  const g2 = ctx.createGain();
  g2.gain.value = 0.08;

  /* LFO for wave movement */
  const lfo = ctx.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = 0.15;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 8;
  lfo.connect(lfoGain);
  lfoGain.connect(osc1.frequency);
  lfoGain.connect(osc2.frequency);

  /* Underwater filter */
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 200;
  filter.Q.value = 1;

  osc1.connect(g1);
  osc2.connect(g2);
  g1.connect(filter);
  g2.connect(filter);
  filter.connect(oceanGain);

  osc1.start();
  osc2.start();
  lfo.start();

  oceanNodes = [osc1, osc2, lfo];
  isOceanPlaying = true;

  /* Fade in 2s */
  oceanGain.gain.linearRampToValueAtTime(0.6, ctx.currentTime + 2);
}

export function stopOceanAmbience() {
  if (!isOceanPlaying || !oceanGain || !audioCtx) return;
  oceanGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1.5);
  setTimeout(() => {
    oceanNodes.forEach((n) => {
      try { n.stop(); } catch { /* already stopped */ }
    });
    oceanNodes = [];
    oceanGain = null;
    isOceanPlaying = false;
  }, 1600);
}

/* ─────────── SFX ─────────── */

export function playXPCollect() {
  const ctx = getCtx();
  if (!ctx || !masterGain) return;
  const o = ctx.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(600, ctx.currentTime);
  o.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.15);
  o.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.3);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.2, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
  o.connect(g);
  g.connect(masterGain);
  o.start();
  o.stop(ctx.currentTime + 0.4);
}

export function playQuizSuccess() {
  const ctx = getCtx();
  if (!ctx || !masterGain) return;
  [523, 659, 784, 1047].forEach((freq, i) => {
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = freq;
    const g = ctx.createGain();
    const t = ctx.currentTime + i * 0.12;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.15, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
    o.connect(g);
    g.connect(masterGain!);
    o.start(t);
    o.stop(t + 0.35);
  });
}

export function playQuizFail() {
  const ctx = getCtx();
  if (!ctx || !masterGain) return;
  const o = ctx.createOscillator();
  o.type = "sawtooth";
  o.frequency.setValueAtTime(300, ctx.currentTime);
  o.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.3);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.1, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
  const f = ctx.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = 600;
  o.connect(f);
  f.connect(g);
  g.connect(masterGain);
  o.start();
  o.stop(ctx.currentTime + 0.4);
}

export function playLevelUp() {
  const ctx = getCtx();
  if (!ctx || !masterGain) return;
  [523, 659, 784, 1047, 1319].forEach((freq, i) => {
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = freq;
    const g = ctx.createGain();
    const t = ctx.currentTime + i * 0.08;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.12, t + 0.06);
    g.gain.exponentialRampToValueAtTime(0.01, t + 0.8);
    o.connect(g);
    g.connect(masterGain!);
    o.start(t);
    o.stop(t + 0.85);
  });
}

export function playAchievement() {
  const ctx = getCtx();
  if (!ctx || !masterGain) return;
  [880, 1320].forEach((freq, i) => {
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = freq;
    const g = ctx.createGain();
    const t = ctx.currentTime + i * 0.1;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.18, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
    o.connect(g);
    g.connect(masterGain!);
    o.start(t);
    o.stop(t + 0.55);
  });
}

export function playClick() {
  const ctx = getCtx();
  if (!ctx || !masterGain) return;
  const o = ctx.createOscillator();
  o.type = "sine";
  o.frequency.value = 800;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.1, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
  o.connect(g);
  g.connect(masterGain);
  o.start();
  o.stop(ctx.currentTime + 0.08);
}

/* ─────────── Volume ─────────── */

export function setMasterVolume(vol: number) {
  if (masterGain) masterGain.gain.value = Math.max(0, Math.min(1, vol));
}

/* ─────────── Sound Toggle Component ─────────── */

export default function SoundToggle() {
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("vibe_sound_muted");
      if (stored === "1") {
        requestAnimationFrame(() => setMuted(true));
        setMasterVolume(0);
      }
    } catch { /* noop */ }
  }, []);

  const toggle = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      setMasterVolume(next ? 0 : 0.3);
      if (next) stopOceanAmbience();
      try {
        localStorage.setItem("vibe_sound_muted", next ? "1" : "0");
      } catch { /* noop */ }
      return next;
    });
  }, []);

  return (
    <button
      className="sound-toggle"
      onClick={toggle}
      title={muted ? "Enable sound" : "Mute sound"}
      aria-label={muted ? "Enable sound" : "Mute sound"}
    >
      {muted ? "🔇" : "🔊"}
    </button>
  );
}
