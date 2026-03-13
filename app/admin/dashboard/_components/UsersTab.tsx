"use client";

import { DashboardStats, UserProfile } from "./types";

interface UsersTabProps {
  stats: DashboardStats | null;
  userProfile: UserProfile | null;
  dueCards: number;
}

export function UsersTab({ stats, userProfile, dueCards }: UsersTabProps) {
  return (
    <>
      {/* User Profile Card */}
      <div className="admin-card" style={{ marginBottom: "1.5rem" }}>
        <div className="admin-card-header">
          <h2 className="admin-card-title">
            <ion-icon name="person-circle"></ion-icon>
            Current User
          </h2>
          <span className="admin-badge admin-badge-success">Active</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "2rem", padding: "1.5rem" }}>
          <div
            style={{
              width: "96px",
              height: "96px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, var(--admin-primary), #9B7FFF)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "2.5rem",
              color: "#fff",
              fontWeight: 700,
              flexShrink: 0,
              overflow: "hidden",
            }}
          >
            {userProfile?.avatar ? (
              <img
                src={userProfile.avatar}
                alt="Avatar"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              (userProfile?.name || "A").charAt(0).toUpperCase()
            )}
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.25rem" }}>
              {userProfile?.name || "Admin"}
            </h3>
            <p style={{ color: "var(--text-secondary)", marginBottom: "1rem" }}>
              {userProfile?.email || "No email"}
            </p>
            <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
              <div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-tertiary)",
                    marginBottom: "0.15rem",
                  }}
                >
                  User ID
                </div>
                <code
                  style={{
                    fontSize: "0.75rem",
                    background: "var(--bg-primary)",
                    padding: "0.2rem 0.5rem",
                    borderRadius: "4px",
                    border: "1px solid var(--border)",
                  }}
                >
                  {userProfile?.id?.slice(0, 12)}...
                </code>
              </div>
              <div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-tertiary)",
                    marginBottom: "0.15rem",
                  }}
                >
                  Last Sign In
                </div>
                <span style={{ fontSize: "0.875rem" }}>
                  {userProfile?.lastSignIn
                    ? new Date(userProfile.lastSignIn).toLocaleString()
                    : "N/A"}
                </span>
              </div>
              <div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-tertiary)",
                    marginBottom: "0.15rem",
                  }}
                >
                  Account Created
                </div>
                <span style={{ fontSize: "0.875rem" }}>
                  {userProfile?.createdAt
                    ? new Date(userProfile.createdAt).toLocaleDateString()
                    : "N/A"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* User Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        {[
          {
            label: "Decks Created",
            value: stats?.decks.total || 0,
            icon: "albums",
            color: "#7C5CFC",
          },
          {
            label: "Cards Created",
            value: stats?.cards.total || 0,
            icon: "library",
            color: "#10b981",
          },
          {
            label: "Total Reviews",
            value: stats?.reviews.total || 0,
            icon: "checkmark-done",
            color: "#f59e0b",
          },
          { label: "Cards Due", value: dueCards, icon: "alarm", color: "#ef4444" },
        ].map((stat) => (
          <div key={stat.label} className="admin-card" style={{ padding: "1.5rem" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                marginBottom: "0.75rem",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  background: `${stat.color}15`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: stat.color,
                  fontSize: "1.25rem",
                }}
              >
                <ion-icon name={stat.icon}></ion-icon>
              </div>
            </div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{stat.value.toLocaleString()}</div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Account Info */}
      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">
            <ion-icon name="information-circle"></ion-icon>
            Account Details
          </h2>
        </div>
        <table className="admin-table">
          <tbody>
            <tr>
              <td style={{ fontWeight: 600, width: "200px" }}>Full Name</td>
              <td>{userProfile?.name || "N/A"}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 600 }}>Email Address</td>
              <td>{userProfile?.email || "N/A"}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 600 }}>User ID</td>
              <td>
                <code style={{ fontSize: "0.8rem" }}>{userProfile?.id || "N/A"}</code>
              </td>
            </tr>
            <tr>
              <td style={{ fontWeight: 600 }}>Role</td>
              <td>
                <span className="admin-badge admin-badge-primary">Administrator</span>
              </td>
            </tr>
            <tr>
              <td style={{ fontWeight: 600 }}>Last Sign In</td>
              <td>
                {userProfile?.lastSignIn
                  ? new Date(userProfile.lastSignIn).toLocaleString()
                  : "N/A"}
              </td>
            </tr>
            <tr>
              <td style={{ fontWeight: 600 }}>Account Created</td>
              <td>
                {userProfile?.createdAt ? new Date(userProfile.createdAt).toLocaleString() : "N/A"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
