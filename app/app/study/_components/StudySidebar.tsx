type StudySidebarProps = {
  role?: string | null;
};

export default function StudySidebar({ role }: StudySidebarProps) {
  return (
    <nav className="sidebar" id="sidebar" aria-label="Main navigation">
      <div className="brand">
        <ion-icon name="flash"></ion-icon>
        <span>AnkiFlow</span>
        <button
          className="sidebar-collapse-btn"
          id="sidebarCollapseBtn"
          aria-label="Toggle sidebar"
          title="Toggle sidebar"
        >
          <ion-icon name="chevron-back-outline"></ion-icon>
        </button>
        <button className="sidebar-close-btn" id="sidebarCloseBtn" aria-label="Close sidebar">
          <ion-icon name="close-outline"></ion-icon>
        </button>
      </div>

      <div className="sidebar-section">
        <h3>My Decks</h3>
        <ul className="deck-list" id="deckList"></ul>
        <button className="new-deck-btn" id="btnNewDeck">
          <ion-icon name="add-circle"></ion-icon> New Deck
        </button>
      </div>

      <div className="sidebar-section">
        <a
          href={role === "teacher" ? "/teacher" : "/student"}
          className="new-deck-btn"
          style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "8px" }}
        >
          <ion-icon name="arrow-back-outline"></ion-icon>
          Back to Dashboard
        </a>
      </div>

      <div className="sidebar-footer">
        <div className="daily-goal-widget" id="dailyGoalWidget">
          <div className="goal-progress">
            <div className="goal-progress-bar" id="goalProgressBar" style={{ width: "0%" }}></div>
          </div>
          <div className="goal-info">
            <span className="goal-text" id="goalText">
              0 / 20 cards today
            </span>
            <span className="streak-badge" id="streakBadge">
              <ion-icon name="flame"></ion-icon> <span>0</span>
            </span>
          </div>
        </div>
        <div className="status-indicator online">
          <span className="dot"></span> <span id="autoSaveText">System Ready</span>
        </div>
      </div>
    </nav>
  );
}
