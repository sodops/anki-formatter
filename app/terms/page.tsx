import Link from "next/link";

export default function TermsPage() {
  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem 1rem" }}>
      <Link href="/" style={{ color: "var(--accent)", textDecoration: "none", marginBottom: "2rem", display: "inline-block" }}>
        ← Bosh sahifa
      </Link>
      
      <h1 style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>Foydalanish Shartlari</h1>
      <p style={{ color: "var(--text-secondary)", marginBottom: "2rem" }}>
        Oxirgi yangilanish: {new Date().toLocaleDateString("uz-UZ")}
      </p>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>1. Shartlarni Qabul Qilish</h2>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          AnkiFlow platformasidan foydalanish orqali siz ushbu Foydalanish Shartlarini ("Shartlar") o'qiganingizni, 
          tushunganingizni va qabul qilganingizni tasdiqlaysiz. Agar shartlar bilan rozi bo'lmasangiz, 
          platformadan foydalanmang.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>2. Xizmat Ta'rifi</h2>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          AnkiFlow - bu flashcard yaratish, import qilish va spaced repetition algoritmi yordamida 
          o'rganish uchun mo'ljallangan veb-platforma. Xizmat quyidagilarni o'z ichiga oladi:
        </p>
        <ul style={{ lineHeight: "1.8", marginBottom: "1rem", paddingLeft: "1.5rem" }}>
          <li>Flashcard deck yaratish va boshqarish</li>
          <li>SM-2 algoritmi bilan spaced repetition</li>
          <li>Cloud sync (barcha qurilmalar)</li>
          <li>Import/Export (TXT, CSV, DOCX, Google Docs, Anki)</li>
          <li>Statistika va progress tracking</li>
          <li>Offline rejim (PWA)</li>
        </ul>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>3. Foydalanuvchi Akkauntlari</h2>
        
        <h3 style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>3.1. Ro'yxatdan O'tish</h3>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          Xizmatdan foydalanish uchun akkount yaratishingiz kerak. Siz:
        </p>
        <ul style={{ lineHeight: "1.8", marginBottom: "1rem", paddingLeft: "1.5rem" }}>
          <li>To'g'ri va haqiqiy ma'lumot berishingiz shart</li>
          <li>Akkount xavfsizligidan javobgarsiz</li>
          <li>Parolingizni maxfiy tutishingiz kerak</li>
          <li>Bir kishiga bitta akkount</li>
        </ul>

        <h3 style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>3.2. Yosh Cheklovi</h3>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          13 yoshdan katta bo'lishingiz kerak. 13 yoshdan kichiklar ota-ona roziligi bilan foydalanishi mumkin.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>4. Foydalanuvchi Kontenti</h2>
        
        <h3 style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>4.1. Sizning Kontentingiz</h3>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          Siz yaratgan barcha flashcardlar, decklar va boshqa kontent sizniki. Biz sizning kontentingizni:
        </p>
        <ul style={{ lineHeight: "1.8", marginBottom: "1rem", paddingLeft: "1.5rem" }}>
          <li>Xizmat ko'rsatish uchun saqlaymiz</li>
          <li>Backup va restore uchun nusxalaymiz</li>
          <li>Sizning roziligingizsiz umuman oshkor qilmaymiz</li>
        </ul>

        <h3 style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>4.2. Taqiqlangan Kontent</h3>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          Quyidagi turdagi kontent yaratish taqiqlanadi:
        </p>
        <ul style={{ lineHeight: "1.8", marginBottom: "1rem", paddingLeft: "1.5rem" }}>
          <li>Noqonuniy yoki huquqbuzar kontent</li>
          <li>Nafrat, zo'ravonlik yoki diskriminatsiya uyg'otuvchi kontent</li>
          <li>Spam yoki viruslar</li>
          <li>Boshqa shaxslarning mualliflik huquqlarini buzuvchi kontent</li>
          <li>Yolg'on yoki chalg'ituvchi ma'lumotlar</li>
        </ul>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>5. Xizmat Ko'rsatish</h2>
        
        <h3 style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>5.1. Xizmat Sifati</h3>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          Biz xizmatni "AS IS" asosida taqdim etamiz. Quyidagilarni kafolatlamaymiz:
        </p>
        <ul style={{ lineHeight: "1.8", marginBottom: "1rem", paddingLeft: "1.5rem" }}>
          <li>24/7 mavjudlik</li>
          <li>Xatosiz ishlash</li>
          <li>Ma'lumotlarning yo'qolmasligi (backup qiling!)</li>
          <li>Muayyan natijalarni o'rganishda</li>
        </ul>

        <h3 style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>5.2. Texnik Xizmat</h3>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          Biz xizmatni yaxshilash, texnik xizmat ko'rsatish yoki xatolarni tuzatish uchun vaqti-vaqti bilan 
          to'xtatishimiz mumkin. Oldindan xabar berishga harakat qilamiz.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>6. Narxlar va To'lov</h2>
        
        <h3 style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>6.1. Bepul Xizmat</h3>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          Hozircha barcha xususiyatlar <strong>bepul</strong>. Kelajakda premium funksiyalar qo'shilishi mumkin:
        </p>
        <ul style={{ lineHeight: "1.8", marginBottom: "1rem", paddingLeft: "1.5rem" }}>
          <li>AI card generation</li>
          <li>Advanced statistika</li>
          <li>Collaborative decklar</li>
          <li>Priority support</li>
        </ul>

        <h3 style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>6.2. Narx O'zgarishlari</h3>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          Agar premium funksiyalar kiritilsa, mavjud foydalanuvchilar 30 kun oldin xabardor qilinadi.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>7. Javobgarlik Cheklovi</h2>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          Qonun tomonidan ruxsat etilgan darajada, AnkiFlow quyidagilar uchun javobgar emas:
        </p>
        <ul style={{ lineHeight: "1.8", marginBottom: "1rem", paddingLeft: "1.5rem" }}>
          <li>Ma'lumotlar yo'qolishi (backup qiling!)</li>
          <li>O'rganish natijalariga ta'sir</li>
          <li>Xizmat to'xtab turishi</li>
          <li>Texnik muammolar</li>
          <li>Uchinchi tomon xizmatlari (Google, GitHub)</li>
        </ul>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>8. Intelektual Mulk</h2>
        
        <h3 style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>8.1. Platform Kodi</h3>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          AnkiFlow platformasi open-source va MIT litsenziyasi ostida:
        </p>
        <ul style={{ lineHeight: "1.8", marginBottom: "1rem", paddingLeft: "1.5rem" }}>
          <li>GitHub: <a href="https://github.com/sodops/anki-formatter" target="_blank" rel="noopener" style={{ color: "var(--accent)" }}>github.com/sodops/anki-formatter</a></li>
          <li>Litsenziya: MIT</li>
          <li>Siz fork qilishingiz va o'zgartirishingiz mumkin</li>
        </ul>

        <h3 style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>8.2. Brend</h3>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          "AnkiFlow" nomi va logotipi himoyalangan. Tijorat maqsadlarida foydalanishdan oldin ruxsat oling.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>9. Akkountni Bekor Qilish</h2>
        
        <h3 style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>9.1. Siz Tomonidan</h3>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          Istalgan vaqt akkountingizni o'chirishingiz mumkin:
        </p>
        <ul style={{ lineHeight: "1.8", marginBottom: "1rem", paddingLeft: "1.5rem" }}>
          <li>Settings → Account → Delete Account</li>
          <li>Barcha ma'lumotlaringiz darhol o'chiriladi</li>
          <li>Backup yuklab olib, keyin o'chiring</li>
        </ul>

        <h3 style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>9.2. Biz Tomonidan</h3>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          Quyidagi hollarda akkountingizni to'xtatishimiz yoki o'chirishimiz mumkin:
        </p>
        <ul style={{ lineHeight: "1.8", marginBottom: "1rem", paddingLeft: "1.5rem" }}>
          <li>Shartlarni buzish</li>
          <li>Taqiqlangan kontent yaratish</li>
          <li>Spam yoki abuse</li>
          <li>Texnik xavfsizlik xavfi</li>
        </ul>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>10. Shartlar O'zgarishi</h2>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          Ushbu shartlarni vaqti-vaqti bilan yangilashimiz mumkin. Muhim o'zgarishlar:
        </p>
        <ul style={{ lineHeight: "1.8", marginBottom: "1rem", paddingLeft: "1.5rem" }}>
          <li>Email orqali xabar beriladi</li>
          <li>30 kun oldin e'lon qilinadi</li>
          <li>Davom etish = yangi shartlarni qabul qilish</li>
        </ul>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>11. Qonun va Nizolar</h2>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          Ushbu shartlar O'zbekiston Respublikasi qonunlariga muvofiq boshqariladi. Nizolar:
        </p>
        <ul style={{ lineHeight: "1.8", marginBottom: "1rem", paddingLeft: "1.5rem" }}>
          <li>Avval muzokaralar orqali hal qilishga harakat qilamiz</li>
          <li>Agar hal bo'lmasa, Toshkent sudiga murojaat qilish mumkin</li>
        </ul>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>12. Bog'lanish</h2>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          Shartlar bilan bog'liq savol yoki murojaatlar uchun:
        </p>
        <ul style={{ lineHeight: "1.8", marginBottom: "1rem", paddingLeft: "1.5rem" }}>
          <li>Email: legal@ankiflow.com</li>
          <li>GitHub Issues: <a href="https://github.com/sodops/anki-formatter/issues" target="_blank" rel="noopener" style={{ color: "var(--accent)" }}>github.com/sodops/anki-formatter/issues</a></li>
        </ul>
      </section>

      <div style={{ marginTop: "3rem", padding: "1.5rem", background: "var(--bg-secondary)", borderRadius: "8px" }}>
        <p style={{ margin: 0, lineHeight: "1.6" }}>
          <strong>Qisqacha:</strong> Platformadan yaxshi niyatda foydalaning, sizning kontentingiz sizniki, 
          biz sizning ma'lumotlaringizni himoya qilamiz. Bepul va open-source. Savollar bo'lsa - murojaat qiling!
        </p>
      </div>
    </div>
  );
}
