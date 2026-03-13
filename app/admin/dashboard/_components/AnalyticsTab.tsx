"use client";

import { DashboardStats, CardStates, TodayGrades } from "./types";

interface AnalyticsTabProps {
  stats: DashboardStats | null;
  cardStates: CardStates;
  todayGrades: TodayGrades;
  dueCards: number;
}

export function AnalyticsTab({ stats, cardStates, todayGrades, dueCards }: AnalyticsTabProps) {
  return (
    <>
      {/* Card State Distribution + Today's Grades */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1.5rem",
          marginBottom: "1.5rem",
        }}
      >
        {/* Donut Chart */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">
              <ion-icon name="pie-chart"></ion-icon>
              Card State Distribution
            </h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "2rem", padding: "1rem" }}>
            <div style={{ position: "relative", width: "180px", height: "180px", flexShrink: 0 }}>
              <svg
                viewBox="0 0 36 36"
                style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}
              >
                {(() => {
                  const total =
                    cardStates.new +
                      cardStates.learning +
                      cardStates.review +
                      cardStates.relearning || 1;
                  const segments = [
                    { value: cardStates.new, color: "#7C5CFC" },
                    { value: cardStates.learning, color: "#f59e0b" },
                    { value: cardStates.review, color: "#10b981" },
                    { value: cardStates.relearning, color: "#ef4444" },
                  ];
                  let offset = 0;
                  return segments.map((seg, i) => {
                    const pct = (seg.value / total) * 100;
                    const el = (
                      <circle
                        key={i}
                        cx="18"
                        cy="18"
                        r="15.9"
                        fill="none"
                        stroke={seg.color}
                        strokeWidth="3.5"
                        strokeDasharray={`${pct} ${100 - pct}`}
                        strokeDashoffset={`${-offset}`}
                      />
                    );
                    offset += pct;
                    return el;
                  });
                })()}
              </svg>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span style={{ fontSize: "1.5rem", fontWeight: 700 }}>
                  {cardStates.new + cardStates.learning + cardStates.review + cardStates.relearning}
                </span>
                <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>
                  Total Cards
                </span>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", flex: 1 }}>
              {[
                { label: "New", value: cardStates.new, color: "#7C5CFC" },
                { label: "Learning", value: cardStates.learning, color: "#f59e0b" },
                { label: "Review", value: cardStates.review, color: "#10b981" },
                { label: "Relearning", value: cardStates.relearning, color: "#ef4444" },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
                >
                  <div
                    style={{
                      width: "12px",
                      height: "12px",
                      borderRadius: "3px",
                      background: item.color,
                      flexShrink: 0,
                    }}
                  ></div>
                  <span style={{ flex: 1, fontSize: "0.875rem" }}>{item.label}</span>
                  <span style={{ fontWeight: 700, fontSize: "0.875rem" }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Today's Grade Distribution */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">
              <ion-icon name="bar-chart"></ion-icon>
              Today&apos;s Grade Distribution
            </h2>
          </div>
          <div style={{ padding: "1rem" }}>
            {(() => {
              const maxGrade = Math.max(
                todayGrades.again,
                todayGrades.hard,
                todayGrades.good,
                todayGrades.easy,
                1
              );
              const bars = [
                { label: "Again", value: todayGrades.again, color: "#ef4444" },
                { label: "Hard", value: todayGrades.hard, color: "#f59e0b" },
                { label: "Good", value: todayGrades.good, color: "#10b981" },
                { label: "Easy", value: todayGrades.easy, color: "#7C5CFC" },
              ];
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {bars.map((bar) => (
                    <div key={bar.label}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "0.35rem",
                        }}
                      >
                        <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>{bar.label}</span>
                        <span style={{ fontSize: "0.875rem", fontWeight: 700 }}>{bar.value}</span>
                      </div>
                      <div
                        style={{
                          height: "28px",
                          background: "var(--border)",
                          borderRadius: "6px",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${(bar.value / maxGrade) * 100}%`,
                            height: "100%",
                            background: bar.color,
                            borderRadius: "6px",
                            transition: "width 0.5s ease",
                            minWidth: bar.value > 0 ? "24px" : "0px",
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
                  <div
                    style={{
                      textAlign: "center",
                      marginTop: "0.5rem",
                      fontSize: "0.8rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Total reviews today:{" "}
                    <strong>
                      {todayGrades.again + todayGrades.hard + todayGrades.good + todayGrades.easy}
                    </strong>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Review Summary Cards */}
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
            label: "Due Now",
            value: dueCards,
            icon: "alarm",
            color: "#ef4444",
            bg: "rgba(239,68,68,0.1)",
          },
          {
            label: "Total Reviews",
            value: stats?.reviews.total || 0,
            icon: "checkmark-done",
            color: "#10b981",
            bg: "rgba(16,185,129,0.1)",
          },
          {
            label: "Reviewed Today",
            value: stats?.reviews.today || 0,
            icon: "today",
            color: "#7C5CFC",
            bg: "rgba(124,92,252,0.1)",
          },
          {
            label: "Web Vitals",
            value: stats?.webVitals.count || 0,
            icon: "pulse",
            color: "#f59e0b",
            bg: "rgba(245,158,11,0.1)",
          },
        ].map((item) => (
          <div
            key={item.label}
            className="admin-card"
            style={{ textAlign: "center", padding: "1.5rem" }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: item.bg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 0.75rem",
                color: item.color,
                fontSize: "1.5rem",
              }}
            >
              <ion-icon name={item.icon}></ion-icon>
            </div>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "0.25rem" }}>
              {item.value.toLocaleString()}
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* Learning Efficiency */}
      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">
            <ion-icon name="analytics"></ion-icon>
            Learning Efficiency
          </h2>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "1.5rem",
            padding: "1rem",
          }}
        >
          {(() => {
            const totalToday =
              todayGrades.again + todayGrades.hard + todayGrades.good + todayGrades.easy;
            const passRate =
              totalToday > 0
                ? Math.round(((todayGrades.good + todayGrades.easy) / totalToday) * 100)
                : 0;
            const totalCards =
              cardStates.new + cardStates.learning + cardStates.review + cardStates.relearning;
            const masteryRate =
              totalCards > 0 ? Math.round((cardStates.review / totalCards) * 100) : 0;
            return [
              {
                label: "Pass Rate (Today)",
                value: `${passRate}%`,
                desc: "Good + Easy answers",
                color: passRate >= 80 ? "#10b981" : passRate >= 60 ? "#f59e0b" : "#ef4444",
              },
              {
                label: "Mastery Rate",
                value: `${masteryRate}%`,
                desc: "Cards in Review state",
                color: masteryRate >= 70 ? "#10b981" : masteryRate >= 40 ? "#f59e0b" : "#ef4444",
              },
              {
                label: "Cards Due",
                value: dueCards.toString(),
                desc: dueCards === 0 ? "All caught up!" : "Cards waiting for review",
                color: dueCards === 0 ? "#10b981" : "#f59e0b",
              },
            ].map((metric) => (
              <div key={metric.label} style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: "2.25rem",
                    fontWeight: 700,
                    color: metric.color,
                    marginBottom: "0.25rem",
                  }}
                >
                  {metric.value}
                </div>
                <div style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.25rem" }}>
                  {metric.label}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                  {metric.desc}
                </div>
              </div>
            ));
          })()}
        </div>
      </div>
    </>
  );
}
