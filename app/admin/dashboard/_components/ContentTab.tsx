"use client";

import Link from "next/link";
import { DashboardStats, CardStates, RecentDeck } from "./types";

interface ContentTabProps {
  stats: DashboardStats | null;
  cardStates: CardStates;
  dueCards: number;
  recentDecks: RecentDeck[];
}

export function ContentTab({ stats, cardStates, dueCards, recentDecks }: ContentTabProps) {
  return (
    <>
      {/* Content Overview Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <div className="admin-card" style={{ padding: "1.5rem", textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
            <ion-icon name="library-outline"></ion-icon>
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 700 }}>{stats?.decks.total || 0}</div>
          <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Total Decks</div>
        </div>
        <div className="admin-card" style={{ padding: "1.5rem", textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
            <ion-icon name="albums-outline"></ion-icon>
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 700 }}>{stats?.cards.total || 0}</div>
          <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Total Cards</div>
        </div>
        <div className="admin-card" style={{ padding: "1.5rem", textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
            <ion-icon name="time-outline"></ion-icon>
          </div>
          <div
            style={{
              fontSize: "2rem",
              fontWeight: 700,
              color: dueCards > 0 ? "var(--admin-danger)" : "var(--admin-success)",
            }}
          >
            {dueCards}
          </div>
          <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Due for Review</div>
        </div>
      </div>

      {/* Card States Summary */}
      <div className="admin-card" style={{ marginBottom: "1.5rem" }}>
        <div className="admin-card-header">
          <h2 className="admin-card-title">
            <ion-icon name="layers"></ion-icon>
            Card States
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
          {[
            { label: "New", value: cardStates.new, color: "#7C5CFC", icon: "sparkles" },
            { label: "Learning", value: cardStates.learning, color: "#f59e0b", icon: "school" },
            {
              label: "Review",
              value: cardStates.review,
              color: "#10b981",
              icon: "checkmark-circle",
            },
            { label: "Relearning", value: cardStates.relearning, color: "#ef4444", icon: "reload" },
          ].map((state) => (
            <div
              key={state.label}
              style={{
                padding: "1rem",
                border: "1px solid var(--border)",
                borderRadius: "0.75rem",
                borderLeft: `4px solid ${state.color}`,
                background: "var(--bg-primary)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginBottom: "0.5rem",
                }}
              >
                <ion-icon
                  name={state.icon}
                  style={{ color: state.color, fontSize: "1.25rem" }}
                ></ion-icon>
                <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                  {state.label}
                </span>
              </div>
              <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{state.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Decks */}
      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">
            <ion-icon name="albums"></ion-icon>
            Recent Decks
          </h2>
          <Link href="/app" className="admin-btn admin-btn-secondary admin-btn-sm">
            Open App
          </Link>
        </div>
        {recentDecks.length > 0 ? (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Deck Name</th>
                <th>Created</th>
                <th>Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {recentDecks.map((deck) => (
                <tr key={deck.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <ion-icon
                        name="albums-outline"
                        style={{ color: "var(--admin-primary)" }}
                      ></ion-icon>
                      <strong>{deck.name}</strong>
                    </div>
                  </td>
                  <td>{new Date(deck.created_at).toLocaleDateString()}</td>
                  <td>{new Date(deck.updated_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-secondary)" }}>
            <ion-icon
              name="albums-outline"
              style={{ fontSize: "3rem", marginBottom: "1rem" }}
            ></ion-icon>
            <p>No decks created yet</p>
          </div>
        )}
      </div>
    </>
  );
}
