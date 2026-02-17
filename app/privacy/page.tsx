import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem 1rem" }}>
      <Link href="/" style={{ color: "var(--accent)", textDecoration: "none", marginBottom: "2rem", display: "inline-block" }}>
        ← Home
      </Link>
      
      <h1 style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>Privacy Policy</h1>
      <p style={{ color: "var(--text-secondary)", marginBottom: "2rem" }}>
        Last updated: {new Date().toLocaleDateString("en-US")}
      </p>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>1. General Information</h2>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          AnkiFlow ("we", "our", "platform") is committed to protecting user privacy. 
          This privacy policy explains how we collect, use, and protect your personal information.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>2. Data We Collect</h2>
        
        <h3 style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>2.1. Account Information</h3>
        <ul style={{ lineHeight: "1.8", marginBottom: "1rem", paddingLeft: "1.5rem" }}>
          <li>Email address</li>
          <li>Name (optional)</li>
          <li>Profile picture (for OAuth login)</li>
          <li>Login time and date</li>
        </ul>

        <h3 style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>2.2. Usage Data</h3>
        <ul style={{ lineHeight: "1.8", marginBottom: "1rem", paddingLeft: "1.5rem" }}>
          <li>Your created decks and cards</li>
          <li>Study statistics (review logs)</li>
          <li>Settings and preferences</li>
          <li>Web Vitals (performance metrics)</li>
          <li>System logs (for debugging)</li>
        </ul>

        <h3 style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>2.3. Technical Information</h3>
        <ul style={{ lineHeight: "1.8", marginBottom: "1rem", paddingLeft: "1.5rem" }}>
          <li>IP address (for rate limiting)</li>
          <li>Browser type and version</li>
          <li>Device type (desktop/mobile)</li>
          <li>Operating system</li>
        </ul>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>3. How We Use Your Data</h2>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          We use your data for the following purposes:
        </p>
        <ul style={{ lineHeight: "1.8", marginBottom: "1rem", paddingLeft: "1.5rem" }}>
          <li><strong>Service delivery:</strong> Create, store, and sync flashcards</li>
          <li><strong>Authentication:</strong> Secure access to your account</li>
          <li><strong>Statistics:</strong> Display learning progress and achievements</li>
          <li><strong>Debugging:</strong> Identify and fix technical issues</li>
          <li><strong>Improvement:</strong> Enhance platform features</li>
        </ul>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>4. Data Storage</h2>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          All data is stored in <strong>Supabase</strong> (PostgreSQL) cloud database:
        </p>
        <ul style={{ lineHeight: "1.8", marginBottom: "1rem", paddingLeft: "1.5rem" }}>
          <li>Server location: AWS (Frankfurt, Germany)</li>
          <li>Encryption: TLS/SSL (in-transit), AES-256 (at-rest)</li>
          <li>Backup: Automatic daily backups</li>
          <li>Row Level Security (RLS): Each user can only access their own data</li>
        </ul>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>5. Data Sharing</h2>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          We <strong>never</strong> sell or rent your personal information to third parties.
        </p>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          Data may be shared in the following cases:
        </p>
        <ul style={{ lineHeight: "1.8", marginBottom: "1rem", paddingLeft: "1.5rem" }}>
          <li><strong>OAuth providers:</strong> Google, GitHub (if you choose)</li>
          <li><strong>Hosting:</strong> Vercel (frontend), Supabase (backend)</li>
          <li><strong>Legal requirements:</strong> Court orders or legal obligations</li>
        </ul>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>6. Your Rights</h2>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          Under GDPR and other privacy laws, you have the following rights:
        </p>
        <ul style={{ lineHeight: "1.8", marginBottom: "1rem", paddingLeft: "1.5rem" }}>
          <li><strong>Access:</strong> View your personal data</li>
          <li><strong>Correction:</strong> Fix incorrect information</li>
          <li><strong>Deletion:</strong> Delete your account and all data</li>
          <li><strong>Export:</strong> Download your data in JSON format</li>
          <li><strong>Restriction:</strong> Limit data processing</li>
        </ul>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          To exercise these rights: Settings → Account → Export Data or Delete Account
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>7. Cookies and LocalStorage</h2>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          We use the following cookies and local storage:
        </p>
        <ul style={{ lineHeight: "1.8", marginBottom: "1rem", paddingLeft: "1.5rem" }}>
          <li><strong>Authentication:</strong> Supabase session cookies (required)</li>
          <li><strong>Preferences:</strong> Theme, language, settings (localStorage)</li>
          <li><strong>Offline cache:</strong> Decks and cards (IndexedDB)</li>
          <li><strong>Analytics:</strong> Vercel Analytics (anonymous)</li>
        </ul>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>8. Children's Privacy</h2>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          Our service is intended for users aged 13 and above. If you are under 13, 
          please obtain permission from your parent or guardian.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>9. Security</h2>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          We implement the following measures to protect your data:
        </p>
        <ul style={{ lineHeight: "1.8", marginBottom: "1rem", paddingLeft: "1.5rem" }}>
          <li>HTTPS encryption (all traffic)</li>
          <li>Database encryption (AES-256)</li>
          <li>Row Level Security (access only your own data)</li>
          <li>Rate limiting (brute-force protection)</li>
          <li>Input validation (Zod)</li>
          <li>Regular security updates</li>
        </ul>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>10. Changes</h2>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          We may update this privacy policy from time to time. For significant changes, 
          we will notify you via email.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>11. Contact</h2>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          For privacy-related questions or concerns:
        </p>
        <ul style={{ lineHeight: "1.8", marginBottom: "1rem", paddingLeft: "1.5rem" }}>
          <li>Email: privacy@ankiflow.com</li>
          <li>GitHub: <a href="https://github.com/sodops/anki-formatter" target="_blank" rel="noopener" style={{ color: "var(--accent)" }}>github.com/sodops/anki-formatter</a></li>
        </ul>
      </section>

      <div style={{ marginTop: "3rem", padding: "1.5rem", background: "var(--bg-secondary)", borderRadius: "8px" }}>
        <p style={{ margin: 0, lineHeight: "1.6" }}>
          <strong>In short:</strong> We use your data only to provide the service, 
          never sell it to anyone, store it securely, and you can delete it anytime.
        </p>
      </div>
    </div>
  );
}
