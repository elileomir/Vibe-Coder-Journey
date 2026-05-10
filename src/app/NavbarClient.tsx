"use client";

import { useSyncExternalStore, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";

const SoundToggle = dynamic(() => import("@/components/audio/AudioManager"), { ssr: false });

interface StoredUser {
  id: string;
  email: string;
  total_xp: number;
}

/**
 * Reads `vibe_user` from localStorage via useSyncExternalStore
 * to avoid the "setState in effect" lint error.
 */
function subscribeToUserStore(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener("vibe_auth_change", cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener("vibe_auth_change", cb);
  };
}

function getUserSnapshot(): string | null {
  try {
    return localStorage.getItem("vibe_user");
  } catch {
    return null;
  }
}

function getServerSnapshot(): string | null {
  return null;
}

export function NavbarClient() {
  const raw = useSyncExternalStore(subscribeToUserStore, getUserSnapshot, getServerSnapshot);

  /* Derive user from the raw snapshot — no useState/useEffect needed */
  const user = useMemo<StoredUser | null>(() => {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as StoredUser;
    } catch {
      return null;
    }
  }, [raw]);

  return (
    <nav className="nav">
      <Link href="/" className="nav-logo">
        <span className="nav-logo-icon">🌊</span>
        <span>Vibe Coder</span>
      </Link>
      <div className="nav-links">
        <Link href="/learn" className="nav-link">Learn</Link>
        <Link href="/dashboard" className="nav-link">Dashboard</Link>
        <SoundToggle />
        {user ? (
          <div className="nav-xp">
            ⚡ {user.total_xp} XP
          </div>
        ) : (
          <Link href="/auth/login" className="btn btn-sm btn-primary">Start Free</Link>
        )}
      </div>
    </nav>
  );
}
