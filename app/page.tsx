"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

export default function LandingPage() {
  const { user, loading, signOut } = useAuth();

  return (
    <div className="about-page">
      {/* Animated background orbs */}
      <div className="about-orb about-orb-1"></div>
      <div className="about-orb about-orb-2"></div>
      <div className="about-orb about-orb-3"></div>

      {/* Navigation */}
      <nav className="about-nav">
        <Link href="/" className="about-nav-brand">
          <ion-icon name="flash" style={{ verticalAlign: 'middle' }}></ion-icon> AnkiFlow
        </Link>
        <div className="about-nav-links">
          <a href="#features">Features</a>
          <a href="#how-it-works">How It Works</a>
          <a href="#dictionary">Dictionary</a>
          <a href="#roadmap">Roadmap</a>
          {!loading &&
            (user ? (
              <>
                <Link href="/app" className="about-nav-cta">
                  Dashboard →
                </Link>
                <div className="about-nav-profile">
                  {user?.user_metadata?.avatar_url ? (
                    <img src={user.user_metadata.avatar_url} alt="" className="about-nav-avatar" />
                  ) : (
                    <div className="about-nav-avatar-placeholder">
                      {(user?.email?.[0] || "U").toUpperCase()}
                    </div>
                  )}
                  <div className="about-nav-dropdown">
                    <div className="about-nav-dropdown-header">
                      <div className="about-nav-dropdown-name">
                        {user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User"}
                      </div>
                      <div className="about-nav-dropdown-email">{user?.email}</div>
                    </div>
                    <Link href="/app" className="about-nav-dropdown-item">
                      <ion-icon name="bar-chart-outline"></ion-icon> Dashboard
                    </Link>
                    <Link href="/app/study" className="about-nav-dropdown-item">
                      <ion-icon name="library-outline"></ion-icon> Flashcards
                    </Link>
                    <button className="about-nav-dropdown-item danger" onClick={signOut}>
                      <ion-icon name="log-out-outline"></ion-icon> Sign Out
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <Link href="/login" className="about-nav-cta">
                Get Started →
              </Link>
            ))}
        </div>
      </nav>

      {/* ============ HERO SECTION ============ */}
      <section className="about-hero">
        <div className="about-hero-badge"><ion-icon name="flash" style={{ verticalAlign: 'middle' }}></ion-icon> Smart Flashcards + Dictionary</div>
        <h1 className="about-hero-title">
          Learn Smarter, <span className="about-gradient-text">Remember Forever</span>
        </h1>
        <p className="about-hero-subtitle">
          Create flashcards, look up words in the dictionary, and master any subject with 
          scientifically proven spaced repetition. Your all-in-one learning companion.
        </p>
        <div className="about-hero-actions">
          {user ? (
            <Link href="/app" className="about-btn-primary">
              <span>Go to Dashboard</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          ) : (
            <Link href="/login" className="about-btn-primary">
              <span>Start Free — No Card Required</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          )}
          <a href="#how-it-works" className="about-btn-secondary">
            See How It Works
          </a>
        </div>

        {/* Stats bar */}
        <div className="about-stats-bar">
          <div className="about-stat">
            <span className="about-stat-value">SM-2</span>
            <span className="about-stat-label">Algorithm</span>
          </div>
          <div className="about-stat-divider"></div>
          <div className="about-stat">
            <span className="about-stat-value">95%</span>
            <span className="about-stat-label">Retention</span>
          </div>
          <div className="about-stat-divider"></div>
          <div className="about-stat">
            <span className="about-stat-value">∞</span>
            <span className="about-stat-label">Free Cards</span>
          </div>
          <div className="about-stat-divider"></div>
          <div className="about-stat">
            <span className="about-stat-value"><ion-icon name="book-outline"></ion-icon></span>
            <span className="about-stat-label">Dictionary</span>
          </div>
          <div className="about-stat-divider"></div>
          <div className="about-stat">
            <span className="about-stat-value"><ion-icon name="cloud-outline"></ion-icon></span>
            <span className="about-stat-label">Cloud Sync</span>
          </div>
        </div>
      </section>

      {/* ============ FEATURES SECTION ============ */}
      <section className="about-section" id="features">
        <div className="about-section-header">
          <span className="about-section-badge">Features</span>
          <h2 className="about-section-title">
            Everything You Need <em>to Learn</em>
          </h2>
          <p className="about-section-subtitle">
            From smart flashcard creation to built-in dictionary — all in one platform.
          </p>
        </div>

        <div className="about-features-grid">
          <div className="about-feature-card">
            <div className="about-feature-icon"><ion-icon name="book-outline"></ion-icon></div>
            <h3>Built-in Dictionary</h3>
            <p>
              Look up any word instantly with definitions, pronunciation, examples, and phonetics. 
              Powered by comprehensive dictionary data — no need to leave the app.
            </p>
          </div>

          <div className="about-feature-card">
            <div className="about-feature-icon"><ion-icon name="bulb-outline"></ion-icon></div>
            <h3>Spaced Repetition (SRS)</h3>
            <p>
              Based on SM-2 algorithm. Shows what you don&apos;t know more often, what you know less frequently. 
              Saves your time, increases efficiency.
            </p>
          </div>

          <div className="about-feature-card">
            <div className="about-feature-icon"><ion-icon name="download-outline"></ion-icon></div>
            <h3>Smart Import</h3>
            <p>
              Paste TXT, CSV, DOCX files or Google Docs links — AnkiFlow automatically separates terms and definitions. 
              Even works with <code>word = translation</code> format.
            </p>
          </div>

          <div className="about-feature-card">
            <div className="about-feature-icon"><ion-icon name="volume-high-outline"></ion-icon></div>
            <h3>Text-to-Speech</h3>
            <p>
              Learn by listening. Hear pronunciation in any language — ideal for language learning.
            </p>
          </div>

          <div className="about-feature-card">
            <div className="about-feature-icon"><ion-icon name="cloud-outline"></ion-icon></div>
            <h3>Cloud Sync</h3>
            <p>
              All your cards are automatically saved. Create on computer, study on phone — synced everywhere.
            </p>
          </div>

          <div className="about-feature-card">
            <div className="about-feature-icon"><ion-icon name="school-outline"></ion-icon></div>
            <h3>Teacher &amp; Student Mode</h3>
            <p>
              Teachers create groups and assignments. Students join, study flashcards, earn XP, and track progress together.
            </p>
          </div>
        </div>
      </section>

      {/* ============ DICTIONARY PREVIEW SECTION ============ */}
      <section className="about-section about-dict-section" id="dictionary">
        <div className="about-section-header">
          <span className="about-section-badge">New Feature</span>
          <h2 className="about-section-title">
            Built-in <em>Dictionary</em>
          </h2>
          <p className="about-section-subtitle">
            Look up any English word — get definitions, pronunciation, examples, and phonetics. 
            All without leaving your study session.
          </p>
        </div>

        <div className="about-dict-preview">
          <div className="about-dict-card">
            <div className="about-dict-header">
              <div className="about-dict-word">example</div>
              <div className="about-dict-phonetic">/ɪɡˈzɑːmpəl/</div>
              <div className="about-dict-audio"><ion-icon name="volume-high-outline"></ion-icon></div>
            </div>
            <div className="about-dict-meanings">
              <div className="about-dict-pos">noun</div>
              <div className="about-dict-def">
                A thing characteristic of its kind or illustrating a general rule.
              </div>
              <div className="about-dict-example">
                &quot;it&apos;s a good example of how European architecture influenced the city&quot;
              </div>
              <div className="about-dict-pos" style={{ marginTop: '16px' }}>verb</div>
              <div className="about-dict-def">
                To be illustrated or exemplified.
              </div>
            </div>
          </div>
          <div className="about-dict-features">
            <div className="about-dict-feat">
              <span className="about-dict-feat-icon"><ion-icon name="document-text-outline"></ion-icon></span>
              <div>
                <strong>Definitions</strong>
                <p>Multiple meanings with part of speech</p>
              </div>
            </div>
            <div className="about-dict-feat">
              <span className="about-dict-feat-icon"><ion-icon name="mic-outline"></ion-icon></span>
              <div>
                <strong>Pronunciation</strong>
                <p>IPA phonetics with audio playback</p>
              </div>
            </div>
            <div className="about-dict-feat">
              <span className="about-dict-feat-icon"><ion-icon name="bulb-outline"></ion-icon></span>
              <div>
                <strong>Examples</strong>
                <p>Real-world usage examples</p>
              </div>
            </div>
            <div className="about-dict-feat">
              <span className="about-dict-feat-icon"><ion-icon name="library-outline"></ion-icon></span>
              <div>
                <strong>Add to Flashcards</strong>
                <p>Save words directly to your decks</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ HOW IT WORKS SECTION ============ */}
      <section className="about-section about-algo-section" id="how-it-works">
        <div className="about-section-header">
          <span className="about-section-badge">Scientific Foundation</span>
          <h2 className="about-section-title">
            SM-2: <em>Science-Based</em> Memory Algorithm
          </h2>
          <p className="about-section-subtitle">
            Developed by scientist Piotr Woźniak in 1987. Based on Ebbinghaus&apos;s forgetting curve.
          </p>
        </div>

        {/* Forgetting Curve Visual */}
        <div className="about-algo-visual">
          <div className="about-algo-card">
            <h3><ion-icon name="flask-outline" style={{ verticalAlign: 'middle', marginRight: 6 }}></ion-icon> Problem: The Forgetting Curve</h3>
            <p>After learning something, without review:</p>
            <div className="about-forget-bars">
              <div className="about-forget-row">
                <span className="about-forget-label">After 1 hour</span>
                <div className="about-forget-bar">
                  <div className="about-forget-fill" style={{ width: "50%" }}>
                    50% forgotten
                  </div>
                </div>
              </div>
              <div className="about-forget-row">
                <span className="about-forget-label">After 1 day</span>
                <div className="about-forget-bar">
                  <div className="about-forget-fill about-forget-warn" style={{ width: "70%" }}>
                    70% forgotten
                  </div>
                </div>
              </div>
              <div className="about-forget-row">
                <span className="about-forget-label">After 1 week</span>
                <div className="about-forget-bar">
                  <div className="about-forget-fill about-forget-danger" style={{ width: "90%" }}>
                    90% forgotten
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="about-algo-card about-algo-solution">
            <h3><ion-icon name="checkmark-circle" style={{ verticalAlign: 'middle', marginRight: 6 }}></ion-icon> Solution: Optimal Repetition</h3>
            <p>
              SM-2 algorithm shows cards <strong>before you forget</strong>:
            </p>
            <div className="about-review-steps">
              <div className="about-step">
                <div className="about-step-number">1</div>
                <div className="about-step-text">
                  <strong>New card</strong>
                  <span>1 minute → 10 minutes → Graduate</span>
                </div>
              </div>
              <div className="about-step">
                <div className="about-step-number">2</div>
                <div className="about-step-text">
                  <strong>1st review</strong>
                  <span>After 1 day</span>
                </div>
              </div>
              <div className="about-step">
                <div className="about-step-number">3</div>
                <div className="about-step-text">
                  <strong>2nd review</strong>
                  <span>After 6 days</span>
                </div>
              </div>
              <div className="about-step">
                <div className="about-step-number">4</div>
                <div className="about-step-text">
                  <strong>3rd review</strong>
                  <span>After 15 days</span>
                </div>
              </div>
              <div className="about-step">
                <div className="about-step-number">5</div>
                <div className="about-step-text">
                  <strong>4th review</strong>
                  <span>After 38 days...</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Rating buttons explanation */}
        <div className="about-ratings-explain">
          <h3>How Do Rating Buttons Work?</h3>
          <div className="about-ratings-grid">
            <div className="about-rating-card about-rating-again">
              <div className="about-rating-btn-label">Again</div>
              <p>Couldn&apos;t remember at all</p>
              <span className="about-rating-effect">
                → Restarts after 1 minute
                <br />→ Returns after 3-8 cards in session
              </span>
            </div>
            <div className="about-rating-card about-rating-hard">
              <div className="about-rating-btn-label">Hard</div>
              <p>Remembered with difficulty</p>
              <span className="about-rating-effect">
                → Reviews sooner
                <br />→ Returns after 5-12 cards in session
              </span>
            </div>
            <div className="about-rating-card about-rating-good">
              <div className="about-rating-btn-label">Good</div>
              <p>Remembered normally</p>
              <span className="about-rating-effect">
                → Moves to next step
                <br />→ 1 day → 6 days → 15 days...
              </span>
            </div>
            <div className="about-rating-card about-rating-easy">
              <div className="about-rating-btn-label">Easy</div>
              <p>Very easy</p>
              <span className="about-rating-effect">
                → Graduates faster
                <br />→ Interval increases with 1.3x bonus
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ============ BENEFITS SECTION ============ */}
      <section className="about-section about-benefits-section">
        <div className="about-section-header">
          <span className="about-section-badge">Why AnkiFlow?</span>
          <h2 className="about-section-title">
            Not Just Repetition, <em>Smart</em> Repetition
          </h2>
        </div>

        <div className="about-benefits-grid">
          <div className="about-benefit">
            <div className="about-benefit-icon"><ion-icon name="timer-outline"></ion-icon></div>
            <h3>Save Time</h3>
            <p>
              Only see cards you&apos;re about to forget. Don&apos;t waste time on what you already know.
            </p>
          </div>
          <div className="about-benefit">
            <div className="about-benefit-icon"><ion-icon name="trending-up-outline"></ion-icon></div>
            <h3>95% Efficiency</h3>
            <p>
              Research shows people who learn with SRS retain 95% of information
              over the long term.
            </p>
          </div>
          <div className="about-benefit">
            <div className="about-benefit-icon"><ion-icon name="flag-outline"></ion-icon></div>
            <h3>Personalized</h3>
            <p>
              Ease Factor adapts to each card individually. Words you find difficult repeat more often.
            </p>
          </div>
          <div className="about-benefit">
            <div className="about-benefit-icon"><ion-icon name="globe-outline"></ion-icon></div>
            <h3>For Any Subject</h3>
            <p>
              Languages, medicine, programming, history — any field that can be learned with flashcards.
            </p>
          </div>
        </div>
      </section>

      {/* ============ ROADMAP SECTION ============ */}
      <section className="about-section about-roadmap-section" id="roadmap">
        <div className="about-section-header">
          <span className="about-section-badge">Future</span>
          <h2 className="about-section-title">
            Planned <em>New</em> Features
          </h2>
          <p className="about-section-subtitle">
            AnkiFlow is constantly evolving. Here&apos;s what&apos;s next:
          </p>
        </div>

        <div className="about-roadmap-timeline">
          <div className="about-roadmap-item about-roadmap-done">
            <div className="about-roadmap-dot"></div>
            <div className="about-roadmap-content">
              <span className="about-roadmap-status"><ion-icon name="checkmark-circle" style={{ color: '#10B981' }}></ion-icon> Done</span>
              <h4>SM-2 Spaced Repetition</h4>
              <p>Science-based spaced repetition algorithm for flashcard study</p>
            </div>
          </div>
          <div className="about-roadmap-item about-roadmap-done">
            <div className="about-roadmap-dot"></div>
            <div className="about-roadmap-content">
              <span className="about-roadmap-status"><ion-icon name="checkmark-circle" style={{ color: '#10B981' }}></ion-icon> Done</span>
              <h4>Smart Import &amp; Bulk Paste</h4>
              <p>TXT, CSV, DOCX, Google Docs and multi-line paste support</p>
            </div>
          </div>
          <div className="about-roadmap-item about-roadmap-done">
            <div className="about-roadmap-dot"></div>
            <div className="about-roadmap-content">
              <span className="about-roadmap-status"><ion-icon name="checkmark-circle" style={{ color: '#10B981' }}></ion-icon> Done</span>
              <h4>Cloud Sync &amp; Auth</h4>
              <p>Sign in via Google/GitHub, sync across all devices</p>
            </div>
          </div>
          <div className="about-roadmap-item about-roadmap-done">
            <div className="about-roadmap-dot"></div>
            <div className="about-roadmap-content">
              <span className="about-roadmap-status"><ion-icon name="checkmark-circle" style={{ color: '#10B981' }}></ion-icon> Done</span>
              <h4>Built-in Dictionary</h4>
              <p>Look up English words with definitions, phonetics, pronunciation, and examples</p>
            </div>
          </div>
          <div className="about-roadmap-item about-roadmap-progress">
            <div className="about-roadmap-dot"></div>
            <div className="about-roadmap-content">
              <span className="about-roadmap-status"><ion-icon name="construct-outline" style={{ color: '#F59E0B' }}></ion-icon> In Progress</span>
              <h4>FSRS Algorithm</h4>
              <p>
                Upgrading from SM-2 to the more modern Free Spaced Repetition Scheduler — more accurate intervals based on machine learning
              </p>
            </div>
          </div>
          <div className="about-roadmap-item">
            <div className="about-roadmap-dot"></div>
            <div className="about-roadmap-content">
              <span className="about-roadmap-status"><ion-icon name="clipboard-outline" style={{ color: '#94a3b8' }}></ion-icon> Planned</span>
              <h4>AI-Powered Card Generation</h4>
              <p>Upload text or PDF — AI automatically generates flashcards</p>
            </div>
          </div>
          <div className="about-roadmap-item">
            <div className="about-roadmap-dot"></div>
            <div className="about-roadmap-content">
              <span className="about-roadmap-status"><ion-icon name="clipboard-outline" style={{ color: '#94a3b8' }}></ion-icon> Planned</span>
              <h4>Mobile App</h4>
              <p>Native app for iOS and Android — works offline</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ CTA SECTION ============ */}
      <section className="about-cta-section">
        <h2>Start Learning Today</h2>
        <p>
          Sign up for free and start creating flashcards.
          <br />
          Strengthen your memory scientifically.
        </p>
        {user ? (
          <Link href="/app" className="about-btn-primary about-btn-large">
            <span>Go to Dashboard</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        ) : (
          <Link href="/login" className="about-btn-primary about-btn-large">
            <span>Start Free</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        )}
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="about-footer">
        <div className="about-footer-inner">
          <div>
            <span><ion-icon name="flash" style={{ verticalAlign: 'middle' }}></ion-icon> AnkiFlow — Scientific Learning Platform</span>
            <div style={{ marginTop: "0.5rem", fontSize: "0.875rem", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <Link href="/privacy" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>Privacy</Link>
              <Link href="/terms" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>Terms</Link>
              <a href="https://github.com/sodops/anki-formatter" target="_blank" rel="noopener" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>GitHub</a>
              <a href="mailto:support@ankiflow.com" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>Support</a>
            </div>
          </div>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}
