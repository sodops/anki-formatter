# ⚡ AnkiFlow — Smart Flashcard Platform

Zamonaviy flashcard o'rganish platformasi — **Spaced Repetition (SM-2)** algoritmi bilan. Flask + Vanilla JS.

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

### �� O'rganish
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

```bash
# Klonlash
git clone https://github.com/sodops/anki-formatter.git
cd anki-formatter

# Python kutubxonalarni o'rnatish
pip install -r requirements.txt

# Ishga tushirish
python src/app.py
# → http://localhost:5000
```

### Docker bilan
```bash
docker-compose up --build
```

---

## 📁 Loyiha tuzilishi

```
src/
├── app.py                       # Flask backend
├── parser.py                    # Matn → flashcard parser
├── anki_generator.py            # .apkg fayl generatori
├── file_handler.py              # Fayl o'qish
├── templates/
│   └── index.html               # SPA sahifa
└── static/
    ├── style.css                # Barcha stillar (dark/light)
    └── js/
        ├── main.js              # Asosiy entry point
        ├── core/
        │   ├── store.js         # Redux-uslubidagi state boshqaruvi
        │   ├── events.js        # EventBus
        │   └── srs/
        │       └── scheduler.js # SM-2 algoritmi
        ├── features/
        │   ├── library/         # Karta va deck boshqaruvi
        │   ├── study/           # O'rganish sessiyasi
        │   ├── import/          # Fayl import
        │   ├── export/          # Eksport (APKG/TXT/MD/CSV)
        │   └── stats/           # Statistika, heatmap, prognoz
        ├── ui/                  # Toast, modal, drag-drop, tema
        └── utils/               # DOM helpers, Markdown parser
```

---

## ⌨️ Klaviatura shortcutlari

| Shortcut | Amal |
|----------|------|
| `F1` | Command palette |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |
| `Ctrl+F` | Qidiruv |
| `Ctrl+/` | Shortcutlar ro'yxati |
| `Space` | Javobni ko'rsatish |
| `1` / `2` / `3` / `4` | Again / Hard / Good / Easy |
| `Esc` | Modalni yopish / Sessiyani tugatish |

---

## 📄 Litsenziya

MIT © [sodops](https://github.com/sodops)
