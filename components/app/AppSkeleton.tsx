export function AppSkeleton() {
  return (
    <div id="appSkeleton" className="app-skeleton" role="status" aria-label="Loading AnkiFlow...">
      <div className="skeleton-sidebar">
        <div className="skeleton-brand">
          <div className="skeleton-circle" style={{ width: 28, height: 28 }}></div>
          <div className="skeleton-line w60" style={{ height: 18 }}></div>
        </div>
        <div className="skeleton-menu">
          <div className="skeleton-line w80"></div>
          <div className="skeleton-deck-item"></div>
          <div className="skeleton-deck-item"></div>
          <div className="skeleton-deck-item"></div>
        </div>
        <div style={{ marginTop: 'auto' }}>
          <div className="skeleton-line w60"></div>
        </div>
      </div>
      <div className="skeleton-main">
        <div className="skeleton-topbar">
          <div className="skeleton-line" style={{ width: '60%', height: 36, borderRadius: 18 }}></div>
        </div>
        <div className="skeleton-content">
          <div className="skeleton-tabs">
            <div className="skeleton-tab"></div>
            <div className="skeleton-tab active"></div>
            <div className="skeleton-tab"></div>
          </div>
          <div className="skeleton-line w40" style={{ height: 20 }}></div>
          <div className="skeleton-flashcard"></div>
          <div className="skeleton-line" style={{ width: 200, height: 44, borderRadius: 12, margin: '0 auto' }}></div>
        </div>
      </div>
      <span className="sr-only">Loading application...</span>
    </div>
  );
}
