# AnkiFlow - Flashcard O'rganish Platformasi

## 🚀 Tez Boshlash

### 1. Ro'yxatdan o'tish
1. [anki.sodops.uz](https://anki.sodops.uz) sahifasiga kiring
2. "Bepul boshlash" tugmasini bosing
3. Google yoki GitHub orqali kirish yoki email/parol bilan ro'yxatdan o'ting

### 2. Birinchi Deckni Yaratish
```
1. Dashboard'da "➕ Yangi Deck" tugmasini bosing
2. Deck nomini kiriting (masalan: "Ingliz tili")
3. Rangni tanlang
4. "Saqlash" bosing
```

### 3. Cardlar Qo'shish

#### Usul 1: Bitta-bitta qo'shish
- "➕ Card qo'shish" tugmasini bosing
- **Term** (savol) va **Definition** (javob) kiriting
- Enter bosing yoki "Saqlash" bosing

#### Usul 2: Bulk Import
```
1. "📤 Import" tugmasini bosing
2. Separator tanlang (==, ->, :, tab)
3. Matnni paste qiling:
   Hello == Salom
   World == Dunyo
   Book == Kitob
4. "Import" bosing
```

#### Usul 3: Fayl Import
- TXT, CSV yoki DOCX faylni yuklang
- AnkiFlow avtomatik parse qiladi

### 4. O'qishni Boshlash
```
1. "📖 O'qish" tugmasini bosing
2. Card ko'rsatiladi
3. Javobni o'ylab ko'ring
4. "Ko'rsatish" bosing
5. Qanchalik yaxshi eslab qolgansiz:
   - 1️⃣ Again - bilmayman
   - 2️⃣ Hard - qiyin
   - 3️⃣ Good - yaxshi
   - 4️⃣ Easy - juda oson
```

## ⌨️ Klaviatura Tugmalari

### Asosiy
- `Ctrl + K` - Buyruqlar palitrasini ochish
- `Ctrl + /` - Klaviatura tugmalari spravkasi
- `Ctrl + S` - Saqlash (Sync)
- `Esc` - Modal yopish

### Deck Boshqaruvi
- `Ctrl + N` - Yangi deck yaratish
- `↑ ↓` - Decklar orasida harakatlanish
- `Enter` - Deckni tanlash

### Card Boshqaruvi
- `Ctrl + Enter` - Yangi card qo'shish
- `Ctrl + E` - Cardni tahrirlash
- `Delete` - Cardni o'chirish
- `Ctrl + F` - Qidirish va almashtirish

### O'qish Rejimi
- `Space` - Javobni ko'rsatish
- `1` - Again (Yana)
- `2` - Hard (Qiyin)
- `3` - Good (Yaxshi)
- `4` - Easy (Oson)
- `R` - TTS (Ovozli o'qish)

## 🎯 Asosiy Imkoniyatlar

### 📥 Smart Import
- **Fayl formatlari**: TXT, CSV, DOCX
- **Google Docs**: URL havolasini paste qiling
- **Bulk paste**: Ko'p qatorli matnni paste qiling
- **Auto-detect**: Separator avtomatik aniqlanadi

### ☁️ Cloud Sync
- Barcha qurilmalarda sinxronlash
- Offline rejimda ishlash
- Avtomatik backup
- Real-time sync status

### 🧠 Spaced Repetition
- **SM-2 algoritmi**: Ilmiy asoslangan takrorlash
- **Adaptive intervals**: Javobingizga qarab interval o'zgaradi
- **Learning stages**: New → Learning → Review
- **Due cards**: Bugungi takrorlash cardlari

### 📊 Statistika
- Kunlik progress
- Eslab qolish darajasi
- O'rganish statistikasi
- Card holatlar (new, learning, review)

### 🎨 Personalizatsiya
- **Themalar**: Light, Dark, Auto
- **Markdown support**: Bold, italic, code, lists
- **Tags**: Cardlarni tag'lar bilan guruhlash
- **Deck colors**: Har bir deck uchun rang

## 🔧 Sozlamalar

### Spaced Repetition Sozlamalari
```
Yangi cardlar limiti: 20/kun (default)
Maksimal reviewlar: 100/kun
Kunlik maqsad: 20 card
Interval modifier: 100%
```

### TTS (Text-to-Speech)
```
Til: Ingliz, Uzbek
Tezlik: 0.5x - 2x
Pitch: 0.5 - 2
```

### Learning Steps
```
Again: 1 daqiqa, 10 daqiqa
Hard: 20% kamroq
Good: Normal interval
Easy: 2x ko'proq
```

## 📤 Export / Import

### Anki Export
1. Deckni tanlang
2. "Export to Anki" bosing
3. TSV fayl yuklab olinadi
4. Anki dasturida import qiling

### Backup
```
1. Settings → Backup
2. "Export Backup" bosing
3. JSON fayl yuklab olinadi
4. Xavfsiz joyda saqlang
```

### Restore
```
1. Settings → Backup
2. "Import Backup" bosing
3. JSON faylni tanlang
4. Tasdiqlang
```

## ❓ Tez-tez So'raladigan Savollar

### Card qanday tahrirlash kerak?
- Cardni bosing yoki `Ctrl + E`
- O'zgarishlarni kiriting
- "Saqlash" yoki `Enter` bosing

### Deckni qanday o'chirish kerak?
- Deck ustiga right-click yoki uchta nuqta
- "O'chirish" tanlang
- Trash'da 30 kun saqlanadi

### Offline rejimda ishlaysizmi?
- Ha! PWA (Progressive Web App)
- O'zgarishlar lokal keshda saqlanadi
- Internet qaytganda avtomatik sinxronlanadi

### Cardlar soni limitlanganmi?
- Yo'q! Cheksiz bepul
- Deck va cardlar soni cheklanmagan

### Google Docs qanday import qilish kerak?
```
1. Google Docs linkini copy qiling
2. Import modal'da paste qiling
3. AnkiFlow avtomatik parse qiladi
```

### Markdown qo'llab-quvvatlanadimi?
Ha! Quyidagi formatlar:
```markdown
**bold** - qalin
*italic* - qiya
`code` - kod
- list item - ro'yxat
```

### Sinxronlash qanday ishlaydi?
- Avtomatik: Har 5 daqiqada
- Manual: `Ctrl + S`
- Delta sync: Faqat o'zgarishlar

### Admin panelga qanday kirish kerak?
```
1. Admin email'ni Vercel env'ga qo'shing
2. /admin URL'ga kiring
3. Dashboard, API tester, logs ko'rish
```

## 🆘 Yordam

### Xatolik yuz bersa
1. Browser console'ni oching (F12)
2. Xatolikni screenshot qiling
3. GitHub Issues'da yozing

### Feature so'rash
- GitHub Issues'da "Feature Request" yarating
- Qanday funksiya kerakligini yozing

### Bog'lanish
- **GitHub**: [github.com/sodops/anki-formatter](https://github.com/sodops/anki-formatter)
- **Website**: [anki.sodops.uz](https://anki.sodops.uz)

## 📚 Qo'shimcha Resurslar

- [Spaced Repetition Science](https://en.wikipedia.org/wiki/Spaced_repetition)
- [SM-2 Algorithm](https://super-memory.com/english/ol/sm2.htm)
- [Effective Learning Guide](https://ncase.me/remember/)

---

**AnkiFlow** - Ilmiy o'rganish platformasi | © 2026
