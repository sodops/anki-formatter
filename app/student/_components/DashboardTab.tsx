import { Assignment, Group, StudentTab, XPData } from "./types";

interface DashboardTabProps {
  user: any;
  activeAssignments: Assignment[];
  completedAssignments: Assignment[];
  overdueAssignments: Assignment[];
  assignments: Assignment[];
  groups: Group[];
  xp: XPData;
  setActiveTab: (tab: StudentTab) => void;
  handleCompleteAssignment: (assignmentId: string, title: string) => Promise<void>;
  completingId: string | null;
}

export default function DashboardTab({
  user,
  activeAssignments,
  completedAssignments,
  overdueAssignments,
  assignments,
  groups,
  xp,
  setActiveTab,
  handleCompleteAssignment,
  completingId,
}: DashboardTabProps) {
  return (
    <div className="s-content">
      <div className="s-page-header">
        <h1>
          Welcome back, {user.user_metadata?.full_name || user.email?.split("@")[0] || "Student"}
        </h1>
        <p className="s-subtitle">Here&apos;s your learning overview</p>
      </div>

      <div className="s-stats-row">
        <div className="s-stat-card">
          <div
            className="s-stat-icon"
            style={{ background: "rgba(124,92,252,0.1)", color: "#7C5CFC" }}
          >
            <ion-icon name="document-text"></ion-icon>
          </div>
          <div>
            <div className="s-stat-value">{activeAssignments.length}</div>
            <div className="s-stat-label">Active Tasks</div>
          </div>
        </div>
        <div className="s-stat-card">
          <div
            className="s-stat-icon"
            style={{ background: "rgba(16,185,129,0.1)", color: "#10B981" }}
          >
            <ion-icon name="checkmark-circle"></ion-icon>
          </div>
          <div>
            <div className="s-stat-value">{completedAssignments.length}</div>
            <div className="s-stat-label">Completed</div>
          </div>
        </div>
        <div className="s-stat-card">
          <div
            className="s-stat-icon"
            style={{ background: "rgba(245,158,11,0.1)", color: "#F59E0B" }}
          >
            <ion-icon name="flash"></ion-icon>
          </div>
          <div>
            <div className="s-stat-value">{xp.total_xp}</div>
            <div className="s-stat-label">Total XP</div>
          </div>
        </div>
        <div className="s-stat-card">
          <div
            className="s-stat-icon"
            style={{
              background:
                overdueAssignments.length > 0 ? "rgba(239,68,68,0.1)" : "rgba(107,114,128,0.1)",
              color: overdueAssignments.length > 0 ? "#EF4444" : "#6B7280",
            }}
          >
            <ion-icon name="time"></ion-icon>
          </div>
          <div>
            <div className="s-stat-value">{overdueAssignments.length}</div>
            <div className="s-stat-label">Overdue</div>
          </div>
        </div>
      </div>

      {overdueAssignments.length > 0 && (
        <div className="s-alert s-alert-error">
          <ion-icon name="warning"></ion-icon>
          <span>
            You have {overdueAssignments.length} overdue assignment
            {overdueAssignments.length > 1 ? "s" : ""}! Complete them as soon as possible.
          </span>
        </div>
      )}

      <div className="s-section">
        <h2 className="s-section-title">Quick Actions</h2>
        <div className="s-quick-actions">
          <a href="/app/study" className="s-quick-action">
            <ion-icon name="flash-outline"></ion-icon>
            <span>Flashcards</span>
          </a>
          <button className="s-quick-action" onClick={() => setActiveTab("assignments")}>
            <ion-icon name="document-text-outline"></ion-icon>
            <span>View Assignments</span>
          </button>
          <button className="s-quick-action" onClick={() => setActiveTab("groups")}>
            <ion-icon name="people-outline"></ion-icon>
            <span>Join a Group</span>
          </button>
        </div>
      </div>

      {activeAssignments.length > 0 && (
        <div className="s-section">
          <div className="s-section-header">
            <h2 className="s-section-title">Current Assignments</h2>
            <button className="s-link-btn" onClick={() => setActiveTab("assignments")}>
              View All →
            </button>
          </div>
          <div className="s-assign-list">
            {activeAssignments.slice(0, 4).map((a) => {
              const prog = a.my_progress;
              const pct = prog
                ? Math.min(
                    100,
                    Math.round((prog.cards_mastered / Math.max(prog.cards_studied || 1, 1)) * 100)
                  )
                : 0;
              const isOverdue = a.deadline && new Date(a.deadline) < new Date();
              return (
                <div key={a.id} className={`s-assign-card ${isOverdue ? "overdue" : ""}`}>
                  <div className="s-assign-top">
                    <div>
                      <div className="s-assign-title">{a.title}</div>
                      <div className="s-assign-meta">
                        {a.group_name && (
                          <span
                            className="s-group-chip"
                            style={{ background: a.group_color || "#7C5CFC" }}
                          >
                            {a.group_name}
                          </span>
                        )}
                        {a.deadline && (
                          <span className={`s-deadline ${isOverdue ? "overdue" : ""}`}>
                            <ion-icon name="time-outline"></ion-icon>
                            {isOverdue ? "Overdue" : new Date(a.deadline).toLocaleDateString()}
                          </span>
                        )}
                        <span className="s-xp-tag">
                          <ion-icon name="flash" style={{ fontSize: 12 }}></ion-icon> {a.xp_reward}{" "}
                          XP
                        </span>
                      </div>
                    </div>
                    <div className="s-assign-actions">
                      <a href={`/student/study/${a.id}`} className="s-btn s-btn-primary s-btn-sm">
                        <ion-icon name="play"></ion-icon> Study
                      </a>
                      {prog?.status === "in_progress" && (
                        <button
                          className="s-btn s-btn-success s-btn-sm"
                          onClick={() => handleCompleteAssignment(a.id, a.title)}
                          disabled={completingId === a.id}
                        >
                          {completingId === a.id ? (
                            "..."
                          ) : (
                            <>
                              <ion-icon name="checkmark-done"></ion-icon> Complete
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                  {prog && (
                    <div className="s-assign-progress">
                      <div className="s-progress-info">
                        <span>{prog.cards_studied} cards studied</span>
                        <span>{prog.accuracy ? Math.round(prog.accuracy) : 0}% accuracy</span>
                      </div>
                      <div className="s-progress-bar">
                        <div className="s-progress-fill" style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {assignments.length === 0 && groups.length === 0 && (
        <div className="s-empty-state">
          <div className="s-empty-icon">
            <ion-icon name="school-outline" style={{ fontSize: 48 }}></ion-icon>
          </div>
          <h3>Welcome to AnkiFlow!</h3>
          <p>Join a group with a code from your teacher to get started with assignments.</p>
          <button className="s-btn s-btn-primary" onClick={() => setActiveTab("groups")}>
            <ion-icon name="people-outline"></ion-icon>Join a Group
          </button>
        </div>
      )}
    </div>
  );
}
