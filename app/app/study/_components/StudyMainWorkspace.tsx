export default function StudyMainWorkspace() {
  return (
    <div className="main-content" id="main-content" role="main">
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
              <button
                className="md-btn"
                title="Bold (Ctrl+B)"
                data-md="**"
                aria-label="Make text bold"
              >
                <b>B</b>
              </button>
              <button
                className="md-btn"
                title="Italic (Ctrl+I)"
                data-md="*"
                aria-label="Make text italic"
              >
                <i>I</i>
              </button>
              <button
                className="md-btn"
                title="Code (Ctrl+`)"
                data-md="`"
                aria-label="Format as code"
              >
                &lt;/&gt;
              </button>
            </div>
            <span className="key-hint">ENTER</span>
          </div>
          <input
            type="file"
            id="fileInput"
            className="hidden"
            accept=".txt,.csv,.docx"
            aria-label="Upload file to import cards"
          />
          <div id="commandDropdown" className="command-dropdown hidden"></div>
          <div id="omnibarPreview" className="omnibar-preview hidden"></div>
        </div>
      </div>

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
              <button className="search-clear hidden" id="btnClearSearch" aria-label="Clear search">
                <ion-icon name="close-outline"></ion-icon>
              </button>
            </div>
            <div className="deck-actions-header">
              <button className="action-btn secondary" id="btnFindReplace" title="Find & Replace">
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
                    <input type="checkbox" id="selectAllCheckbox" aria-label="Select all cards" />
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
          <div
            className="study-progress-container"
            id="studyProgressContainer"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={0}
            aria-label="Study progress"
          >
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
              <div className="placeholder-icon">
                <ion-icon name="library-outline" style={{ fontSize: 48 }}></ion-icon>
              </div>
              <h3>Start Studying</h3>
              <p>Select a deck from the Library to begin reviewing cards.</p>
            </div>

            <div
              id="sessionSummary"
              className="session-summary hidden"
              role="alert"
              aria-live="assertive"
            >
              <div className="summary-icon">
                <ion-icon name="trophy-outline" style={{ fontSize: 48 }}></ion-icon>
              </div>
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

            <div
              id="studyInterface"
              className="study-interface hidden"
              role="region"
              aria-label="Flashcard study area"
            >
              <div
                id="studyAnnounce"
                className="sr-only"
                aria-live="assertive"
                aria-atomic="true"
              ></div>
              <div
                className="flashcard-area"
                id="flashcard"
                role="button"
                aria-label="Flashcard - click or press Space to flip"
                tabIndex={0}
              >
                <div className="flashcard-inner">
                  <div className="flashcard-front" aria-live="polite">
                    <button
                      className="tts-btn tts-icon"
                      data-text-role="term"
                      title="Listen"
                      aria-label="Read term aloud"
                    >
                      <ion-icon name="volume-high-outline"></ion-icon>
                    </button>
                    <div className="card-label">TERM</div>
                    <div className="card-content" id="studyFront"></div>
                    <div className="hint-text" aria-hidden="true">
                      Click to Flip (Space)
                    </div>
                  </div>
                  <div className="flashcard-back" aria-live="polite">
                    <button
                      className="tts-btn tts-icon"
                      data-text-role="def"
                      title="Listen"
                      aria-label="Read definition aloud"
                    >
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
                <div
                  className="study-rating-buttons hidden"
                  role="group"
                  aria-label="Rate your answer"
                >
                  <button
                    className="rating-btn rating-again"
                    id="btnAgain"
                    aria-label="Again - press 1"
                  >
                    <ion-icon name="close-circle"></ion-icon> Again{" "}
                    <kbd className="rating-kbd">1</kbd>
                  </button>
                  <button
                    className="rating-btn rating-hard"
                    id="btnHard"
                    aria-label="Hard - press 2"
                  >
                    <ion-icon name="sad-outline"></ion-icon> Hard{" "}
                    <kbd className="rating-kbd">2</kbd>
                  </button>
                  <button
                    className="rating-btn rating-good"
                    id="btnGood"
                    aria-label="Good - press 3"
                  >
                    <ion-icon name="checkmark-circle"></ion-icon> Good{" "}
                    <kbd className="rating-kbd">3</kbd>
                  </button>
                  <button
                    className="rating-btn rating-easy"
                    id="btnEasy"
                    aria-label="Easy - press 4"
                  >
                    <ion-icon name="happy-outline"></ion-icon> Easy{" "}
                    <kbd className="rating-kbd">4</kbd>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div id="view-dictionary" className="view-container hidden">
        <div className="workspace dict-workspace">
          <div className="deck-header">
            <h1>
              <ion-icon
                name="book-outline"
                style={{ marginRight: 8, verticalAlign: "middle" }}
              ></ion-icon>{" "}
              Dictionary
            </h1>
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
                <ion-icon
                  name="language-outline"
                  style={{ fontSize: "48px", opacity: 0.3 }}
                ></ion-icon>
                <p>Search for a word to see its definitions, pronunciations, and examples.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

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
  );
}
