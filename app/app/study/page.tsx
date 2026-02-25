"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { AppSkeleton } from "@/components/app/AppSkeleton";
import { reportWebVitals } from "@/lib/web-vitals";

export default function Home() {
  const { user, session, loading, role } = useAuth();
  const router = useRouter();

  // Report Web Vitals on mount
  useEffect(() => {
    reportWebVitals();
  }, []);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (loading) return;
    if (!user) return; // Don't initialize app if not logged in

    // Hide skeleton, show app after JS modules load
    const skeleton = document.getElementById("appSkeleton");
    const container = document.getElementById("appContainer");
    if (skeleton) skeleton.style.display = "none";
    if (container) {
      container.style.visibility = "visible";
      container.style.position = "static";
      container.removeAttribute("aria-hidden");
    }

    // Expose auth info to vanilla JS modules via window
    (window as any).__ankiflow_auth = {
      user: user
        ? {
            id: user.id,
            email: user.email,
            name:
              user.user_metadata?.full_name ||
              user.user_metadata?.name ||
              user.email?.split("@")[0] ||
              "User",
            avatar: user.user_metadata?.avatar_url || null,
          }
        : null,
      accessToken: session?.access_token || null,
      role: role || 'student',
    };

    // Fire auth event so store.js can pick it up
    window.dispatchEvent(
      new CustomEvent("ankiflow:auth-ready", {
        detail: (window as any).__ankiflow_auth,
      })
    );

    // Load Ionicons dynamically (avoids hydration mismatch from class="hydrated")
    const ionModule = document.createElement("script");
    ionModule.type = "module";
    ionModule.src = "https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.esm.js";
    document.head.appendChild(ionModule);

    const ionFallback = document.createElement("script");
    ionFallback.setAttribute("nomodule", "");
    ionFallback.src = "https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.js";
    document.head.appendChild(ionFallback);

    // Load main.js as ES6 module via DOM injection
    // (Next.js strips <script> tags from JSX, so we do it programmatically)
    // Prevent duplicate loading in React Strict Mode (dev mode runs useEffect twice)
    const scriptSrc = "/js/main.js";
    if (!document.querySelector(`script[src="${scriptSrc}"]`)) {
      const script = document.createElement("script");
      script.type = "module";
      script.src = scriptSrc;
      document.body.appendChild(script);
    } else {
      // Script already exists (SPA navigation), manually re-init
      if ((window as any).initAnkiFlow) {
        (window as any).initAnkiFlow();
      }
    }
  }, [user, session, loading]);

  // Register Service Worker for offline support
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration);
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    }
  }, []);

  if (loading || !user) {
    return (
      <main id="app-main">
        <div className="app-background"></div>
        <AppSkeleton />
      </main>
    );
  }

  return (
    <main id="app-main">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <noscript>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
            fontSize: "18px",
            color: "#888",
            textAlign: "center",
            padding: "20px",
          }}
        >
          AnkiFlow requires JavaScript to run. Please enable JavaScript in your browser.
        </div>
      </noscript>

      {/* Subtle Background */}
      <div className="app-background"></div>

      {/* Loading Skeleton */}
      <div id="appSkeleton" className="app-skeleton">
        <div className="skeleton-sidebar">
          <div className="skeleton-line w60"></div>
          <div className="skeleton-line w80"></div>
          <div className="skeleton-line w40"></div>
          <div className="skeleton-line w70"></div>
        </div>
        <div className="skeleton-main">
          <div className="skeleton-topbar"></div>
          <div className="skeleton-content">
            <div className="skeleton-line w50"></div>
            <div className="skeleton-rect"></div>
            <div className="skeleton-line w80"></div>
            <div className="skeleton-line w60"></div>
          </div>
        </div>
      </div>

      <div
        className="app-container"
        id="appContainer"
        style={{ visibility: "hidden", position: "absolute" }}
      >
        {/* Mobile Hamburger */}
        <button className="hamburger-btn" id="hamburgerBtn" aria-label="Toggle menu">
          <ion-icon name="menu-outline"></ion-icon>
        </button>
        <div className="sidebar-overlay" id="sidebarOverlay"></div>

        {/* SIDEBAR */}
        <nav className="sidebar" id="sidebar" aria-label="Main navigation">
          <div className="brand">
            <ion-icon name="flash"></ion-icon>
            <span>AnkiFlow</span>
            <button className="sidebar-collapse-btn" id="sidebarCollapseBtn" aria-label="Toggle sidebar" title="Toggle sidebar">
              <ion-icon name="chevron-back-outline"></ion-icon>
            </button>
            <button className="sidebar-close-btn" id="sidebarCloseBtn" aria-label="Close sidebar">
              <ion-icon name="close-outline"></ion-icon>
            </button>
          </div>

          <div className="sidebar-section">
            <h3>My Decks</h3>
            <ul className="deck-list" id="deckList"></ul>
            <button className="new-deck-btn" id="btnNewDeck">
              <ion-icon name="add-circle"></ion-icon> New Deck
            </button>
          </div>

          {/* Back to Dashboard Link */}
          <div className="sidebar-section">
            <a
              href={role === 'teacher' ? '/teacher' : '/student'}
              className="new-deck-btn"
              style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <ion-icon name="arrow-back-outline"></ion-icon>
              Back to Dashboard
            </a>
          </div>

          <div className="sidebar-footer">
            <div className="daily-goal-widget" id="dailyGoalWidget">
              <div className="goal-progress">
                <div
                  className="goal-progress-bar"
                  id="goalProgressBar"
                  style={{ width: "0%" }}
                ></div>
              </div>
              <div className="goal-info">
                <span className="goal-text" id="goalText">
                  0 / 20 cards today
                </span>
                <span className="streak-badge" id="streakBadge">
                  <ion-icon name="flame"></ion-icon> <span>0</span>
                </span>
              </div>
            </div>
            <div className="status-indicator online">
              <span className="dot"></span> <span id="autoSaveText">System Ready</span>
            </div>
          </div>
        </nav>

        {/* MAIN WORKSPACE */}
        <div className="main-content" id="main-content" role="main">
          {/* TOP BAR */}
          <div className="top-bar">
            <div className="omnibar-container" id="omnibarContainer">
              <div className="omnibar-icon clickable" id="omnibarIcon" title="Click to upload file">
                <ion-icon name="cloud-upload-outline"></ion-icon>
              </div>
              <input
                type="text"
                id="omnibarInput"
                placeholder="Type word - def, paste text, or drag files here..."
                autoComplete="off"
                aria-label="Search cards or paste text to import"
              />
              <div className="omnibar-actions">
                <div className="md-toolbar">
                  <button className="md-btn" title="Bold (Ctrl+B)" data-md="**" aria-label="Make text bold">
                    <b>B</b>
                  </button>
                  <button className="md-btn" title="Italic (Ctrl+I)" data-md="*" aria-label="Make text italic">
                    <i>I</i>
                  </button>
                  <button className="md-btn" title="Code (Ctrl+`)" data-md="`" aria-label="Format as code">
                    &lt;/&gt;
                  </button>
                </div>
                <span className="key-hint">ENTER</span>
              </div>
              <input type="file" id="fileInput" className="hidden" accept=".txt,.csv,.docx" aria-label="Upload file to import cards" />
              <div id="commandDropdown" className="command-dropdown hidden"></div>
              <div id="omnibarPreview" className="omnibar-preview hidden"></div>
            </div>
          </div>

          {/* TAB NAVIGATION */}
          <div className="tab-navigation">
            <button className="nav-tab active" data-view="library">
              <ion-icon name="library-outline"></ion-icon>
              <span>Library</span>
            </button>
            <button className="nav-tab" data-view="study">
              <ion-icon name="book-outline"></ion-icon>
              <span>Study</span>
            </button>
            <button className="nav-tab" data-view="dictionary">
              <ion-icon name="language-outline"></ion-icon>
              <span>Dictionary</span>
            </button>
          </div>

          {/* LIBRARY VIEW */}
          <div id="view-library" className="view-container">
            <div className="workspace">
              <div className="deck-header">
                <h1 id="currentDeckTitle">My Vocabulary</h1>
                <div className="search-container">
                  <ion-icon name="search-outline" className="search-icon"></ion-icon>
                  <input
                    type="text"
                    id="searchInput"
                    placeholder="Search cards..."
                    autoComplete="off"
                    aria-label="Search cards"
                  />
                  <button
                    className="search-clear hidden"
                    id="btnClearSearch"
                    aria-label="Clear search"
                  >
                    <ion-icon name="close-outline"></ion-icon>
                  </button>
                </div>
                <div className="deck-actions-header">
                  <button
                    className="action-btn secondary"
                    id="btnFindReplace"
                    title="Find & Replace"
                  >
                    <ion-icon name="search-outline"></ion-icon>{" "}
                    <span className="btn-text">Find &amp; Replace</span>
                  </button>
                  <button className="action-btn secondary" id="btnImportCards">
                    <ion-icon name="cloud-upload-outline"></ion-icon>{" "}
                    <span className="btn-text">Import</span>
                  </button>
                  <button className="action-btn secondary" id="btnExportDeck">
                    <ion-icon name="download-outline"></ion-icon>{" "}
                    <span className="btn-text">Export</span>
                  </button>
                  <button className="action-btn primary" id="btnStudyDeck">
                    <ion-icon name="play-circle-outline"></ion-icon>{" "}
                    <span className="btn-text">Study</span>
                  </button>
                </div>
                <div className="deck-stats">
                  <span className="stat-badge">
                    <span id="countTotal">0</span> Items
                  </span>
                  <span className="stat-badge warning hidden" id="countIssues">
                    0 Issues
                  </span>
                </div>
              </div>

              <div className="table-container">
                <table className="live-table" id="cardTable">
                  <thead>
                    <tr>
                      <th style={{ width: "40px" }}>
                        <input
                          type="checkbox"
                          id="selectAllCheckbox"
                          aria-label="Select all cards"
                        />
                      </th>
                      <th>Term</th>
                      <th>Definition</th>
                      <th>Tags</th>
                      <th style={{ width: "50px" }}></th>
                    </tr>
                  </thead>
                  <tbody id="tableBody">
                    <tr className="empty-state" id="emptyState">
                      <td colSpan={5}>
                        <div className="empty-content">
                          <ion-icon name="library-outline"></ion-icon>
                          <p>Start typing or drag a file to begin.</p>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* STUDY VIEW */}
          <div id="view-study" className="view-container hidden">
            <div className="workspace study-workspace">
              <div className="deck-header">
                <h1 id="studyDeckTitle">Study Session</h1>
                <div className="header-actions">
                  <div className="study-progress-pill">
                    <span id="studyIndex">0</span> / <span id="studyTotal">0</span>
                  </div>
                </div>
              </div>
              <div className="study-progress-container" id="studyProgressContainer">
                <div className="study-progress-bar-outer">
                  <div className="study-progress-bar-inner" id="studyProgressBar"></div>
                </div>
                <div className="study-progress-info">
                  <span id="studyProgressText">0 / 0</span>
                  <span id="studyProgressPercent">0%</span>
                </div>
              </div>

              <div className="study-view-container">
                <div id="studyPlaceholder" className="study-placeholder">
                  <div className="placeholder-icon"><ion-icon name="library-outline" style={{ fontSize: 48 }}></ion-icon></div>
                  <h3>Start Studying</h3>
                  <p>Select a deck from the Library to begin reviewing cards.</p>
                </div>

                {/* Session Summary */}
                <div id="sessionSummary" className="session-summary hidden">
                  <div className="summary-icon"><ion-icon name="trophy-outline" style={{ fontSize: 48 }}></ion-icon></div>
                  <h2>Session Complete!</h2>
                  <p className="summary-subtitle" id="summarySubtitle">
                    You reviewed 0 cards
                  </p>
                  <div className="summary-grid">
                    <div className="summary-stat again">
                      <div className="summary-stat-value" id="summaryAgain">
                        0
                      </div>
                      <div className="summary-stat-label">Again</div>
                    </div>
                    <div className="summary-stat hard">
                      <div className="summary-stat-value" id="summaryHard">
                        0
                      </div>
                      <div className="summary-stat-label">Hard</div>
                    </div>
                    <div className="summary-stat good">
                      <div className="summary-stat-value" id="summaryGood">
                        0
                      </div>
                      <div className="summary-stat-label">Good</div>
                    </div>
                    <div className="summary-stat easy">
                      <div className="summary-stat-value" id="summaryEasy">
                        0
                      </div>
                      <div className="summary-stat-label">Easy</div>
                    </div>
                  </div>
                  <div className="summary-accuracy">
                    <div className="accuracy-ring" id="accuracyRing">
                      <svg viewBox="0 0 36 36">
                        <path
                          className="ring-bg"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className="ring-fg"
                          id="accuracyPath"
                          strokeDasharray="0, 100"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <span className="accuracy-text" id="accuracyText">
                        0%
                      </span>
                    </div>
                    <span className="accuracy-label">Accuracy</span>
                  </div>
                  <div className="summary-actions">
                    <button className="action-btn secondary" id="btnBackToLibrary">
                      Back to Library
                    </button>
                    <button className="action-btn primary" id="btnStudyAgain">
                      Study Again
                    </button>
                  </div>
                </div>

                {/* Study Interface */}
                <div id="studyInterface" className="study-interface hidden">
                  <div className="flashcard-area" id="flashcard">
                    <div className="flashcard-inner">
                      <div className="flashcard-front">
                        <button className="tts-btn tts-icon" data-text-role="term" title="Listen">
                          <ion-icon name="volume-high-outline"></ion-icon>
                        </button>
                        <div className="card-label">TERM</div>
                        <div className="card-content" id="studyFront"></div>
                        <div className="hint-text">Click to Flip (Space)</div>
                      </div>
                      <div className="flashcard-back">
                        <button className="tts-btn tts-icon" data-text-role="def" title="Listen">
                          <ion-icon name="volume-high-outline"></ion-icon>
                        </button>
                        <div className="card-label">DEFINITION</div>
                        <div className="card-content" id="studyBack"></div>
                      </div>
                    </div>
                  </div>
                  <div className="study-controls">
                    <button className="action-btn primary large" id="btnStudyFlip">
                      Show Answer (Space)
                    </button>
                    <div className="study-rating-buttons hidden">
                      <button className="rating-btn rating-again" id="btnAgain">
                        <ion-icon name="close-circle"></ion-icon> Again{" "}
                        <kbd className="rating-kbd">1</kbd>
                      </button>
                      <button className="rating-btn rating-hard" id="btnHard">
                        <ion-icon name="sad-outline"></ion-icon> Hard{" "}
                        <kbd className="rating-kbd">2</kbd>
                      </button>
                      <button className="rating-btn rating-good" id="btnGood">
                        <ion-icon name="checkmark-circle"></ion-icon> Good{" "}
                        <kbd className="rating-kbd">3</kbd>
                      </button>
                      <button className="rating-btn rating-easy" id="btnEasy">
                        <ion-icon name="happy-outline"></ion-icon> Easy{" "}
                        <kbd className="rating-kbd">4</kbd>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* DICTIONARY VIEW */}
          <div id="view-dictionary" className="view-container hidden">
            <div className="workspace dict-workspace">
              <div className="deck-header">
                <h1><ion-icon name="book-outline" style={{ marginRight: 8, verticalAlign: 'middle' }}></ion-icon> Dictionary</h1>
              </div>
              <div className="dict-container">
                <div className="dict-search-box">
                  <ion-icon name="search-outline"></ion-icon>
                  <input
                    type="text"
                    id="dictSearchInput"
                    placeholder="Look up any English word..."
                    autoComplete="off"
                    aria-label="Search dictionary"
                  />
                  <button className="dict-search-btn" id="btnDictSearch">
                    <ion-icon name="arrow-forward-outline"></ion-icon>
                  </button>
                </div>
                <div id="dictResult" className="dict-result">
                  <div className="dict-empty">
                    <ion-icon name="language-outline" style={{ fontSize: '48px', opacity: 0.3 }}></ion-icon>
                    <p>Search for a word to see its definitions, pronunciations, and examples.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* BULK ACTION BAR */}
          <div id="bulkActionBar" className="bulk-bar hidden">
            <div className="bulk-info">
              <span id="bulkCount">0</span> selected
            </div>
            <div className="bulk-actions">
              <button className="action-btn secondary small" id="btnBulkTag">
                <ion-icon name="pricetag-outline"></ion-icon> Tag
              </button>
              <button className="action-btn danger small" id="btnBulkDelete">
                <ion-icon name="trash-outline"></ion-icon> Delete
              </button>
              <button className="icon-btn" id="btnBulkCancel" aria-label="Cancel selection">
                <ion-icon name="close"></ion-icon>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* TOAST */}
      <div id="toast" className="toast hidden" role="alert" aria-live="polite">
        Action Successful
      </div>

      {/* EXPORT MODAL */}
      <div id="exportModal" className="modal-overlay hidden" role="dialog" aria-modal="true">
        <div className="modal-glass">
          <h2>Export Deck</h2>
          <div className="form-group">
            <label>Filename</label>
            <input type="text" id="exportFilename" defaultValue="my_deck" />
          </div>
          <div className="form-group">
            <label>Format</label>
            <div className="radio-group">
              <label className="radio-option">
                <input type="radio" name="exportFormat" value="apkg" defaultChecked />{" "}
                <span>Anki Package (.apkg)</span>
              </label>
              <label className="radio-option">
                <input type="radio" name="exportFormat" value="txt" /> <span>Text File (.txt)</span>
              </label>
              <label className="radio-option">
                <input type="radio" name="exportFormat" value="md" /> <span>Markdown (.md)</span>
              </label>
              <label className="radio-option">
                <input type="radio" name="exportFormat" value="csv" /> <span>CSV (.csv)</span>
              </label>
            </div>
          </div>
          <div className="modal-actions">
            <button className="action-btn secondary" id="btnCancelExport">
              Cancel
            </button>
            <button className="action-btn secondary" id="btnPreviewExport">
              Preview
            </button>
            <button className="action-btn primary" id="btnConfirmExport">
              Download .apkg
            </button>
          </div>
          <div id="exportLoader" className="loader-line hidden"></div>
        </div>
      </div>

      {/* EXPORT PREVIEW MODAL */}
      <div id="exportPreviewModal" className="modal-overlay hidden">
        <div className="modal-glass" style={{ maxWidth: "700px" }}>
          <h2>Export Preview</h2>
          <div className="preview-stats">
            <div className="stat-item">
              <ion-icon name="library-outline"></ion-icon>
              <div>
                <strong id="previewTotalCards">0</strong>
                <span>Total Cards</span>
              </div>
            </div>
            <div className="stat-item">
              <ion-icon name="checkmark-circle-outline"></ion-icon>
              <div>
                <strong id="previewValidCards">0</strong>
                <span>Valid Cards</span>
              </div>
            </div>
            <div className="stat-item warning">
              <ion-icon name="alert-circle-outline"></ion-icon>
              <div>
                <strong id="previewIssues">0</strong>
                <span>Issues</span>
              </div>
            </div>
          </div>
          <h3 style={{ marginTop: "24px", marginBottom: "12px", fontSize: "16px" }}>
            Sample Cards (First 5)
          </h3>
          <div className="preview-cards" id="previewCardsList"></div>
          <div className="modal-actions">
            <button className="action-btn secondary" id="btnClosePreview">
              Close
            </button>
            <button className="action-btn primary" id="btnConfirmFromPreview">
              Looks Good - Export
            </button>
          </div>
        </div>
      </div>

      {/* KEYBOARD SHORTCUTS MODAL */}
      <div id="shortcutsModal" className="modal-overlay hidden" role="dialog" aria-modal="true">
        <div className="modal-glass">
          <h2>Keyboard Shortcuts</h2>
          <div className="shortcuts-table">
            <div className="shortcuts-section">
              <h3>Navigation</h3>
              <div className="shortcut-row">
                <span className="shortcut-keys">
                  <kbd>F1</kbd>
                </span>
                <span className="shortcut-desc">Open command palette</span>
              </div>
              <div className="shortcut-row">
                <span className="shortcut-keys">
                  <kbd>Esc</kbd>
                </span>
                <span className="shortcut-desc">Close modals / Clear command palette</span>
              </div>
            </div>
            <div className="shortcuts-section">
              <h3>Editing</h3>
              <div className="shortcut-row">
                <span className="shortcut-keys">
                  <kbd>Enter</kbd>
                </span>
                <span className="shortcut-desc">Add card from omnibar</span>
              </div>
              <div className="shortcut-row">
                <span className="shortcut-keys">
                  <kbd>Ctrl</kbd> + <kbd>Z</kbd>
                </span>
                <span className="shortcut-desc">Undo last action</span>
              </div>
              <div className="shortcut-row">
                <span className="shortcut-keys">
                  <kbd>Ctrl</kbd> + <kbd>Y</kbd>
                </span>
                <span className="shortcut-desc">Redo action</span>
              </div>
              <div className="shortcut-row">
                <span className="shortcut-keys">
                  <kbd>Ctrl</kbd> + <kbd>F</kbd>
                </span>
                <span className="shortcut-desc">Focus search</span>
              </div>
            </div>
            <div className="shortcuts-section">
              <h3>Study Mode</h3>
              <div className="shortcut-row">
                <span className="shortcut-keys">
                  <kbd>Space</kbd>
                </span>
                <span className="shortcut-desc">Show answer / flip card</span>
              </div>
              <div className="shortcut-row">
                <span className="shortcut-keys">
                  <kbd>1</kbd>
                </span>
                <span className="shortcut-desc">Rate: Again</span>
              </div>
              <div className="shortcut-row">
                <span className="shortcut-keys">
                  <kbd>2</kbd>
                </span>
                <span className="shortcut-desc">Rate: Hard</span>
              </div>
              <div className="shortcut-row">
                <span className="shortcut-keys">
                  <kbd>3</kbd>
                </span>
                <span className="shortcut-desc">Rate: Good</span>
              </div>
              <div className="shortcut-row">
                <span className="shortcut-keys">
                  <kbd>4</kbd>
                </span>
                <span className="shortcut-desc">Rate: Easy</span>
              </div>
            </div>
            <div className="shortcuts-section">
              <h3>Views</h3>
              <div className="shortcut-row">
                <span className="shortcut-keys">
                  <kbd>Ctrl</kbd> + <kbd>1</kbd>
                </span>
                <span className="shortcut-desc">Library view</span>
              </div>
              <div className="shortcut-row">
                <span className="shortcut-keys">
                  <kbd>Ctrl</kbd> + <kbd>2</kbd>
                </span>
                <span className="shortcut-desc">Study view</span>
              </div>
              <div className="shortcut-row">
                <span className="shortcut-keys">
                  <kbd>Ctrl</kbd> + <kbd>3</kbd>
                </span>
                <span className="shortcut-desc">Statistics view</span>
              </div>
              <div className="shortcut-row">
                <span className="shortcut-keys">
                  <kbd>Ctrl</kbd> + <kbd>4</kbd>
                </span>
                <span className="shortcut-desc">Settings view</span>
              </div>
            </div>
            <div className="shortcuts-section">
              <h3>Help</h3>
              <div className="shortcut-row">
                <span className="shortcut-keys">
                  <kbd>Ctrl</kbd> + <kbd>/</kbd>
                </span>
                <span className="shortcut-desc">Show this help panel</span>
              </div>
            </div>
          </div>
          <div className="modal-actions">
            <button className="action-btn primary" id="btnCloseShortcuts">
              Close
            </button>
          </div>
        </div>
      </div>

      {/* COLOR PICKER MODAL */}
      <div id="colorPickerModal" className="modal-overlay hidden">
        <div className="modal-glass">
          <h2>Choose Deck Color</h2>
          <div className="color-grid">
            {[
              "#7C5CFC",
              "#9B7FFF",
              "#EC4899",
              "#F43F5E",
              "#F97316",
              "#F59E0B",
              "#84CC16",
              "#10B981",
              "#14B8A6",
              "#06B6D4",
              "#3B82F6",
              "#9B7FFF",
            ].map((c, i) => (
              <button
                key={i}
                className="color-option"
                data-color={c}
                style={{ background: c }}
              ></button>
            ))}
          </div>
          <div className="modal-actions">
            <button className="action-btn secondary" id="btnCancelColor">
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* GENERIC CUSTOM MODAL */}
      <div
        id="customModal"
        className="modal-overlay hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="customModalTitle"
      >
        <div className="modal-glass">
          <h2 id="customModalTitle">Title</h2>
          <div id="customModalContent" className="modal-content"></div>
          <div className="form-group hidden" id="customModalInputContainer">
            <input type="text" id="customModalInput" className="modal-input" autoComplete="off" />
          </div>
          <div className="modal-actions">
            <button className="action-btn secondary" id="btnModalCancel">
              Cancel
            </button>
            <button className="action-btn primary" id="btnModalConfirm">
              Confirm
            </button>
          </div>
        </div>
      </div>

      {/* IMPORT PREVIEW MODAL */}
      <div id="importPreviewModal" className="modal hidden">
        <div className="preview-modal-content">
          <h2><ion-icon name="download-outline" style={{ marginRight: 8, verticalAlign: 'middle' }}></ion-icon> Import Preview</h2>
          <div className="import-stats">
            <span>
              Total: <strong id="importTotal">0</strong> cards
            </span>
          </div>
          <div id="columnMapping" className="hidden">
            <h3>Column Mapping</h3>
            <div className="mapping-controls">
              <div className="mapping-row">
                <label>Term Column:</label>
                <select id="termColumnSelect"></select>
              </div>
              <div className="mapping-row">
                <label>Definition Column:</label>
                <select id="defColumnSelect"></select>
              </div>
            </div>
          </div>
          <div className="import-preview-section">
            <h3>Preview (first 10 cards)</h3>
            <div className="import-preview-list" id="importPreviewList"></div>
          </div>
          <div className="modal-actions">
            <button className="action-btn secondary" id="btnCancelImport">
              Cancel
            </button>
            <button className="action-btn primary" id="btnConfirmImport">
              Import Cards
            </button>
          </div>
        </div>
      </div>

      {/* FIND & REPLACE MODAL */}
      <div id="findReplaceModal" className="modal-overlay hidden" role="dialog" aria-modal="true">
        <div className="modal-glass" style={{ maxWidth: "500px" }}>
          <h2>
            <ion-icon name="search-outline"></ion-icon> Find &amp; Replace
          </h2>
          <div className="form-group">
            <label>Find</label>
            <input type="text" id="findInput" placeholder="Search text..." autoComplete="off" />
          </div>
          <div className="form-group">
            <label>Replace with</label>
            <input
              type="text"
              id="replaceInput"
              placeholder="Replacement text..."
              autoComplete="off"
            />
          </div>
          <div className="form-group" style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
              <input type="checkbox" id="findCaseSensitive" /> Case sensitive
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
              <input type="checkbox" id="findWholeWord" /> Whole word
            </label>
            <select
              id="findField"
              style={{
                padding: "6px 10px",
                borderRadius: "6px",
                background: "var(--bg-surface)",
                color: "var(--text-primary)",
                border: "1px solid var(--border-default)",
              }}
            >
              <option value="both">Both fields</option>
              <option value="term">Term only</option>
              <option value="def">Definition only</option>
            </select>
          </div>
          <div className="modal-actions">
            <button className="action-btn secondary" id="btnCancelFindReplace">
              Cancel
            </button>
            <button className="action-btn primary" id="btnExecuteFindReplace">
              Replace All
            </button>
          </div>
        </div>
      </div>

    </main>
  );
}
