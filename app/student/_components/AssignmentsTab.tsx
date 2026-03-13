import { Assignment } from "./types";

interface AssignmentsTabProps {
  assignments: Assignment[];
  activeAssignments: Assignment[];
  completedAssignments: Assignment[];
  overdueAssignments: Assignment[];
  handleCompleteAssignment: (assignmentId: string, title: string) => Promise<void>;
  completingId: string | null;
}

export default function AssignmentsTab({
  assignments,
  activeAssignments,
  completedAssignments,
  overdueAssignments,
  handleCompleteAssignment,
  completingId,
}: AssignmentsTabProps) {
  return (
    <div className="s-content">
      <div className="s-page-header">
        <h1>My Assignments</h1>
        <p className="s-subtitle">
          {assignments.length} total · {activeAssignments.length} active ·{" "}
          {completedAssignments.length} completed
        </p>
      </div>

      {assignments.length === 0 ? (
        <div className="s-empty-state">
          <div className="s-empty-icon">
            <ion-icon name="clipboard-outline" style={{ fontSize: 48 }}></ion-icon>
          </div>
          <h3>No assignments yet</h3>
          <p>Your assignments from teachers will appear here once you join a group.</p>
        </div>
      ) : (
        <>
          {overdueAssignments.length > 0 && (
            <div className="s-section">
              <h2 className="s-section-title" style={{ color: "#f87171" }}>
                <ion-icon
                  name="alert-circle"
                  style={{ marginRight: 6, verticalAlign: "middle" }}
                ></ion-icon>
                Overdue ({overdueAssignments.length})
              </h2>
              <div className="s-assign-list">
                {overdueAssignments.map((a) => (
                  <AssignmentCard
                    key={a.id}
                    a={a}
                    onComplete={handleCompleteAssignment}
                    completingId={completingId}
                  />
                ))}
              </div>
            </div>
          )}
          {activeAssignments.filter((a) => !overdueAssignments.includes(a)).length > 0 && (
            <div className="s-section">
              <h2 className="s-section-title">
                <ion-icon
                  name="list-outline"
                  style={{ marginRight: 6, verticalAlign: "middle" }}
                ></ion-icon>
                To Do ({activeAssignments.filter((a) => !overdueAssignments.includes(a)).length})
              </h2>
              <div className="s-assign-list">
                {activeAssignments
                  .filter((a) => !overdueAssignments.includes(a))
                  .map((a) => (
                    <AssignmentCard
                      key={a.id}
                      a={a}
                      onComplete={handleCompleteAssignment}
                      completingId={completingId}
                    />
                  ))}
              </div>
            </div>
          )}
          {completedAssignments.length > 0 && (
            <div className="s-section">
              <h2 className="s-section-title">
                <ion-icon
                  name="checkmark-done"
                  style={{ marginRight: 6, verticalAlign: "middle", color: "#10B981" }}
                ></ion-icon>
                Completed ({completedAssignments.length})
              </h2>
              <div className="s-assign-list">
                {completedAssignments.map((a) => (
                  <AssignmentCard key={a.id} a={a} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AssignmentCard({
  a,
  onComplete,
  completingId,
}: {
  a: Assignment;
  onComplete?: (id: string, title: string) => void;
  completingId?: string | null;
}) {
  const prog = a.my_progress;
  const isOverdue = a.deadline && new Date(a.deadline) < new Date();
  const isCompleted = prog?.status === "completed";
  const isInProgress = prog?.status === "in_progress";
  const isCompleting = completingId === a.id;

  return (
    <div
      className={`s-assign-card ${isOverdue && !isCompleted ? "overdue" : ""} ${isCompleted ? "completed" : ""}`}
    >
      <div className="s-assign-top">
        <div>
          <div className="s-assign-title">{a.title}</div>
          {a.description && <div className="s-assign-desc">{a.description}</div>}
          <div className="s-assign-meta">
            {a.group_name && (
              <span className="s-group-chip" style={{ background: a.group_color || "#7C5CFC" }}>
                {a.group_name}
              </span>
            )}
            {a.deadline && (
              <span className={`s-deadline ${isOverdue && !isCompleted ? "overdue" : ""}`}>
                <ion-icon name="time-outline"></ion-icon>
                {new Date(a.deadline).toLocaleDateString()}
              </span>
            )}
            <span className="s-xp-tag">
              <ion-icon name="flash" style={{ fontSize: 12 }}></ion-icon> {a.xp_reward} XP
            </span>
            <span className={`s-status ${prog?.status || "not_started"}`}>
              {isCompleted
                ? "Done"
                : prog?.status === "in_progress"
                  ? "In Progress"
                  : "Not Started"}
            </span>
          </div>
        </div>
        <div className="s-assign-actions">
          <a
            href={`/student/study/${a.id}`}
            className={`s-btn ${isCompleted ? "s-btn-outline" : "s-btn-primary"} s-btn-sm`}
          >
            <ion-icon name={isCompleted ? "eye-outline" : "play"}></ion-icon>{" "}
            {isCompleted ? "Review" : "Study"}
          </a>
          {isInProgress && !isCompleted && onComplete && (
            <button
              className="s-btn s-btn-success s-btn-sm"
              onClick={() => onComplete(a.id, a.title)}
              disabled={isCompleting}
              title="Mark this assignment as completed"
            >
              {isCompleting ? (
                <>
                  <span className="s-btn-spinner"></span> Completing...
                </>
              ) : (
                <>
                  <ion-icon name="checkmark-done"></ion-icon> Complete
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
