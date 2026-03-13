import StudySidebar from "./StudySidebar";
import StudyMainWorkspace from "./StudyMainWorkspace";

type StudyAppContainerProps = {
  role?: string | null;
};

export default function StudyAppContainer({ role }: StudyAppContainerProps) {
  return (
    <>
      <div className="app-background"></div>

      <div id="appSkeleton" className="app-skeleton">
        <div className="skeleton-sidebar">
          <div className="skeleton-line w60"></div>
          <div className="skeleton-line w80"></div>
          <div className="skeleton-line w40"></div>
          <div className="skeleton-line w70"></div>
        </div>
        <div className="skeleton-main">
          <div className="skeleton-topbar"></div>
          <div className="skeleton-content">
            <div className="skeleton-line w50"></div>
            <div className="skeleton-rect"></div>
            <div className="skeleton-line w80"></div>
            <div className="skeleton-line w60"></div>
          </div>
        </div>
      </div>

      <div
        className="app-container"
        id="appContainer"
        style={{ visibility: "hidden", position: "absolute" }}
      >
        <button className="hamburger-btn" id="hamburgerBtn" aria-label="Toggle menu">
          <ion-icon name="menu-outline"></ion-icon>
        </button>
        <div className="sidebar-overlay" id="sidebarOverlay"></div>

        <StudySidebar role={role} />
        <StudyMainWorkspace />
      </div>
    </>
  );
}
