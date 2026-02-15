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
          ⚡ AnkiFlow
        </Link>
        <div className="about-nav-links">
          <a href="#features">Imkoniyatlar</a>
          <a href="#algorithm">Algoritm</a>
          <a href="#roadmap">Reja</a>
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
                      📊 Dashboard
                    </Link>
                    <button className="about-nav-dropdown-item danger" onClick={signOut}>
                      🚪 Chiqish
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <Link href="/login" className="about-nav-cta">
                Kirish →
              </Link>
            ))}
        </div>
      </nav>

      {/* ============ HERO SECTION ============ */}
      <section className="about-hero">
        <div className="about-hero-badge">⚡ SM-2 Spaced Repetition</div>
        <h1 className="about-hero-title">
          Xotirangizni <span className="about-gradient-text">ilmiy usulda</span> kuchaytiring
        </h1>
        <p className="about-hero-subtitle">
          AnkiFlow — flashcard yaratish, import qilish va ilmiy asoslangan takrorlash algoritmiga
          asoslangan o&#39;rganish platformasi. Bir marta yozing, umrbod eslab qoling.
        </p>
        <div className="about-hero-actions">
          {user ? (
            <Link href="/app" className="about-btn-primary">
              <span>Dashboard ga o&#39;tish</span>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          ) : (
            <Link href="/login" className="about-btn-primary">
              <span>Bepul boshlash</span>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          )}
          <a href="#algorithm" className="about-btn-secondary">
            Qanday ishlaydi?
          </a>
        </div>

        {/* Stats bar */}
        <div className="about-stats-bar">
          <div className="about-stat">
            <span className="about-stat-value">SM-2</span>
            <span className="about-stat-label">Algoritm</span>
          </div>
          <div className="about-stat-divider"></div>
          <div className="about-stat">
            <span className="about-stat-value">95%</span>
            <span className="about-stat-label">Eslab qolish</span>
          </div>
          <div className="about-stat-divider"></div>
          <div className="about-stat">
            <span className="about-stat-value">∞</span>
            <span className="about-stat-label">Bepul kartalar</span>
          </div>
          <div className="about-stat-divider"></div>
          <div className="about-stat">
            <span className="about-stat-value">☁️</span>
            <span className="about-stat-label">Cloud Sync</span>
          </div>
        </div>
      </section>

      {/* ============ FEATURES SECTION ============ */}
      <section className="about-section" id="features">
        <div className="about-section-header">
          <span className="about-section-badge">Imkoniyatlar</span>
          <h2 className="about-section-title">
            O&#39;rganish uchun kerak bo&#39;lgan <em>hamma narsa</em>
          </h2>
          <p className="about-section-subtitle">
            AnkiFlow flashcard yaratishdan tortib, ilg&#39;or takrorlash algoritmigacha — bir
            platformada jamlangan.
          </p>
        </div>

        <div className="about-features-grid">
          <div className="about-feature-card">
            <div className="about-feature-icon">📥</div>
            <h3>Smart Import</h3>
            <p>
              TXT, CSV, DOCX fayllarni yoki Google Docs havolasini paste qiling — AnkiFlow avtomatik
              term va definitionni ajratadi. Hatto <code>so&#39;z = tarjima</code> formatida ham
              ishlaydi.
            </p>
          </div>

          <div className="about-feature-card">
            <div className="about-feature-icon">🧠</div>
            <h3>Spaced Repetition (SRS)</h3>
            <p>
              SM-2 algoritmiga asoslangan. Bilganingizni kamroq, bilmaganingizni ko&#39;proq
              ko&#39;rsatadi. Vaqtingizni tejaydi, samarangizni oshiradi.
            </p>
          </div>

          <div className="about-feature-card">
            <div className="about-feature-icon">📋</div>
            <h3>Bulk Paste</h3>
            <p>
              Ko&#39;p qatorli matnni bir marta paste qiling — har bir qator alohida karta
              bo&#39;ladi. 20+ kartani bir zumda import qiling.
            </p>
          </div>

          <div className="about-feature-card">
            <div className="about-feature-icon">🔊</div>
            <h3>Text-to-Speech</h3>
            <p>
              Kartalarni eshitib o&#39;rganing. Har qanday tilda talaffuzni tinglang — til
              o&#39;rganish uchun ideal.
            </p>
          </div>

          <div className="about-feature-card">
            <div className="about-feature-icon">☁️</div>
            <h3>Cloud Sync</h3>
            <p>
              Barcha kartalaringiz avtomatik saqlanadi. Kompyuterda yarating, telefonda
              o&#39;rganing — hamma joyda sinxron.
            </p>
          </div>

          <div className="about-feature-card">
            <div className="about-feature-icon">📊</div>
            <h3>Statistika</h3>
            <p>
              Kunlik maqsad, streak, review tarix, aniqlik foizi — o&#39;z progressingizni kuzatib
              boring.
            </p>
          </div>
        </div>
      </section>

      {/* ============ SRS ALGORITHM SECTION ============ */}
      <section className="about-section about-algo-section" id="algorithm">
        <div className="about-section-header">
          <span className="about-section-badge">Ilmiy asos</span>
          <h2 className="about-section-title">
            SM-2: Xotira <em>ilmi</em> asosdagi algoritm
          </h2>
          <p className="about-section-subtitle">
            1987-yilda olim Piotr Woźniak tomonidan ishlab chiqilgan. Ebbinghaus ning unutish egri
            chizig&#39;iga asoslangan.
          </p>
        </div>

        {/* Forgetting Curve Visual */}
        <div className="about-algo-visual">
          <div className="about-algo-card">
            <h3>🧪 Muammo: Unutish egri chizig&#39;i</h3>
            <p>Inson biror narsani o&#39;rgangandan keyin, takrorlamasdan:</p>
            <div className="about-forget-bars">
              <div className="about-forget-row">
                <span className="about-forget-label">1 soatdan keyin</span>
                <div className="about-forget-bar">
                  <div className="about-forget-fill" style={{ width: "50%" }}>
                    50% unutiladi
                  </div>
                </div>
              </div>
              <div className="about-forget-row">
                <span className="about-forget-label">1 kundan keyin</span>
                <div className="about-forget-bar">
                  <div className="about-forget-fill about-forget-warn" style={{ width: "70%" }}>
                    70% unutiladi
                  </div>
                </div>
              </div>
              <div className="about-forget-row">
                <span className="about-forget-label">1 haftadan keyin</span>
                <div className="about-forget-bar">
                  <div className="about-forget-fill about-forget-danger" style={{ width: "90%" }}>
                    90% unutiladi
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="about-algo-card about-algo-solution">
            <h3>✅ Yechim: Optimal takrorlash</h3>
            <p>
              SM-2 algoritmi kartani <strong>unutishdan oldin</strong> ko&#39;rsatadi:
            </p>
            <div className="about-review-steps">
              <div className="about-step">
                <div className="about-step-number">1</div>
                <div className="about-step-text">
                  <strong>Yangi karta</strong>
                  <span>1 daqiqa → 10 daqiqa → Graduate</span>
                </div>
              </div>
              <div className="about-step">
                <div className="about-step-number">2</div>
                <div className="about-step-text">
                  <strong>1-chi review</strong>
                  <span>1 kun keyin</span>
                </div>
              </div>
              <div className="about-step">
                <div className="about-step-number">3</div>
                <div className="about-step-text">
                  <strong>2-chi review</strong>
                  <span>6 kun keyin</span>
                </div>
              </div>
              <div className="about-step">
                <div className="about-step-number">4</div>
                <div className="about-step-text">
                  <strong>3-chi review</strong>
                  <span>15 kun keyin</span>
                </div>
              </div>
              <div className="about-step">
                <div className="about-step-number">5</div>
                <div className="about-step-text">
                  <strong>4-chi review</strong>
                  <span>38 kun keyin...</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Rating buttons explanation */}
        <div className="about-ratings-explain">
          <h3>Baholash tugmalari qanday ishlaydi?</h3>
          <div className="about-ratings-grid">
            <div className="about-rating-card about-rating-again">
              <div className="about-rating-btn-label">Again</div>
              <p>Umuman eslay olmadim</p>
              <span className="about-rating-effect">
                → 1 daqiqadan qayta boshlanadi
                <br />→ Session ichida 3-8 kartadan keyin qaytadi
              </span>
            </div>
            <div className="about-rating-card about-rating-hard">
              <div className="about-rating-btn-label">Hard</div>
              <p>Qiyinchilik bilan esladim</p>
              <span className="about-rating-effect">
                → Tezroq takrorlanadi
                <br />→ Session ichida 5-12 kartadan keyin qaytadi
              </span>
            </div>
            <div className="about-rating-card about-rating-good">
              <div className="about-rating-btn-label">Good</div>
              <p>Normal esladim</p>
              <span className="about-rating-effect">
                → Keyingi step ga o&#39;tadi
                <br />→ 1 kun → 6 kun → 15 kun...
              </span>
            </div>
            <div className="about-rating-card about-rating-easy">
              <div className="about-rating-btn-label">Easy</div>
              <p>Juda oson edi</p>
              <span className="about-rating-effect">
                → Tez graduate bo&#39;ladi
                <br />→ Interval 1.3x bonus bilan oshadi
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ============ BENEFITS SECTION ============ */}
      <section className="about-section about-benefits-section">
        <div className="about-section-header">
          <span className="about-section-badge">Nima uchun?</span>
          <h2 className="about-section-title">
            Oddiy takrorlash <em>emas</em>, aqlli takrorlash
          </h2>
        </div>

        <div className="about-benefits-grid">
          <div className="about-benefit">
            <div className="about-benefit-icon">⏱️</div>
            <h3>Vaqtni tejang</h3>
            <p>
              Faqat unutish arafasidagi kartalarni ko&#39;rasiz. Bilganlaringiz bilan vaqtingizni
              behuda sarflamaysiz.
            </p>
          </div>
          <div className="about-benefit">
            <div className="about-benefit-icon">📈</div>
            <h3>95% samaradorlik</h3>
            <p>
              Tadqiqotlar shuni ko&#39;rsatadiki, SRS bilan o&#39;rgangan odamlar ma&#39;lumotning
              95% ini uzoq muddatga eslab qoladi.
            </p>
          </div>
          <div className="about-benefit">
            <div className="about-benefit-icon">🎯</div>
            <h3>Shaxsiy moslashgan</h3>
            <p>
              Ease Factor har bir kartaga alohida moslashadi. Sizga qiyin bo&#39;lgan so&#39;zlar
              ko&#39;proq, osonlari kamroq takrorlanadi.
            </p>
          </div>
          <div className="about-benefit">
            <div className="about-benefit-icon">🌍</div>
            <h3>Har qanday fan uchun</h3>
            <p>
              Chet tili, tibbiyot, dasturlash, tarix — flashcard bilan o&#39;rganish mumkin
              bo&#39;lgan har qanday soha uchun.
            </p>
          </div>
        </div>
      </section>

      {/* ============ ROADMAP SECTION ============ */}
      <section className="about-section about-roadmap-section" id="roadmap">
        <div className="about-section-header">
          <span className="about-section-badge">Kelajak</span>
          <h2 className="about-section-title">
            Rejalashtirilgan <em>yangi</em> imkoniyatlar
          </h2>
          <p className="about-section-subtitle">
            AnkiFlow doimiy rivojlanmoqda. Mana, keyingi qadam:
          </p>
        </div>

        <div className="about-roadmap-timeline">
          <div className="about-roadmap-item about-roadmap-done">
            <div className="about-roadmap-dot"></div>
            <div className="about-roadmap-content">
              <span className="about-roadmap-status">✅ Tayyor</span>
              <h4>SM-2 Spaced Repetition</h4>
              <p>Ilmiy asoslangan takrorlash algoritmiga asoslangan flashcard study</p>
            </div>
          </div>
          <div className="about-roadmap-item about-roadmap-done">
            <div className="about-roadmap-dot"></div>
            <div className="about-roadmap-content">
              <span className="about-roadmap-status">✅ Tayyor</span>
              <h4>Smart Import &amp; Bulk Paste</h4>
              <p>TXT, CSV, DOCX, Google Docs va multi-line paste support</p>
            </div>
          </div>
          <div className="about-roadmap-item about-roadmap-done">
            <div className="about-roadmap-dot"></div>
            <div className="about-roadmap-content">
              <span className="about-roadmap-status">✅ Tayyor</span>
              <h4>Cloud Sync &amp; Auth</h4>
              <p>Google/GitHub orqali kirish, barcha qurilmalarda sinxronlash</p>
            </div>
          </div>
          <div className="about-roadmap-item about-roadmap-progress">
            <div className="about-roadmap-dot"></div>
            <div className="about-roadmap-content">
              <span className="about-roadmap-status">🚧 Jarayonda</span>
              <h4>FSRS Algorithm</h4>
              <p>
                SM-2 dan yanada zamonaviy Free Spaced Repetition Scheduler ga o&#39;tish — mashinali
                o&#39;rganish asosida aniqroq intervallar
              </p>
            </div>
          </div>
          <div className="about-roadmap-item">
            <div className="about-roadmap-dot"></div>
            <div className="about-roadmap-content">
              <span className="about-roadmap-status">📋 Rejalangan</span>
              <h4>AI-Powered Card Generation</h4>
              <p>Matn yoki PDF yuklang — AI avtomatik flashcard yaratib beradi</p>
            </div>
          </div>
          <div className="about-roadmap-item">
            <div className="about-roadmap-dot"></div>
            <div className="about-roadmap-content">
              <span className="about-roadmap-status">📋 Rejalangan</span>
              <h4>Mobile App</h4>
              <p>iOS va Android uchun native dastur — offline rejimda ishlaydi</p>
            </div>
          </div>
          <div className="about-roadmap-item">
            <div className="about-roadmap-dot"></div>
            <div className="about-roadmap-content">
              <span className="about-roadmap-status">📋 Rejalangan</span>
              <h4>Collaborative Decks</h4>
              <p>Decklar bilan bo&#39;lishing, jamoaviy o&#39;rganish, public deck library</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ CTA SECTION ============ */}
      <section className="about-cta-section">
        <h2>Hoziroq boshlang</h2>
        <p>
          Bepul ro&#39;yxatdan o&#39;ting va flashcard yaratishni boshlang.
          <br />
          Xotirangizni ilmiy usulda kuchaytiring.
        </p>
        {user ? (
          <Link href="/app" className="about-btn-primary about-btn-large">
            <span>Dashboard ga o&#39;tish</span>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        ) : (
          <Link href="/login" className="about-btn-primary about-btn-large">
            <span>Bepul boshlash</span>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        )}
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="about-footer">
        <div className="about-footer-inner">
          <div>
            <span>⚡ AnkiFlow — Ilmiy o&#39;rganish platformasi</span>
            <div style={{ marginTop: "0.5rem", fontSize: "0.875rem", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <Link href="/privacy" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>Maxfiylik</Link>
              <Link href="/terms" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>Shartlar</Link>
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
