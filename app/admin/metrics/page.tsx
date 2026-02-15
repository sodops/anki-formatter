"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";

interface MetricSummary {
  name: string;
  count: number;
  avg: number;
  median: number;
  p75: number;
  p95: number;
  min: number;
  max: number;
  rating: {
    good: number;
    needsImprovement: number;
    poor: number;
  };
}

interface MetricsData {
  summary: MetricSummary[];
  raw: any[];
  period: string;
}

export default function AdminMetrics() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<MetricsData | null>(null);
  const [days, setDays] = useState(7);
  const [isLoading, setIsLoading] = useState(true);
  const [isForbidden, setIsForbidden] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;

    const fetchMetrics = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/admin/metrics?days=${days}`);
        if (response.status === 403) {
          setIsForbidden(true);
          setData(null);
          return;
        }
        if (response.ok) {
          const json = await response.json();
          setData(json);
        }
      } catch (err) {
        console.error("Failed to fetch metrics:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetrics();
  }, [user, days]);

  if (loading || !user) {
    return (
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        minHeight: "100vh",
        background: "var(--bg-primary)"
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⚡</div>
          <div>Loading...</div>
        </div>
      </div>
    );
  }

  if (isForbidden) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--bg-primary)",
          padding: "2rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            textAlign: "center",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border)",
            borderRadius: "1rem",
            padding: "2rem",
            maxWidth: "520px",
          }}
        >
          <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>🚫</div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "0.5rem" }}>
            Access denied
          </h1>
          <p style={{ color: "var(--text-secondary)" }}>
            This dashboard is restricted to admins. Contact the owner if you need access.
          </p>
        </div>
      </div>
    );
  }

  const getMetricThresholds = (name: string) => {
    switch (name) {
      case "LCP": return { good: 2500, poor: 4000, unit: "ms" };
      case "CLS": return { good: 0.1, poor: 0.25, unit: "" };
      case "FCP": return { good: 1800, poor: 3000, unit: "ms" };
      case "TTFB": return { good: 800, poor: 1800, unit: "ms" };
      case "INP": return { good: 200, poor: 500, unit: "ms" };
      default: return { good: 0, poor: 0, unit: "" };
    }
  };

  const formatValue = (value: number, name: string) => {
    const { unit } = getMetricThresholds(name);
    if (name === "CLS") return value.toFixed(3);
    return `${Math.round(value)}${unit}`;
  };

  const getScoreColor = (metric: MetricSummary) => {
    const goodPercent = (metric.rating.good / metric.count) * 100;
    if (goodPercent >= 75) return "#22c55e"; // green
    if (goodPercent >= 50) return "#f59e0b"; // yellow
    return "#ef4444"; // red
  };

  return (
    <div style={{ 
      minHeight: "100vh", 
      background: "var(--bg-primary)",
      padding: "2rem"
    }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "2rem", fontWeight: "600", marginBottom: "0.5rem" }}>
            📊 Performance Metrics
          </h1>
          <p style={{ color: "var(--text-secondary)" }}>
            Web Vitals monitoring dashboard
          </p>
        </div>

        {/* Time Period Selector */}
        <div style={{ marginBottom: "2rem", display: "flex", gap: "0.5rem" }}>
          {[1, 7, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "0.5rem",
                border: "1px solid var(--border)",
                background: days === d ? "var(--accent)" : "var(--bg-secondary)",
                color: days === d ? "white" : "var(--text-primary)",
                cursor: "pointer",
                fontWeight: days === d ? "600" : "400",
              }}
            >
              {d === 1 ? "Today" : `${d} days`}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div style={{ textAlign: "center", padding: "4rem" }}>
            <div style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>⏳</div>
            <div>Loading metrics...</div>
          </div>
        ) : !data || data.summary.length === 0 ? (
          <div style={{ 
            textAlign: "center", 
            padding: "4rem",
            background: "var(--bg-secondary)",
            borderRadius: "1rem",
            border: "1px solid var(--border)"
          }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📭</div>
            <h2 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>No data yet</h2>
            <p style={{ color: "var(--text-secondary)" }}>
              Start using the app to collect performance metrics
            </p>
          </div>
        ) : (
          <>
            {/* Metrics Cards */}
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "1rem",
              marginBottom: "2rem"
            }}>
              {data.summary.map((metric) => {
                const color = getScoreColor(metric);
                
                return (
                  <div
                    key={metric.name}
                    style={{
                      background: "var(--bg-secondary)",
                      border: "1px solid var(--border)",
                      borderRadius: "1rem",
                      padding: "1.5rem",
                    }}
                  >
                    <div style={{ 
                      display: "flex", 
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "1rem"
                    }}>
                      <h3 style={{ fontSize: "1.25rem", fontWeight: "600" }}>
                        {metric.name}
                      </h3>
                      <div style={{ 
                        fontSize: "0.875rem", 
                        color: "var(--text-secondary)" 
                      }}>
                        {metric.count} samples
                      </div>
                    </div>

                    {/* Average Value */}
                    <div style={{ marginBottom: "1rem" }}>
                      <div style={{ fontSize: "2rem", fontWeight: "700", color }}>
                        {formatValue(metric.avg, metric.name)}
                      </div>
                      <div style={{ 
                        fontSize: "0.875rem", 
                        color: "var(--text-secondary)" 
                      }}>
                        average
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div style={{ 
                      display: "grid", 
                      gridTemplateColumns: "1fr 1fr",
                      gap: "0.75rem",
                      marginBottom: "1rem"
                    }}>
                      <div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                          Median
                        </div>
                        <div style={{ fontWeight: "600" }}>
                          {formatValue(metric.median, metric.name)}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                          P95
                        </div>
                        <div style={{ fontWeight: "600" }}>
                          {formatValue(metric.p95, metric.name)}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                          Min
                        </div>
                        <div style={{ fontWeight: "600" }}>
                          {formatValue(metric.min, metric.name)}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                          Max
                        </div>
                        <div style={{ fontWeight: "600" }}>
                          {formatValue(metric.max, metric.name)}
                        </div>
                      </div>
                    </div>

                    {/* Rating Bar */}
                    <div style={{ marginTop: "1rem" }}>
                      <div style={{ 
                        display: "flex", 
                        height: "8px", 
                        borderRadius: "4px",
                        overflow: "hidden",
                        marginBottom: "0.5rem"
                      }}>
                        <div style={{ 
                          width: `${(metric.rating.good / metric.count) * 100}%`,
                          background: "#22c55e"
                        }} />
                        <div style={{ 
                          width: `${(metric.rating.needsImprovement / metric.count) * 100}%`,
                          background: "#f59e0b"
                        }} />
                        <div style={{ 
                          width: `${(metric.rating.poor / metric.count) * 100}%`,
                          background: "#ef4444"
                        }} />
                      </div>
                      <div style={{ 
                        display: "flex", 
                        justifyContent: "space-between",
                        fontSize: "0.75rem",
                        color: "var(--text-secondary)"
                      }}>
                        <span>✅ {metric.rating.good}</span>
                        <span>⚠️ {metric.rating.needsImprovement}</span>
                        <span>❌ {metric.rating.poor}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Overall Score */}
            <div style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border)",
              borderRadius: "1rem",
              padding: "2rem",
              textAlign: "center"
            }}>
              <h3 style={{ fontSize: "1.5rem", fontWeight: "600", marginBottom: "1rem" }}>
                Overall Performance Score
              </h3>
              <div style={{ fontSize: "3rem", fontWeight: "700", marginBottom: "0.5rem" }}>
                {Math.round(
                  (data.summary.reduce((sum, m) => sum + (m.rating.good / m.count), 0) / 
                   data.summary.length) * 100
                )}
              </div>
              <div style={{ color: "var(--text-secondary)" }}>
                Based on {data.summary.reduce((sum, m) => sum + m.count, 0)} total measurements
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
