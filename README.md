# ⚡ AnkiFlow — Aqlli Flashcard Platformasi

> **English version available**: See [README_EN.md](./README_EN.md) for English documentation.

**[anki.sodops.uz](https://anki.sodops.uz)** — Zamonaviy flashcard o'rganish platformasi. **SM-2 Spaced Repetition** algoritmi, cloud sync va ko'p qurilma sinxronizatsiyasi bilan.

---

## 📖 Loyiha haqida

**AnkiFlow** — lug'at va bilimlarga oid ma'lumotlarni samarali yodlash uchun mo'ljallangan full-stack flashcard platformasi. SM-2 algoritmidan foydalanib takrorlash rejasini optimal boshqaradi. Supabase orqali foydalanuvchi autentifikatsiyasi va cloud sync imkoniyatini taqdim etadi.

### Texnologiyalar:

| Qatlam | Texnologiya |
| --- | --- |
| **Framework** | Next.js 16.1 (React 19, Turbopack) |
| **UI** | Vanilla JavaScript ES6 modullari |
| **Auth** | Supabase Auth (Email, Google, GitHub OAuth) |
| **Ma'lumotlar bazasi** | Supabase PostgreSQL (JSONB) + localStorage fallback |
| **Deploy** | Vercel (auto-deploy `main` branch) |
| **Algoritm** | SM-2 Spaced Repetition |

---

## 🌐 Demo

**Production**: [anki.sodops.uz](https://anki.sodops.uz)

---

## ✨ Asosiy imkoniyatlar

### 🔐 Autentifikatsiya va Cloud

- **Supabase Auth** — email/parol, Google OAuth, GitHub OAuth
- **Cloud Sync** — barcha qurilmalarda ma'lumotlar sinxronlanadi
- **Debounced auto-save** — 2s kechikish bilan cloudga saqlash
- **Offline fallback** — internet yo'q bo'lsa localStorage'dan ishlaydi
- **Sync indikatori** — syncing / synced / error holatlari

### 📚 Kartalar va Decklar

- **SM-2 Spaced Repetition** — aqlli takrorlash rejasi (new → learning → review)
- **Ko'p deckli boshqaruv** — yaratish, nomini o'zgartirish, rang tanlash, tartibni o'zgartirish
- **Inline tahrirlash** — jadvalda to'g'ridan-to'g'ri kartani tahrirlash
- **Markdown qo'llab-quvvatlash** — bold, italic, code, linklar
- **Tag tizimi** — kartalarni teglash, teglar bo'yicha filtrlash
- **Qidiruv** — term va definitionlar bo'yicha tezkor qidiruv
- **Teskari rejim** — definition → term yo'nalishda o'rganish
- **Kartani to'xtatish** — vaqtincha o'rganishdan chiqarish (suspend)
- **Find & Replace** — ommaviy matn tahrirlash
- **Kartalarni ko'chirish** — decklar orasida move/copy

### 📖 O'rganish

- **Aqlli sessiyalar** — faqat muddati kelgan kartalar (new + learning + review)
- **Flashcard animatsiya** — flip effekti, klaviatura bilan boshqarish
- **Ovozli effektlar** — ixtiyoriy audio feedback
- **Kunlik maqsad** — progress bar va streak hisoblagich
- **Sessiya xulosasi** — aniqlik halqasi, reytinglar bo'linmasi, confetti

### 📊 Statistika

- **Umumiy ko'rsatkichlar** — kartalar, decklar, streak, aniqlik
- **Deck taqsimoti** — gorizontal diagramma
- **Karta yetuklik darajasi** — New / Learning / Young / Mature
- **Review heatmap** — 90 kunlik GitHub-uslubidagi faollik kalendari
- **Review prognoz** — 14 kunlik kelgusi kartalar diagrammasi
- **Har bir deck statistikasi** — jadval: New/Learning/Review/Suspended/Accuracy
- **Top teglar** — teg buluti

### 📥 Import / Eksport

- **Import**: TXT, CSV (ustun xaritalash bilan), DOCX, Google Docs URL
- **Eksport**: .apkg (Anki), .txt, .md, .csv
- **Import preview** — birinchi 10 karta + dublikat aniqlash
- **To'liq backup** — JSON formatda barcha ma'lumotlar

### 🎨 Interfeys

- **Qorong'u va yorug' mavzu** — auto (tizim sozlamasi) ham bor
- **Command palette** — `F1` yoki omnibar'da `>`
- **Klaviatura shortcutlari** — Ctrl+Z, Ctrl+F, Space, 1-4
- **Responsive dizayn** — mobil uchun hamburger menyu
- **Drag & drop** — kartalarni tartibini o'zgartirish
- **Undo / Redo** — barcha amallarni qaytarish

### 🛡️ Xavfsizlik

- **Supabase RLS** — foydalanuvchilar faqat o'z ma'lumotlarini ko'radi
- **XSS himoya** — Markdown chiqishi sanitize qilinadi
- **Path traversal himoya** — fayl yuklab olish himoyalangan
- **localStorage kvota** — xotira to'lganda xatolik boshqaruvi

---

## 🚀 Ishga tushirish

### Talablar

- Node.js 18+
- npm
- Supabase loyihasi (bepul: [supabase.com](https://supabase.com))

### 1. Klonlash va o'rnatish

```bash
git clone https://github.com/sodops/anki-formatter.git
cd anki-formatter
npm install
```

### 2. Supabase sozlash

`.env.local` faylini yarating:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

Supabase Dashboard → **SQL Editor** → `supabase/schema.sql` ni ishga tushiring.

### 3. OAuth sozlash (ixtiyoriy)

Supabase Dashboard → **Authentication** → **Providers**:

- **Google**: Google Cloud Console'dan Client ID va Secret oling
- **GitHub**: GitHub Developer Settings'dan OAuth App yarating

Ikkala provider uchun redirect URL: `https://YOUR_PROJECT.supabase.co/auth/v1/callback`

### 4. Ishga tushirish

```bash
npm run dev
```

Brauzeringizda oching: `http://localhost:3000`

---

## 📁 Loyiha tuzilishi

```
anki-formatter/
├── app/
│   ├── layout.tsx                   # Root layout (AuthProvider)
│   ├── page.tsx                     # Asosiy sahifa (SPA)
│   ├── login/
│   │   └── page.tsx                 # Login sahifasi
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts             # OAuth callback handler
│   └── api/
│       ├── parse/route.ts           # Matn parser API
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
│   ├── style.css                    # Barcha stillar
│   └── js/
│       ├── main.js                  # Entry point
│       ├── core/
│       │   ├── store.js             # State management + cloud sync
│       │   └── srs/
│       │       └── scheduler.js     # SM-2 algoritmi
│       ├── features/
│       │   ├── library/             # Karta va deck boshqaruvi
│       │   ├── study/               # O'rganish sessiyasi
│       │   ├── import/              # Fayl import
│       │   ├── export/              # Eksport (APKG/TXT/MD/CSV)
│       │   └── stats/               # Statistika, heatmap
│       ├── ui/                      # Toast, modal, drag-drop, tema
│       └── utils/                   # DOM helpers, Markdown parser
├── supabase/
│   └── schema.sql                   # Database schema + RLS
├── .env.local.example               # Environment variables namunasi
├── package.json
└── README.md
```

---

## ⌨️ Klaviatura shortcutlari

| Tugma | Amal |
| --- | --- |
| `F1` | Command palette |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |
| `Ctrl+F` | Qidiruv |
| `Ctrl+/` | Shortcutlar ro'yxati |
| `Space` | Javobni ko'rsatish (study mode) |
| `1` / `2` / `3` / `4` | Again / Hard / Good / Easy |
| `Esc` | Modalni yopish / Sessiyani tugatish |

---

## 🧠 SM-2 Algoritmi

AnkiFlow **SuperMemo 2 (SM-2)** algoritmidan foydalanadi:

- **New** → Yangi kartalar
- **Learning** → O'rganish jarayonida (1min → 10min)
- **Review** → Muntazam takrorlash (1d → 3d → 7d → ...)
- **Young/Mature** → 21+ kundan keyin karta "mature" hisoblanadi

Har bir rating (Again, Hard, Good, Easy) kartaning ease factor va intervalini o'zgartiradi.

---

## 🚢 Deploy (Vercel)

1. GitHub repo'ni Vercel'ga ulang (`main` branch)
2. Environment Variables qo'shing:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Custom domain qo'shing (masalan: `anki.sodops.uz`)
4. Auto-deploy — har bir push'da avtomatik yangilanadi

---

## 📄 Litsenziya

MIT © [sodops](https://github.com/sodops)

---

## 🤝 Hissa qo'shish

1. Fork qiling
2. Feature branch yarating (`git checkout -b feature/YangiImkoniyat`)
3. Commit qiling (`git commit -m 'Add: yangi imkoniyat'`)
4. Push qiling (`git push origin feature/YangiImkoniyat`)
5. Pull Request oching

---

## 📞 Bog'lanish

- **Sayt**: [anki.sodops.uz](https://anki.sodops.uz)
- **GitHub**: [sodops/anki-formatter](https://github.com/sodops/anki-formatter)

Savollaringiz yoki takliflaringiz bo'lsa, GitHub issue oching!
