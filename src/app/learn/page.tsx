"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getModules, type VibeModule } from "@/lib/supabase";

export default function LearnPage() {
  const [modules, setModules] = useState<VibeModule[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem("vibe_user");
    if (!stored) { router.push("/auth/login"); return; }
    getModules().then(setModules).finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="page container" style={{ display: "grid", placeItems: "center", minHeight: "80vh" }}>
        <p style={{ color: "var(--text-muted)" }}>Loading curriculum...</p>
      </div>
    );
  }

  return (
    <main className="page container">
      <div className="section-title fade-in" style={{ textAlign: "left", marginBottom: "2rem" }}>
        <h1>Learning <span className="gradient-text">Curriculum</span></h1>
        <p style={{ maxWidth: "none" }}>7 modules from absolute zero to Vibe Coder Pro. Start wherever you are.</p>
      </div>

      <div className="module-grid">
        {modules.map((mod, i) => (
          <Link href={`/learn/${mod.slug}`} key={mod.id}>
            <div className={`card module-card fade-in stagger-${Math.min(i + 1, 4)}`}>
              <div className="module-card-icon">{mod.icon}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <h3 className="module-card-title" style={{ margin: 0 }}>{mod.title}</h3>
                <span className={`difficulty-badge difficulty-${mod.difficulty}`}>{mod.difficulty}</span>
              </div>
              <p className="module-card-desc">{mod.description}</p>
              <div className="module-card-meta">
                <span>📚 {mod.total_lessons} lessons</span>
                <span>⏱️ ~{mod.total_lessons * 10} min</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
