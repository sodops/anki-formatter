"use client";

import { MetricSummary } from "./types";

interface VitalsTabProps {
  metricsData: MetricSummary[];
  metricsLoading: boolean;
  metricsDays: number;
  setMetricsDays: (days: number) => void;
}

export function VitalsTab({
  metricsData,
  metricsLoading,
  metricsDays,
  setMetricsDays,
}: VitalsTabProps) {
  return (
    <>
      {/* Time Period Selector */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
        {[1, 7, 30].map((d) => (
          <button
            key={d}
            onClick={() => setMetricsDays(d)}
            className={`admin-btn ${metricsDays === d ? "admin-btn-primary" : "admin-btn-secondary"}`}
          >
            {d === 1 ? "Today" : `${d} days`}
          </button>
        ))}
      </div>

      {metricsLoading ? (
        <div className="admin-card" style={{ textAlign: "center", padding: "4rem" }}>
          <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⏳</div>
          <p style={{ color: "var(--text-secondary)" }}>Loading metrics...</p>
        </div>
      ) : metricsData.length === 0 ? (
        <div className="admin-card" style={{ textAlign: "center", padding: "4rem" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>
            <ion-icon name="mail-open-outline"></ion-icon>
          </div>
          <h3 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.5rem" }}>
            No data yet
          </h3>
          <p style={{ color: "var(--text-secondary)" }}>
            Start using the app to collect performance metrics
          </p>
        </div>
      ) : (
        <>
          {/* Metrics Cards Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "1.5rem",
              marginBottom: "1.5rem",
            }}
          >
            {metricsData.map((metric) => {
              const goodPct = metric.count > 0 ? (metric.rating.good / metric.count) * 100 : 0;
              const scoreColor =
                goodPct >= 75
                  ? "var(--admin-success)"
                  : goodPct >= 50
                    ? "var(--admin-warning)"
                    : "var(--admin-danger)";
              const unit = metric.name === "CLS" ? "" : "ms";
              const fmt = (v: number) =>
                metric.name === "CLS" ? v.toFixed(3) : `${Math.round(v)}${unit}`;

              return (
                <div key={metric.name} className="admin-card">
                  <div className="admin-card-header">
                    <h2 className="admin-card-title">{metric.name}</h2>
                    <span className="admin-badge admin-badge-info">{metric.count} samples</span>
                  </div>

                  <div style={{ marginBottom: "1.25rem" }}>
                    <div style={{ fontSize: "2.25rem", fontWeight: 700, color: scoreColor }}>
                      {fmt(metric.avg)}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                      average
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr 1fr",
                      gap: "0.75rem",
                      marginBottom: "1.25rem",
                    }}
                  >
                    {[
                      { label: "Median", value: metric.median },
                      { label: "P75", value: metric.p75 },
                      { label: "P95", value: metric.p95 },
                      { label: "Max", value: metric.max },
                    ].map((s) => (
                      <div key={s.label}>
                        <div
                          style={{
                            fontSize: "0.7rem",
                            color: "var(--text-tertiary)",
                            marginBottom: "0.15rem",
                          }}
                        >
                          {s.label}
                        </div>
                        <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{fmt(s.value)}</div>
                      </div>
                    ))}
                  </div>

                  {/* Rating bar */}
                  <div>
                    <div
                      style={{
                        display: "flex",
                        height: "8px",
                        borderRadius: "4px",
                        overflow: "hidden",
                        marginBottom: "0.5rem",
                        background: "var(--border)",
                      }}
                    >
                      <div
                        style={{
                          width: `${(metric.rating.good / metric.count) * 100}%`,
                          background: "var(--admin-success)",
                        }}
                      />
                      <div
                        style={{
                          width: `${(metric.rating.needsImprovement / metric.count) * 100}%`,
                          background: "var(--admin-warning)",
                        }}
                      />
                      <div
                        style={{
                          width: `${(metric.rating.poor / metric.count) * 100}%`,
                          background: "var(--admin-danger)",
                        }}
                      />
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "0.75rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      <span style={{ color: "var(--admin-success)" }}>
                        ✓ {metric.rating.good} good
                      </span>
                      <span style={{ color: "var(--admin-warning)" }}>
                        ⚠ {metric.rating.needsImprovement} ok
                      </span>
                      <span style={{ color: "var(--admin-danger)" }}>
                        ✗ {metric.rating.poor} poor
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Overall Score */}
          <div className="admin-card">
            <div className="admin-card-header">
              <h2 className="admin-card-title">
                <ion-icon name="trophy"></ion-icon>
                Overall Performance Score
              </h2>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "2rem",
                padding: "1rem",
              }}
            >
              {(() => {
                const score = Math.round(
                  (metricsData.reduce((sum, m) => sum + m.rating.good / m.count, 0) /
                    metricsData.length) *
                    100
                );
                const color =
                  score >= 75
                    ? "var(--admin-success)"
                    : score >= 50
                      ? "var(--admin-warning)"
                      : "var(--admin-danger)";
                return (
                  <>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "4rem", fontWeight: 700, color, lineHeight: 1 }}>
                        {score}
                      </div>
                      <div
                        style={{
                          fontSize: "0.875rem",
                          color: "var(--text-secondary)",
                          marginTop: "0.5rem",
                        }}
                      >
                        out of 100
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: "0.875rem",
                        color: "var(--text-secondary)",
                        lineHeight: 1.8,
                      }}
                    >
                      <p>
                        Based on <strong>{metricsData.reduce((s, m) => s + m.count, 0)}</strong>{" "}
                        total measurements
                      </p>
                      <p>
                        Across <strong>{metricsData.length}</strong> metrics
                      </p>
                      <p>
                        Period:{" "}
                        <strong>{metricsDays === 1 ? "Today" : `Last ${metricsDays} days`}</strong>
                      </p>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </>
      )}
    </>
  );
}
