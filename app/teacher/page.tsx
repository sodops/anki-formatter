"use client";

import { useAuth } from "@/components/AuthProvider";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface Group {
  id: string;
  name: string;
  description: string | null;
  join_code: string;
  color: string;
  member_count: number;
  assignment_count: number;
  created_at: string;
  is_owner: boolean;
}

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  deadline: string | null;
  xp_reward: number;
  group_id: string;
  groups: { id: string; name: string; color: string };
  assignment_decks: { id: string; deck_name: string; card_count: number }[];
  progress_summary: {
    total: number;
    completed: number;
    in_progress: number;
    pending: number;
    avg_accuracy: number;
  };
  created_at: string;
}

interface Deck {
  id: string;
  name: string;
  card_count?: number;
}

type TeacherTab = "groups" | "assignments" | "create-group" | "create-assignment";

export default function TeacherDashboard() {
  const { user, loading: authLoading, role } = useAuth();
  const [tab, setTab] = useState<TeacherTab>("groups");
  const [groups, setGroups] = useState<Group[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [myDecks, setMyDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Create group form
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");
  const [groupColor, setGroupColor] = useState("#6366F1");

  // Create assignment form
  const [assignTitle, setAssignTitle] = useState("");
  const [assignDesc, setAssignDesc] = useState("");
  const [assignGroupId, setAssignGroupId] = useState("");
  const [assignDeadline, setAssignDeadline] = useState("");
  const [assignXP, setAssignXP] = useState(10);
  const [selectedDeckIds, setSelectedDeckIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [groupsRes, assignmentsRes] = await Promise.all([
        fetch("/api/groups"),
        fetch("/api/assignments"),
      ]);

      if (groupsRes.ok) {
        const data = await groupsRes.json();
        setGroups(data.groups || []);
      }
      if (assignmentsRes.ok) {
        const data = await assignmentsRes.json();
        setAssignments(data.assignments || []);
      }
    } catch {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDecks = useCallback(async () => {
    try {
      const res = await fetch("/api/sync");
      if (res.ok) {
        const data = await res.json();
        const state = data.state || data;
        const decks = (state.decks || []).map((d: Record<string, unknown>) => ({
          id: d.id,
          name: d.name,
          card_count: Array.isArray(d.cards) ? d.cards.length : 0,
        }));
        setMyDecks(decks);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) {
      fetchData();
      fetchDecks();
    }
  }, [authLoading, user, fetchData, fetchDecks]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: groupName, description: groupDesc, color: groupColor }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccess(`Group "${groupName}" created! Join code: ${data.group.join_code}`);
      setGroupName("");
      setGroupDesc("");
      setTab("groups");
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create group");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          group_id: assignGroupId,
          title: assignTitle,
          description: assignDesc,
          deadline: assignDeadline || null,
          xp_reward: assignXP,
          deck_ids: selectedDeckIds,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccess(`Assignment "${assignTitle}" created!`);
      setAssignTitle("");
      setAssignDesc("");
      setAssignDeadline("");
      setSelectedDeckIds([]);
      setTab("assignments");
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create assignment");
    } finally {
      setSubmitting(false);
    }
  };

  const deleteGroup = async (groupId: string) => {
    if (!confirm("Delete this group? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/groups/${groupId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      fetchData();
    } catch {
      setError("Failed to delete group");
    }
  };

  const deleteAssignment = async (assignmentId: string) => {
    if (!confirm("Delete this assignment?")) return;
    try {
      const res = await fetch(`/api/assignments/${assignmentId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      fetchData();
    } catch {
      setError("Failed to delete assignment");
    }
  };

  const copyJoinCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setSuccess("Join code copied to clipboard!");
    setTimeout(() => setSuccess(null), 2000);
  };

  if (authLoading || loading) {
    return (
      <div className="teacher-loading">
        <div className="teacher-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (role !== "teacher" && role !== "admin") {
    return (
      <div className="teacher-loading">
        <h2>Access Denied</h2>
        <p>Only teachers can access this page.</p>
        <Link href="/app" style={{ color: "#6366F1" }}>← Back to App</Link>
      </div>
    );
  }

  const colors = ["#6366F1", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4", "#F97316"];

  return (
    <div className="teacher-container">
      {/* Sidebar */}
      <aside className="teacher-sidebar">
        <div className="teacher-sidebar-header">
          <Link href="/app" className="teacher-logo">
            <span className="teacher-logo-icon">⚡</span>
            <span>AnkiFlow</span>
          </Link>
          <span className="teacher-role-badge">Teacher</span>
        </div>

        <nav className="teacher-nav">
          <button className={`teacher-nav-item ${tab === "groups" ? "active" : ""}`} onClick={() => setTab("groups")}>
            <ion-icon name="people-outline"></ion-icon>
            <span>My Groups</span>
            <span className="teacher-nav-count">{groups.length}</span>
          </button>
          <button className={`teacher-nav-item ${tab === "assignments" ? "active" : ""}`} onClick={() => setTab("assignments")}>
            <ion-icon name="document-text-outline"></ion-icon>
            <span>Assignments</span>
            <span className="teacher-nav-count">{assignments.length}</span>
          </button>
          <hr className="teacher-nav-divider" />
          <button className={`teacher-nav-item teacher-nav-action ${tab === "create-group" ? "active" : ""}`} onClick={() => setTab("create-group")}>
            <ion-icon name="add-circle-outline"></ion-icon>
            <span>New Group</span>
          </button>
          <button className={`teacher-nav-item teacher-nav-action ${tab === "create-assignment" ? "active" : ""}`} onClick={() => setTab("create-assignment")}>
            <ion-icon name="create-outline"></ion-icon>
            <span>New Assignment</span>
          </button>
        </nav>

        <div className="teacher-sidebar-footer">
          <Link href="/app" className="teacher-nav-item">
            <ion-icon name="arrow-back-outline"></ion-icon>
            <span>Back to App</span>
          </Link>
        </div>
      </aside>

      {/* Main */}
      <main className="teacher-main">
        {/* Alerts */}
        {error && (
          <div className="teacher-alert teacher-alert-error">
            <ion-icon name="alert-circle-outline"></ion-icon>
            <span>{error}</span>
            <button onClick={() => setError(null)}>×</button>
          </div>
        )}
        {success && (
          <div className="teacher-alert teacher-alert-success">
            <ion-icon name="checkmark-circle-outline"></ion-icon>
            <span>{success}</span>
            <button onClick={() => setSuccess(null)}>×</button>
          </div>
        )}

        {/* Groups Tab */}
        {tab === "groups" && (
          <div className="teacher-section">
            <div className="teacher-section-header">
              <h1>My Groups</h1>
              <button className="teacher-btn teacher-btn-primary" onClick={() => setTab("create-group")}>
                <ion-icon name="add-outline"></ion-icon> New Group
              </button>
            </div>

            {groups.length === 0 ? (
              <div className="teacher-empty">
                <ion-icon name="people-outline" style={{ fontSize: "48px", opacity: 0.3 }}></ion-icon>
                <h3>No groups yet</h3>
                <p>Create your first group and invite students with a join code.</p>
                <button className="teacher-btn teacher-btn-primary" onClick={() => setTab("create-group")}>
                  Create Group
                </button>
              </div>
            ) : (
              <div className="teacher-grid">
                {groups.map(group => (
                  <div key={group.id} className="teacher-card" style={{ borderTop: `3px solid ${group.color}` }}>
                    <div className="teacher-card-header">
                      <h3>{group.name}</h3>
                      <button className="teacher-btn-icon" onClick={() => deleteGroup(group.id)} title="Delete group">
                        <ion-icon name="trash-outline"></ion-icon>
                      </button>
                    </div>
                    {group.description && <p className="teacher-card-desc">{group.description}</p>}
                    <div className="teacher-card-stats">
                      <div className="teacher-stat">
                        <ion-icon name="people-outline"></ion-icon>
                        <span>{group.member_count} members</span>
                      </div>
                      <div className="teacher-stat">
                        <ion-icon name="document-text-outline"></ion-icon>
                        <span>{group.assignment_count} assignments</span>
                      </div>
                    </div>
                    <div className="teacher-card-footer">
                      <div className="teacher-join-code">
                        <span className="teacher-join-label">Join Code:</span>
                        <code>{group.join_code}</code>
                        <button className="teacher-btn-icon" onClick={() => copyJoinCode(group.join_code)} title="Copy">
                          <ion-icon name="copy-outline"></ion-icon>
                        </button>
                      </div>
                      <Link href={`/teacher/groups/${group.id}`} className="teacher-btn teacher-btn-outline">
                        View Details
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Assignments Tab */}
        {tab === "assignments" && (
          <div className="teacher-section">
            <div className="teacher-section-header">
              <h1>Assignments</h1>
              <button className="teacher-btn teacher-btn-primary" onClick={() => setTab("create-assignment")}>
                <ion-icon name="add-outline"></ion-icon> New Assignment
              </button>
            </div>

            {assignments.length === 0 ? (
              <div className="teacher-empty">
                <ion-icon name="document-text-outline" style={{ fontSize: "48px", opacity: 0.3 }}></ion-icon>
                <h3>No assignments yet</h3>
                <p>Create assignments and assign decks to your groups.</p>
                <button className="teacher-btn teacher-btn-primary" onClick={() => setTab("create-assignment")}>
                  Create Assignment
                </button>
              </div>
            ) : (
              <div className="teacher-assignments-list">
                {assignments.map(assignment => {
                  const deadline = assignment.deadline ? new Date(assignment.deadline) : null;
                  const isOverdue = deadline && deadline < new Date();
                  const progress = assignment.progress_summary;
                  const completionRate = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;

                  return (
                    <div key={assignment.id} className="teacher-assignment-card">
                      <div className="teacher-assignment-header">
                        <div>
                          <h3>{assignment.title}</h3>
                          <div className="teacher-assignment-meta">
                            <span className="teacher-group-tag" style={{ background: assignment.groups?.color || "#6366F1" }}>
                              {assignment.groups?.name}
                            </span>
                            {deadline && (
                              <span className={`teacher-deadline ${isOverdue ? "overdue" : ""}`}>
                                <ion-icon name="time-outline"></ion-icon>
                                {deadline.toLocaleDateString()}
                              </span>
                            )}
                            <span className="teacher-xp-badge">+{assignment.xp_reward} XP</span>
                          </div>
                        </div>
                        <div className="teacher-assignment-actions">
                          <Link href={`/teacher/assignments/${assignment.id}`} className="teacher-btn teacher-btn-outline teacher-btn-sm">
                            Details
                          </Link>
                          <button className="teacher-btn-icon" onClick={() => deleteAssignment(assignment.id)}>
                            <ion-icon name="trash-outline"></ion-icon>
                          </button>
                        </div>
                      </div>

                      {assignment.description && <p className="teacher-assignment-desc">{assignment.description}</p>}

                      <div className="teacher-assignment-decks">
                        {assignment.assignment_decks?.map(d => (
                          <span key={d.id} className="teacher-deck-chip">
                            <ion-icon name="albums-outline"></ion-icon>
                            {d.deck_name} ({d.card_count} cards)
                          </span>
                        ))}
                      </div>

                      {/* Progress Bar */}
                      <div className="teacher-progress-section">
                        <div className="teacher-progress-header">
                          <span>Student Progress</span>
                          <span>{progress.completed}/{progress.total} completed ({completionRate}%)</span>
                        </div>
                        <div className="teacher-progress-bar">
                          <div className="teacher-progress-fill completed" style={{ width: `${(progress.completed / Math.max(progress.total, 1)) * 100}%` }}></div>
                          <div className="teacher-progress-fill in-progress" style={{ width: `${(progress.in_progress / Math.max(progress.total, 1)) * 100}%` }}></div>
                        </div>
                        <div className="teacher-progress-legend">
                          <span><span className="dot completed"></span> Completed: {progress.completed}</span>
                          <span><span className="dot in-progress"></span> In Progress: {progress.in_progress}</span>
                          <span><span className="dot pending"></span> Pending: {progress.pending}</span>
                          {progress.avg_accuracy > 0 && <span>Avg Accuracy: {progress.avg_accuracy}%</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Create Group Tab */}
        {tab === "create-group" && (
          <div className="teacher-section">
            <div className="teacher-section-header">
              <h1>Create New Group</h1>
            </div>
            <form onSubmit={handleCreateGroup} className="teacher-form">
              <div className="teacher-field">
                <label>Group Name *</label>
                <input
                  type="text"
                  value={groupName}
                  onChange={e => setGroupName(e.target.value)}
                  placeholder="e.g., English Vocabulary - Grade 10"
                  required
                  maxLength={100}
                />
              </div>
              <div className="teacher-field">
                <label>Description</label>
                <textarea
                  value={groupDesc}
                  onChange={e => setGroupDesc(e.target.value)}
                  placeholder="A brief description of this group..."
                  rows={3}
                  maxLength={500}
                />
              </div>
              <div className="teacher-field">
                <label>Color</label>
                <div className="teacher-color-picker">
                  {colors.map(c => (
                    <button
                      key={c}
                      type="button"
                      className={`teacher-color-swatch ${groupColor === c ? "selected" : ""}`}
                      style={{ background: c }}
                      onClick={() => setGroupColor(c)}
                    />
                  ))}
                </div>
              </div>
              <div className="teacher-form-actions">
                <button type="button" className="teacher-btn teacher-btn-outline" onClick={() => setTab("groups")}>
                  Cancel
                </button>
                <button type="submit" className="teacher-btn teacher-btn-primary" disabled={submitting}>
                  {submitting ? "Creating..." : "Create Group"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Create Assignment Tab */}
        {tab === "create-assignment" && (
          <div className="teacher-section">
            <div className="teacher-section-header">
              <h1>Create New Assignment</h1>
            </div>

            {groups.length === 0 ? (
              <div className="teacher-empty">
                <p>You need at least one group to create an assignment.</p>
                <button className="teacher-btn teacher-btn-primary" onClick={() => setTab("create-group")}>
                  Create a Group First
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateAssignment} className="teacher-form">
                <div className="teacher-field">
                  <label>Group *</label>
                  <select
                    value={assignGroupId}
                    onChange={e => setAssignGroupId(e.target.value)}
                    required
                  >
                    <option value="">Select a group...</option>
                    {groups.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
                <div className="teacher-field">
                  <label>Assignment Title *</label>
                  <input
                    type="text"
                    value={assignTitle}
                    onChange={e => setAssignTitle(e.target.value)}
                    placeholder="e.g., Unit 5 Vocabulary"
                    required
                    maxLength={200}
                  />
                </div>
                <div className="teacher-field">
                  <label>Description</label>
                  <textarea
                    value={assignDesc}
                    onChange={e => setAssignDesc(e.target.value)}
                    placeholder="Instructions for students..."
                    rows={3}
                    maxLength={1000}
                  />
                </div>
                <div className="teacher-form-row">
                  <div className="teacher-field">
                    <label>Deadline</label>
                    <input
                      type="datetime-local"
                      value={assignDeadline}
                      onChange={e => setAssignDeadline(e.target.value)}
                      min={new Date().toISOString().slice(0, 16)}
                    />
                  </div>
                  <div className="teacher-field">
                    <label>XP Reward</label>
                    <input
                      type="number"
                      value={assignXP}
                      onChange={e => setAssignXP(Number(e.target.value))}
                      min={1}
                      max={100}
                    />
                  </div>
                </div>
                <div className="teacher-field">
                  <label>Select Decks *</label>
                  <p className="teacher-field-hint">Choose which decks to assign. Students will receive copies of these cards.</p>
                  {myDecks.length === 0 ? (
                    <p className="teacher-field-hint">No decks found. Create some flashcard decks first in the main app.</p>
                  ) : (
                    <div className="teacher-deck-select">
                      {myDecks.map(deck => (
                        <label key={deck.id} className={`teacher-deck-option ${selectedDeckIds.includes(deck.id) ? "selected" : ""}`}>
                          <input
                            type="checkbox"
                            checked={selectedDeckIds.includes(deck.id)}
                            onChange={e => {
                              if (e.target.checked) {
                                setSelectedDeckIds([...selectedDeckIds, deck.id]);
                              } else {
                                setSelectedDeckIds(selectedDeckIds.filter(id => id !== deck.id));
                              }
                            }}
                          />
                          <div>
                            <span className="teacher-deck-name">{deck.name}</span>
                            <span className="teacher-deck-count">{deck.card_count || 0} cards</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <div className="teacher-form-actions">
                  <button type="button" className="teacher-btn teacher-btn-outline" onClick={() => setTab("assignments")}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="teacher-btn teacher-btn-primary"
                    disabled={submitting || selectedDeckIds.length === 0}
                  >
                    {submitting ? "Creating..." : "Create Assignment"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
