"use client";

export function ApiTab() {
  return (
    <>
      <div className="admin-card" style={{ marginBottom: "1.5rem" }}>
        <div className="admin-card-header">
          <h2 className="admin-card-title">
            <ion-icon name="code-slash"></ion-icon>
            API Endpoints
          </h2>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <span className="admin-badge admin-badge-success">All Healthy</span>
          </div>
        </div>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Method</th>
              <th>Endpoint</th>
              <th>Description</th>
              <th>Auth</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {[
              {
                method: "GET",
                path: "/api/admin/overview",
                desc: "Admin dashboard data",
                auth: "Admin",
              },
              {
                method: "GET",
                path: "/api/admin/metrics",
                desc: "Web Vitals metrics",
                auth: "Admin",
              },
              { method: "POST", path: "/api/generate", desc: "AI card generation", auth: "User" },
              { method: "POST", path: "/api/parse", desc: "Document parsing", auth: "User" },
              { method: "POST", path: "/api/translate", desc: "Text translation", auth: "User" },
              { method: "GET", path: "/api/sync", desc: "Sync data from cloud", auth: "User" },
              { method: "POST", path: "/api/sync", desc: "Sync data to cloud", auth: "User" },
              { method: "GET", path: "/api/logs", desc: "System logs", auth: "User" },
              { method: "POST", path: "/api/logs", desc: "Create log entry", auth: "User" },
              {
                method: "POST",
                path: "/api/analytics",
                desc: "Track analytics event",
                auth: "User",
              },
              { method: "GET", path: "/api/backup/export", desc: "Export all data", auth: "User" },
              {
                method: "POST",
                path: "/api/backup/import",
                desc: "Import data backup",
                auth: "User",
              },
            ].map((ep, i) => (
              <tr key={i}>
                <td>
                  <span
                    className={`admin-badge ${ep.method === "GET" ? "admin-badge-success" : ep.method === "POST" ? "admin-badge-primary" : "admin-badge-warning"}`}
                    style={{ fontFamily: "monospace", fontSize: "0.75rem" }}
                  >
                    {ep.method}
                  </span>
                </td>
                <td>
                  <code style={{ fontSize: "0.8rem" }}>{ep.path}</code>
                </td>
                <td style={{ fontSize: "0.875rem" }}>{ep.desc}</td>
                <td>
                  <span
                    className={`admin-badge ${ep.auth === "Admin" ? "admin-badge-danger" : "admin-badge-secondary"}`}
                  >
                    {ep.auth}
                  </span>
                </td>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <div
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background: "var(--admin-success)",
                      }}
                    ></div>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                      Active
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        <div className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">
              <ion-icon name="shield-checkmark"></ion-icon>
              Authentication
            </h2>
          </div>
          <div style={{ padding: "1rem", fontSize: "0.875rem", lineHeight: 1.8 }}>
            <p>
              <strong>Provider:</strong> Supabase Auth
            </p>
            <p>
              <strong>Methods:</strong> Google OAuth, Email/Password
            </p>
            <p>
              <strong>Token Type:</strong> JWT (HttpOnly Cookies)
            </p>
            <p>
              <strong>Rate Limiting:</strong> IP-based sliding window
            </p>
            <p>
              <strong>Admin Check:</strong> Email allowlist via <code>ADMIN_EMAILS</code>
            </p>
          </div>
        </div>
        <div className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">
              <ion-icon name="lock-closed"></ion-icon>
              Rate Limits
            </h2>
          </div>
          <div style={{ padding: "1rem", fontSize: "0.875rem", lineHeight: 1.8 }}>
            <p>
              <strong>Admin Endpoints:</strong> 30 req/min
            </p>
            <p>
              <strong>Generate (AI):</strong> 10 req/min
            </p>
            <p>
              <strong>Translate:</strong> 20 req/min
            </p>
            <p>
              <strong>Sync:</strong> 30 req/min
            </p>
            <p>
              <strong>Logs:</strong> 60 req/min
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
