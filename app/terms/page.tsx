import Link from "next/link";

export default function TermsPage() {
  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem 1rem" }}>
      <Link href="/" style={{ color: "var(--accent)", textDecoration: "none", marginBottom: "2rem", display: "inline-block" }}>
        ← Home
      </Link>
      
      <h1 style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>Terms of Service</h1>
      <p style={{ color: "var(--text-secondary)", marginBottom: "2rem" }}>
        Last updated: {new Date().toLocaleDateString("en-US")}
      </p>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>1. Acceptance of Terms</h2>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          By using the AnkiFlow platform, you confirm that you have read, understood, and agree to these Terms of Service ("Terms"). 
          If you do not agree to these terms, please do not use the platform.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>2. Service Description</h2>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          AnkiFlow is a web platform for creating, importing, and studying flashcards using a spaced repetition algorithm. 
          The service includes:
        </p>
        <ul style={{ lineHeight: "1.8", marginBottom: "1rem", paddingLeft: "1.5rem" }}>
          <li>Flashcard deck creation and management</li>
          <li>Spaced repetition with SM-2 algorithm</li>
          <li>Cloud sync (all devices)</li>
          <li>Import/Export (TXT, CSV, DOCX, Google Docs, Anki)</li>
          <li>Statistics and progress tracking</li>
          <li>Offline mode (PWA)</li>
        </ul>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>3. User Accounts</h2>
        
        <h3 style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>3.1. Registration</h3>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          To use the service, you must create an account. You:
        </p>
        <ul style={{ lineHeight: "1.8", marginBottom: "1rem", paddingLeft: "1.5rem" }}>
          <li>Must provide accurate and truthful information</li>
          <li>Are responsible for account security</li>
          <li>Must keep your password confidential</li>
          <li>May have only one account per person</li>
        </ul>

        <h3 style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>3.2. Age Restriction</h3>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          You must be at least 13 years old. Users under 13 may use the service with parental consent.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>4. User Content</h2>
        
        <h3 style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>4.1. Your Content</h3>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          All flashcards, decks, and other content you create are yours. We:
        </p>
        <ul style={{ lineHeight: "1.8", marginBottom: "1rem", paddingLeft: "1.5rem" }}>
          <li>Store it to provide the service</li>
          <li>Copy it for backup and restore purposes</li>
          <li>Will not disclose it without your consent</li>
        </ul>

        <h3 style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>4.2. Prohibited Content</h3>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          The following types of content are prohibited:
        </p>
        <ul style={{ lineHeight: "1.8", marginBottom: "1rem", paddingLeft: "1.5rem" }}>
          <li>Illegal or infringing content</li>
          <li>Content inciting hate, violence, or discrimination</li>
          <li>Spam or viruses</li>
          <li>Content violating others' copyrights</li>
          <li>False or misleading information</li>
        </ul>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>5. Service Provision</h2>
        
        <h3 style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>5.1. Service Quality</h3>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          We provide the service on an "AS IS" basis. We do not guarantee:
        </p>
        <ul style={{ lineHeight: "1.8", marginBottom: "1rem", paddingLeft: "1.5rem" }}>
          <li>24/7 availability</li>
          <li>Error-free operation</li>
          <li>No data loss (please backup!)</li>
          <li>Specific learning outcomes</li>
        </ul>

        <h3 style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>5.2. Maintenance</h3>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          We may temporarily suspend the service to improve, maintain, or fix bugs. 
          We will try to notify you in advance.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>6. Pricing and Payment</h2>
        
        <h3 style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>6.1. Free Service</h3>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          Currently, all features are <strong>free</strong>. Premium features may be added in the future:
        </p>
        <ul style={{ lineHeight: "1.8", marginBottom: "1rem", paddingLeft: "1.5rem" }}>
          <li>AI card generation</li>
          <li>Advanced statistics</li>
          <li>Collaborative decks</li>
          <li>Priority support</li>
        </ul>

        <h3 style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>6.2. Price Changes</h3>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          If premium features are introduced, existing users will be notified 30 days in advance.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>7. Limitation of Liability</h2>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          To the extent permitted by law, AnkiFlow is not liable for:
        </p>
        <ul style={{ lineHeight: "1.8", marginBottom: "1rem", paddingLeft: "1.5rem" }}>
          <li>Data loss (please backup!)</li>
          <li>Impact on learning outcomes</li>
          <li>Service downtime</li>
          <li>Technical issues</li>
          <li>Third-party services (Google, GitHub)</li>
        </ul>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>8. Intellectual Property</h2>
        
        <h3 style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>8.1. Platform Code</h3>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          The AnkiFlow platform is open-source under MIT license:
        </p>
        <ul style={{ lineHeight: "1.8", marginBottom: "1rem", paddingLeft: "1.5rem" }}>
          <li>GitHub: <a href="https://github.com/sodops/anki-formatter" target="_blank" rel="noopener" style={{ color: "var(--accent)" }}>github.com/sodops/anki-formatter</a></li>
          <li>License: MIT</li>
          <li>You may fork and modify it</li>
        </ul>

        <h3 style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>8.2. Brand</h3>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          The "AnkiFlow" name and logo are protected. Please obtain permission before commercial use.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>9. Account Termination</h2>
        
        <h3 style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>9.1. By You</h3>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          You may delete your account at any time:
        </p>
        <ul style={{ lineHeight: "1.8", marginBottom: "1rem", paddingLeft: "1.5rem" }}>
          <li>Settings → Account → Delete Account</li>
          <li>All your data will be deleted immediately</li>
          <li>Download a backup before deleting</li>
        </ul>

        <h3 style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>9.2. By Us</h3>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          We may suspend or delete your account in the following cases:
        </p>
        <ul style={{ lineHeight: "1.8", marginBottom: "1rem", paddingLeft: "1.5rem" }}>
          <li>Violation of terms</li>
          <li>Creating prohibited content</li>
          <li>Spam or abuse</li>
          <li>Technical security risks</li>
        </ul>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>10. Changes to Terms</h2>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          We may update these terms from time to time. For significant changes:
        </p>
        <ul style={{ lineHeight: "1.8", marginBottom: "1rem", paddingLeft: "1.5rem" }}>
          <li>Notification via email</li>
          <li>Announced 30 days in advance</li>
          <li>Continued use = acceptance of new terms</li>
        </ul>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>11. Governing Law and Disputes</h2>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          These terms are governed by the laws of Uzbekistan. Disputes:
        </p>
        <ul style={{ lineHeight: "1.8", marginBottom: "1rem", paddingLeft: "1.5rem" }}>
          <li>We will first attempt to resolve through negotiation</li>
          <li>If unresolved, may be referred to Tashkent courts</li>
        </ul>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>12. Contact</h2>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          For questions or concerns about these terms:
        </p>
        <ul style={{ lineHeight: "1.8", marginBottom: "1rem", paddingLeft: "1.5rem" }}>
          <li>Email: legal@ankiflow.com</li>
          <li>GitHub Issues: <a href="https://github.com/sodops/anki-formatter/issues" target="_blank" rel="noopener" style={{ color: "var(--accent)" }}>github.com/sodops/anki-formatter/issues</a></li>
        </ul>
      </section>

      <div style={{ marginTop: "3rem", padding: "1.5rem", background: "var(--bg-secondary)", borderRadius: "8px" }}>
        <p style={{ margin: 0, lineHeight: "1.6" }}>
          <strong>In short:</strong> Use the platform in good faith, your content is yours, 
          we protect your data. Free and open-source. Questions? Reach out!
        </p>
      </div>
    </div>
  );
}
