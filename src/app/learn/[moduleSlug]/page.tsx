"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  getModuleBySlug,
  getLessonsByModule,
  getUserProgress,
  type VibeModule,
  type VibeLesson,
  type UserProgress,
  type VibeUser,
} from "@/lib/supabase";

/* Lazy-load 3D components */
const Scene = dynamic(() => import("@/components/3d/Scene"), { ssr: false });
const LessonConstellation = dynamic(
  () => import("@/components/3d/LessonConstellation"),
  { ssr: false }
);

export default function ModulePage() {
  const { moduleSlug } = useParams<{ moduleSlug: string }>();
  const [mod, setMod] = useState<VibeModule | null>(null);
  const [lessons, setLessons] = useState<VibeLesson[]>([]);
  const [progress, setProgress] = useState<UserProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem("vibe_user");
    if (!stored) {
      router.push("/auth/login");
      return;
    }

    const user = JSON.parse(stored) as VibeUser;

    if (!moduleSlug) return;
    getModuleBySlug(moduleSlug).then(async (m) => {
      if (m) {
        setMod(m);
        const [l, p] = await Promise.all([
          getLessonsByModule(m.id),
          getUserProgress(user.id),
        ]);
        setLessons(l);
        setProgress(p);
      }
      setLoading(false);
    });
  }, [moduleSlug, router]);

  function getLessonStatus(
    lessonId: number
  ): "completed" | "in_progress" | "not_started" {
    const p = progress.find((pr) => pr.lesson_id === lessonId);
    return (
      (p?.status as "completed" | "in_progress" | "not_started") ||
      "not_started"
    );
  }

  const handleLessonSelect = useCallback(
    (path: string) => {
      router.push(path);
    },
    [router]
  );

  if (loading) {
    return (
      <div
        className="page container"
        style={{ display: "grid", placeItems: "center", minHeight: "60vh" }}
      >
        <p style={{ color: "var(--text-muted)" }}>Loading module...</p>
      </div>
    );
  }

  if (!mod) {
    return (
      <div className="page container">
        <h1>Module not found</h1>
      </div>
    );
  }

  const completedCount = lessons.filter(
    (l) => getLessonStatus(l.id) === "completed"
  ).length;

  /* Transform lessons for 3D constellation */
  const constellationNodes = lessons.map((l, i) => ({
    id: l.id,
    slug: l.slug,
    title: l.title,
    xpReward: l.xp_reward,
    estimatedMinutes: l.estimated_minutes,
    status: getLessonStatus(l.id),
    index: i,
  }));

  return (
    <main className="page container">
      <div className="fade-in" style={{ marginBottom: "2rem" }}>
        <Link
          href="/learn"
          style={{ color: "var(--accent-cyan)", fontSize: "0.85rem" }}
        >
          ← Back to Curriculum
        </Link>
      </div>

      <div className="fade-in stagger-1" style={{ marginBottom: "1.5rem" }}>
        <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>
          {mod.icon}
        </div>
        <h1>{mod.title}</h1>
        <p
          style={{
            color: "var(--text-secondary)",
            marginTop: "0.5rem",
            maxWidth: 600,
          }}
        >
          {mod.description}
        </p>
        <div
          style={{
            display: "flex",
            gap: "1rem",
            marginTop: "1rem",
            alignItems: "center",
          }}
        >
          <span className={`difficulty-badge difficulty-${mod.difficulty}`}>
            {mod.difficulty}
          </span>
          <span
            style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}
          >
            📚 {lessons.length} lessons
          </span>
          <span
            style={{
              color: "var(--accent-teal)",
              fontSize: "0.85rem",
              fontWeight: 600,
            }}
          >
            ✅ {completedCount}/{lessons.length} completed
          </span>
        </div>
      </div>

      {/* ─── 3D Lesson Constellation ─── */}
      <div className="lesson-constellation-wrap fade-in stagger-2">
        <Scene
          cameraPosition={[0, 0, 10]}
          fov={45}
          fallback={
            <p style={{ color: "var(--text-muted)" }}>
              3D map unavailable — use the lesson list below.
            </p>
          }
        >
          <LessonConstellation
            lessons={constellationNodes}
            moduleTitle={mod.title}
            moduleIcon={mod.icon}
            moduleSlug={moduleSlug}
            difficulty={mod.difficulty}
            onLessonSelect={handleLessonSelect}
          />
        </Scene>

        {/* Legend */}
        <div className="constellation-legend">
          <div className="constellation-legend-item">
            <span
              className="constellation-legend-dot"
              style={{ background: "#00bfa6" }}
            />
            <span>Completed</span>
          </div>
          <div className="constellation-legend-item">
            <span
              className="constellation-legend-dot"
              style={{ background: "#00d4ff" }}
            />
            <span>In Progress</span>
          </div>
          <div className="constellation-legend-item">
            <span
              className="constellation-legend-dot"
              style={{ background: "#2a3f5f" }}
            />
            <span>Not Started</span>
          </div>
        </div>
      </div>

      {/* ─── Lesson Cards (always visible, accessible fallback) ─── */}
      <h2
        className="fade-in stagger-3"
        style={{ marginTop: "2rem", marginBottom: "1rem" }}
      >
        Lesson List
      </h2>
      <div
        style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
      >
        {lessons.map((lesson, i) => {
          const status = getLessonStatus(lesson.id);
          return (
            <Link
              href={`/learn/${moduleSlug}/${lesson.slug}`}
              key={lesson.id}
            >
              <div
                className={`card lesson-card fade-in stagger-${Math.min(
                  i + 1,
                  4
                )} ${status === "completed" ? "lesson-completed" : ""}`}
              >
                <div className={`lesson-number-dot ${status}`}>
                  {status === "completed" ? "✓" : i + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <h3
                    style={{ fontSize: "1.05rem", marginBottom: "2px" }}
                  >
                    {lesson.title}
                  </h3>
                  <p
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "0.85rem",
                    }}
                  >
                    {lesson.description}
                  </p>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    flexShrink: 0,
                  }}
                >
                  {status === "completed" && (
                    <span className="status-pill completed">
                      Completed
                    </span>
                  )}
                  {status === "in_progress" && (
                    <span className="status-pill in-progress">
                      In Progress
                    </span>
                  )}
                  <span className="xp-badge">
                    +{lesson.xp_reward} XP
                  </span>
                  <span
                    style={{
                      color: "var(--text-dim)",
                      fontSize: "0.8rem",
                    }}
                  >
                    ⏱️ {lesson.estimated_minutes}m
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
