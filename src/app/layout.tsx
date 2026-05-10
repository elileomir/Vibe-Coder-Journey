import type { Metadata } from "next";
import "./globals.css";
import { NavbarClient } from "./NavbarClient";

export const metadata: Metadata = {
  title: "Vibe Coder Journey — Learn to Build Apps with AI",
  description: "An interactive learning platform that teaches complete beginners how to build real applications using AI and Vibe Coding with Google Antigravity.",
  keywords: ["vibe coding", "learn coding", "AI coding", "antigravity", "beginner programming"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <NavbarClient />
        {children}
        <Bubbles />
      </body>
    </html>
  );
}

/* ─── Floating Bubbles Background ─── */

/**
 * Deterministic seeded random to avoid impure Math.random during render.
 * Uses a simple LCG (linear congruential generator).
 */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function Bubbles() {
  const rand = seededRandom(42);
  const bubbles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    size: 20 + rand() * 80,
    left: rand() * 100,
    delay: rand() * 15,
    duration: 15 + rand() * 20,
  }));

  return (
    <div className="bubbles" aria-hidden="true">
      {bubbles.map((b) => (
        <div
          key={b.id}
          className="bubble"
          style={{
            width: b.size,
            height: b.size,
            left: `${b.left}%`,
            animationDelay: `${b.delay}s`,
            animationDuration: `${b.duration}s`,
          }}
        />
      ))}
    </div>
  );
}
