# 📋 CHANGELOG

All notable changes are documented in this file.

---

## v8.1 — 2026-02-13

> Incremental Sync, Device Fixes, and Testing Infrastructure

**Core Sync Improvements:**

- **Incremental Sync:** Optimized data syncing to fetch only changed items (delta sync) instead of the full database, significantly reducing bandwidth usage and improving speed.
- **Conflict Resolution:** Implemented server-side "deep merge" for settings and devices. This fixes the critical bug where syncing from a new device would overwrite and erase other registered devices.
- **Real-time Deletions:** Sync protocol now correctly propagates deletion events to all devices.

**Security:**

- **API Hardening:** Added mandatory authentication checks to `/api/logs`, `/api/translate`, `/api/generate`, and `/api/parse` endpoints to prevent unauthorized access and abuse.

**Testing & Quality:**

- **Test Infrastructure:** Added Jest and React Testing Library setup (`jest.config.js`, `jest.setup.ts`).
- **Linting:** Added ESLint and Prettier configuration (`.eslintrc`, `.prettierrc`) for consistent code style.
- **Unit Tests:** Added initial test suites for:
  - `AuthProvider` (Login/Logout flows)
  - `Scheduler` (SRS algorithm logic)
  - `Supabase` (Client initialization)
- **Documentation:** Added `TESTING.md` and `LINTING_TESTING_SETUP.md` guides.

**Fixes:**

- Fixed device list inconsistency where devices appeared on one client but not others.
- Fixed potential data loss in user settings due to aggressive overwriting during sync.

---

## v8.0 — 2026-02-09

> Supabase authentication, cloud sync, and login page redesign

**Authentication:**

- Supabase Auth integration — email/password, Google OAuth, GitHub OAuth
- AuthProvider component — graceful degradation (guest mode if Supabase is not configured)
- Login page — modern split-layout design, animated orbs, responsive
- OAuth callback route — `/auth/callback` code exchange
- Client-side auth redirect — unauthenticated users redirected to `/login`
- Authenticated users redirected from `/login` back to `/`

**Cloud Sync:**

- Cloud data storage with Supabase PostgreSQL (JSONB)
- Debounced auto-sync — saves to cloud with 2s debounce
- Cloud-first loading — fetches from cloud first, falls back to localStorage
- Sync API routes — `GET/POST /api/sync`
- Sync indicator — visual syncing/synced/error status display
- Database schema — `user_data` and `profiles` tables with RLS policies

**UI Improvements:**

- User profile in sidebar — avatar, name, email, logout button
- Login page fully redesigned — split layout, animated background
- Improved loading spinner and skeleton states

**Technical:**

- Middleware Edge Runtime issue resolved (simplified pass-through)
- `.next` cache clearing issue identified and fixed
- React ↔ Vanilla JS bridge — `window.__ankiflow_auth`, CustomEvents
- Added `@supabase/ssr@0.8.0` and `@supabase/supabase-js@2.95.3`

---

## v7.0 — 2026-02-09

> Next.js migration, mobile fixes, accessibility improvements

**Architecture:**

- Flask → Next.js 16 migration (React 19)
- Client-side rendering (CSR) approach
- Turbopack dev server (faster builds)
- ES6 modules preserved

**Mobile Fixes:**

- Added viewport meta tag (width=device-width, initial-scale=1)
- Fixed sidebar overlay `pointer-events` issue
- Fixed mobile button `auto-focus` issue
- Adjusted hamburger button position (left: 10px)
- Centered tab navigation for mobile
- Added touch-action manipulation
- Fixed ion-icon pointer-events

**Accessibility (WCAG 2 AA):**

- Improved color contrast:
  - `--text-secondary`: #8b8b8d → #a8a8aa
  - `--warning`: #f59e0b → #fbbf24
- Increased contrast for active nav-tab and primary buttons
- Added aria-labels (button, input, checkbox)
- Accessibility issues fully resolved

**UI Improvements:**

- Removed statistics button from sidebar
- Centered tab navigation on mobile
- Improved responsive design

**Bug Fixes:**

- Fixed `ReferenceError: i is not defined` in card-manager.js
- Fixed mobile button tap issues
- Added getElementById fallback

---

## v6.0 — 2026-02-09

> Critical bug fixes, security hardening, and 8 new features

**Critical Fixes:**

- Fixed APKG export (incorrect endpoint `/generate_apkg` → `/generate`)
- Fixed XSS vulnerability — added HTML sanitizer to Markdown output (tag whitelist + attribute filtering)
- Fixed Flask path traversal vulnerability — added `secure_filename()`
- Fixed undo/redo — search/view/theme no longer pollute history, off-by-one error fixed
- Fixed drag-drop card reordering — via store dispatch, correct index calculation

**New Features:**

- Card suspension (suspend/bury) — temporarily exclude cards from study
- CSV export — .csv format with Term, Definition, Tags columns
- Review heatmap — 90-day GitHub-style activity calendar
- Review forecast — 14-day upcoming cards chart
- Per-deck statistics — table: New/Learning/Review/Suspended/Accuracy
- Batch import — single state update for 1000+ cards (CARD_BATCH_ADD)
- localStorage quota management — error handling when storage is full
- Improved ID generation — `crypto.randomUUID()` with fallback

**Improvements:**

- SM-2 ease factor only changes for graduated review cards
- TXT export uses tab separator (reimport-friendly)
- MD export escapes `#` character
- Undo/redo preserves native browser undo in inputs
- Flask Google Docs import with 30s timeout
- Flask cleans up temp files on error
- Added `role="dialog"` and `aria-modal="true"` to all modals
- Added `aria-live="polite"` to toasts
- Added `<noscript>` fallback
- Fixed keyboard shortcuts modal (Ctrl+Y for redo)

---

## v5.0 — 2026-02-09

> 9 new features + 9 bug fixes

**New Features:**

- Reverse card mode (definition → term)
- Find & Replace — bulk text editing (case/whole-word/field)
- Card transfer — move/copy between decks
- Markdown preview — live preview in omnibar
- Review history — color-coded rating log per card
- Card maturity chart — New/Learning/Young/Mature
- Tag filtering — filter cards by tags
- Auto-save indicator — visual notification on state change
- Confetti animation — on session completion

**Bug Fixes:**

- Filled in CSS dark theme variables
- Fixed import duplicate detection
- Cleaned up export filenames
- Improved statistics calculation accuracy
- Fixed study session completion logic error
- Fixed modal close error
- Fixed keyboard shortcuts conflicts
- Optimized toast notification timing
- Fixed active deck indicator in sidebar

---

## v4.0 — 2026-02-07

> Modular architecture, SRS, multi-view system

**Architecture:**

- Full modular rewrite — Redux-style store, EventBus, ES6 modules
- 10+ separate modules: store, scheduler, card-manager, deck-manager, study-session, and more
- Removed console warnings

**New Features:**

- SM-2 Spaced Repetition System (SRS) — smart review algorithm
- Due cards badge — counter for cards due for review
- Expanded statistics dashboard
- Deck settings — daily limits
- Multi-view navigation system (Library, Study, Stats, Settings)
- Theme system — Light / Dark / Auto modes
- Professional design — removed emojis

**Fixes:**

- Fixed Study and Statistics view functionality
- View cache busting and import cleanup
- Fixed session summary HTML rendering

---

## v3.0 — 2026-02-04

> Google Import, Study Mode, Docker

**New Features:**

- Google Docs import — fetch cards via URL
- Study Mode — flashcard study session with flip animation
- Statistics panel — overview metrics
- Animations and transitions

**Infrastructure:**

- Docker support (Dockerfile + docker-compose.yml)
- UI cleanup and notifications fix
- Ready for deployment

---

## v2.0 — 2026-02-04

> Search, tags, Markdown, drag-drop

**New Features:**

- Search filter — by term and definition
- Undo/Redo system
- Keyboard shortcuts (Ctrl+Z, Ctrl+/, Ctrl+F)
- Light/Dark theme with auto-detection
- Tag system — tag and filter cards
- Deck color picker
- Export preview
- Drag & Drop card reordering
- Markdown support (bold, italic, code)
- Import preview (CSV with column mapping)

**Fixes:**

- Changed shortcut Ctrl+? → Ctrl+/
- Moved toast notifications to bottom-right
- Removed orphaned event listeners
- Fixed Import Preview CSS and event listeners

**Architecture:**

- Monolithic script.js → 10 ES6 modules
- Fixed modal CSS conflicts

---

## v1.0 — 2026-02-03

> Initial release

**Core Features:**

- Flashcard creation and editing
- Deck management (create, delete)
- Smart Omnibar — Google Docs and file import
- Command Palette (F1) — VS Code-style
- Glassmorphism modal windows
- Multi-format export (TXT, MD)
- Soft-delete (trash bin)
- Reading Mode

**Fixes:**

- Fixed UI glitches
- Fixed Command Palette z-index/blur issue
- Fixed export button dynamic text
