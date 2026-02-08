# 🎴 AnkiFlow - Smart Anki Card Formatter

A modern, feature-rich web application for creating and managing Anki flashcards with a beautiful dark/light theme interface, built-in spaced repetition (SM-2), and a powerful study mode.

![AnkiFlow Dashboard](https://img.shields.io/badge/Status-Active-success) ![Version](https://img.shields.io/badge/Version-5.0-blue)

## ✨ Features

### 📚 **Study Mode with SRS**

- Built-in SM-2 spaced repetition algorithm
- Learning steps (1m, 10m) with graduation to review queue
- 4-button rating system: Again, Hard, Good, Easy
- Card re-queuing on "Again" within the same session
- Session summary with accuracy ring and animated stats
- Keyboard shortcuts: Space to flip, 1-4 to rate
- Progress bar with card count and percentage
- Sound effects (optional) via Web Audio API
- 🆕 **Reverse Mode** — Study definition → term (toggle in Settings)
- 🆕 **Confetti animation** on session completion 🎉

### 🔄 **Reverse Cards**

- Toggle in Settings → Study → Reverse mode
- Shows definition on front, guess the term
- Study title shows "(Reverse)" indicator

### 🔍 **Find & Replace**

- Bulk text editing across all cards in the active deck
- Case-sensitive and whole-word match options
- Target specific fields (term only, definition only, or both)
- Accessible via toolbar button or Command Palette

### �� **Move & Copy Cards**

- Move or copy any card to another deck with one click
- Context menu appears on the ➡️ button in each card row
- Move removes from source deck, Copy keeps the original
- Supports any number of decks

### ✍️ **Markdown Preview**

- Real-time markdown preview in the omnibar while typing
- Shows formatted term → definition before adding
- Activates automatically when markdown syntax is detected
- Full markdown support: **bold**, *italic*, `code`, lists

### 📊 **Review History**

- Per-card review history accessible via ⏱ button on each row
- Shows date, rating (color-coded), interval, and ease factor
- Last 20 reviews displayed in reverse chronological order
- Total review count per card

### 📈 **Card Maturity Chart**

- Visual breakdown of card states across all decks
- Categories: New (blue), Learning (amber), Young (green), Mature (purple)
- Horizontal stacked bar with percentage legend
- Located in the Statistics view

### 🏷️ **Tag Filter**

- Filter cards by tag in the Library view
- Auto-generated pill buttons for all tags in the deck
- "All" button to reset filter
- Combines with search for powerful filtering

### 💾 **Auto-Save Indicator**

- Visual feedback in the sidebar status bar on every save
- Shows "Saving..." → "Saved ✓" → "System Ready"
- Animated dot color changes (amber → green → default)

### 🏷️ **Tags System**

- Add multiple tags to each card for better organization
- Tag input with Enter or comma to add tags
- Beautiful tag badges with one-click removal
- Bulk tagging of selected cards

### 🎨 **Deck Color Picker**

- Customize each deck with vibrant colors
- 12 preset color options + custom color input
- Color indicator on sidebar deck items
- Optional gradient mode

### 📋 **Export Preview**

- Preview your export before downloading
- See total cards, valid cards, and issues count
- View first 5 sample cards with term, definition, and tags
- Quick "Looks Good - Export" button

### 🔍 **Search & Filter**

- Real-time card search by term or definition
- Clear button for quick reset
- Filtered count display
- Combines with tag filter

### ↩️ **Undo/Redo System**

- Full history tracking (last 50 operations)
- Undo with Ctrl+Z, Redo with Ctrl+Y
- Supports: add, edit, delete, clear, tag operations

### ⌨️ **Keyboard Shortcuts**

- F1 — Open command palette
- Ctrl+/ — Show keyboard shortcuts panel
- Ctrl+Z / Ctrl+Y — Undo / Redo
- Ctrl+F — Focus search
- Ctrl+1-4 — Switch views (Library, Study, Statistics, Settings)
- Space — Show answer (study mode)
- 1-4 — Rate card (study mode)

### 🌓 **Dark/Light Theme**

- Three modes: Dark, Light, Auto (system preference)
- Premium color palette for both modes
- Glassmorphism effects and smooth gradients

### 📥 **Import Options**

- Plain text with flexible separators
- CSV files with column mapping
- Google Docs integration
- DOCX support via backend
- Drag & drop file upload
- JSON backup restore (Settings → Data → Import)

### 💾 **Export Formats**

- Anki Package (.apkg)
- Plain Text (.txt)
- Markdown (.md)
- Full JSON backup (Settings → Data → Export)

### 🗂️ **Deck Management**

- Create unlimited decks
- Per-deck settings (new cards/day, max reviews/day)
- Rename, delete (trash), restore from trash
- Color customization with due card badges

### ⚡ **Smart Operations**

- **Bulk Actions**: Select multiple cards to delete or tag at once
- **Smart Paste**: Paste chains like term1=def1 -> term2=def2
- **Flexible Import**: Handles various separators
- **Clear Deck** uses efficient bulk delete

### 📊 **Statistics Dashboard**

- Total cards & decks overview with animated counters
- Study streak and accuracy percentage
- Due today & upcoming week counts
- Deck distribution chart
- Card maturity chart (New/Learning/Young/Mature)
- Top tags cloud

## 🚀 Quick Start

### Installation

```bash
git clone https://github.com/sodops/anki-formatter.git
cd anki-formatter
pip install -r requirements.txt
./start_web.sh
```

### Docker

```bash
docker-compose up --build
```

### Access

```
http://127.0.0.1:5000
```

## 📖 Usage

1. **Create a Deck**: Click "+ New Deck" in the sidebar
2. **Add Cards**: Type in the omnibar (e.g., apple - fruit)
3. **Add Tags**: Click in the Tags column, type a tag, press Enter
4. **Study**: Click "Study" to start a spaced repetition session
5. **Move/Copy**: Click ➡️ on any card to move or copy to another deck
6. **Find & Replace**: Click "Find & Replace" for bulk edits
7. **Filter by Tag**: Click tag pills above the table
8. **View History**: Click ⏱ on any card to see its review history
9. **Export**: Click "Export", preview, then download

## 🛠️ Tech Stack

- **Frontend**: Vanilla JavaScript (ES6 Modules), CSS3, HTML5
- **Backend**: Python (Flask)
- **Storage**: localStorage (client-side persistence)
- **SRS**: SM-2 algorithm with learning steps
- **Icons**: Ionicons 7
- **Design**: Custom CSS with CSS Variables

## 📁 Project Structure

```
anki-formatter/
├── src/
│   ├── app.py                          # Flask backend
│   ├── parser.py                       # Text parser
│   ├── anki_generator.py               # .apkg generation
│   ├── static/
│   │   ├── style.css                   # 3300+ lines of CSS
│   │   └── js/
│   │       ├── main.js                 # Entry point
│   │       ├── core/
│   │       │   ├── store.js            # State management
│   │       │   ├── events.js           # EventBus
│   │       │   ├── logger.js           # Logging
│   │       │   └── srs/scheduler.js    # SM-2 algorithm
│   │       ├── features/
│   │       │   ├── library/
│   │       │   │   ├── card-manager.js # Cards + find & replace
│   │       │   │   └── deck-manager.js # Decks + sidebar
│   │       │   ├── study/
│   │       │   │   └── study-session.js
│   │       │   ├── import/import-handler.js
│   │       │   ├── export/export-handler.js
│   │       │   └── stats/stats-calculator.js
│   │       ├── ui/
│   │       │   ├── components/ui.js
│   │       │   ├── navigation/view-manager.js
│   │       │   ├── interactions/drag-drop.js
│   │       │   └── theme/theme-manager.js
│   │       └── utils/
│   │           ├── dom-helpers.js
│   │           └── markdown-parser.js
│   └── templates/index.html
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
├── start_web.sh
└── README.md
```

## 🎯 Changelog

### v5.0 (Current)
- ✅ Reverse Cards (study definition → term)
- ✅ Find & Replace (bulk text editing)
- ✅ Move/Copy cards between decks
- ✅ Markdown preview in omnibar
- ✅ Per-card Review History UI
- ✅ Card Maturity chart
- ✅ Tag filter in Library view
- ✅ Auto-save indicator
- ✅ Confetti animation on session complete
- ✅ 9 bug fixes (double session, store bypasses, etc.)

### v4.x
- ✅ SM-2 spaced repetition
- ✅ Architecture refactoring (Store/EventBus/Logger)
- ✅ 30+ bug fixes
- ✅ Import/export with backup/restore
- ✅ Session summary, streak, daily goal
- ✅ Command palette

### v3.0
- ✅ Markdown support
- ✅ CSV column mapping
- ✅ Study mode, bulk operations
- ✅ Statistics dashboard

### v2.0
- ✅ Tags, deck colors, drag & drop, export preview

### v1.0
- ✅ Basic flashcard creation, multi-deck, import/export

## 🤝 Contributing

Contributions are welcome! Feel free to report bugs, suggest features, or submit PRs.

## 📝 License

MIT License

## 👤 Author

**Sodiq** - [@sodops](https://github.com/sodops)

---

**Made with ❤️ for productive learning**
