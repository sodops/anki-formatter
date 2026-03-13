"use client";

import { DashboardStats, CardStates, TodayGrades, ActivityItem } from "./types";

interface OverviewTabProps {
  stats: DashboardStats;
  activities: ActivityItem[];
  cardStates: CardStates;
  todayGrades: TodayGrades;
  dueCards: number;
  logsCount: number;
}

export function OverviewTab({
  stats,
  activities,
  cardStates,
  todayGrades,
  dueCards,
  logsCount,
}: OverviewTabProps) {
  return (
    <>
      {/* Stats Grid */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-card-header">
            <div className="admin-stat-card-icon">
              <ion-icon name="albums"></ion-icon>
            </div>
          </div>
          <div className="admin-stat-card-label">Total Decks</div>
          <div className="admin-stat-card-value">{stats.decks.total.toLocaleString()}</div>
          <div className="admin-stat-card-footer">
            <ion-icon name="layers-outline"></ion-icon>
            {stats.cards.total.toLocaleString()} cards total
          </div>
        </div>

        <div className="admin-stat-card success">
          <div className="admin-stat-card-header">
            <div className="admin-stat-card-icon">
              <ion-icon name="library"></ion-icon>
            </div>
          </div>
          <div className="admin-stat-card-label">Total Cards</div>
          <div className="admin-stat-card-value">{stats.cards.total.toLocaleString()}</div>
          <div className="admin-stat-card-footer">
            <ion-icon name="alarm-outline"></ion-icon>
            {dueCards} due for review
          </div>
        </div>

        <div className="admin-stat-card warning">
          <div className="admin-stat-card-header">
            <div className="admin-stat-card-icon">
              <ion-icon name="checkmark-done"></ion-icon>
            </div>
          </div>
          <div className="admin-stat-card-label">Total Reviews</div>
          <div className="admin-stat-card-value">{stats.reviews.total.toLocaleString()}</div>
          <div className="admin-stat-card-footer">
            <ion-icon name="today-outline"></ion-icon>
            {stats.reviews.today} today
          </div>
        </div>

        <div className="admin-stat-card danger">
          <div className="admin-stat-card-header">
            <div className="admin-stat-card-icon">
              <ion-icon name="document-text"></ion-icon>
            </div>
          </div>
          <div className="admin-stat-card-label">System Logs</div>
          <div className="admin-stat-card-value">{logsCount.toLocaleString()}</div>
          <div className="admin-stat-card-footer">
            <ion-icon name="pulse-outline"></ion-icon>
            {stats.webVitals.count} web vitals
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: "1.5rem",
          marginBottom: "1.5rem",
        }}
      >
        {/* Activity Feed */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">
              <ion-icon name="pulse"></ion-icon>
              Recent Activity
            </h2>
            <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
              Last {activities.length} entries
            </span>
          </div>
          <div className="admin-activity-feed">
            {activities.length > 0 ? (
              activities.map((activity) => (
                <div key={activity.id} className="admin-activity-item">
                  <div
                    className="admin-activity-icon"
                    style={{
                      background:
                        activity.color === "success"
                          ? "rgba(16, 185, 129, 0.1)"
                          : "rgba(239, 68, 68, 0.1)",
                      color:
                        activity.color === "success"
                          ? "var(--admin-success)"
                          : "var(--admin-danger)",
                    }}
                  >
                    <ion-icon name={activity.icon}></ion-icon>
                  </div>
                  <div className="admin-activity-content">
                    <div className="admin-activity-title">{activity.message}</div>
                    <div className="admin-activity-description">{activity.user}</div>
                    <div className="admin-activity-time">
                      {new Date(activity.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-secondary)" }}>
                <ion-icon
                  name="ellipse-outline"
                  style={{ fontSize: "3rem", marginBottom: "1rem" }}
                ></ion-icon>
                <p>No recent activity</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">
              <ion-icon name="speedometer"></ion-icon>
              Quick Stats
            </h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Card States Breakdown */}
            <div
              style={{
                padding: "1rem",
                background: "var(--bg-primary)",
                borderRadius: "0.5rem",
                border: "1px solid var(--border)",
              }}
            >
              <div
                style={{
                  fontSize: "0.875rem",
                  color: "var(--text-secondary)",
                  marginBottom: "0.75rem",
                  fontWeight: 600,
                }}
              >
                Card States
              </div>
              {[
                { label: "New", value: cardStates.new, color: "#7C5CFC" },
                { label: "Learning", value: cardStates.learning, color: "#f59e0b" },
                { label: "Review", value: cardStates.review, color: "#10b981" },
                { label: "Relearning", value: cardStates.relearning, color: "#ef4444" },
              ].map((s) => {
                const total =
                  cardStates.new +
                    cardStates.learning +
                    cardStates.review +
                    cardStates.relearning || 1;
                return (
                  <div key={s.label} style={{ marginBottom: "0.5rem" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "0.2rem",
                      }}
                    >
                      <span style={{ fontSize: "0.75rem" }}>{s.label}</span>
                      <span style={{ fontSize: "0.75rem", fontWeight: 700 }}>{s.value}</span>
                    </div>
                    <div
                      style={{
                        height: "6px",
                        background: "var(--border)",
                        borderRadius: "3px",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${(s.value / total) * 100}%`,
                          height: "100%",
                          background: s.color,
                          borderRadius: "3px",
                        }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Due Cards */}
            <div
              style={{
                padding: "1rem",
                background: "var(--bg-primary)",
                borderRadius: "0.5rem",
                border: "1px solid var(--border)",
              }}
            >
              <div
                style={{
                  fontSize: "0.875rem",
                  color: "var(--text-secondary)",
                  marginBottom: "0.5rem",
                }}
              >
                Cards Due for Review
              </div>
              <div
                style={{
                  fontSize: "1.75rem",
                  fontWeight: 700,
                  marginBottom: "0.25rem",
                  color: dueCards > 0 ? "var(--admin-warning)" : "var(--admin-success)",
                }}
              >
                {dueCards}
              </div>
              <div
                style={{
                  fontSize: "0.75rem",
                  color: dueCards === 0 ? "var(--admin-success)" : "var(--text-tertiary)",
                }}
              >
                {dueCards === 0 ? "All caught up!" : "Cards waiting for review"}
              </div>
            </div>

            {/* Today's Grades */}
            <div
              style={{
                padding: "1rem",
                background: "var(--bg-primary)",
                borderRadius: "0.5rem",
                border: "1px solid var(--border)",
              }}
            >
              <div
                style={{
                  fontSize: "0.875rem",
                  color: "var(--text-secondary)",
                  marginBottom: "0.5rem",
                }}
              >
                Today&apos;s Reviews
              </div>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                {todayGrades.again + todayGrades.hard + todayGrades.good + todayGrades.easy}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
                {todayGrades.good + todayGrades.easy} passed ·{" "}
                {todayGrades.again + todayGrades.hard} need work
              </div>
            </div>

            {/* Mastery Rate */}
            <div
              style={{
                padding: "1rem",
                background: "var(--bg-primary)",
                borderRadius: "0.5rem",
                border: "1px solid var(--border)",
              }}
            >
              <div
                style={{
                  fontSize: "0.875rem",
                  color: "var(--text-secondary)",
                  marginBottom: "0.5rem",
                }}
              >
                Mastery Rate
              </div>
              {(() => {
                const total =
                  cardStates.new +
                    cardStates.learning +
                    cardStates.review +
                    cardStates.relearning || 1;
                const rate = Math.round((cardStates.review / total) * 100);
                return (
                  <>
                    <div
                      style={{
                        fontSize: "1.75rem",
                        fontWeight: 700,
                        marginBottom: "0.25rem",
                        color:
                          rate >= 70
                            ? "var(--admin-success)"
                            : rate >= 40
                              ? "var(--admin-warning)"
                              : "var(--admin-danger)",
                      }}
                    >
                      {rate}%
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
                      {cardStates.review} of {total} cards mastered
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">
            <ion-icon name="server"></ion-icon>
            System Status
          </h2>
          <span className="admin-badge admin-badge-success">All Systems Operational</span>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1rem",
          }}
        >
          {[
            { name: "API", status: "operational", uptime: "99.9%" },
            { name: "Database", status: "operational", uptime: "99.8%" },
            { name: "Auth Service", status: "operational", uptime: "100%" },
            { name: "Cloud Sync", status: "operational", uptime: "99.7%" },
          ].map((service) => (
            <div
              key={service.name}
              style={{
                padding: "1rem",
                border: "1px solid var(--border)",
                borderRadius: "0.5rem",
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
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "var(--admin-success)",
                  }}
                ></div>
                <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>{service.name}</span>
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                Uptime: {service.uptime}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
