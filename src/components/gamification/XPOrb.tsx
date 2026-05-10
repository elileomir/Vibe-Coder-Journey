"use client";

import { useEffect, useState, useRef, useCallback } from "react";

/* ────────────────────────────────────────────
   XP Orb — Animated reward overlay
   Renders a 2D CSS particle burst + counter
   when XP is earned. Listens to custom events.
   ──────────────────────────────────────────── */

interface Particle {
  id: number;
  x: number;
  y: number;
  angle: number;
  distance: number;
  size: number;
  delay: number;
}

function generateParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: 50 + (Math.random() - 0.5) * 10,
    y: 50 + (Math.random() - 0.5) * 10,
    angle: (360 / count) * i + Math.random() * 20,
    distance: 40 + Math.random() * 60,
    size: 4 + Math.random() * 8,
    delay: Math.random() * 0.2,
  }));
}

export interface XPOrbEvent {
  amount: number;
  label?: string;
}

/** Dispatch this to trigger the XP orb animation */
export function triggerXPOrb(amount: number, label?: string) {
  window.dispatchEvent(
    new CustomEvent<XPOrbEvent>("vibe_xp_earned", {
      detail: { amount, label },
    })
  );
}

export default function XPOrb() {
  const [visible, setVisible] = useState(false);
  const [amount, setAmount] = useState(0);
  const [label, setLabel] = useState("");
  const [particles, setParticles] = useState<Particle[]>([]);
  const counterRef = useRef<HTMLDivElement>(null);
  const animatedValue = useRef(0);
  const frameId = useRef<number | null>(null);

  const animateCounter = useCallback(
    (target: number) => {
      const duration = 1200;
      const start = performance.now();
      animatedValue.current = 0;

      const tick = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        /* Ease-out cubic */
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(eased * target);

        if (counterRef.current) {
          counterRef.current.textContent = `+${current} XP`;
        }

        if (progress < 1) {
          frameId.current = requestAnimationFrame(tick);
        }
      };
      frameId.current = requestAnimationFrame(tick);
    },
    []
  );

  useEffect(() => {
    function handleXP(e: Event) {
      const { amount: xp, label: lbl } = (e as CustomEvent<XPOrbEvent>).detail;
      setAmount(xp);
      setLabel(lbl ?? "");
      setParticles(generateParticles(24));
      setVisible(true);
      animateCounter(xp);

      /* Auto-dismiss after animation completes */
      setTimeout(() => setVisible(false), 2800);
    }

    window.addEventListener("vibe_xp_earned", handleXP);
    return () => {
      window.removeEventListener("vibe_xp_earned", handleXP);
      if (frameId.current) cancelAnimationFrame(frameId.current);
    };
  }, [animateCounter]);

  if (!visible) return null;

  return (
    <div className="xp-orb-overlay" aria-live="polite">
      {/* Particle burst */}
      <div className="xp-orb-burst">
        {particles.map((p) => (
          <div
            key={p.id}
            className="xp-orb-particle"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
              "--angle": `${p.angle}deg`,
              "--distance": `${p.distance}px`,
              animationDelay: `${p.delay}s`,
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* Central XP counter */}
      <div className="xp-orb-center">
        <div className="xp-orb-glow" />
        <div className="xp-orb-counter" ref={counterRef}>
          +{amount} XP
        </div>
        {label && <div className="xp-orb-label">{label}</div>}
      </div>
    </div>
  );
}
