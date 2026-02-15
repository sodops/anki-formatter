import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem 1rem" }}>
      <Link href="/" style={{ color: "var(--accent)", textDecoration: "none", marginBottom: "2rem", display: "inline-block" }}>
        ← Bosh sahifa
      </Link>
      
      <h1 style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>Maxfiylik Siyosati</h1>
      <p style={{ color: "var(--text-secondary)", marginBottom: "2rem" }}>
        Oxirgi yangilanish: {new Date().toLocaleDateString("uz-UZ")}
      </p>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>1. Umumiy Ma'lumot</h2>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          AnkiFlow ("biz", "bizning", "platformamiz") foydalanuvchilarning maxfiyligini himoya qilishga intiladi. 
          Ushbu maxfiylik siyosati sizning shaxsiy ma'lumotlaringizni qanday to'plash, ishlatish va himoya 
          qilishimizni tushuntiradi.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>2. To'planadigan Ma'lumotlar</h2>
        
        <h3 style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>2.1. Akkount Ma'lumotlari</h3>
        <ul style={{ lineHeight: "1.8", marginBottom: "1rem", paddingLeft: "1.5rem" }}>
          <li>Email manzil</li>
          <li>Ism (ixtiyoriy)</li>
          <li>Profil rasmi (OAuth orqali kirish uchun)</li>
          <li>Kirish vaqti va tarix</li>
        </ul>

        <h3 style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>2.2. Foydalanish Ma'lumotlari</h3>
        <ul style={{ lineHeight: "1.8", marginBottom: "1rem", paddingLeft: "1.5rem" }}>
          <li>Yaratgan decklaringiz va cardlaringiz</li>
          <li>O'rganish statistikasi (review logs)</li>
          <li>Sozlamalar va preferences</li>
          <li>Web Vitals (performance metrics)</li>
          <li>System logs (xatolarni tuzatish uchun)</li>
        </ul>

        <h3 style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>2.3. Texnik Ma'lumotlar</h3>
        <ul style={{ lineHeight: "1.8", marginBottom: "1rem", paddingLeft: "1.5rem" }}>
          <li>IP manzil (rate limiting uchun)</li>
          <li>Browser turi va versiyasi</li>
          <li>Qurilma turi (desktop/mobile)</li>
          <li>Operatsion tizim</li>
        </ul>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>3. Ma'lumotlardan Foydalanish</h2>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          Biz sizning ma'lumotlaringizni quyidagi maqsadlarda ishlatamiz:
        </p>
        <ul style={{ lineHeight: "1.8", marginBottom: "1rem", paddingLeft: "1.5rem" }}>
          <li><strong>Xizmat ko'rsatish:</strong> Flashcard yaratish, saqlash va sinxronlash</li>
          <li><strong>Autentifikatsiya:</strong> Akkountingizga xavfsiz kirish</li>
          <li><strong>Statistika:</strong> O'rganish progress va yutuqlar ko'rsatish</li>
          <li><strong>Xatolarni tuzatish:</strong> Texnik muammolarni aniqlash va hal qilish</li>
          <li><strong>Yaxshilash:</strong> Platformani takomillashtirish</li>
        </ul>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>4. Ma'lumotlarni Saqlash</h2>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          Barcha ma'lumotlar <strong>Supabase</strong> (PostgreSQL) cloud database'da saqlanadi:
        </p>
        <ul style={{ lineHeight: "1.8", marginBottom: "1rem", paddingLeft: "1.5rem" }}>
          <li>Server joylashuvi: AWS (Frankfurt, Germany)</li>
          <li>Shifrlash: TLS/SSL (in-transit), AES-256 (at-rest)</li>
          <li>Backup: Avtomatik kunlik backup</li>
          <li>Row Level Security (RLS): Har bir foydalanuvchi faqat o'z ma'lumotlariga kiradi</li>
        </ul>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>5. Ma'lumotlarni Ulashish</h2>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          Biz sizning shaxsiy ma'lumotlaringizni <strong>hech qachon</strong> uchinchi shaxslarga sotmaymiz yoki ijarasiga bermaymiz.
        </p>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          Quyidagi hollarda ma'lumotlar ulashilishi mumkin:
        </p>
        <ul style={{ lineHeight: "1.8", marginBottom: "1rem", paddingLeft: "1.5rem" }}>
          <li><strong>OAuth providers:</strong> Google, GitHub (siz tanlagan holda)</li>
          <li><strong>Hosting:</strong> Vercel (frontend), Supabase (backend)</li>
          <li><strong>Qonuniy talablar:</strong> Sud qarori yoki huquqiy majburiyat</li>
        </ul>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>6. Sizning Huquqlaringiz</h2>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          GDPR va boshqa maxfiylik qonunlariga muvofiq, sizda quyidagi huquqlar bor:
        </p>
        <ul style={{ lineHeight: "1.8", marginBottom: "1rem", paddingLeft: "1.5rem" }}>
          <li><strong>Ko'rish:</strong> Shaxsiy ma'lumotlaringizni ko'rish</li>
          <li><strong>Tuzatish:</strong> Noto'g'ri ma'lumotlarni tuzatish</li>
          <li><strong>O'chirish:</strong> Akkountni va barcha ma'lumotlarni o'chirish</li>
          <li><strong>Export:</strong> Ma'lumotlarni JSON formatda yuklab olish</li>
          <li><strong>Cheklash:</strong> Ma'lumotlar ishlov berishni cheklash</li>
        </ul>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          Ushbu huquqlardan foydalanish uchun: Settings → Account → Export Data yoki Delete Account
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>7. Cookies va LocalStorage</h2>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          Biz quyidagi cookies va local storage'dan foydalanamiz:
        </p>
        <ul style={{ lineHeight: "1.8", marginBottom: "1rem", paddingLeft: "1.5rem" }}>
          <li><strong>Autentifikatsiya:</strong> Supabase session cookies (zaruriy)</li>
          <li><strong>Preferences:</strong> Theme, til, sozlamalar (localStorage)</li>
          <li><strong>Offline cache:</strong> Deck va cardlar (IndexedDB)</li>
          <li><strong>Analytics:</strong> Vercel Analytics (anonim)</li>
        </ul>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>8. Bolalarning Maxfiyligi</h2>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          Xizmatimiz 13 yoshdan katta foydalanuvchilar uchun mo'ljallangan. Agar siz 13 yoshdan kichik bo'lsangiz, 
          ota-onangiz yoki vasiyingizdan ruxsat oling.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>9. Xavfsizlik</h2>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          Biz sizning ma'lumotlaringizni himoya qilish uchun quyidagi choralarni ko'ramiz:
        </p>
        <ul style={{ lineHeight: "1.8", marginBottom: "1rem", paddingLeft: "1.5rem" }}>
          <li>HTTPS shifrlash (barcha trafik)</li>
          <li>Database shifrlash (AES-256)</li>
          <li>Row Level Security (faqat o'z ma'lumotlaringizga kirish)</li>
          <li>Rate limiting (brute-force himoyasi)</li>
          <li>Input validation (Zod)</li>
          <li>Regular security updates</li>
        </ul>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>10. O'zgarishlar</h2>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          Ushbu maxfiylik siyosatini vaqti-vaqti bilan yangilashimiz mumkin. Muhim o'zgarishlar bo'lsa, 
          email orqali xabardor qilamiz.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>11. Bog'lanish</h2>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          Maxfiylik bilan bog'liq savol yoki murojaatlar uchun:
        </p>
        <ul style={{ lineHeight: "1.8", marginBottom: "1rem", paddingLeft: "1.5rem" }}>
          <li>Email: privacy@ankiflow.com</li>
          <li>GitHub: <a href="https://github.com/sodops/anki-formatter" target="_blank" rel="noopener" style={{ color: "var(--accent)" }}>github.com/sodops/anki-formatter</a></li>
        </ul>
      </section>

      <div style={{ marginTop: "3rem", padding: "1.5rem", background: "var(--bg-secondary)", borderRadius: "8px" }}>
        <p style={{ margin: 0, lineHeight: "1.6" }}>
          <strong>Qisqacha:</strong> Biz sizning ma'lumotlaringizni faqat xizmat ko'rsatish uchun ishlatamiz, 
          hech kimga sotmaymiz, xavfsiz saqlaymiz va siz istalgan vaqt o'chirishingiz mumkin.
        </p>
      </div>
    </div>
  );
}
