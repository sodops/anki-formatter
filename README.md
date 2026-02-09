# ⚡ AnkiFlow — Smart Flashcard Platform

A modern, feature-rich flashcard study platform with **Spaced Repetition (SM-2)**, built with Flask + Vanilla JS.

> **v6.0** — Major bug fixes, security hardening, and 8 new features

---

## ✨ Features

### 📚 Core
- **Spaced Repetition (SM-2)** — intelligent review scheduling with learning steps
- **Multi-deck management** — create, rename, color-code, drag-reorder
- **Rich card editing** — inline editing with Markdown support (bold, italic, code)
- **Tag system** — tag cards, filter by tags, bulk tagging
- **Search** — instant full-text search across terms and definitions
- **Reverse mode** — study definition → term
- **Card suspend/bury** — temporarily exclude cards from study

### 📖 Study
- **Smart sessions** — only due cards (new + learning + review)
- **Visual flashcards** — flip animation, keyboard shortcuts (Space, 1-4)
- **Sound effects** — subtle audio feedback (optional)
- **Again re-queuing** — failed cards reappear later in session
- **Daily goal tracking** — progress bar with streak counter
- **Session summary** — accuracy ring, per-rating breakdown, confetti

### 📊 Statistics
- **Overview** — total cards, decks, streak, accuracy, upcoming
- **Deck distribution** — horizontal bar chart
- **Card maturity** — New / Learning / Young / Mature breakdown
- **Review heatmap** — GitHub-style 90-day activity calendar
- **Review forecast** — 14-day upcoming due cards bar chart
- **Per-deck breakdown** — table with New/Learning/Review/Suspended/Accuracy
- **Top tags** — tag cloud with counts

### 📥 Import / Export
- **Import**: TXT, CSV (with column mapping), DOCX, Google Docs URL
- **Export**: .apkg (Anki), .txt (tab-separated), .md, .csv
- **Batch import** — optimized single-state-update for 1000+ cards
- **Import preview** — see first 10 cards + duplicate detection
- **Full backup** — JSON export/import of all data

### 🎨 UI/UX
- **Dark & Light themes** — plus auto (system preference)
- **Command palette** — press `>` in omnibar or `F1`
- **Keyboard shortcuts** — Ctrl+Z undo, Ctrl+F search, Space flip, 1-4 rate
- **Responsive design** — mobile hamburger menu, touch-friendly
- **Find & Replace** — bulk text editing with case/whole-word/field options
- **Move/Copy cards** — between decks via context menu
- **Review history** — per-card review log with color-coded ratings
- **Markdown preview** — live preview in omnibar
- **Auto-save indicator** — visual feedback on state changes
- **Drag & drop** — reorder cards in table

---

## 🛡️ Security (v6.0)

- **XSS prevention** — all Markdown output sanitized (tag whitelist + attribute filtering)
- **Path traversal fix** — `secure_filename()` on Flask download endpoint
- **Request timeouts** — Google Docs import has 30s timeout
- **localStorage quota** — graceful handling when storage is full

---

## 🚀 Quick Start

```bash
# Clone & setup
git clone https://github.com/sodops/anki-formatter.git
cd anki-formatter

# Install Python deps
pip install -r requirements.txt

# Run
python src/app.py
# → http://localhost:5000
```

### Docker
```bash
docker-compose up --build
```

---

## 📁 Project Structure

```
src/
├── app.py                    # Flask backend
├── parser.py                 # Text → flashcard parser
├── anki_generator.py         # .apkg file generator
├── file_handler.py           # File reading utilities
├── templates/
│   └── index.html            # Single-page application (853 lines)
└── static/
    ├── style.css             # All styles (3500+ lines, dark/light)
    └── js/
        ├── main.js           # App entry, event listeners, commands
        ├── core/
        │   ├── store.js      # Redux-inspired state management
        │   ├── events.js     # EventBus for decoupled updates
        │   ├── logger.js     # Structured logging
        │   ├── storage/
        │   │   └── storage.js # Compatibility layer
        │   ├── srs/
        │   │   └── scheduler.js # SM-2 algorithm
        │   └── history/
        │       └── history-manager.js
        ├── features/
        │   ├── library/
        │   │   ├── card-manager.js  # Card CRUD, tags, find/replace
        │   │   └── deck-manager.js  # Deck CRUD, sidebar, trash
        │   ├── study/
        │   │   └── study-session.js # Study mode, rating, confetti
        │   ├── import/
        │   │   └── import-handler.js # File upload, CSV parsing
        │   ├── export/
        │   │   └── export-handler.js # APKG/TXT/MD/CSV export
        │   └── stats/
        │       └── stats-calculator.js # Dashboard, heatmap, forecast
        ├── ui/
        │   ├── components/ui.js     # Toast, modals, color picker
        │   ├── interactions/drag-drop.js
        │   ├── navigation/view-manager.js
        │   └── theme/theme-manager.js
        └── utils/
            ├── dom-helpers.js       # DOM element references
            └── markdown-parser.js   # Sanitized Markdown rendering
```

---

## 📋 Changelog

### v6.0 — Bug Fixes & Security Hardening
**Critical Fixes:**
- 🔴 Fixed APKG export (was calling wrong endpoint `/generate_apkg` → `/generate`)
- 🔴 Fixed XSS vulnerability in Markdown rendering (added HTML sanitizer)
- 🔴 Fixed path traversal vulnerability in Flask download endpoint
- 🔴 Fixed undo/redo (search/view/theme no longer pollute history, off-by-one fixed)
- 🔴 Fixed drag-drop card reorder (now uses store dispatch, correct index handling)

**New Features:**
- ✅ **Card suspend/bury** — exclude cards from study sessions
- ✅ **CSV export** — export decks as .csv with Term, Definition, Tags columns
- ✅ **Review heatmap** — 90-day GitHub-style activity calendar
- ✅ **Review forecast** — 14-day upcoming due cards chart
- ✅ **Per-deck statistics** — breakdown table with accuracy per deck
- ✅ **Batch import** — single state update for 1000+ card imports
- ✅ **localStorage quota handling** — graceful fallback when storage is full
- ✅ **Better ID generation** — `crypto.randomUUID()` with fallback

**Improvements:**
- SM-2 ease factor only modified for graduated review cards (not learning)
- TXT export uses tab separator (reimport-friendly)
- Markdown export escapes `#` in terms to prevent heading corruption
- Undo/redo skips inputs to preserve native browser undo
- Flask Google Docs import has 30s timeout
- Flask cleans up temp files on generation failure
- All modals have `role="dialog"` and `aria-modal="true"`
- Toast has `aria-live="polite"` for screen readers
- `<noscript>` tag for JS-disabled browsers
- Keyboard shortcuts help modal corrected (Ctrl+Y for redo)

### v5.0 — 9 Features + Architecture
- Reverse card mode, Find & Replace, Move/Copy cards
- Markdown preview, review history, maturity chart
- Tag filter, auto-save indicator, confetti animation

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `F1` | Command palette |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |
| `Ctrl+F` | Focus search |
| `Ctrl+/` | Show shortcuts |
| `Ctrl+1-4` | Switch view |
| `Space` | Show answer |
| `1` / `2` / `3` / `4` | Again / Hard / Good / Easy |
| `Esc` | Close modal / End session |

---

## 📄 License

MIT © [sodops](https://github.com/sodops)
