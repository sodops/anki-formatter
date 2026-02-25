"use client";

import { useAuth } from "@/components/AuthProvider";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface AssignmentDetail {
  id: string;
  title: string;
  description: string | null;
  deadline: string | null;
  xp_reward: number;
  group_id: string;
  is_active: boolean;
  created_at: string;
  groups: { id: string; name: string; color: string; owner_id: string };
  assignment_decks: { id: string; deck_name: string; card_count: number }[];
}

interface StudentProgressDetail {
  student_id: string;
  status: string;
  cards_total: number;
  cards_studied: number;
  cards_mastered: number;
  accuracy: number;
  total_reviews: number;
  time_spent_seconds: number;
  started_at: string | null;
  completed_at: string | null;
  last_studied_at: string | null;
  xp_earned: number;
  profiles: {
    display_name: string;
    avatar_url: string | null;
    total_xp: number;
    current_streak: number;
  };
}

export default function AssignmentDetailPage({ params }: { params: { id: string } }) {
  const { id: assignmentId } = params;
  const { loading: authLoading } = useAuth();
  const [assignment, setAssignment] = useState<AssignmentDetail | null>(null);
  const [progress, setProgress] = useState<StudentProgressDetail[]>([]);
  const [isTeacher, setIsTeacher] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/assignments/${assignmentId}`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setAssignment(data.assignment);
      setProgress(data.progress || []);
      setIsTeacher(data.isTeacher);
    } catch {
      // error
    } finally {
      setLoading(false);
    }
  }, [assignmentId]);

  useEffect(() => {
    if (!authLoading) fetchData();
  }, [authLoading, fetchData]);

  const handleFinishAssignment = async () => {
    if (!confirm("Finish this assignment? It will be marked as inactive and students won't be able to study it anymore.")) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/assignments/${assignmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: false }),
      });
      if (!res.ok) throw new Error("Failed to finish assignment");
      fetchData();
    } catch {
      alert("Failed to finish assignment");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAssignment = async () => {
    if (!confirm("Delete this assignment permanently? All student progress will be lost. This cannot be undone.")) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/assignments/${assignmentId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      window.location.href = "/teacher";
    } catch {
      alert("Failed to delete assignment");
      setActionLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="teacher-loading">
        <div className="teacher-spinner"></div>
        <p>Loading assignment...</p>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="teacher-loading">
        <h2>Assignment not found</h2>
        <Link href="/teacher" style={{ color: "#7C5CFC" }}>← Back</Link>
      </div>
    );
  }

  const totalStudents = progress.length;
  const completed = progress.filter(p => p.status === "completed").length;
  const inProgress = progress.filter(p => p.status === "in_progress").length;
  const pending = progress.filter(p => p.status === "pending").length;
  const avgAccuracy = totalStudents > 0
    ? Math.round(progress.reduce((sum, p) => sum + (p.accuracy || 0), 0) / totalStudents)
    : 0;
  const totalTime = progress.reduce((sum, p) => sum + (p.time_spent_seconds || 0), 0);
  const deadline = assignment.deadline ? new Date(assignment.deadline) : null;
  const isOverdue = deadline && deadline < new Date();

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}m`;
  };

  return (
    <div className="teacher-container">
      {/* Mobile Back Header */}
      <div className="teacher-mobile-back">
        <Link href="/teacher">
          <ion-icon name="arrow-back-outline"></ion-icon>
          Back to Dashboard
        </Link>
      </div>

      <aside className="teacher-sidebar">
        <div className="teacher-sidebar-header">
          <Link href="/teacher" className="teacher-logo">
            <span className="teacher-logo-icon"><ion-icon name="flash"></ion-icon></span>
            <span>AnkiFlow</span>
          </Link>
        </div>
        <nav className="teacher-nav">
          <Link href="/teacher" className="teacher-nav-item">
            <ion-icon name="arrow-back-outline"></ion-icon>
            <span>Dashboard</span>
          </Link>
          {assignment.groups && (
            <Link href={`/teacher/groups/${assignment.group_id}`} className="teacher-nav-item">
              <ion-icon name="people-outline"></ion-icon>
              <span>{assignment.groups.name}</span>
            </Link>
          )}
        </nav>
      </aside>

      <main className="teacher-main">
        {/* Assignment Header */}
        <div className="teacher-assignment-hero">
          <div>
            <h1>{assignment.title}</h1>
            <div className="teacher-assignment-meta">
              <span className="teacher-group-tag" style={{ background: assignment.groups?.color || "#7C5CFC" }}>
                {assignment.groups?.name}
              </span>
              {deadline && (
                <span className={`teacher-deadline ${isOverdue ? "overdue" : ""}`}>
                  <ion-icon name="time-outline"></ion-icon>
                  {isOverdue ? "Overdue: " : "Due: "}{deadline.toLocaleDateString()} {deadline.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
              <span className="teacher-xp-badge">+{assignment.xp_reward} XP</span>
            </div>
            {assignment.description && <p className="teacher-assignment-desc" style={{ marginTop: "8px" }}>{assignment.description}</p>}
          </div>
          {isTeacher && (
            <div className="teacher-assignment-actions">
              <button
                className="teacher-btn teacher-btn-outline teacher-btn-sm"
                onClick={handleFinishAssignment}
                disabled={actionLoading || !assignment.is_active}
                title={assignment.is_active ? "Mark as finished" : "Already finished"}
              >
                <ion-icon name="checkmark-done-outline"></ion-icon>
                {assignment.is_active ? "Finish" : "Finished"}
              </button>
              <button
                className="teacher-btn teacher-btn-danger teacher-btn-sm"
                onClick={handleDeleteAssignment}
                disabled={actionLoading}
              >
                <ion-icon name="trash-outline"></ion-icon> Delete
              </button>
            </div>
          )}
        </div>

        {/* Inactive Banner */}
        {!assignment.is_active && (
          <div className="teacher-inactive-banner">
            <ion-icon name="checkmark-done-outline"></ion-icon>
            This assignment has been finished. Students can no longer study it.
          </div>
        )}

        {/* Decks */}
        <div className="teacher-assignment-decks" style={{ marginBottom: "20px" }}>
          {assignment.assignment_decks?.map(d => (
            <span key={d.id} className="teacher-deck-chip">
              <ion-icon name="albums-outline"></ion-icon>
              {d.deck_name} ({d.card_count} cards)
            </span>
          ))}
        </div>

        {/* Summary Stats */}
        <div className="teacher-stats-row">
          <div className="teacher-stat-card">
            <div className="teacher-stat-value">{totalStudents}</div>
            <div className="teacher-stat-label">Total Students</div>
          </div>
          <div className="teacher-stat-card" style={{ borderTop: "3px solid #10B981" }}>
            <div className="teacher-stat-value">{completed}</div>
            <div className="teacher-stat-label">Completed</div>
          </div>
          <div className="teacher-stat-card" style={{ borderTop: "3px solid #F59E0B" }}>
            <div className="teacher-stat-value">{inProgress}</div>
            <div className="teacher-stat-label">In Progress</div>
          </div>
          <div className="teacher-stat-card" style={{ borderTop: "3px solid #EF4444" }}>
            <div className="teacher-stat-value">{pending}</div>
            <div className="teacher-stat-label">Not Started</div>
          </div>
          <div className="teacher-stat-card">
            <div className="teacher-stat-value">{avgAccuracy}%</div>
            <div className="teacher-stat-label">Avg Accuracy</div>
          </div>
          <div className="teacher-stat-card">
            <div className="teacher-stat-value">{formatTime(totalTime)}</div>
            <div className="teacher-stat-label">Total Time</div>
          </div>
        </div>

        {/* Student Progress */}
        {isTeacher && (
          <div className="teacher-section">
            <h2>Student Progress</h2>
            {progress.length === 0 ? (
              <div className="teacher-empty-inline">
                <p>No students have been assigned yet.</p>
              </div>
            ) : (
              <div className="teacher-progress-cards">
                {progress
                  .sort((a, b) => {
                    const statusOrder: Record<string, number> = { completed: 0, in_progress: 1, pending: 2, overdue: 3 };
                    return (statusOrder[a.status] || 9) - (statusOrder[b.status] || 9);
                  })
                  .map(p => {
                    const progressPct = p.cards_total > 0 ? Math.round((p.cards_studied / p.cards_total) * 100) : 0;
                    const isExpanded = selectedStudent === p.student_id;
                    return (
                      <div
                        key={p.student_id}
                        className={`teacher-progress-card ${p.status === "completed" ? "card-completed" : ""} ${isExpanded ? "card-expanded" : ""}`}
                        onClick={() => setSelectedStudent(isExpanded ? null : p.student_id)}
                        style={{ cursor: "pointer" }}
                      >
                        <div className="teacher-progress-card-header">
                          <div className="teacher-member-inline">
                            <div className="teacher-member-avatar-sm">
                              {p.profiles?.avatar_url
                                ? <img src={p.profiles.avatar_url} alt="" />
                                : <span>{(p.profiles?.display_name || "?")[0].toUpperCase()}</span>}
                            </div>
                            <span>{p.profiles?.display_name || "Unknown"}</span>
                          </div>
                          <span className={`teacher-status-badge status-${p.status}`}>
                            {p.status.replace("_", " ")}
                          </span>
                        </div>
                        <div className="teacher-progress-card-bar">
                          <div className="teacher-mini-bar">
                            <div style={{ width: `${progressPct}%` }}></div>
                          </div>
                          <span className="teacher-progress-card-pct">{progressPct}%</span>
                        </div>
                        <div className="teacher-progress-card-stats">
                          <div className="teacher-pcs">
                            <span className="teacher-pcs-val">{p.cards_studied}/{p.cards_total}</span>
                            <span className="teacher-pcs-label">Cards</span>
                          </div>
                          <div className="teacher-pcs">
                            <span className="teacher-pcs-val">{p.cards_mastered}/{p.cards_total}</span>
                            <span className="teacher-pcs-label">Mastered</span>
                          </div>
                          <div className="teacher-pcs">
                            <span className={`teacher-pcs-val ${p.accuracy >= 80 ? "text-green" : p.accuracy >= 50 ? "text-yellow" : "text-red"}`}>
                              {p.accuracy ? `${Math.round(p.accuracy)}%` : "—"}
                            </span>
                            <span className="teacher-pcs-label">Accuracy</span>
                          </div>
                          <div className="teacher-pcs">
                            <span className="teacher-pcs-val">{p.total_reviews}</span>
                            <span className="teacher-pcs-label">Reviews</span>
                          </div>
                          <div className="teacher-pcs">
                            <span className="teacher-pcs-val">{p.time_spent_seconds ? formatTime(p.time_spent_seconds) : "—"}</span>
                            <span className="teacher-pcs-label">Time</span>
                          </div>
                          <div className="teacher-pcs">
                            <span className="teacher-pcs-val">{p.xp_earned > 0 ? `${p.xp_earned}/${assignment.xp_reward}` : "—"}</span>
                            <span className="teacher-pcs-label">XP Earned</span>
                          </div>
                        </div>
                        {p.last_studied_at && (
                          <div className="teacher-progress-card-footer">
                            Last active: {new Date(p.last_studied_at).toLocaleDateString()}
                          </div>
                        )}

                        {/* Expanded student detail */}
                        {isExpanded && (
                          <div className="teacher-student-detail">
                            <div className="teacher-student-detail-grid">
                              <div className="teacher-sd-item">
                                <span className="teacher-sd-label">Student</span>
                                <span className="teacher-sd-val">{p.profiles?.display_name || "Unknown"}</span>
                              </div>
                              <div className="teacher-sd-item">
                                <span className="teacher-sd-label">Student Total XP</span>
                                <span className="teacher-sd-val"><ion-icon name="flash" style={{ fontSize: 14 }}></ion-icon> {p.profiles?.total_xp || 0}</span>
                              </div>
                              <div className="teacher-sd-item">
                                <span className="teacher-sd-label">Current Streak</span>
                                <span className="teacher-sd-val"><ion-icon name="flame" style={{ fontSize: 14, color: '#F59E0B' }}></ion-icon> {p.profiles?.current_streak || 0} days</span>
                              </div>
                              <div className="teacher-sd-item">
                                <span className="teacher-sd-label">Cards Studied</span>
                                <span className="teacher-sd-val">{p.cards_studied} / {p.cards_total}</span>
                              </div>
                              <div className="teacher-sd-item">
                                <span className="teacher-sd-label">Cards Mastered</span>
                                <span className="teacher-sd-val">{p.cards_mastered} / {p.cards_total}</span>
                              </div>
                              <div className="teacher-sd-item">
                                <span className="teacher-sd-label">Accuracy</span>
                                <span className={`teacher-sd-val ${p.accuracy >= 80 ? "text-green" : p.accuracy >= 50 ? "text-yellow" : p.accuracy > 0 ? "text-red" : ""}`}>
                                  {p.accuracy ? `${Math.round(p.accuracy)}%` : "Not started"}
                                </span>
                              </div>
                              <div className="teacher-sd-item">
                                <span className="teacher-sd-label">Total Reviews</span>
                                <span className="teacher-sd-val">{p.total_reviews}</span>
                              </div>
                              <div className="teacher-sd-item">
                                <span className="teacher-sd-label">Time Spent</span>
                                <span className="teacher-sd-val">{p.time_spent_seconds ? formatTime(p.time_spent_seconds) : "—"}</span>
                              </div>
                              <div className="teacher-sd-item">
                                <span className="teacher-sd-label">Status</span>
                                <span className={`teacher-status-badge status-${p.status}`}>{p.status.replace("_", " ")}</span>
                              </div>
                              {p.started_at && (
                                <div className="teacher-sd-item">
                                  <span className="teacher-sd-label">Started</span>
                                  <span className="teacher-sd-val">{new Date(p.started_at).toLocaleDateString()} {new Date(p.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                                </div>
                              )}
                              {p.completed_at && (
                                <div className="teacher-sd-item">
                                  <span className="teacher-sd-label">Completed</span>
                                  <span className="teacher-sd-val">{new Date(p.completed_at).toLocaleDateString()} {new Date(p.completed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                                </div>
                              )}
                              <div className="teacher-sd-item">
                                <span className="teacher-sd-label">XP Earned</span>
                                <span className="teacher-sd-val">{p.xp_earned > 0 ? `${p.xp_earned} / ${assignment.xp_reward} XP` : `— / ${assignment.xp_reward} XP`}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
