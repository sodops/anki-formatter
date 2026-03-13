export default function StudyModals() {
  return (
    <>
      <div id="toast" className="toast hidden" role="alert" aria-live="polite">
        Action Successful
      </div>

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

      <div id="importPreviewModal" className="modal hidden">
        <div className="preview-modal-content">
          <h2>
            <ion-icon
              name="download-outline"
              style={{ marginRight: 8, verticalAlign: "middle" }}
            ></ion-icon>{" "}
            Import Preview
          </h2>
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
    </>
  );
}
