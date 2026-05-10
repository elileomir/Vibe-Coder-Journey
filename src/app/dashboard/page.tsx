"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  getModules,
  getUserProgress,
  getOrCreateUser,
  type VibeUser,
  type VibeModule,
  type UserProgress,
} from "@/lib/supabase";
import { getLevel, getNextLevel, getLevelProgress } from "@/components/gamification/LevelUpEffect";
import { checkXPAchievements, checkStreakAchievements } from "@/components/gamification/AchievementToast";

/* Lazy-load the heavy 3D components — keeps initial JS bundle light */
const Scene = dynamic(() => import("@/components/3d/Scene"), { ssr: false });
const LearningWorld = dynamic(
  () => import("@/components/3d/LearningWorld"),
  { ssr: false }
);
const XPOrb = dynamic(() => import("@/components/gamification/XPOrb"), { ssr: false });
const AchievementToast = dynamic(() => import("@/components/gamification/AchievementToast"), { ssr: false });
const LevelUpEffect = dynamic(() => import("@/components/gamification/LevelUpEffect"), { ssr: false });

export default function DashboardPage() {
  const [user, setUser] = useState<VibeUser | null>(null);
  const [modules, setModules] = useState<VibeModule[]>([]);
  const [progress, setProgress] = useState<UserProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem("vibe_user");
    if (!stored) {
      router.push("/auth/login");
      return;
    }

    const cached = JSON.parse(stored) as VibeUser;

    getOrCreateUser(cached.email)
      .then(async (freshUser) => {
        setUser(freshUser);
        localStorage.setItem("vibe_user", JSON.stringify(freshUser));
        window.dispatchEvent(new Event("vibe_auth_change"));

        const [mods, prog] = await Promise.all([
          getModules(),
          getUserProgress(freshUser.id),
        ]);
        setModules(mods);
        setProgress(prog);
        setLoading(false);

        /* ── Auto-check achievements on dashboard load ── */
        checkXPAchievements(freshUser.total_xp);
        checkStreakAchievements(freshUser.streak_days);
      })
      .catch(() => setLoading(false));
  }, [router]);

  const handleModuleSelect = useCallback(
    (slug: string) => {
      router.push(`/learn/${slug}`);
    },
    [router]
  );

  if (loading || !user) {
    return (
      <div
        className="page container"
        style={{ display: "grid", placeItems: "center", minHeight: "80vh" }}
      >
        <div className="scene-loader">
          <div className="scene-loader-ring" />
          <p style={{ color: "var(--text-muted)" }}>Loading your journey…</p>
        </div>
      </div>
    );
  }

  const completedLessons = progress.filter(
    (p) => p.status === "completed"
  ).length;
  const totalLessons = modules.reduce((acc, m) => acc + m.total_lessons, 0);
  const overallPct =
    totalLessons > 0
      ? Math.round((completedLessons / totalLessons) * 100)
      : 0;

  return (
    <main className="page container">
      {/* ─── 3D World with HUD ─── */}
      <div className="dashboard-3d fade-in">
        <Scene
          cameraPosition={[0, 8, 18]}
          fov={50}
          fallback={
            <p style={{ color: "var(--text-muted)" }}>
              Your browser doesn&apos;t support 3D. Use the module list below.
            </p>
          }
        >
          <LearningWorld
            modules={modules}
            progress={progress}
            currentModule={user.current_module}
            onModuleSelect={handleModuleSelect}
          />
        </Scene>

        {/* HUD Overlay — sits on top of the 3D canvas */}
        <div className="hud-overlay">
          <div className="hud-greeting">
            <h1>
              Welcome,{" "}
              <span className="gradient-text">
                {user.display_name || user.email.split("@")[0]}
              </span>{" "}
              👋
            </h1>
            <p>Explore your archipelago. Click an island to dive in.</p>
          </div>

          <div className="hud-stats">
            <div className="hud-stat">
              <div className="hud-stat-value">{user.total_xp}</div>
              <div className="hud-stat-label">XP</div>
            </div>
            <div className="hud-stat">
              <div className="hud-stat-value">{user.streak_days}</div>
              <div className="hud-stat-label">🔥 Streak</div>
            </div>
            <div className="hud-stat">
              <div className="hud-stat-value">{completedLessons}</div>
              <div className="hud-stat-label">Lessons</div>
            </div>
            <div className="hud-stat">
              <div className="hud-stat-value">{overallPct}%</div>
              <div className="hud-stat-label">Progress</div>
            </div>

            {/* Level progress bar */}
            {(() => {
              const lvl = getLevel(user.total_xp);
              const next = getNextLevel(user.total_xp);
              const pct = Math.round(getLevelProgress(user.total_xp) * 100);
              return (
                <div className="hud-level-bar">
                  <span className="hud-level-icon">{lvl.icon}</span>
                  <div className="hud-level-info">
                    <span className="hud-level-text">
                      Lv.{lvl.level} {lvl.title}{next ? ` → ${next.title}` : " (Max)"}
                    </span>
                    <div className="hud-level-track">
                      <div className="hud-level-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* ─── Controls ─── */}
      <div className="dashboard-3d-controls fade-in stagger-1">
        <Link href="/learn" className="btn btn-primary">
          📚 Browse Curriculum
        </Link>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => {
            localStorage.removeItem("vibe_user");
            window.dispatchEvent(new Event("vibe_auth_change"));
            router.push("/");
          }}
        >
          Sign Out
        </button>
      </div>

      {/* ─── Fallback Module List (always visible below 3D) ─── */}
      <h2
        style={{ marginTop: "3rem", marginBottom: "1.5rem" }}
        className="fade-in stagger-2"
      >
        Your Learning Path
      </h2>
      <div className="path-container fade-in stagger-3">
        {modules.map((mod, i) => {
          const isCompleted = i < user.current_module - 1;
          const isActive = i === user.current_module - 1;
          const isLocked = i > user.current_module - 1;
          const status = isCompleted
            ? "completed"
            : isActive
            ? "active"
            : "locked";

          return (
            <div key={mod.id}>
              <Link
                href={isLocked ? "#" : `/learn/${mod.slug}`}
                style={{
                  textDecoration: "none",
                  pointerEvents: isLocked ? "none" : "auto",
                }}
              >
                <div
                  className="path-node"
                  style={{ opacity: isLocked ? 0.4 : 1 }}
                >
                <div className={`path-dot ${status}`}>
                  {isCompleted ? "✅" : isLocked ? "🔒" : mod.icon}
                </div>
                  <div className="path-info" style={{ flex: 1 }}>
                    <h3>{mod.title}</h3>
                    <p>{mod.description}</p>
                  </div>
                  <div>
                    <span
                      className={`difficulty-badge difficulty-${mod.difficulty}`}
                    >
                      {mod.difficulty}
                    </span>
                  </div>
                </div>
              </Link>
              {i < modules.length - 1 && (
                <div
                  className={`path-connector ${
                    isCompleted ? "completed" : ""
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* ─── Global Gamification Overlays ─── */}
      <XPOrb />
      <AchievementToast />
      <LevelUpEffect />
    </main>
  );
}
