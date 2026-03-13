import Link from "next/link";
import { Group, Assignment } from "./types";

interface OverviewTabProps {
  user: any;
  groups: Group[];
  assignments: Assignment[];
  totalStudents: number;
  activeAssignments: number;
  overdueCount: number;
  setActiveTab: any;
  copyCode: any;
  copyJoinLink: any;
}

export default function OverviewTab({
  user,
  groups,
  assignments,
  totalStudents,
  activeAssignments,
  overdueCount,
  setActiveTab,
  copyCode,
  copyJoinLink,
}: OverviewTabProps) {
  return (
    <div className="t-content">
      <div className="t-page-header">
        <div>
          <h1>
            Welcome back, {user.user_metadata?.full_name || user.email?.split("@")[0] || "Teacher"}
          </h1>
          <p className="t-subtitle">Here&apos;s what&apos;s happening with your classes</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="t-stats-row">
        <div className="t-stat-card">
          <div
            className="t-stat-icon"
            style={{ background: "rgba(124,92,252,0.1)", color: "#7C5CFC" }}
          >
            <ion-icon name="people"></ion-icon>
          </div>
          <div>
            <div className="t-stat-value">{groups.length}</div>
            <div className="t-stat-label">Groups</div>
          </div>
        </div>
        <div className="t-stat-card">
          <div
            className="t-stat-icon"
            style={{ background: "rgba(16,185,129,0.1)", color: "#10B981" }}
          >
            <ion-icon name="school"></ion-icon>
          </div>
          <div>
            <div className="t-stat-value">{totalStudents}</div>
            <div className="t-stat-label">Students</div>
          </div>
        </div>
        <div className="t-stat-card">
          <div
            className="t-stat-icon"
            style={{ background: "rgba(245,158,11,0.1)", color: "#F59E0B" }}
          >
            <ion-icon name="document-text"></ion-icon>
          </div>
          <div>
            <div className="t-stat-value">{activeAssignments}</div>
            <div className="t-stat-label">Active Tasks</div>
          </div>
        </div>
        <div className="t-stat-card">
          <div
            className="t-stat-icon"
            style={{
              background: overdueCount > 0 ? "rgba(239,68,68,0.1)" : "rgba(107,114,128,0.1)",
              color: overdueCount > 0 ? "#EF4444" : "#6B7280",
            }}
          >
            <ion-icon name="time"></ion-icon>
          </div>
          <div>
            <div className="t-stat-value">{overdueCount}</div>
            <div className="t-stat-label">Overdue</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="t-section">
        <h2 className="t-section-title">Quick Actions</h2>
        <div className="t-quick-actions">
          <button className="t-quick-action" onClick={() => setActiveTab("create-group")}>
            <ion-icon name="people-outline"></ion-icon>
            <span>Create Group</span>
          </button>
          <button className="t-quick-action" onClick={() => setActiveTab("create-assignment")}>
            <ion-icon name="create-outline"></ion-icon>
            <span>New Assignment</span>
          </button>
          <a href="/app/study" className="t-quick-action">
            <ion-icon name="flash-outline"></ion-icon>
            <span>Flashcards</span>
          </a>
        </div>
      </div>

      {/* Recent Groups */}
      {groups.length > 0 && (
        <div className="t-section">
          <div className="t-section-header">
            <h2 className="t-section-title">Your Groups</h2>
            <button className="t-link-btn" onClick={() => setActiveTab("groups")}>
              View All →
            </button>
          </div>
          <div className="t-card-grid">
            {groups.slice(0, 4).map((g) => (
              <Link
                href={`/groups/${g.id}`}
                key={g.id}
                className="t-group-card"
                style={{ borderTopColor: g.color }}
              >
                <div className="t-group-card-header">
                  <div className="t-group-dot" style={{ background: g.color }}></div>
                  <h3>{g.name}</h3>
                </div>
                <p className="t-group-desc">{g.description || "No description"}</p>
                <div className="t-group-footer">
                  <span>
                    <ion-icon name="people-outline"></ion-icon> {g.member_count} members
                  </span>
                  <span>
                    <ion-icon name="document-text-outline"></ion-icon> {g.assignment_count} tasks
                  </span>
                </div>
                <div
                  className="t-group-code"
                  onClick={(e) => {
                    e.preventDefault();
                    copyCode(g.join_code);
                  }}
                >
                  <span>
                    Code: <strong>{g.join_code}</strong>
                  </span>
                  <ion-icon name="copy-outline"></ion-icon>
                </div>
                <div
                  className="t-group-code t-group-link"
                  onClick={(e) => {
                    e.preventDefault();
                    copyJoinLink(g.join_code);
                  }}
                >
                  <span>
                    <ion-icon name="link-outline"></ion-icon> Copy Invite Link
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent Assignments */}
      {assignments.length > 0 && (
        <div className="t-section">
          <div className="t-section-header">
            <h2 className="t-section-title">Recent Assignments</h2>
            <button className="t-link-btn" onClick={() => setActiveTab("assignments")}>
              View All →
            </button>
          </div>
          <div className="t-assign-list">
            {assignments.slice(0, 5).map((a) => {
              const ps = a.progress_summary;
              const pct = ps && ps.total > 0 ? Math.round((ps.completed / ps.total) * 100) : 0;
              const isOverdue = a.deadline && new Date(a.deadline) < new Date();
              return (
                <Link
                  href={`/teacher/assignments/${a.id}`}
                  key={a.id}
                  className={`t-assign-row ${isOverdue ? "overdue" : ""}`}
                >
                  <div className="t-assign-row-left">
                    <span
                      className="t-assign-dot"
                      style={{ background: a.group_color || "#7C5CFC" }}
                    ></span>
                    <div>
                      <div className="t-assign-title">{a.title}</div>
                      <div className="t-assign-meta">
                        {a.group_name && <span className="t-assign-group">{a.group_name}</span>}
                        {a.deadline && (
                          <span className={`t-assign-deadline ${isOverdue ? "overdue" : ""}`}>
                            <ion-icon name="time-outline"></ion-icon>
                            {new Date(a.deadline).toLocaleDateString()}
                          </span>
                        )}
                        <span className="t-assign-xp">
                          <ion-icon name="flash" style={{ fontSize: 12 }}></ion-icon> {a.xp_reward}{" "}
                          XP
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="t-assign-row-right">
                    <div className="t-mini-progress">
                      <div className="t-mini-progress-fill" style={{ width: `${pct}%` }}></div>
                    </div>
                    <span className="t-assign-pct">{pct}%</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {groups.length === 0 && (
        <div className="t-empty-state">
          <div className="t-empty-icon">
            <ion-icon name="library-outline" style={{ fontSize: 48 }}></ion-icon>
          </div>
          <h3>Get Started!</h3>
          <p>Create your first group and start assigning tasks to students.</p>
          <button className="t-btn t-btn-primary" onClick={() => setActiveTab("create-group")}>
            <ion-icon name="add-circle-outline"></ion-icon>
            Create First Group
          </button>
        </div>
      )}
    </div>
  );
}
