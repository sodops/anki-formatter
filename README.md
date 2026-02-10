# ⚡ AnkiFlow — Smart Flashcard Platform

**[anki.sodops.uz](https://anki.sodops.uz)** — A modern flashcard learning platform. Powered by the **SM-2 Spaced Repetition** algorithm, cloud sync, and multi-device synchronization.

---

## 📖 About

**AnkiFlow** is a full-stack flashcard platform designed for efficiently memorizing vocabulary and knowledge. It uses the SM-2 algorithm to optimally manage review schedules. Provides user authentication and cloud sync via Supabase.

### Tech Stack

| Layer | Technology |
| --- | --- |
| **Framework** | Next.js 16.1 (React 19, Turbopack) |
| **UI** | Vanilla JavaScript ES6 Modules |
| **Auth** | Supabase Auth (Email, Google, GitHub OAuth) |
| **Database** | Supabase PostgreSQL (JSONB) + localStorage fallback |
| **Deploy** | Vercel (auto-deploy from `main` branch) |
| **Algorithm** | SM-2 Spaced Repetition |

---

## 🌐 Demo

**Production**: [anki.sodops.uz](https://anki.sodops.uz)

---

## ✨ Key Features

### 🔐 Authentication & Cloud

- **Supabase Auth** — email/password, Google OAuth, GitHub OAuth
- **Cloud Sync** — data syncs across all devices
- **Debounced auto-save** — saves to cloud with 2s debounce
- **Offline fallback** — works from localStorage when offline
- **Sync indicator** — visual syncing / synced / error states

### 📚 Cards & Decks

- **SM-2 Spaced Repetition** — smart review scheduling (new → learning → review)
- **Multi-deck management** — create, rename, color-pick, reorder
- **Inline editing** — edit cards directly in the table
- **Markdown support** — bold, italic, code, links
- **Tag system** — tag cards and filter by tags
- **Search** — fast search across terms and definitions
- **Reverse mode** — study in definition → term direction
- **Card suspension** — temporarily exclude cards from study
- **Find & Replace** — bulk text editing
- **Card transfer** — move/copy cards between decks

### 📖 Study

- **Smart sessions** — only due cards (new + learning + review)
- **Flashcard animation** — flip effect, keyboard controls
- **Sound effects** — optional audio feedback
- **Daily goal** — progress bar and streak counter
- **Session summary** — accuracy ring, rating breakdown, confetti

### 📊 Statistics

- **Overview metrics** — cards, decks, streak, accuracy
- **Deck distribution** — horizontal bar chart
- **Card maturity levels** — New / Learning / Young / Mature
- **Review heatmap** — 90-day GitHub-style activity calendar
- **Review forecast** — 14-day upcoming cards chart
- **Per-deck statistics** — table: New/Learning/Review/Suspended/Accuracy
- **Top tags** — tag cloud

### 📥 Import / Export

- **Import**: TXT, CSV (with column mapping), DOCX, Google Docs URL
- **Export**: .apkg (Anki), .txt, .md, .csv
- **Import preview** — first 10 cards + duplicate detection
- **Full backup** — all data in JSON format

### 🎨 Interface

- **Dark and light theme** — auto (system preference) available
- **Command palette** — `F1` or `>` in the omnibar
- **Keyboard shortcuts** — Ctrl+Z, Ctrl+F, Space, 1-4
- **Responsive design** — hamburger menu for mobile
- **Drag & drop** — reorder cards
- **Undo / Redo** — revert any action

### 🛡️ Security

- **Supabase RLS** — users can only see their own data
- **XSS protection** — Markdown output is sanitized
- **Path traversal protection** — file downloads are secured
- **localStorage quota** — error handling when storage is full

---

## 🚀 Getting Started

### Requirements

- Node.js 18+
- npm
- Supabase project (free: [supabase.com](https://supabase.com))

### 1. Clone and Install

```bash
git clone https://github.com/sodops/anki-formatter.git
cd anki-formatter
npm install
```

### 2. Supabase Setup

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

Go to Supabase Dashboard → **SQL Editor** → run `supabase/schema.sql`.

### 3. OAuth Setup (optional)

Supabase Dashboard → **Authentication** → **Providers**:

- **Google**: Get Client ID and Secret from Google Cloud Console
- **GitHub**: Create an OAuth App in GitHub Developer Settings

Redirect URL for both providers: `https://YOUR_PROJECT.supabase.co/auth/v1/callback`

### 4. Run

```bash
npm run dev
```

Open in your browser: `http://localhost:3000`

---

## 📁 Project Structure

```
anki-formatter/
├── app/
│   ├── layout.tsx                   # Root layout (AuthProvider)
│   ├── page.tsx                     # Main page (SPA)
│   ├── login/
│   │   └── page.tsx                 # Login page
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts             # OAuth callback handler
│   └── api/
│       ├── parse/route.ts           # Text parser API
│       ├── generate/route.ts        # APKG generator API
│       └── sync/route.ts            # Cloud sync API (GET/POST)
├── components/
│   └── AuthProvider.tsx             # React auth context
├── lib/
│   └── supabase/
│       ├── client.ts                # Browser Supabase client
│       ├── server.ts                # Server Supabase client
│       └── middleware.ts            # Session refresh
├── middleware.ts                     # Next.js middleware
├── public/
│   ├── style.css                    # All styles
│   └── js/
│       ├── main.js                  # Entry point
│       ├── core/
│       │   ├── store.js             # State management + cloud sync
│       │   └── srs/
│       │       └── scheduler.js     # SM-2 algorithm
│       ├── features/
│       │   ├── library/             # Card and deck management
│       │   ├── study/               # Study session
│       │   ├── import/              # File import
│       │   ├── export/              # Export (APKG/TXT/MD/CSV)
│       │   └── stats/               # Statistics, heatmap
│       ├── ui/                      # Toast, modal, drag-drop, theme
│       └── utils/                   # DOM helpers, Markdown parser
├── supabase/
│   └── schema.sql                   # Database schema + RLS
├── .env.local.example               # Environment variables example
├── package.json
└── README.md
```

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
| --- | --- |
| `F1` | Command palette |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |
| `Ctrl+F` | Search |
| `Ctrl+/` | Shortcuts list |
| `Space` | Show answer (study mode) |
| `1` / `2` / `3` / `4` | Again / Hard / Good / Easy |
| `Esc` | Close modal / End session |

---

## 🧠 SM-2 Algorithm

AnkiFlow uses the **SuperMemo 2 (SM-2)** algorithm:

- **New** → Brand new cards
- **Learning** → In the learning phase (1min → 10min)
- **Review** → Regular review (1d → 3d → 7d → ...)
- **Young/Mature** → After 21+ days a card is considered "mature"

Each rating (Again, Hard, Good, Easy) adjusts the card's ease factor and interval.

---

## 🚢 Deploy (Vercel)

1. Connect your GitHub repo to Vercel (`main` branch)
2. Add Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Add a custom domain (e.g., `anki.sodops.uz`)
4. Auto-deploy — updates automatically on every push

---

## 📄 License

MIT © [sodops](https://github.com/sodops)

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/NewFeature`)
3. Commit your changes (`git commit -m 'Add: new feature'`)
4. Push to the branch (`git push origin feature/NewFeature`)
5. Open a Pull Request

---

## 📞 Contact

- **Website**: [anki.sodops.uz](https://anki.sodops.uz)
- **GitHub**: [sodops/anki-formatter](https://github.com/sodops/anki-formatter)

Have questions or suggestions? Open a GitHub issue!
