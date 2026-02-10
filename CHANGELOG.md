# 📋 CHANGELOG

All notable changes are documented in this file.

---

## v8.0 — 2026-02-09

> Supabase authentication, cloud sync, and login page design

**Authentication:**

- Supabase Auth integration — email/password, Google OAuth, GitHub OAuth
- AuthProvider component — graceful degradation (guest mode if Supabase not configured)
- Login page — modern split-layout design, animated orbs, responsive
- OAuth callback route — `/auth/callback` code exchange
- Client-side auth redirect — unauthenticated users redirected to `/login`
- Logged-in users redirected from `/login` to `/`

**Cloud Sync:**

- Cloud data storage with Supabase PostgreSQL (JSONB)
- Debounced auto-sync — saves to cloud with 2-second delay
- Cloud-first loading — loads from cloud first, then localStorage fallback
- Sync API routes — `GET/POST /api/sync`
- Sync indicator — visual display of syncing/synced/error states
- Database schema — `user_data` and `profiles` tables, RLS policies

**UI Improvements:**

- User profile in sidebar — avatar, name, email, logout button
- Login page completely redesigned — split layout, animated background
- Loading spinner and skeleton improved

**Technical:**

- Middleware Edge Runtime issue resolved (simplified pass-through)
- `.next` cache clearing issue identified and fixed
- React ↔ Vanilla JS bridge — `window.__ankiflow_auth`, CustomEvents
- Added `@supabase/ssr@0.8.0` and `@supabase/supabase-js@2.95.3`

---

## v7.0 — 2026-02-09

> Next.js migration, mobile version fixes, accessibility improvements

**Architecture:**

- Flask → Next.js 16 migration (React 19)
- Client-side rendering (CSR) approach
- Turbopack dev server (faster builds)
- ES6 modules preserved

**Mobile Version Fixes:**

- Added viewport meta tag (width=device-width, initial-scale=1)
- Fixed sidebar overlay `pointer-events` issue
- Fixed button `auto-focus` issue in mobile mode
- Adjusted hamburger button position (left: 10px)
- Centered tab navigation (for mobile)
- Added touch-action manipulation
- Fixed Ion-icon pointer-events

**Accessibility (WCAG 2 AA):**

- Improved color contrast:
  - `--text-secondary`: #8b8b8d → #a8a8aa
  - `--warning`: #f59e0b → #fbbf24
- Increased contrast for active nav-tabs and primary buttons
- Added aria-labels (button, input, checkbox)
- Fully resolved accessibility issues

**UI Improvements:**

- Removed Statistics button from sidebar
- Centered tab navigation in mobile version
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
- Fixed undo/redo — search/view/theme don't pollute history, fixed off-by-one error
- Fixed drag-drop card reordering — through store dispatch, proper index calculation

**New Features:**

- Card suspend/bury — temporarily remove cards from study
- CSV export — .csv format with Term, Definition, Tags columns
- Review heatmap — 90-day GitHub-style activity calendar
- Review forecast — 14-day upcoming cards chart
- Per-deck statistics — table: New/Learning/Review/Suspended/Accuracy
- Batch import — single state update for 1000+ cards (CARD_BATCH_ADD)
- localStorage quota management — error handling when memory is full
- Improved ID generation — `crypto.randomUUID()` with fallback

**Improvements:**

- SM-2 ease factor only changes for graduated review cards
- TXT export uses tab separator (reimport-friendly)
- MD export escapes `#` character
- Undo/redo preserves native browser undo in inputs
- Flask Google Docs import with 30s timeout
- Flask cleans temp files on error
- Added `role="dialog"` and `aria-modal="true"` to all modals
- Added `aria-live="polite"` to toast
- Added `<noscript>` fallback
- Fixed keyboard shortcuts modal (Ctrl+Y for redo)

---

## v5.0 — 2026-02-09

> 9 new features + 9 bug fixes

**New Features:**

- Reverse card mode (definition → term)
- Find & Replace — bulk text editing (case/whole-word/field)
- Move cards — move/copy between decks
- Markdown preview — live preview in omnibar
- Review history — colorful ratings log for each card
- Card maturity chart — New/Learning/Young/Mature
- Tag filtering — filter cards by tags
- Auto-save indicator — visual notification when state changes
- Confetti animation — at end of session

**Bug Fixes:**

- Filled in CSS dark theme variables
- Fixed import duplicate detection
- Cleaned export filenames
- Improved statistics calculation accuracy
- Fixed study session end logic error
- Fixed modal close error
- Fixed keyboard shortcut conflicts
- Optimized toast message timing
- Fixed sidebar active deck indicator

---

## v4.0 — 2026-02-07

> Modular architecture, SRS, multi-view system

**Architecture:**

- Complete modular rewrite — Redux-style store, EventBus, ES6 modules
- 10+ separate modules: store, scheduler, card-manager, deck-manager, study-session, and others
- Removed console warnings

**New Features:**

- SM-2 Spaced Repetition System (SRS) — intelligent repetition algorithm
- Due cards badge — counter for due cards
- Extended statistics dashboard
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
- Statistics panel — overall metrics
- Animations and transitions

**Infrastructure:**

- Docker support (Dockerfile + docker-compose.yml)
- UI cleanup and notifications fixes
- Ready for deployment

---

## v2.0 — 2026-02-04

> Search, tags, Markdown, drag-drop

**New Features:**

- Search filter — by term and definition
- Undo/Redo system
- Keyboard shortcuts (Ctrl+Z, Ctrl+/, Ctrl+F)
- Light/Dark theme automatic support
- Tag system — tag and filter cards
- Deck color picker (Color Picker)
- Export preview
- Drag & Drop card reordering
- Markdown support (bold, italic, code)
- Import preview (with CSV column mapping)

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
- Command Palette (F1) — VS Code style
- Glassmorphism modal windows
- Multi-format export (TXT, MD)
- Soft-delete (trash bin)
- Reading Mode

**Fixes:**

- Fixed UI glitches
- Fixed Command Palette z-index/blur issue
- Fixed export button dynamic text
