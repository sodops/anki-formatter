export default function Loading() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-primary)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⏳</div>
        <div>Loading admin dashboard...</div>
      </div>
    </div>
  );
}