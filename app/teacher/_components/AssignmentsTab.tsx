import Link from "next/link";
import { Assignment } from "./types";

interface AssignmentsTabProps {
  assignments: Assignment[];
  activeAssignments: number;
  setActiveTab: (tab: string) => void;
}

export default function AssignmentsTab({
  assignments,
  activeAssignments,
  setActiveTab,
}: AssignmentsTabProps) {
  return (
    <div className="t-content">
      <div className="t-page-header">
        <div>
          <h1>Assignments</h1>
          <p className="t-subtitle">
            {assignments.length} total · {activeAssignments} active
          </p>
        </div>
        <button className="t-btn t-btn-primary" onClick={() => setActiveTab("create-assignment")}>
          <ion-icon name="add-circle-outline"></ion-icon>
          New Assignment
        </button>
      </div>

      {assignments.length === 0 ? (
        <div className="t-empty-state">
          <div className="t-empty-icon">
            <ion-icon name="document-text-outline" style={{ fontSize: 48 }}></ion-icon>
          </div>
          <h3>No assignments yet</h3>
          <p>Create an assignment and assign it to one of your groups.</p>
          <button className="t-btn t-btn-primary" onClick={() => setActiveTab("create-assignment")}>
            Create Assignment
          </button>
        </div>
      ) : (
        <div className="t-assign-list">
          {assignments.map((a) => {
            const ps = a.progress_summary;
            const pct = ps && ps.total > 0 ? Math.round((ps.completed / ps.total) * 100) : 0;
            const isOverdue =
              a.deadline && new Date(a.deadline) < new Date() && a.status === "active";
            return (
              <Link
                href={`/teacher/assignments/${a.id}`}
                key={a.id}
                className={`t-assign-card-full ${isOverdue ? "overdue" : ""}`}
              >
                <div className="t-assign-card-top">
                  <div>
                    <div className="t-assign-title-lg">{a.title}</div>
                    <div className="t-assign-meta">
                      {a.group_name && (
                        <span
                          className="t-group-chip"
                          style={{ background: a.group_color || "#7C5CFC" }}
                        >
                          {a.group_name}
                        </span>
                      )}
                      {a.deadline && (
                        <span className={`t-assign-deadline ${isOverdue ? "overdue" : ""}`}>
                          <ion-icon name="time-outline"></ion-icon>
                          {isOverdue ? "Overdue: " : "Due: "}
                          {new Date(a.deadline).toLocaleDateString()}
                        </span>
                      )}
                      <span className="t-assign-xp">
                        <ion-icon name="flash" style={{ fontSize: 12 }}></ion-icon> {a.xp_reward} XP
                      </span>
                    </div>
                  </div>
                  <span className={`t-status-badge ${a.status}`}>{a.status}</span>
                </div>
                {ps && (
                  <div className="t-assign-progress-section">
                    <div className="t-progress-bar-lg">
                      <div className="t-progress-fill-lg" style={{ width: `${pct}%` }}></div>
                    </div>
                    <div className="t-progress-stats">
                      <span className="t-progress-done">{ps.completed} completed</span>
                      <span className="t-progress-wip">{ps.in_progress} in progress</span>
                      <span className="t-progress-pending">{ps.not_started} not started</span>
                      {ps.avg_accuracy > 0 && (
                        <span className="t-progress-acc">
                          {Math.round(ps.avg_accuracy)}% avg accuracy
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
