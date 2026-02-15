export function AppSkeleton() {
  return (
    <div id="appSkeleton" className="app-skeleton">
      <div className="skeleton-sidebar">
        <div className="skeleton-logo"></div>
        <div className="skeleton-menu">
          <div className="skeleton-menu-item"></div>
          <div className="skeleton-menu-item"></div>
          <div className="skeleton-menu-item"></div>
          <div className="skeleton-menu-item"></div>
        </div>
      </div>
      <div className="skeleton-main">
        <div className="skeleton-header">
          <div className="skeleton-title"></div>
        </div>
        <div className="skeleton-content">
          <div className="skeleton-card"></div>
          <div className="skeleton-card"></div>
          <div className="skeleton-card"></div>
        </div>
      </div>
    </div>
  );
}
