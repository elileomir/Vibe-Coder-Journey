"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getOrCreateUser } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");

    try {
      const user = await getOrCreateUser(email);
      localStorage.setItem("vibe_user", JSON.stringify(user));
      window.dispatchEvent(new Event("vibe_auth_change"));
      router.push("/dashboard");
    } catch (err) {
      setError("Something went wrong. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <div className="card auth-card fade-in">
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🌊</div>
        <h2>Welcome, Future Vibe Coder</h2>
        <p>Enter your email to save your progress. No password needed — just vibes.</p>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              className="input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          {error && (
            <p style={{ color: "var(--accent-coral)", fontSize: "0.85rem", marginBottom: "1rem" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%" }}
            disabled={loading}
          >
            {loading ? "Diving in..." : "🚀 Start Learning"}
          </button>
        </form>

        <p style={{ marginTop: "1.5rem", fontSize: "0.8rem", color: "var(--text-dim)" }}>
          Your email is only used to save progress. No spam, ever.
        </p>
      </div>
    </div>
  );
}
