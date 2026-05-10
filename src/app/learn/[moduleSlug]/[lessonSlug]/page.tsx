"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import {
  getLessonBySlug, getLessonsByModule, getModuleBySlug,
  getQuizForLesson, getQuizQuestions,
  updateLessonProgress, submitQuizAttempt, updateUserXP, getUserProgress,
  advanceUserModule,
  type VibeLesson, type VibeQuiz, type QuizQuestion, type ContentBlock, type VibeUser,
} from "@/lib/supabase";
import { triggerXPOrb } from "@/components/gamification/XPOrb";
import { unlockAchievement, checkXPAchievements } from "@/components/gamification/AchievementToast";
import { getLevel, triggerLevelUp } from "@/components/gamification/LevelUpEffect";
import {
  startOceanAmbience, playXPCollect, playQuizSuccess,
  playQuizFail, playLevelUp, playClick,
} from "@/components/audio/AudioManager";

const XPOrb = dynamic(() => import("@/components/gamification/XPOrb"), { ssr: false });
const AchievementToast = dynamic(() => import("@/components/gamification/AchievementToast"), { ssr: false });
const LevelUpEffect = dynamic(() => import("@/components/gamification/LevelUpEffect"), { ssr: false });
const InteractiveCodeBlock = dynamic(() => import("@/components/interactive/InteractiveCodeBlock"), { ssr: false });
const DragDropChallenge = dynamic(() => import("@/components/interactive/DragDropChallenge"), { ssr: false });
const LessonProgressBar = dynamic(() => import("@/components/interactive/LessonProgressBar"), { ssr: false });
const LessonComplete = dynamic(() => import("@/components/interactive/LessonComplete"), { ssr: false });

export default function LessonPage() {
  const { moduleSlug, lessonSlug } = useParams<{ moduleSlug: string; lessonSlug: string }>();
  const [lesson, setLesson] = useState<VibeLesson | null>(null);
  const [quiz, setQuiz] = useState<VibeQuiz | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQuiz, setShowQuiz] = useState(false);
  const [user, setUser] = useState<VibeUser | null>(null);
  const [nextLessonSlug, setNextLessonSlug] = useState<string | null>(null);
  const [lessonStatus, setLessonStatus] = useState<"completed" | "in_progress" | "not_started">("not_started");
  const [showCompletion, setShowCompletion] = useState(false);
  const totalLessons = 0;
  const completedLessons = 0;

  /* Start ocean ambience on lesson load (after user gesture) */
  useEffect(() => {
    const handleFirstInteraction = () => {
      const muted = localStorage.getItem("vibe_sound_muted") === "1";
      if (!muted) startOceanAmbience();
      document.removeEventListener("click", handleFirstInteraction);
    };
    document.addEventListener("click", handleFirstInteraction, { once: true });
    return () => document.removeEventListener("click", handleFirstInteraction);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("vibe_user");
    if (!stored) {
      window.location.href = "/auth/login";
      return;
    }
    requestAnimationFrame(() => setUser(JSON.parse(stored)));

    if (!lessonSlug) return;
    getLessonBySlug(lessonSlug).then(async (l) => {
      if (l) {
        setLesson(l);
        const q = await getQuizForLesson(l.id);
        if (q) {
          setQuiz(q);
          const qs = await getQuizQuestions(q.id);
          setQuestions(qs);
        }
        // Mark as in progress (won't downgrade completed)
        const u = JSON.parse(stored);
        // Check existing progress
        getUserProgress(u.id).then(prog => {
          const existing = prog.find(p => p.lesson_id === l.id);
          if (existing?.status === "completed") {
            setLessonStatus("completed");
          } else {
            setLessonStatus("in_progress");
          }
        }).catch(console.error);
        updateLessonProgress(u.id, l.id, "in_progress").catch(console.error);
        // Find next lesson
        if (moduleSlug) {
          getModuleBySlug(moduleSlug).then(async (mod) => {
            if (mod) {
              const siblings = await getLessonsByModule(mod.id);
              const idx = siblings.findIndex(s => s.id === l.id);
              if (idx >= 0 && idx < siblings.length - 1) {
                setNextLessonSlug(siblings[idx + 1].slug);
              }
            }
          });
        }
      }
      setLoading(false);
    });
  }, [lessonSlug, moduleSlug]);

  /* Reading completion is derived, not set synchronously in an effect */
  const readingComplete = useMemo(() => {
    if (lessonStatus === "completed") return true;
    if (showQuiz) return true;
    return false;
  }, [showQuiz, lessonStatus]);

  if (loading) {
    return <div className="page container" style={{ display: "grid", placeItems: "center", minHeight: "60vh" }}>
      <p style={{ color: "var(--text-muted)" }}>Loading lesson...</p>
    </div>;
  }

  if (!lesson) return <div className="page container"><h1>Lesson not found</h1></div>;

  return (
    <main className="page container">
      <div className="lesson-page">
        <div className="lesson-header fade-in">
          <div className="breadcrumb">
            <Link href="/learn">Curriculum</Link> / <Link href={`/learn/${moduleSlug}`}>{moduleSlug}</Link> / <span>{lesson.title}</span>
          </div>
          <h1>{lesson.title}</h1>
          <div style={{ display: "flex", gap: "1rem", color: "var(--text-muted)", fontSize: "0.85rem", alignItems: "center" }}>
            <span>⏱️ {lesson.estimated_minutes} min</span>
            <span className="xp-badge">+{lesson.xp_reward} XP</span>
            {lessonStatus === "completed" && <span className="status-pill completed">✓ Completed</span>}
            {lessonStatus === "in_progress" && <span className="status-pill in-progress">In Progress</span>}
          </div>
          {/* Lesson Progress Bar */}
          <LessonProgressBar
            readingComplete={readingComplete}
            quizPassed={lessonStatus === "completed"}
            hasQuiz={!!quiz}
          />
        </div>

        {/* Completion Banner */}
        {lessonStatus === "completed" && (
          <div className="completion-banner fade-in">
            <span className="completion-banner-icon">🎉</span>
            <div>
              <strong>You&apos;ve already completed this lesson!</strong>
              <p style={{ margin: 0, fontSize: "0.85rem", opacity: 0.85 }}>Feel free to review the content or move on to the next one.</p>
            </div>
            {nextLessonSlug && (
              <Link href={`/learn/${moduleSlug}/${nextLessonSlug}`} className="btn btn-primary" style={{ marginLeft: "auto", whiteSpace: "nowrap" }}>
                Next Lesson →
              </Link>
            )}
          </div>
        )}

        {/* Lesson Content */}
        <div className="fade-in stagger-1">
          {(lesson.content as ContentBlock[]).map((block, i) => (
            <ContentRenderer key={i} block={block} />
          ))}
        </div>

        {/* YouTube Video */}
        {lesson.youtube_url && (
          <div className="fade-in stagger-2">
            <h3 style={{ marginBottom: "0.5rem" }}>📺 Watch: {lesson.youtube_title || "Tutorial Video"}</h3>
            <div className="video-wrapper">
              <iframe
                src={lesson.youtube_url.replace("watch?v=", "embed/")}
                title={lesson.youtube_title || "Tutorial"}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        )}

        {/* Quiz Section */}
        {quiz && questions.length > 0 && (
          <div className="fade-in stagger-3" style={{ marginTop: "3rem" }}>
            {!showQuiz ? (
              <div style={{ textAlign: "center", padding: "2rem" }} className="card">
                {lessonStatus === "completed" ? (
                  <>
                    <h3 style={{ marginBottom: "0.5rem", color: "var(--accent-teal)" }}>✅ Quiz Passed!</h3>
                    <p style={{ color: "var(--text-secondary)", marginBottom: "1rem", fontSize: "0.9rem" }}>
                      You already earned <strong>{quiz.xp_reward} XP</strong> from this quiz. Want to try again for fun?
                    </p>
                    <button className="btn" style={{ borderColor: "var(--accent-teal)", color: "var(--accent-teal)" }} onClick={() => setShowQuiz(true)}>Retake Quiz</button>
                  </>
                ) : (
                  <>
                    <h3 style={{ marginBottom: "0.5rem" }}>📝 Ready for a Quick Quiz?</h3>
                    <p style={{ color: "var(--text-secondary)", marginBottom: "1rem", fontSize: "0.9rem" }}>
                      Test what you learned. Score {quiz.passing_score}% or higher to earn <strong>{quiz.xp_reward} XP</strong>!
                    </p>
                    <button className="btn btn-primary" onClick={() => setShowQuiz(true)}>Take the Quiz</button>
                  </>
                )}
              </div>
            ) : (
              <QuizEngine
                quiz={quiz}
                questions={questions}
                user={user}
                lessonId={lesson.id}
                nextLessonSlug={nextLessonSlug}
                moduleSlug={moduleSlug}
                onQuizPass={() => {
                  setLessonStatus("completed");
                  /* Delay celebration so gamification effects play first */
                  setTimeout(() => setShowCompletion(true), 4500);
                }}
              />
            )}
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "3rem", paddingBottom: "3rem" }}>
          <Link href={`/learn/${moduleSlug}`} className="btn btn-secondary">← Back to Module</Link>
        </div>
      </div>

      {/* Gamification Overlays */}
      <XPOrb />
      <AchievementToast />
      <LevelUpEffect />

      {/* Lesson Completion Celebration */}
      {showCompletion && lesson && (
        <LessonComplete
          lessonTitle={lesson.title}
          xpEarned={quiz?.xp_reward ?? lesson.xp_reward}
          nextLessonSlug={nextLessonSlug}
          moduleSlug={moduleSlug}
          totalCompleted={completedLessons}
          totalLessons={totalLessons}
          onDismiss={() => setShowCompletion(false)}
        />
      )}
    </main>
  );
}

function ContentRenderer({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case "text":
      return <div className="content-block"><p style={{ whiteSpace: "pre-line" }}>{block.content}</p></div>;
    case "image":
      return (
        <div className="content-block">
          <div className="lesson-image-wrap">
            {block.src ? (
              <Image
                src={block.src}
                alt={block.alt || "Lesson illustration"}
                className="lesson-image"
                loading="lazy"
                width={800}
                height={450}
                style={{ width: "100%", height: "auto" }}
              />
            ) : (
              <div className="lesson-image-placeholder">
                <span>🖼️</span>
                <p>{block.alt || "Visual illustration"}</p>
              </div>
            )}
          </div>
          {block.caption && <div className="caption">{block.caption}</div>}
        </div>
      );
    case "callout":
      return (
        <div className={`callout callout-${block.variant || "info"}`}>
          <p>{block.content}</p>
        </div>
      );
    case "code":
      return (
        <div className="content-block">
          <pre style={{ background: "var(--bg-secondary)", padding: "1rem", borderRadius: "var(--radius-sm)", overflow: "auto", border: "1px solid var(--border-subtle)" }}>
            <code className="mono" style={{ fontSize: "0.85rem", color: "var(--accent-cyan)" }}>{block.content}</code>
          </pre>
        </div>
      );
    case "interactive_code":
      return (
        <InteractiveCodeBlock
          code={block.content || ""}
          language={block.language}
          editable={block.editable}
          expectedOutput={block.expectedOutput}
          caption={block.caption}
        />
      );
    case "drag_drop":
      return (
        <DragDropChallenge
          mode={block.dragMode || "order"}
          title={block.dragTitle || "Challenge"}
          instruction={block.dragInstruction || "Arrange the items in the correct order."}
          items={block.dragItems || []}
          targets={block.dragTargets}
          xpReward={block.dragXpReward}
        />
      );
    default:
      return null;
  }
}

function QuizEngine({ quiz, questions, user, lessonId, nextLessonSlug, moduleSlug, onQuizPass }: {
  quiz: VibeQuiz; questions: QuizQuestion[]; user: VibeUser | null; lessonId: number;
  nextLessonSlug: string | null; moduleSlug: string; onQuizPass?: () => void;
}) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  function selectAnswer(questionId: number, optionIndex: number) {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
  }

  async function handleSubmit() {
    let correct = 0;
    questions.forEach(q => {
      const selected = answers[q.id];
      if (selected !== undefined && q.options[selected]?.isCorrect) correct++;
    });

    const pct = Math.round((correct / questions.length) * 100);
    setScore(pct);
    setSubmitted(true);

    const passed = pct >= quiz.passing_score;
    const xp = passed ? quiz.xp_reward : 0;

    if (user) {
      submitQuizAttempt(user.id, quiz.id, pct, answers as unknown as Record<string, string>, passed, xp).catch(console.error);
      if (passed) {
        updateLessonProgress(user.id, lessonId, "completed")
          .then(() => {
            /* Check if this completion finishes the module → unlock next */
            advanceUserModule(user.id).then((advanced) => {
              if (advanced) {
                /* Update localStorage so dashboard reflects new current_module */
                const freshUser = { ...user, total_xp: user.total_xp + xp, current_module: user.current_module + 1 };
                localStorage.setItem("vibe_user", JSON.stringify(freshUser));
                window.dispatchEvent(new Event("vibe_auth_change"));
              }
            }).catch(console.error);
          })
          .catch(console.error);
        updateUserXP(user.id, user.total_xp + xp).catch(console.error);

        const oldXP = user.total_xp;
        const newXP = oldXP + xp;
        const oldLevel = getLevel(oldXP);
        const newLevel = getLevel(newXP);

        // Update local storage XP + notify navbar
        const updated = { ...user, total_xp: newXP };
        localStorage.setItem("vibe_user", JSON.stringify(updated));
        window.dispatchEvent(new Event("vibe_auth_change"));

        /* ── Gamification + Audio triggers ── */
        playXPCollect();
        playQuizSuccess();
        triggerXPOrb(xp, "Quiz Passed!");

        unlockAchievement("first_quiz");
        unlockAchievement("first_lesson");
        if (pct === 100) unlockAchievement("perfect_score");
        checkXPAchievements(newXP);

        if (newLevel.level > oldLevel.level) {
          setTimeout(() => {
            playLevelUp();
            triggerLevelUp(newLevel);
          }, 3000);
        }

        onQuizPass?.();
      } else {
        playQuizFail();
      }
    }
  }

  const passed = score >= quiz.passing_score;

  if (submitted) {
    return (
      <div className="card quiz-result">
        <div className={`quiz-result-score ${passed ? "passed" : "failed"}`}>{score}%</div>
        <h3 style={{ margin: "1rem 0 0.5rem" }}>{passed ? "🎉 You Passed!" : "😅 Not quite..."}</h3>
        <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
          {passed
            ? `You earned ${quiz.xp_reward} XP! Great job!`
            : `You need ${quiz.passing_score}% to pass. Review the lesson and try again!`}
        </p>

        {/* Show answers */}
        <div style={{ textAlign: "left" }}>
          {questions.map(q => {
            const selected = answers[q.id];
            return (
              <div key={q.id} style={{ marginBottom: "1.5rem" }}>
                <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>{q.question}</p>
                {q.options.map((opt, oi) => {
                  const isSelected = selected === oi;
                  const isCorrect = opt.isCorrect;
                  let cls = "quiz-option";
                  if (isCorrect) cls += " correct";
                  else if (isSelected && !isCorrect) cls += " incorrect";
                  return <div key={oi} className={cls} style={{ cursor: "default" }}><span>{opt.text}</span></div>;
                })}
                <div className="quiz-explanation">💡 {q.explanation}</div>
              </div>
            );
          })}
        </div>

        {passed && nextLessonSlug && (
          <Link href={`/learn/${moduleSlug}/${nextLessonSlug}`} className="btn btn-primary btn-lg" style={{ width: "100%", marginBottom: "1rem" }}>
            🚀 Continue to Next Lesson
          </Link>
        )}
        {passed && !nextLessonSlug && (
          <Link href={`/learn/${moduleSlug}`} className="btn btn-primary" style={{ marginBottom: "1rem" }}>
            🏆 Module Complete — Back to Overview
          </Link>
        )}
        {!passed && (
          <button className="btn btn-primary" onClick={() => { setSubmitted(false); setAnswers({}); }}>
            Try Again
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="quiz-container">
      <h2 style={{ marginBottom: "1.5rem" }}>📝 {quiz.title}</h2>
      {questions.map((q, qi) => (
        <div key={q.id} className="card quiz-question-card">
          <h3>Q{qi + 1}. {q.question}</h3>
          <div className="quiz-options">
            {q.options.map((opt, oi) => (
              <button
                key={oi}
                className={`quiz-option ${answers[q.id] === oi ? "selected" : ""}`}
                onClick={() => { playClick(); selectAnswer(q.id, oi); }}
              >
                <div className="quiz-option-radio" />
                <span>{opt.text}</span>
              </button>
            ))}
          </div>
        </div>
      ))}

      <button
        className="btn btn-primary btn-lg"
        style={{ width: "100%", marginTop: "1rem" }}
        onClick={handleSubmit}
        disabled={Object.keys(answers).length < questions.length}
      >
        Submit Answers ({Object.keys(answers).length}/{questions.length})
      </button>
    </div>
  );
}
