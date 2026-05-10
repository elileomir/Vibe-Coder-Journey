"use client";

import { useEffect, useState } from "react";

/* ────────────────────────────────────────────
   Level system — XP thresholds
   ──────────────────────────────────────────── */

export const LEVELS = [
  { level: 1,  title: "Newcomer",         xp: 0,    icon: "🌱" },
  { level: 2,  title: "Learner",          xp: 100,  icon: "📖" },
  { level: 3,  title: "Explorer",         xp: 300,  icon: "🧭" },
  { level: 4,  title: "Builder",          xp: 600,  icon: "🔨" },
  { level: 5,  title: "Creator",          xp: 1000, icon: "🎨" },
  { level: 6,  title: "Innovator",        xp: 1500, icon: "💡" },
  { level: 7,  title: "Architect",        xp: 2200, icon: "🏗️" },
  { level: 8,  title: "Vibe Coder",       xp: 3000, icon: "⚡" },
  { level: 9,  title: "Vibe Master",      xp: 4000, icon: "🌟" },
  { level: 10, title: "Vibe Legend",       xp: 5250, icon: "👑" },
];

export function getLevel(xp: number): typeof LEVELS[number] {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xp) return LEVELS[i];
  }
  return LEVELS[0];
}

export function getNextLevel(xp: number): typeof LEVELS[number] | null {
  const current = getLevel(xp);
  const idx = LEVELS.findIndex((l) => l.level === current.level);
  return idx < LEVELS.length - 1 ? LEVELS[idx + 1] : null;
}

export function getLevelProgress(xp: number): number {
  const current = getLevel(xp);
  const next = getNextLevel(xp);
  if (!next) return 1;
  const range = next.xp - current.xp;
  return (xp - current.xp) / range;
}

/** Dispatch to trigger the level-up cinematic */
export function triggerLevelUp(newLevel: typeof LEVELS[number]) {
  window.dispatchEvent(
    new CustomEvent("vibe_level_up", { detail: newLevel })
  );
}

/* ────────────────────────────────────────────
   Level-Up full-screen cinematic
   ──────────────────────────────────────────── */

export default function LevelUpEffect() {
  const [visible, setVisible] = useState(false);
  const [level, setLevel] = useState(LEVELS[0]);

  useEffect(() => {
    function handleLevelUp(e: Event) {
      const data = (e as CustomEvent<typeof LEVELS[number]>).detail;
      setLevel(data);
      setVisible(true);

      setTimeout(() => setVisible(false), 4000);
    }

    window.addEventListener("vibe_level_up", handleLevelUp);
    return () => window.removeEventListener("vibe_level_up", handleLevelUp);
  }, []);

  if (!visible) return null;

  return (
    <div className="levelup-overlay">
      {/* Radial light burst */}
      <div className="levelup-burst" />

      {/* Central content */}
      <div className="levelup-content">
        <div className="levelup-badge">{level.icon}</div>
        <div className="levelup-label">LEVEL UP</div>
        <div className="levelup-title">
          Level {level.level} — {level.title}
        </div>
      </div>

      {/* Orbiting ring particles */}
      <div className="levelup-ring">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="levelup-ring-dot"
            style={{
              "--ring-i": i,
              "--ring-total": 12,
            } as React.CSSProperties}
          />
        ))}
      </div>
    </div>
  );
}
