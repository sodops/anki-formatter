"use client";

import { useAuth } from "@/components/AuthProvider";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface AssignmentWithProgress {
  id: string;
  title: string;
  description: string | null;
  deadline: string | null;
  xp_reward: number;
  groups: { id: string; name: string; color: string } | null;
  assignment_decks: { id: string; deck_name: string; card_count: number; source_deck_id: string }[];
  my_progress: {
    status: string;
    cards_total: number;
    cards_studied: number;
    cards_mastered: number;
    accuracy: number;
    total_reviews: number;
    xp_earned: number;
    last_studied_at: string | null;
  } | null;
}

interface XPData {
  total_xp: number;
  today_xp: number;
  level: number;
  xp_in_level: number;
  xp_to_next_level: number;
  current_streak: number;
  longest_streak: number;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  is_read: boolean;
  created_at: string;
}

interface Group {
  id: string;
  name: string;
  color: string;
  member_count: number;
  assignment_count: number;
  joined_at: string;
}

export default function StudentDashboard() {
  const { user, loading: authLoading, role } = useAuth();
  const [assignments, setAssignments] = useState<AssignmentWithProgress[]>([]);
  const [xpData, setXPData] = useState<XPData | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinSuccess, setJoinSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"assignments" | "groups" | "xp" | "notifications">("assignments");

  const fetchData = useCallback(async () => {
    try {
      const [assignRes, xpRes, notifRes, groupRes] = await Promise.all([
        fetch("/api/assignments"),
        fetch("/api/xp"),
        fetch("/api/notifications?limit=20"),
        fetch("/api/groups"),
      ]);

      if (assignRes.ok) {
        const data = await assignRes.json();
        setAssignments(data.assignments || []);
      }
      if (xpRes.ok) {
        const data = await xpRes.json();
        setXPData(data);
      }
      if (notifRes.ok) {
        const data = await notifRes.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unread_count || 0);
      }
      if (groupRes.ok) {
        const data = await groupRes.json();
        setGroups(data.groups || []);
      }
    } catch {
      // error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) fetchData();
  }, [authLoading, user, fetchData]);

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError(null);
    setJoinSuccess(null);

    try {
      const res = await fetch("/api/groups/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ join_code: joinCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setJoinSuccess(`Joined "${data.group.name}" successfully!`);
      setJoinCode("");
      fetchData();
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : "Failed to join group");
    }
  };

  const markAllRead = async () => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  if (authLoading || loading) {
    return (
      <div className="student-loading">
        <div className="student-spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  const pendingAssignments = assignments.filter(a => a.my_progress?.status === "pending" || !a.my_progress);
  const activeAssignments = assignments.filter(a => a.my_progress?.status === "in_progress");
  const completedAssignments = assignments.filter(a => a.my_progress?.status === "completed");
  const overdueAssignments = assignments.filter(a => {
    if (!a.deadline) return false;
    return new Date(a.deadline) < new Date() && a.my_progress?.status !== "completed";
  });

  return (
    <div className="student-dashboard">
      {/* Top Bar */}
      <div className="student-topbar">
        <div className="student-topbar-left">
          <Link href="/app" className="student-back">
            <ion-icon name="arrow-back-outline"></ion-icon> Back to App
          </Link>
          <h1>My Learning Hub</h1>
        </div>
        <div className="student-topbar-right">
          {xpData && (
            <div className="student-xp-pill">
              <span className="student-xp-icon">⚡</span>
              <span className="student-xp-amount">{xpData.total_xp} XP</span>
              <span className="student-level-badge">Lv.{xpData.level}</span>
            </div>
          )}
          {xpData && xpData.current_streak > 0 && (
            <div className="student-streak-pill">
              🔥 {xpData.current_streak} day streak
            </div>
          )}
          <button
            className={`student-notif-btn ${unreadCount > 0 ? "has-unread" : ""}`}
            onClick={() => setActiveTab("notifications")}
          >
            <ion-icon name="notifications-outline"></ion-icon>
            {unreadCount > 0 && <span className="student-notif-badge">{unreadCount}</span>}
          </button>
        </div>
      </div>

      {/* Tab Nav */}
      <div className="student-tabs">
        <button className={`student-tab ${activeTab === "assignments" ? "active" : ""}`} onClick={() => setActiveTab("assignments")}>
          <ion-icon name="document-text-outline"></ion-icon>
          Assignments
          {(pendingAssignments.length + activeAssignments.length) > 0 && (
            <span className="student-tab-count">{pendingAssignments.length + activeAssignments.length}</span>
          )}
        </button>
        <button className={`student-tab ${activeTab === "groups" ? "active" : ""}`} onClick={() => setActiveTab("groups")}>
          <ion-icon name="people-outline"></ion-icon>
          My Groups
          <span className="student-tab-count">{groups.length}</span>
        </button>
        <button className={`student-tab ${activeTab === "xp" ? "active" : ""}`} onClick={() => setActiveTab("xp")}>
          <ion-icon name="trophy-outline"></ion-icon>
          XP & Progress
        </button>
        <button className={`student-tab ${activeTab === "notifications" ? "active" : ""}`} onClick={() => setActiveTab("notifications")}>
          <ion-icon name="notifications-outline"></ion-icon>
          Notifications
          {unreadCount > 0 && <span className="student-tab-count">{unreadCount}</span>}
        </button>
      </div>

      {/* Content */}
      <div className="student-content">
        {/* Assignments Tab */}
        {activeTab === "assignments" && (
          <div>
            {/* Overdue Warning */}
            {overdueAssignments.length > 0 && (
              <div className="student-overdue-banner">
                <ion-icon name="warning-outline"></ion-icon>
                <span>You have {overdueAssignments.length} overdue assignment{overdueAssignments.length > 1 ? "s" : ""}!</span>
              </div>
            )}

            {assignments.length === 0 ? (
              <div className="student-empty">
                <ion-icon name="document-text-outline" style={{ fontSize: "48px", opacity: 0.3 }}></ion-icon>
                <h3>No assignments yet</h3>
                <p>Join a group to receive assignments from your teacher.</p>
                <button className="student-btn student-btn-primary" onClick={() => setActiveTab("groups")}>
                  Join a Group
                </button>
              </div>
            ) : (
              <>
                {/* Active / Pending */}
                {[...activeAssignments, ...pendingAssignments].length > 0 && (
                  <div className="student-assign-section">
                    <h2>📝 To Do ({activeAssignments.length + pendingAssignments.length})</h2>
                    <div className="student-assign-list">
                      {[...activeAssignments, ...pendingAssignments].map(a => (
                        <AssignmentCard key={a.id} assignment={a} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Completed */}
                {completedAssignments.length > 0 && (
                  <div className="student-assign-section">
                    <h2>✅ Completed ({completedAssignments.length})</h2>
                    <div className="student-assign-list">
                      {completedAssignments.map(a => (
                        <AssignmentCard key={a.id} assignment={a} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Groups Tab */}
        {activeTab === "groups" && (
          <div>
            {/* Join Group Form */}
            <div className="student-join-section">
              <h3>Join a Group</h3>
              <form onSubmit={handleJoinGroup} className="student-join-form">
                <input
                  type="text"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value)}
                  placeholder="Enter join code..."
                  required
                  maxLength={20}
                />
                <button type="submit" className="student-btn student-btn-primary">
                  Join
                </button>
              </form>
              {joinError && <p className="student-join-error">{joinError}</p>}
              {joinSuccess && <p className="student-join-success">{joinSuccess}</p>}
            </div>

            {groups.length === 0 ? (
              <div className="student-empty">
                <ion-icon name="people-outline" style={{ fontSize: "48px", opacity: 0.3 }}></ion-icon>
                <h3>No groups yet</h3>
                <p>Ask your teacher for a join code to get started.</p>
              </div>
            ) : (
              <div className="student-groups-grid">
                {groups.map(g => (
                  <div key={g.id} className="student-group-card" style={{ borderTop: `3px solid ${g.color || "#6366F1"}` }}>
                    <h3>{g.name}</h3>
                    <div className="student-group-stats">
                      <span><ion-icon name="people-outline"></ion-icon> {g.member_count} members</span>
                      <span><ion-icon name="document-text-outline"></ion-icon> {g.assignment_count} assignments</span>
                    </div>
                    <div className="student-group-joined">
                      Joined {new Date(g.joined_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* XP Tab */}
        {activeTab === "xp" && xpData && (
          <div>
            <div className="student-xp-overview">
              <div className="student-xp-card student-xp-card-main">
                <div className="student-xp-level-circle">
                  <div className="student-xp-level-number">{xpData.level}</div>
                  <div className="student-xp-level-label">Level</div>
                </div>
                <div className="student-xp-details">
                  <h2>{xpData.total_xp} XP Total</h2>
                  <div className="student-xp-bar-container">
                    <div className="student-xp-bar">
                      <div className="student-xp-bar-fill" style={{ width: `${(xpData.xp_in_level / 100) * 100}%` }}></div>
                    </div>
                    <span>{xpData.xp_in_level}/100 to next level</span>
                  </div>
                </div>
              </div>

              <div className="student-xp-stats">
                <div className="student-xp-stat">
                  <div className="student-xp-stat-value">⚡ {xpData.today_xp}</div>
                  <div className="student-xp-stat-label">XP Today</div>
                </div>
                <div className="student-xp-stat">
                  <div className="student-xp-stat-value">🔥 {xpData.current_streak}</div>
                  <div className="student-xp-stat-label">Current Streak</div>
                </div>
                <div className="student-xp-stat">
                  <div className="student-xp-stat-value">🏆 {xpData.longest_streak}</div>
                  <div className="student-xp-stat-label">Longest Streak</div>
                </div>
                <div className="student-xp-stat">
                  <div className="student-xp-stat-value">✅ {completedAssignments.length}</div>
                  <div className="student-xp-stat-label">Completed</div>
                </div>
              </div>
            </div>

            {/* How to earn XP */}
            <div className="student-xp-guide">
              <h3>How to Earn XP</h3>
              <div className="student-xp-guide-list">
                <div className="student-xp-guide-item">
                  <span className="student-xp-guide-icon">📖</span>
                  <div>
                    <strong>Review Cards</strong>
                    <span>+1 XP per card reviewed</span>
                  </div>
                </div>
                <div className="student-xp-guide-item">
                  <span className="student-xp-guide-icon">✅</span>
                  <div>
                    <strong>Complete Assignment</strong>
                    <span>+10–50 XP based on difficulty</span>
                  </div>
                </div>
                <div className="student-xp-guide-item">
                  <span className="student-xp-guide-icon">🔥</span>
                  <div>
                    <strong>Daily Streak</strong>
                    <span>+5 XP bonus for maintaining streak</span>
                  </div>
                </div>
                <div className="student-xp-guide-item">
                  <span className="student-xp-guide-icon">💯</span>
                  <div>
                    <strong>Perfect Score</strong>
                    <span>+10 XP for 100% accuracy in a session</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === "notifications" && (
          <div>
            <div className="student-section-header">
              <h2>Notifications</h2>
              {unreadCount > 0 && (
                <button className="student-btn student-btn-outline student-btn-sm" onClick={markAllRead}>
                  Mark all as read
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className="student-empty">
                <ion-icon name="notifications-outline" style={{ fontSize: "48px", opacity: 0.3 }}></ion-icon>
                <h3>No notifications</h3>
                <p>You&apos;ll see assignment updates and achievements here.</p>
              </div>
            ) : (
              <div className="student-notif-list">
                {notifications.map(n => (
                  <div key={n.id} className={`student-notif-item ${!n.is_read ? "unread" : ""}`}>
                    <div className="student-notif-icon">
                      {n.type === "assignment_new" && "📝"}
                      {n.type === "assignment_deadline" && "⏰"}
                      {n.type === "assignment_graded" && "✅"}
                      {n.type === "group_invite" && "👥"}
                      {n.type === "xp_earned" && "⚡"}
                      {n.type === "streak_milestone" && "🔥"}
                      {n.type === "system" && "ℹ️"}
                    </div>
                    <div className="student-notif-content">
                      <strong>{n.title}</strong>
                      {n.message && <p>{n.message}</p>}
                      <span className="student-notif-time">
                        {new Date(n.created_at).toLocaleDateString()} {new Date(n.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Assignment Card Component
function AssignmentCard({ assignment }: { assignment: AssignmentWithProgress }) {
  const progress = assignment.my_progress;
  const deadline = assignment.deadline ? new Date(assignment.deadline) : null;
  const isOverdue = deadline && deadline < new Date() && progress?.status !== "completed";
  const progressPct = progress && progress.cards_total > 0
    ? Math.round((progress.cards_studied / progress.cards_total) * 100)
    : 0;
  const totalCards = assignment.assignment_decks?.reduce((s, d) => s + d.card_count, 0) || 0;

  return (
    <div className={`student-assign-card ${isOverdue ? "overdue" : ""} ${progress?.status === "completed" ? "completed" : ""}`}>
      <div className="student-assign-header">
        <div>
          <h3>{assignment.title}</h3>
          <div className="student-assign-meta">
            {assignment.groups && (
              <span className="student-group-tag" style={{ background: assignment.groups.color || "#6366F1" }}>
                {assignment.groups.name}
              </span>
            )}
            {deadline && (
              <span className={`student-deadline ${isOverdue ? "overdue" : ""}`}>
                <ion-icon name="time-outline"></ion-icon>
                {isOverdue ? "Overdue" : `Due ${deadline.toLocaleDateString()}`}
              </span>
            )}
            <span className="student-xp-tag">+{assignment.xp_reward} XP</span>
          </div>
        </div>
        <span className={`student-status-badge status-${progress?.status || "pending"}`}>
          {(progress?.status || "pending").replace("_", " ")}
        </span>
      </div>

      {assignment.description && <p className="student-assign-desc">{assignment.description}</p>}

      <div className="student-assign-decks">
        {assignment.assignment_decks?.map(d => (
          <span key={d.id} className="student-deck-chip">
            📚 {d.deck_name} ({d.card_count})
          </span>
        ))}
      </div>

      {/* Progress */}
      <div className="student-assign-progress">
        <div className="student-progress-info">
          <span>{progress?.cards_studied || 0}/{totalCards} cards studied</span>
          <span>{progressPct}%</span>
        </div>
        <div className="student-progress-bar">
          <div className="student-progress-fill" style={{ width: `${progressPct}%` }}></div>
        </div>
        {progress?.accuracy ? (
          <div className="student-progress-stats">
            <span>Accuracy: {Math.round(progress.accuracy)}%</span>
            <span>Reviews: {progress.total_reviews}</span>
            {progress.xp_earned > 0 && <span>XP earned: +{progress.xp_earned}</span>}
          </div>
        ) : null}
      </div>

      {progress?.status !== "completed" && (
        <Link href="/app" className="student-btn student-btn-primary student-btn-study">
          <ion-icon name="play-outline"></ion-icon>
          {progress?.status === "in_progress" ? "Continue Studying" : "Start Studying"}
        </Link>
      )}
    </div>
  );
}
