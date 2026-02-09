# ⚡ AnkiFlow — Aqlli Flashcard Platformasi

Zamonaviy flashcard o'rganish platformasi — **Spaced Repetition (SM-2)** algoritmi bilan. Next.js + Vanilla JS yordamida yaratilgan.

---

## 📖 Loyiha haqida

**AnkiFlow** — bu lug'at va bilimlarga oid ma'lumotlarni samarali yodlash uchun mo'ljallangan zamonaviy flashcard platformasi. Platforma **SM-2 Spaced Repetition** algoritmidan foydalanib, takrorlash rejasini optimal tarzda boshqaradi va o'rganish jarayonini iloji boricha samarali qiladi.

### Texnologiyalar:

- **Frontend Framework**: Next.js 16 (React 19)
- **UI**: Vanilla JavaScript, HTML, CSS
- **Ma'lumotlar bazasi**: localStorage (client-side)
- **Algoritm**: SM-2 Spaced Repetition

---

## ✨ Asosiy imkoniyatlar

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

- **XSS himoya** — Markdown chiqishi sanitize qilinadi
- **Path traversal himoya** — fayl yuklab olish himoyalangan
- **Request timeout** — tashqi so'rovlar chegaralangan
- **localStorage kvota** — xotira to'lganda xatolik boshqaruvi

---

## 🚀 Ishga tushirish

### Talablar

- Node.js 18+
- npm yoki yarn

### O'rnatish va ishga tushirish

```bash
# Repositoriyani klonlash
git clone https://github.com/sodops/anki-formatter.git
cd anki-formatter

# Kerakli paketlarni o'rnatish
npm install

# Development rejimda ishga tushirish
npm run dev
```

Brauzeringizda quyidagi manzilga o'ting:

```
http://localhost:3000
```

### Docker bilan

```bash
docker-compose up --build
```

---

## 📁 Loyiha tuzilishi

```
anki-formatter/
├── src/
│   ├── app.py                       # Flask backend (API endpoints)
│   ├── parser.py                    # Matn → flashcard parser (SM-2 algoritmi)
│   ├── anki_generator.py            # .apkg fayl generatori
│   ├── file_handler.py              # Fayl o'qish (TXT, CSV)
│   ├── main.py                      # CLI interfeysi (ixtiyoriy)
│   ├── templates/
│   │   └── index.html               # SPA sahifa (asosiy interfeys)
│   └── static/
│       ├── style.css                # Barcha stillar (dark/light mode)
│       └── js/
│           ├── main.js              # Asosiy entry point
│           ├── core/
│           │   ├── store.js         # Redux-uslubidagi state boshqaruvi
│           │   ├── events.js        # EventBus (komponentlar o'rtasida aloqa)
│           │   └── srs/
│           │       └── scheduler.js # SM-2 algoritmi implementatsiyasi
│           ├── features/
│           │   ├── library/         # Karta va deck boshqaruvi
│           │   ├── study/           # O'rganish sessiyasi
│           │   ├── import/          # Fayl import
│           │   ├── export/          # Eksport (APKG/TXT/MD/CSV)
│           │   └── stats/           # Statistika, heatmap, prognoz
│           ├── ui/                  # Toast, modal, drag-drop, tema
│           └── utils/               # DOM helpers, Markdown parser
├── requirements.txt                 # Python dependencies
├── docker-compose.yml               # Docker konfiguratsiyasi
└── README.md
```

### Asosiy komponentlar:

#### Backend (Python/Flask):

- **`app.py`**: Flask serverini ishga tushiradi, API endpointlari (`/parse`, `/` va boshqalar)
- **`parser.py`**: Matndan flashcard juftliklarini ajratib oladi (adaptiv separator detection)
- **`anki_generator.py`**: Anki .apkg formatida eksport qiladi
- **`file_handler.py`**: TXT, CSV, DOCX va Google Docs'dan ma'lumot o'qiydi

#### Frontend (Vanilla JS):

- **`main.js`**: Entry point, barcha modullarni bog'laydi
- **`store.js`**: Global state management (Redux pattern)
- **`scheduler.js`**: SM-2 spaced repetition algoritmi
- **`library/`**: Kartalar jadvalini ko'rsatish va tahrirlash
- **`study/`**: Flashcard sessiyasi (flip animatsiya, rating)
- **`stats/`**: Statistika va heatmap

---

## ⌨️ Klaviatura shortcutlari

| Tugma                 | Amal                                |
| --------------------- | ----------------------------------- |
| `F1`                  | Command palette                     |
| `Ctrl+Z`              | Undo (bekor qilish)                 |
| `Ctrl+Y`              | Redo (qaytarish)                    |
| `Ctrl+F`              | Qidiruv                             |
| `Ctrl+/`              | Shortcutlar ro'yxati                |
| `Space`               | Javobni ko'rsatish (study mode)     |
| `1` / `2` / `3` / `4` | Again / Hard / Good / Easy (rating) |
| `Esc`                 | Modalni yopish / Sessiyani tugatish |

---

## 🧠 SM-2 Algoritmi

AnkiFlow **SuperMemo 2 (SM-2)** algoritmidan foydalanadi. Bu algoritm har bir kartaning qiyinlik darajasiga qarab keyingi takrorlash vaqtini belgilaydi:

- **New** → Yangi kartalar
- **Learning** → O'rganish jarayonida
- **Review** → Muntazam takrorlash
- **Young/Mature** → Karta yetuklik darajasi

Har bir rating (Again, Hard, Good, Easy) kartaning keyingi ko'rinish vaqtini o'zgartiradi.

---

## 🛠️ Foydalanish

### 1. Karta yaratish

Kartalarni qo'lda qo'shish yoki fayl import qilish orqali yaratish mumkin:

- **Qo'lda kiritish**: Library sahifasida "Add Card" tugmasini bosing
- **Import**: TXT, CSV, DOCX yoki Google Docs URL'sini yuklang

### 2. O'rganish sessiyasi

"Study" sahifasiga o'tib, deckni tanlang. Har bir karta uchun:

- `Space` tugmasini bosib javobni ko'ring
- `1` (Again) / `2` (Hard) / `3` (Good) / `4` (Easy) bilan baholang

### 3. Eksport

Kartalaringizni Anki, TXT, CSV yoki Markdown formatida eksport qiling.

---

## 📄 Litsenziya

MIT © [sodops](https://github.com/sodops)

---

## 🤝 Hissa qo'shish

Hissa qo'shmoqchi bo'lsangiz, pull request yuboring yoki issue oching!

1. Fork qiling
2. Feature branch yarating (`git checkout -b feature/AmazingFeature`)
3. Commit qiling (`git commit -m 'Add some AmazingFeature'`)
4. Push qiling (`git push origin feature/AmazingFeature`)
5. Pull Request oching

---

## 📞 Bog'lanish

Savollaringiz yoki takliflaringiz bo'lsa, GitHub orqali murojaat qiling!
