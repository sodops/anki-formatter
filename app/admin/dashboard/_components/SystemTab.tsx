"use client";

import Link from "next/link";
import { DashboardStats } from "./types";

interface SystemTabProps {
  stats: DashboardStats | null;
  logsCount: number;
  onRefresh: () => void;
  onViewVitals: () => void;
}

export function SystemTab({ stats, logsCount, onRefresh, onViewVitals }: SystemTabProps) {
  return (
    <>
      {/* System Status Overview */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        {[
          { name: "API Server", status: "Operational", icon: "server", color: "#10b981" },
          { name: "Database", status: "Operational", icon: "server-outline", color: "#10b981" },
          {
            name: "Auth Service",
            status: "Operational",
            icon: "shield-checkmark",
            color: "#10b981",
          },
          { name: "Cloud Sync", status: "Operational", icon: "cloud-done", color: "#10b981" },
        ].map((service) => (
          <div key={service.name} className="admin-card" style={{ padding: "1.25rem" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginBottom: "0.75rem",
              }}
            >
              <div
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: service.color,
                  boxShadow: `0 0 8px ${service.color}50`,
                }}
              ></div>
              <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>{service.name}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <ion-icon
                name={service.icon}
                style={{ color: service.color, fontSize: "1.25rem" }}
              ></ion-icon>
              <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                {service.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Environment & DB Info */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1.5rem",
          marginBottom: "1.5rem",
        }}
      >
        <div className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">
              <ion-icon name="information-circle"></ion-icon>
              Environment
            </h2>
          </div>
          <table className="admin-table">
            <tbody>
              {[
                { key: "Framework", value: "Next.js 14 (App Router)" },
                { key: "Runtime", value: "Node.js (Edge Compatible)" },
                { key: "Database", value: "Supabase (PostgreSQL)" },
                { key: "Auth Provider", value: "Supabase Auth" },
                { key: "Hosting", value: "Vercel" },
                { key: "SRS Algorithm", value: "FSRS v4" },
                { key: "AI Provider", value: "Google Gemini" },
              ].map((item) => (
                <tr key={item.key}>
                  <td style={{ fontWeight: 600, width: "160px" }}>{item.key}</td>
                  <td>{item.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">
              <ion-icon name="pie-chart"></ion-icon>
              Database Statistics
            </h2>
          </div>
          <table className="admin-table">
            <tbody>
              {[
                { table: "Decks", count: stats?.decks.total || 0 },
                { table: "Cards", count: stats?.cards.total || 0 },
                { table: "Review Logs", count: stats?.reviews.total || 0 },
                { table: "System Logs", count: logsCount },
                { table: "Web Vitals", count: stats?.webVitals.count || 0 },
              ].map((item) => (
                <tr key={item.table}>
                  <td style={{ fontWeight: 600, width: "160px" }}>{item.table}</td>
                  <td>{item.count.toLocaleString()} rows</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">
            <ion-icon name="flash"></ion-icon>
            Quick Actions
          </h2>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "1rem",
            padding: "1rem",
          }}
        >
          <button
            className="admin-btn admin-btn-secondary"
            style={{
              padding: "1.25rem",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.5rem",
              height: "auto",
            }}
            onClick={onRefresh}
          >
            <ion-icon name="refresh" style={{ fontSize: "1.5rem" }}></ion-icon>
            <span style={{ fontSize: "0.8rem" }}>Refresh Data</span>
          </button>
          <a
            href="/api/backup/export"
            className="admin-btn admin-btn-secondary"
            style={{
              padding: "1.25rem",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.5rem",
              height: "auto",
              textDecoration: "none",
            }}
          >
            <ion-icon name="download" style={{ fontSize: "1.5rem" }}></ion-icon>
            <span style={{ fontSize: "0.8rem" }}>Export Backup</span>
          </a>
          <button
            className="admin-btn admin-btn-secondary"
            style={{
              padding: "1.25rem",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.5rem",
              height: "auto",
            }}
            onClick={onViewVitals}
          >
            <ion-icon name="pulse" style={{ fontSize: "1.5rem" }}></ion-icon>
            <span style={{ fontSize: "0.8rem" }}>View Metrics</span>
          </button>
          <Link
            href="/app"
            className="admin-btn admin-btn-secondary"
            style={{
              padding: "1.25rem",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.5rem",
              height: "auto",
              textDecoration: "none",
            }}
          >
            <ion-icon name="open" style={{ fontSize: "1.5rem" }}></ion-icon>
            <span style={{ fontSize: "0.8rem" }}>Open App</span>
          </Link>
        </div>
      </div>
    </>
  );
}
