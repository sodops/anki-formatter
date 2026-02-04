# 🎴 AnkiFlow - Smart Anki Card Formatter

A modern, feature-rich web application for creating and managing Anki flashcards with a beautiful dark/light theme interface.

![AnkiFlow Dashboard](https://img.shields.io/badge/Status-Active-success) ![Version](https://img.shields.io/badge/Version-2.0-blue)

## ✨ Features

### 🏷️ **Tags System**

- Add multiple tags to each card for better organization
- Tag input with Enter or comma (`,`) to add tags
- Beautiful tag badges with one-click removal
- Quick filtering by tags (coming soon)

### 🎨 **Deck Color Picker**

- Customize each deck with vibrant colors
- 12 preset color options (indigo, purple, pink, red, orange, yellow, green, cyan, blue)
- Color indicator on sidebar deck items (4px left border)
- Hover-to-reveal color palette icon

### 📋 **Export Preview**

- Preview your export before downloading
- See total cards, valid cards, and issues count
- View first 5 sample cards with term, definition, and tags
- Invalid cards highlighted in red for easy spotting
- Quick "Looks Good - Export" button

### 🔍 **Search & Filter**

- Real-time card search by term or definition
- Clear button for quick reset
- Filtered count display (e.g., "5 / 10 cards")
- Empty state message when no matches found

### ↩️ **Undo/Redo System**

- Full history tracking (last 50 operations)
- Undo with `Ctrl+Z` (or `Cmd+Z` on Mac)
- Redo with `Ctrl+Shift+Z`
- Supports: add card, edit card, delete card, clear deck
- Toast notification for undo/redo actions

### ⌨️ **Keyboard Shortcuts**

- `F1` - Open command palette
- `Ctrl+/` - Show keyboard shortcuts panel
- `Ctrl+Z` - Undo last action
- `Ctrl+Shift+Z` - Redo action
- Full shortcuts panel with categorized commands

### 🌓 **Automatic Light/Dark Theme**

- Respects system color scheme preference
- Seamless switching between themes
- Premium color palette for both modes
- Glassmorphism effects and smooth gradients

### 📥 **Import Options**

- Plain text (one card per line, with separators: `-`, `->`, `==`, `:`, etc.)
- CSV files
- Google Docs integration
- DOCX support
- Drag & drop file upload

### ✨ **Markdown Support**

- Format cards with Markdown syntax
- **Bold text** with `**text**`
- _Italic text_ with `*text*`
- `Inline code` with backticks
- Renders in export preview and final .apkg export
- Input fields show plain markdown syntax
- Preview shows formatted HTML

### 💾 **Export Formats**

- Anki Package (`.apkg`) - Ready to import into Anki
- Plain Text (`.txt`)
- Markdown (`.md`)
- Preview before export

### 🗂️ **Deck Management**

- Create unlimited decks
- Rename decks
- Delete decks (moved to trash)
- Restore decks from trash
- Export individual decks

### ✏️ **Inline Editing**

- Edit cards directly in the table
- Auto-save on change
- Validation warnings for empty fields
- Error highlighting for incomplete cards

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/sodops/anki-formatter.git
cd anki-formatter

# Install Python dependencies
pip install -r requirements.txt

# Run the application
./start_web.sh
# Or manually:
# python src/app.py
```

### 🌐 Access

Open your browser and navigate to:

```
http://127.0.0.1:5000
```

## 📖 Usage

1. **Create a Deck**: Click "+ New Deck" in the sidebar
2. **Add Cards**: Type in the omnibar (e.g., `apple - fruit` or `term -> definition`)
3. **Add Tags**: Click in the Tags column input, type a tag, press Enter
4. **Customize Color**: Hover over deck, click color palette icon, choose a color
5. **Export**: Click "Export to Anki", preview your cards, then download

## 🛠️ Tech Stack

- **Frontend**: Vanilla JavaScript, CSS3, HTML5
- **Backend**: Python (Flask)
- **Storage**: LocalStorage (client-side persistence)
- **Icons**: Ionicons
- **Design**: Custom CSS with CSS Variables

## 📁 Project Structure

```
anki-formatter/
├── src/
│   ├── app.py              # Flask backend
│   ├── static/
│   │   ├── script.js       # Main JavaScript logic
│   │   └── style.css       # Styling
│   └── templates/
│       └── index.html      # Main HTML template
├── requirements.txt        # Python dependencies
├── start_web.sh           # Startup script
└── README.md              # This file
```

## 🎯 Roadmap

**Phase 1 (Completed):**

- [x] Tags System
- [x] Deck Color Picker

**Phase 2 (Completed):**

- [x] Drag & Drop Card Reordering
- [x] Export Preview

**Phase 3 (Upcoming):**

- [ ] Markdown Support in Cards
- [ ] Enhanced Import Preview
- [ ] Built-in Study Mode
- [ ] Bulk Card Selection & Operations
- [ ] Statistics Dashboard

## 🤝 Contributing

Contributions are welcome! Feel free to:

- Report bugs
- Suggest new features
- Submit pull requests

## 📝 License

MIT License - feel free to use this project for personal or commercial purposes.

## 👤 Author

**Sodiq** - [@sodops](https://github.com/sodops)

## 🙏 Acknowledgments

- Anki for the amazing spaced repetition system
- Ionicons for beautiful icons
- The open-source community

---

**Made with ❤️ for productive learning**
