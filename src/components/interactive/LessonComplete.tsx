"use client";

import { useState, useEffect, useCallback } from "react";

/* ────────────────────────────────────────────
   Lesson Completion Celebration
   
   Animated overlay shown after completing a lesson:
   - Radial particle burst
   - XP earned counter
   - Lesson progress update
   - Next lesson CTA
   ──────────────────────────────────────────── */

interface LessonCompleteProps {
  lessonTitle: string;
  xpEarned: number;
  nextLessonSlug: string | null;
  moduleSlug: string;
  totalCompleted: number;
  totalLessons: number;
  onDismiss: () => void;
}

export default function LessonComplete({
  lessonTitle,
  xpEarned,
  nextLessonSlug,
  moduleSlug,
  totalCompleted,
  totalLessons,
  onDismiss,
}: LessonCompleteProps) {
  const [phase, setPhase] = useState<"enter" | "show" | "exit">("enter");
  const progressPct = Math.round((totalCompleted / totalLessons) * 100);

  useEffect(() => {
    /* Animate in */
    const t1 = setTimeout(() => setPhase("show"), 100);
    return () => clearTimeout(t1);
  }, []);

  const handleDismiss = useCallback(() => {
    setPhase("exit");
    setTimeout(onDismiss, 400);
  }, [onDismiss]);

  const handleNext = useCallback(() => {
    setPhase("exit");
    setTimeout(() => {
      if (nextLessonSlug) {
        window.location.href = `/learn/${moduleSlug}/${nextLessonSlug}`;
      } else {
        window.location.href = `/learn/${moduleSlug}`;
      }
    }, 300);
  }, [nextLessonSlug, moduleSlug]);

  return (
    <div
      className={`lesson-complete-overlay lesson-complete-${phase}`}
      onClick={handleDismiss}
    >
      <div
        className="lesson-complete-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Star burst behind */}
        <div className="lesson-complete-burst">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="lesson-complete-ray"
              style={{
                "--ray-angle": `${i * 45}deg`,
              } as React.CSSProperties}
            />
          ))}
        </div>

        {/* Trophy */}
        <div className="lesson-complete-trophy">🏆</div>

        {/* Content */}
        <h2 className="lesson-complete-title">Lesson Complete!</h2>
        <p className="lesson-complete-lesson">{lessonTitle}</p>

        {/* XP earned */}
        <div className="lesson-complete-xp">
          <span className="lesson-complete-xp-value">+{xpEarned}</span>
          <span className="lesson-complete-xp-label">XP Earned</span>
        </div>

        {/* Module progress */}
        <div className="lesson-complete-progress">
          <div className="lesson-complete-progress-label">
            <span>Module Progress</span>
            <span>
              {totalCompleted}/{totalLessons}
            </span>
          </div>
          <div className="lesson-complete-progress-track">
            <div
              className="lesson-complete-progress-fill"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="lesson-complete-progress-pct">{progressPct}%</div>
        </div>

        {/* Actions */}
        <div className="lesson-complete-actions">
          {nextLessonSlug ? (
            <button
              className="btn btn-primary btn-lg"
              onClick={handleNext}
              style={{ width: "100%" }}
            >
              🚀 Next Lesson
            </button>
          ) : (
            <button
              className="btn btn-primary btn-lg"
              onClick={handleNext}
              style={{ width: "100%" }}
            >
              🏝️ Back to Module
            </button>
          )}
          <button
            className="btn btn-secondary"
            onClick={handleDismiss}
            style={{ width: "100%", marginTop: "0.5rem" }}
          >
            Stay Here
          </button>
        </div>
      </div>
    </div>
  );
}
