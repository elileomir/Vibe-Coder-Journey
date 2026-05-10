"use client";

import { useState, useCallback, useRef } from "react";

/* ────────────────────────────────────────────
   Drag-and-Drop Challenge
   
   Two modes:
   1. "order" — Drag items into correct sequence
   2. "match" — Drag items to their matching targets
   ──────────────────────────────────────────── */

export interface DragItem {
  id: string;
  text: string;
  /** For "match" mode: the target this item should match to */
  matchTarget?: string;
}

interface DragDropChallengeProps {
  mode: "order" | "match";
  title: string;
  instruction: string;
  items: DragItem[];
  /** For "match" mode: target labels */
  targets?: string[];
  /** XP reward shown on success */
  xpReward?: number;
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function DragDropChallenge({
  mode,
  title,
  instruction,
  items,
  targets,
  xpReward = 10,
}: DragDropChallengeProps) {
  const [shuffledItems, setShuffledItems] = useState<DragItem[]>(() =>
    shuffleArray(items)
  );
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [matchMap, setMatchMap] = useState<Record<string, string>>({});
  const dragOverRef = useRef<string | null>(null);

  /* ─── Order mode handlers ─── */
  const handleDragStart = useCallback(
    (id: string) => {
      if (submitted) return;
      setDraggedId(id);
    },
    [submitted]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      if (submitted) return;
      dragOverRef.current = targetId;
    },
    [submitted]
  );

  const handleDrop = useCallback(
    (targetId: string) => {
      if (!draggedId || submitted) return;

      if (mode === "order") {
        setShuffledItems((prev) => {
          const fromIdx = prev.findIndex((i) => i.id === draggedId);
          const toIdx = prev.findIndex((i) => i.id === targetId);
          if (fromIdx === -1 || toIdx === -1) return prev;
          const next = [...prev];
          const [moved] = next.splice(fromIdx, 1);
          next.splice(toIdx, 0, moved);
          return next;
        });
      } else if (mode === "match") {
        setMatchMap((prev) => ({
          ...prev,
          [draggedId]: targetId,
        }));
      }

      setDraggedId(null);
      dragOverRef.current = null;
    },
    [draggedId, mode, submitted]
  );

  /* ─── Touch support ─── */
  const [touchDragId, setTouchDragId] = useState<string | null>(null);

  const handleTouchMove = useCallback(
    (id: string, idx: number) => {
      if (submitted) return;
      if (!touchDragId) {
        setTouchDragId(id);
      } else if (touchDragId !== id) {
        /* Swap positions */
        setShuffledItems((prev) => {
          const fromIdx = prev.findIndex((i) => i.id === touchDragId);
          const toIdx = idx;
          if (fromIdx === -1) return prev;
          const next = [...prev];
          const [moved] = next.splice(fromIdx, 1);
          next.splice(toIdx, 0, moved);
          return next;
        });
        setTouchDragId(id);
      }
    },
    [touchDragId, submitted]
  );

  /* ─── Confetti burst on correct ─── */
  const [confetti, setConfetti] = useState<
    { id: number; x: number; y: number; color: string; delay: number }[]
  >([]);
  const confettiTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  /**
   * Seeded PRNG for deterministic confetti placement.
   * Avoids impure Math.random() during render.
   */
  const confettiRand = useCallback((seed: number): (() => number) => {
    let s = seed;
    return () => {
      s = (s * 1664525 + 1013904223) & 0xffffffff;
      return (s >>> 0) / 0xffffffff;
    };
  }, []);

  /* ─── Check answer ─── */
  const handleSubmit = useCallback(() => {
    if (mode === "order") {
      const correct = shuffledItems.every((item, i) => item.id === items[i].id);
      setIsCorrect(correct);
    } else {
      const correct = items.every(
        (item) => matchMap[item.id] === item.matchTarget
      );
      setIsCorrect(correct);
    }
    setSubmitted(true);

    /* Fire confetti on correct answer (avoids setState in useEffect) */
    if (
      (mode === "order" && shuffledItems.every((item, i) => item.id === items[i].id)) ||
      (mode === "match" && items.every((item) => matchMap[item.id] === item.matchTarget))
    ) {
      const rand = confettiRand(Date.now());
      const particles = Array.from({ length: 20 }, (_, i) => ({
        id: i,
        x: 30 + rand() * 40,
        y: 20 + rand() * 30,
        color: ["#00d4ff", "#00bfa6", "#ffc857", "#8b5cf6", "#3dabff"][i % 5],
        delay: rand() * 0.3,
      }));
      setConfetti(particles);
      clearTimeout(confettiTimer.current);
      confettiTimer.current = setTimeout(() => setConfetti([]), 2000);
    }
  }, [mode, shuffledItems, items, matchMap, confettiRand]);

  const handleReset = useCallback(() => {
    setShuffledItems(shuffleArray(items));
    setMatchMap({});
    setSubmitted(false);
    setIsCorrect(false);
    setTouchDragId(null);
  }, [items]);

  return (
    <div className="content-block">
      <div className="drag-challenge">
        <div className="drag-challenge-header">
          <div className="drag-challenge-icon">🧩</div>
          <div>
            <h3 className="drag-challenge-title">{title}</h3>
            <p className="drag-challenge-instruction">{instruction}</p>
          </div>
          {xpReward > 0 && (
            <span className="xp-badge" style={{ marginLeft: "auto" }}>
              +{xpReward} XP
            </span>
          )}
        </div>

        {mode === "order" && (
          <div className="drag-challenge-items">
            {shuffledItems.map((item, i) => (
              <div
                key={item.id}
                className={`drag-item ${
                  draggedId === item.id ? "dragging" : ""
                } ${touchDragId === item.id ? "touch-active" : ""} ${
                  submitted
                    ? item.id === items[i]?.id
                      ? "correct"
                      : "incorrect"
                    : ""
                }`}
                draggable={!submitted}
                onDragStart={() => handleDragStart(item.id)}
                onDragOver={(e) => handleDragOver(e, item.id)}
                onDrop={() => handleDrop(item.id)}
                onClick={() => mode === "order" && handleTouchMove(item.id, i)}
              >
                <span className="drag-item-handle">⠿</span>
                <span className="drag-item-number">{i + 1}</span>
                <span className="drag-item-text">{item.text}</span>
                {submitted && (
                  <span className="drag-item-check">
                    {item.id === items[i]?.id ? "✓" : "✗"}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {mode === "match" && targets && (
          <div className="drag-match-grid">
            <div className="drag-match-sources">
              {shuffledItems.map((item) => (
                <div
                  key={item.id}
                  className={`drag-item ${
                    draggedId === item.id ? "dragging" : ""
                  } ${matchMap[item.id] ? "matched" : ""} ${
                    submitted
                      ? matchMap[item.id] === item.matchTarget
                        ? "correct"
                        : "incorrect"
                      : ""
                  }`}
                  draggable={!submitted}
                  onDragStart={() => handleDragStart(item.id)}
                >
                  <span className="drag-item-handle">⠿</span>
                  <span className="drag-item-text">{item.text}</span>
                  {matchMap[item.id] && (
                    <span className="drag-item-matched-to">
                      → {matchMap[item.id]}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div className="drag-match-targets">
              {targets.map((target) => (
                <div
                  key={target}
                  className="drag-target"
                  onDragOver={(e) => {
                    e.preventDefault();
                  }}
                  onDrop={() => {
                    if (draggedId) {
                      setMatchMap((prev) => ({
                        ...prev,
                        [draggedId]: target,
                      }));
                      setDraggedId(null);
                    }
                  }}
                >
                  {target}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="drag-challenge-actions">
          {!submitted ? (
            <>
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={
                  mode === "match" &&
                  Object.keys(matchMap).length < items.length
                }
              >
                Check Answer
              </button>
              <button className="btn btn-secondary" onClick={handleReset}>
                Shuffle
              </button>
            </>
          ) : (
            <>
              <div
                className={`drag-result ${
                  isCorrect ? "correct" : "incorrect"
                }`}
              >
                {isCorrect
                  ? "🎉 Perfect! You got it right!"
                  : "❌ Not quite — try again!"}
              </div>
              {!isCorrect && (
                <button className="btn btn-primary" onClick={handleReset}>
                  Try Again
                </button>
              )}
            </>
          )}
        </div>

        {/* Confetti */}
        {confetti.length > 0 && (
          <div className="drag-confetti">
            {confetti.map((p) => (
              <div
                key={p.id}
                className="drag-confetti-piece"
                style={{
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                  background: p.color,
                  animationDelay: `${p.delay}s`,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
