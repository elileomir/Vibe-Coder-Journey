"use client";

/* ────────────────────────────────────────────
   Lesson Progress Bar
   
   Horizontal progress indicator showing
   reading + quiz completion status.
   ──────────────────────────────────────────── */

interface LessonProgressBarProps {
  readingComplete: boolean;
  quizPassed: boolean;
  hasQuiz: boolean;
}

export default function LessonProgressBar({
  readingComplete,
  quizPassed,
  hasQuiz,
}: LessonProgressBarProps) {
  const steps = [
    {
      label: "Reading",
      icon: "📖",
      done: readingComplete,
    },
    ...(hasQuiz
      ? [
          {
            label: "Quiz",
            icon: "📝",
            done: quizPassed,
          },
        ]
      : []),
  ];

  const completedSteps = steps.filter((s) => s.done).length;
  const pct = Math.round((completedSteps / steps.length) * 100);

  return (
    <div className="lesson-progress">
      <div className="lesson-progress-track">
        <div
          className="lesson-progress-fill"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="lesson-progress-steps">
        {steps.map((step, i) => (
          <div
            key={i}
            className={`lesson-progress-step ${
              step.done ? "done" : ""
            }`}
          >
            <span className="lesson-progress-step-icon">
              {step.done ? "✓" : step.icon}
            </span>
            <span className="lesson-progress-step-label">{step.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
