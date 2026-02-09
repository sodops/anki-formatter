# 📋 CHANGELOG

Barcha muhim o'zgarishlar shu faylda qayd etilgan.

---

## v8.0 — 2026-02-09

> Supabase autentifikatsiya, cloud sync, va login sahifa dizayni

**Autentifikatsiya:**

- Supabase Auth integratsiyasi — email/parol, Google OAuth, GitHub OAuth
- AuthProvider komponenti — graceful degradation (Supabase sozlanmagan bo'lsa guest rejim)
- Login sahifasi — zamonaviy split-layout dizayn, animated orbs, responsive
- OAuth callback route — `/auth/callback` kod almashish
- Client-side auth redirect — login bo'lmagan foydalanuvchilar `/login`'ga yo'naltiriladi
- Login bo'lgan foydalanuvchilar `/login`'dan `/`'ga qaytariladi

**Cloud Sync:**

- Supabase PostgreSQL bilan cloud ma'lumotlar saqlash (JSONB)
- Debounced auto-sync — 2 soniya kechikish bilan cloudga saqlash
- Cloud-first yuklash — avval clouddan, keyin localStorage fallback
- Sync API route'lari — `GET/POST /api/sync`
- Sync indikatori — syncing/synced/error holatlari vizual ko'rsatish
- Database schema — `user_data` va `profiles` jadvallari, RLS siyosatlari

**UI yaxshilanishlar:**

- Foydalanuvchi profili sidebar'da — avatar, ism, email, logout tugmasi
- Login sahifa butunlay qayta dizayn qilindi — split layout, animated background
- Loading spinner va skeleton yaxshilandi

**Texnik:**

- Middleware Edge Runtime muammosi hal qilindi (soddalashtirilgan pass-through)
- `.next` cache tozalash muammosi aniqlandi va tuzatildi
- React ↔ Vanilla JS ko'prigi — `window.__ankiflow_auth`, CustomEvents
- `@supabase/ssr@0.8.0` va `@supabase/supabase-js@2.95.3` qo'shildi

---

## v7.0 — 2026-02-09

> Next.js migratsiyasi, mobil versiya tuzatish, accessibility yaxshilash

**Arxitektura:**

- Flask → Next.js 16 migratsiyasi (React 19)
- Client-side rendering (CSR) yondashuvi
- Turbopack dev server (tezroq build)
- ES6 modullar saqlanib qoldi

**Mobil versiya tuzatishlari:**

- Viewport meta tag qo'shildi (width=device-width, initial-scale=1)
- Sidebar overlay `pointer-events` muammosi tuzatildi
- Mobil rejimda tugmalar `auto-focus` muammosi tuzatildi
- Hamburger tugma pozitsiyasi sozlandi (left: 10px)
- Tab navigation markazga joylashtirildi (mobil uchun)
- Touch-action manipulation qo'shildi
- Ion-icon pointer-events tuzatildi

**Accessibility (WCAG 2 AA):**

- Color contrast yaxshilandi:
  - `--text-secondary`: #8b8b8d → #a8a8aa
  - `--warning`: #f59e0b → #fbbf24
- Active nav-tab va primary button'lar uchun contrast oshirildi
- Aria-label'lar qo'shildi (button, input, checkbox)
- Accessibility muammolar butunlay hal qilindi

**UI yaxshilanishlar:**

- Statistics tugmasi sidebar'dan olib tashlandi
- Tab navigation mobil versiyada markazlashtirildi
- Responsive dizayn yaxshilandi

**Bug tuzatishlar:**

- `ReferenceError: i is not defined` in card-manager.js tuzatildi
- Mobile button tap issues tuzatildi
- getElementById fallback qo'shildi

---

## v6.0 — 2026-02-09

> Kritik bug tuzatishlar, xavfsizlik mustahkamlash va 8 ta yangi funksiya

**Kritik tuzatishlar:**

- APKG eksport tuzatildi (noto'g'ri endpoint `/generate_apkg` → `/generate`)
- XSS zaiflik tuzatildi — Markdown chiqishiga HTML sanitizer qo'shildi (tag whitelist + attribute filtrlash)
- Flask path traversal zaiflik tuzatildi — `secure_filename()` qo'shildi
- Undo/redo tuzatildi — search/view/theme tarixni ifloslamas, off-by-one xato tuzatildi
- Drag-drop karta tartiblash tuzatildi — store dispatch orqali, to'g'ri index hisoblash

**Yangi funksiyalar:**

- Kartani to'xtatish (suspend/bury) — kartalarni vaqtincha o'rganishdan chiqarish
- CSV eksport — .csv formatda Term, Definition, Tags ustunlari bilan
- Review heatmap — 90 kunlik GitHub-uslubidagi faollik kalendari
- Review prognoz — 14 kunlik kelgusi kartalar diagrammasi
- Har bir deck statistikasi — jadval: New/Learning/Review/Suspended/Accuracy
- Batch import — 1000+ karta uchun bitta state yangilanish (CARD_BATCH_ADD)
- localStorage kvota boshqaruvi — xotira to'lganda xatolik boshqarish
- Yaxshilangan ID generatsiya — `crypto.randomUUID()` fallback bilan

**Yaxshilanishlar:**

- SM-2 ease factor faqat graduated review kartalar uchun o'zgaradi
- TXT eksport tab separator ishlatadi (reimport-friendly)
- MD eksport `#` belgisini escape qiladi
- Undo/redo inputlarda native browser undo saqlanadi
- Flask Google Docs import 30s timeout bilan
- Flask temp fayllarni xatolikda tozalaydi
- Barcha modallarga `role="dialog"` va `aria-modal="true"` qo'shildi
- Toast'ga `aria-live="polite"` qo'shildi
- `<noscript>` fallback qo'shildi
- Klaviatura shortcutlari modal tuzatildi (Ctrl+Y redo uchun)

---

## v5.0 — 2026-02-09

> 9 ta yangi funksiya + 9 ta bug tuzatish

**Yangi funksiyalar:**

- Teskari karta rejimi (definition → term)
- Find & Replace — ommaviy matn tahrirlash (case/whole-word/field)
- Kartalarni ko'chirish — decklar orasida move/copy
- Markdown preview — omnibar'da jonli ko'rish
- Review tarixi — har bir karta uchun rang-barang reytinglar jurnali
- Karta yetuklik diagrammasi — New/Learning/Young/Mature
- Tag filtrlash — teglar bo'yicha kartalarni filtrlash
- Auto-save indikatori — state o'zgarganda vizual bildirish
- Confetti animatsiya — sessiya yakunida

**Bug tuzatishlar:**

- CSS dark theme o'zgaruvchilari to'ldirildi
- Import duplicate detection tuzatildi
- Eksport fayl nomlari tozalandi
- Statistika hisoblash aniqligi oshirildi
- Study sessiya tugash mantiqiy xatosi tuzatildi
- Modal yopilish xatosi tuzatildi
- Keyboard shortcutlar to'qnashuvi tuzatildi
- Toast xabar vaqti optimallashtirildi
- Sidebar faol deck belgisi tuzatildi

---

## v4.0 — 2026-02-07

> Modular arxitektura, SRS, ko'p ko'rinish tizimi

**Arxitektura:**

- To'liq modular qayta yozish — Redux-uslubidagi store, EventBus, ES6 modullar
- 10+ alohida modul: store, scheduler, card-manager, deck-manager, study-session, va boshqalar
- Konsol ogohlantirishlari olib tashlandi

**Yangi funksiyalar:**

- SM-2 Spaced Repetition System (SRS) — aqlli takrorlash algoritmi
- Due cards badge — muddati kelgan kartalar hisoblagichi
- Kengaytirilgan statistika dashboard
- Deck sozlamalari — kunlik limitlar
- Multi-view navigatsiya tizimi (Library, Study, Stats, Settings)
- Tema tizimi — Light / Dark / Auto rejimlar
- Professional dizayn — emoji olib tashlandi

**Tuzatishlar:**

- Study va Statistics ko'rinishlari funksionalligi tuzatildi
- View cache busting va import tozalash
- Session summary HTML rendering tuzatildi

---

## v3.0 — 2026-02-04

> Google Import, Study Mode, Docker

**Yangi funksiyalar:**

- Google Docs import — URL orqali kartalar olish
- Study Mode — flashcard o'rganish sessiyasi flip animatsiya bilan
- Statistika paneli — umumiy ko'rsatkichlar
- Animatsiyalar va o'tishlar

**Infratuzilma:**

- Docker qo'llab-quvvatlash (Dockerfile + docker-compose.yml)
- UI tozalash va notifications tuzatish
- Deploy uchun tayyor

---

## v2.0 — 2026-02-04

> Qidiruv, teglar, Markdown, drag-drop

**Yangi funksiyalar:**

- Qidiruv filtri — term va definition bo'yicha
- Undo/Redo tizimi
- Klaviatura shortcutlari (Ctrl+Z, Ctrl+/, Ctrl+F)
- Light/Dark tema avtomatik qo'llab-quvvatlash
- Tag tizimi — kartalarni teglash va filtrlash
- Deck rang tanlash (Color Picker)
- Eksport preview
- Drag & Drop karta tartiblash
- Markdown qo'llab-quvvatlash (bold, italic, code)
- Import preview (CSV ustun xaritalash bilan)

**Tuzatishlar:**

- Shortcut Ctrl+? → Ctrl+/ ga o'zgartirildi
- Toast xabarnomalar pastga-o'ngga ko'chirildi
- Orphaned event listener olib tashlandi
- Import Preview CSS va event listenerlar tuzatildi

**Arxitektura:**

- Monolitik script.js → 10 ta ES6 modul
- Modal CSS to'qnashuvlari tuzatildi

---

## v1.0 — 2026-02-03

> Dastlabki versiya

**Asosiy funksiyalar:**

- Flashcard yaratish va tahrirlash
- Deck boshqaruvi (yaratish, o'chirish)
- Smart Omnibar — Google Docs va fayl import
- Command Palette (F1) — VS Code uslubida
- Glassmorphism modal oynalar
- Multi-format eksport (TXT, MD)
- Soft-delete (axlat qutisi)
- Reading Mode

**Tuzatishlar:**

- UI glitchlar tuzatildi
- Command Palette z-index/blur muammosi tuzatildi
- Eksport tugmasi dinamik matni tuzatildi
