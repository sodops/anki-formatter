/**
 * Skeleton loading components for better perceived performance
 */

import React from "react";

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  animate?: boolean;
}

export function Skeleton({
  width = "100%",
  height = "1rem",
  borderRadius = "4px",
  className = "",
  animate = true,
}: SkeletonProps) {
  const style: React.CSSProperties = {
    width,
    height,
    borderRadius,
    background: animate
      ? "linear-gradient(90deg, var(--bg-tertiary, #e5e7eb) 25%, var(--bg-secondary, #f3f4f6) 50%, var(--bg-tertiary, #e5e7eb) 75%)"
      : "var(--bg-tertiary, #e5e7eb)",
    backgroundSize: animate ? "200% 100%" : "100% 100%",
    animation: animate ? "skeleton-loading 1.5s ease-in-out infinite" : "none",
  };

  return (
    <>
      {animate && (
        <style>{`
          @keyframes skeleton-loading {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>
      )}
      <div className={`skeleton ${className}`} style={style} aria-busy="true" aria-live="polite" />
    </>
  );
}

export function DeckSkeleton() {
  return (
    <div
      style={{
        padding: "0.75rem 1rem",
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <Skeleton width={32} height={32} borderRadius="6px" />
      <div style={{ flex: 1 }}>
        <Skeleton width="60%" height="1rem" />
        <div style={{ marginTop: "0.5rem" }}>
          <Skeleton width="40%" height="0.75rem" />
        </div>
      </div>
      <Skeleton width={40} height="1.5rem" borderRadius="12px" />
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div
      style={{
        background: "var(--bg-secondary)",
        border: "1px solid var(--border)",
        borderRadius: "8px",
        padding: "1rem",
        marginBottom: "0.75rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "start", gap: "1rem", marginBottom: "0.75rem" }}>
        <div style={{ flex: 1 }}>
          <Skeleton width="80%" height="1rem" />
          <div style={{ marginTop: "0.5rem" }}>
            <Skeleton width="90%" height="0.875rem" />
          </div>
        </div>
        <Skeleton width={60} height="1.25rem" borderRadius="4px" />
      </div>
      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
        <Skeleton width={50} height="1.25rem" borderRadius="12px" />
        <Skeleton width={70} height="1.25rem" borderRadius="12px" />
      </div>
    </div>
  );
}

export function StudyCardSkeleton() {
  return (
    <div
      style={{
        maxWidth: "600px",
        margin: "0 auto",
        padding: "2rem",
      }}
    >
      <div
        style={{
          background: "var(--bg-secondary)",
          border: "2px solid var(--border)",
          borderRadius: "16px",
          padding: "3rem 2rem",
          textAlign: "center",
          minHeight: "300px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.5rem",
        }}
      >
        <Skeleton width="80%" height="2rem" />
        <Skeleton width="60%" height="1.5rem" />
        <div style={{ marginTop: "1rem", width: "100%" }}>
          <Skeleton width="100%" height="1rem" />
          <div style={{ marginTop: "0.5rem" }}>
            <Skeleton width="90%" height="1rem" />
          </div>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          gap: "1rem",
          marginTop: "2rem",
          justifyContent: "center",
        }}
      >
        <Skeleton width={100} height="3rem" borderRadius="8px" />
        <Skeleton width={100} height="3rem" borderRadius="8px" />
        <Skeleton width={100} height="3rem" borderRadius="8px" />
        <Skeleton width={100} height="3rem" borderRadius="8px" />
      </div>
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <div style={{ padding: "1.5rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <Skeleton width="200px" height="2rem" />
        <div style={{ marginTop: "0.5rem" }}>
          <Skeleton width="300px" height="1rem" />
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              padding: "1.5rem",
            }}
          >
            <Skeleton width="60%" height="0.875rem" />
            <div style={{ marginTop: "1rem" }}>
              <Skeleton width="50%" height="2rem" />
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          padding: "1.5rem",
          marginBottom: "1rem",
        }}
      >
        <Skeleton width="150px" height="1.25rem" />
        <div style={{ marginTop: "1.5rem", height: "200px", display: "flex", alignItems: "flex-end", gap: "0.5rem" }}>
          {[40, 70, 50, 90, 60, 80, 45].map((height, i) => (
            <Skeleton key={i} width="100%" height={`${height}%`} borderRadius="4px 4px 0 0" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function DeckListSkeleton() {
  return (
    <div>
      {[1, 2, 3, 4, 5].map((i) => (
        <DeckSkeleton key={i} />
      ))}
    </div>
  );
}

export function CardListSkeleton() {
  return (
    <div style={{ padding: "1rem" }}>
      {[1, 2, 3].map((i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
