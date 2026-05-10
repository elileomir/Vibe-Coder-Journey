"use client";

import { useEffect, useState, useCallback } from "react";

/* ────────────────────────────────────────────
   Achievement definitions & toast system
   ──────────────────────────────────────────── */

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  rarity: "common" | "rare" | "epic" | "legendary";
}

export const ACHIEVEMENTS: Record<string, Achievement> = {
  first_lesson: {
    id: "first_lesson",
    title: "First Steps",
    description: "Complete your very first lesson",
    icon: "🐣",
    rarity: "common",
  },
  first_quiz: {
    id: "first_quiz",
    title: "Quiz Master",
    description: "Pass your first quiz",
    icon: "🧠",
    rarity: "common",
  },
  perfect_score: {
    id: "perfect_score",
    title: "Perfection",
    description: "Score 100% on a quiz",
    icon: "💎",
    rarity: "rare",
  },
  streak_3: {
    id: "streak_3",
    title: "On Fire",
    description: "Maintain a 3-day streak",
    icon: "🔥",
    rarity: "common",
  },
  streak_7: {
    id: "streak_7",
    title: "Unstoppable",
    description: "Maintain a 7-day streak",
    icon: "⚡",
    rarity: "rare",
  },
  module_complete: {
    id: "module_complete",
    title: "Island Conquered",
    description: "Complete an entire module",
    icon: "🏝️",
    rarity: "epic",
  },
  xp_500: {
    id: "xp_500",
    title: "Rising Star",
    description: "Earn 500 XP total",
    icon: "⭐",
    rarity: "common",
  },
  xp_2000: {
    id: "xp_2000",
    title: "Supernova",
    description: "Earn 2,000 XP total",
    icon: "🌟",
    rarity: "epic",
  },
  xp_5000: {
    id: "xp_5000",
    title: "Legendary Coder",
    description: "Earn 5,000 XP total",
    icon: "👑",
    rarity: "legendary",
  },
  all_lessons: {
    id: "all_lessons",
    title: "The Whole Journey",
    description: "Complete all 35 lessons",
    icon: "🌊",
    rarity: "legendary",
  },
};

const RARITY_COLORS: Record<string, string> = {
  common: "#00bfa6",
  rare: "#3dabff",
  epic: "#8b5cf6",
  legendary: "#ffc857",
};

/* ── Storage helpers ── */
function getUnlockedAchievements(): Set<string> {
  try {
    const raw = localStorage.getItem("vibe_achievements");
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveAchievement(id: string) {
  const unlocked = getUnlockedAchievements();
  unlocked.add(id);
  localStorage.setItem("vibe_achievements", JSON.stringify([...unlocked]));
}

/** Dispatch this to unlock an achievement */
export function unlockAchievement(id: string) {
  const already = getUnlockedAchievements();
  if (already.has(id)) return; /* Already earned */

  saveAchievement(id);
  window.dispatchEvent(
    new CustomEvent("vibe_achievement", { detail: { id } })
  );
}

/** Check and trigger XP-based achievements */
export function checkXPAchievements(totalXP: number) {
  if (totalXP >= 500) unlockAchievement("xp_500");
  if (totalXP >= 2000) unlockAchievement("xp_2000");
  if (totalXP >= 5000) unlockAchievement("xp_5000");
}

/** Check streak achievements */
export function checkStreakAchievements(streakDays: number) {
  if (streakDays >= 3) unlockAchievement("streak_3");
  if (streakDays >= 7) unlockAchievement("streak_7");
}

/* ────────────────────────────────────────────
   Toast UI Component
   ──────────────────────────────────────────── */

interface ToastItem {
  achievement: Achievement;
  key: number;
}

export default function AchievementToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useCallback(() => Date.now(), []);

  useEffect(() => {
    function handleAchievement(e: Event) {
      const { id } = (e as CustomEvent<{ id: string }>).detail;
      const achievement = ACHIEVEMENTS[id];
      if (!achievement) return;

      const key = counter();
      setToasts((prev) => [...prev, { achievement, key }]);

      /* Remove after animation */
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.key !== key));
      }, 4500);
    }

    window.addEventListener("vibe_achievement", handleAchievement);
    return () =>
      window.removeEventListener("vibe_achievement", handleAchievement);
  }, [counter]);

  if (toasts.length === 0) return null;

  return (
    <div className="achievement-container" aria-live="polite">
      {toasts.map(({ achievement, key }) => (
        <div
          key={key}
          className={`achievement-toast achievement-${achievement.rarity}`}
          style={{
            "--rarity-color": RARITY_COLORS[achievement.rarity],
          } as React.CSSProperties}
        >
          <div className="achievement-icon-wrap">
            <span className="achievement-icon">{achievement.icon}</span>
          </div>
          <div className="achievement-content">
            <div className="achievement-unlocked">
              Achievement Unlocked!
            </div>
            <div className="achievement-title">{achievement.title}</div>
            <div className="achievement-desc">{achievement.description}</div>
          </div>
          <span
            className="achievement-rarity-badge"
            style={{ color: RARITY_COLORS[achievement.rarity] }}
          >
            {achievement.rarity}
          </span>
        </div>
      ))}
    </div>
  );
}
