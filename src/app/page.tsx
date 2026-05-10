import Link from "next/link";

export default function HomePage() {
  return (
    <main className="page">
      {/* Hero */}
      <section className="hero container">
        <div className="hero-badge fade-in">✨ No Coding Experience Required</div>
        <h1 className="fade-in stagger-1">
          Build Real Apps with
          <br />
          <span className="gradient-text">AI as Your Developer</span>
        </h1>
        <p className="hero-subtitle fade-in stagger-2">
          Learn Vibe Coding — the revolutionary approach where you describe what you want
          and AI builds it. Go from absolute beginner to shipping real apps, guided step-by-step.
        </p>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center" }} className="fade-in stagger-3">
          <Link href="/auth/login" className="btn btn-lg btn-primary">
            🚀 Start Your Journey
          </Link>
          <Link href="/learn" className="btn btn-lg btn-secondary">
            📚 Explore Curriculum
          </Link>
        </div>
      </section>

      {/* Wave Divider */}
      <div className="wave-divider">
        <svg viewBox="0 0 1440 80" preserveAspectRatio="none">
          <path
            className="wave-fill"
            d="M0,40 C360,80 720,0 1080,40 C1260,60 1380,50 1440,40 L1440,80 L0,80 Z"
          />
        </svg>
      </div>

      {/* Features */}
      <section style={{ background: "var(--bg-secondary)", padding: "4rem 0" }}>
        <div className="container">
          <div className="section-title">
            <h2>Why Vibe Coding?</h2>
            <p>Traditional coding takes years. Vibe Coding lets you build from Day 1.</p>
          </div>
          <div className="feature-grid">
            <FeatureCard icon="🎯" title="Zero Code Required" desc="Describe what you want in plain English. AI writes the code for you." />
            <FeatureCard icon="🤖" title="AI-Powered Learning" desc="Learn with Google Antigravity — an AI-first IDE that builds alongside you." />
            <FeatureCard icon="🏆" title="Gamified Progress" desc="Earn XP, maintain streaks, and track your journey from beginner to pro." />
            <FeatureCard icon="🎬" title="Video Tutorials" desc="Each lesson includes curated YouTube videos for visual learners." />
            <FeatureCard icon="📝" title="Interactive Quizzes" desc="Test your knowledge with instant feedback and detailed explanations." />
            <FeatureCard icon="🌐" title="Ship Real Apps" desc="By Module 4, you will be building and deploying real web applications." />
          </div>
        </div>
      </section>

      {/* Journey Preview */}
      <section className="container" style={{ padding: "5rem 0" }}>
        <div className="section-title">
          <h2>Your Learning Journey</h2>
          <p>7 modules taking you from absolute zero to professional Vibe Coder.</p>
        </div>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <JourneyNode icon="🌱" title="The Starting Line" desc="What is code, AI, and Vibe Coding?" status="start" />
          <JourneyNode icon="🚀" title="Setting Up Your Launchpad" desc="Install Antigravity and create your first project" status="future" />
          <JourneyNode icon="🤖" title="Your First AI Conversation" desc="Master prompts and the iteration loop" status="future" />
          <JourneyNode icon="🏗️" title="Building Real Things" desc="Build a to-do app, portfolio, and calculator" status="future" />
          <JourneyNode icon="⚡" title="Power User Mode" desc="Skills, MCP tools, and multi-agent workflows" status="future" />
          <JourneyNode icon="🌐" title="Going Live" desc="Deploy, domains, databases — make it real" status="future" />
          <JourneyNode icon="🏆" title="Vibe Coder Pro" desc="Full-stack apps and professional portfolio" status="future" last />
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: "var(--bg-secondary)", padding: "5rem 0", textAlign: "center" }}>
        <div className="container">
          <h2 style={{ marginBottom: "1rem" }}>Ready to Start Building?</h2>
          <p style={{ color: "var(--text-secondary)", marginBottom: "2rem", maxWidth: 500, margin: "0 auto 2rem" }}>
            Join for free with just your email. No credit card, no password. Just vibes. 🌊
          </p>
          <Link href="/auth/login" className="btn btn-lg btn-primary">
            🌊 Dive In — It&apos;s Free
          </Link>
        </div>
      </section>

      <footer className="footer">
        <div className="container">
          <p>© 2026 Vibe Coder Journey. Built with vibes and AI. 🌊</p>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="card feature-card fade-in">
      <div className="feature-icon">{icon}</div>
      <h3 style={{ marginBottom: "0.5rem" }}>{title}</h3>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.6 }}>{desc}</p>
    </div>
  );
}

function JourneyNode({ icon, title, desc, status, last }: { icon: string; title: string; desc: string; status: string; last?: boolean }) {
  return (
    <>
      <div className="path-node fade-in">
        <div className={`path-dot ${status === "start" ? "active" : "locked"}`}>{icon}</div>
        <div className="path-info">
          <h3>{title}</h3>
          <p>{desc}</p>
        </div>
      </div>
      {!last && <div className={`path-connector ${status === "completed" ? "completed" : ""}`} />}
    </>
  );
}
