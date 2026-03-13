"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";
import { Assignment, Deck, Group, COLORS, TeacherTab } from "./_components/types";
import OverviewTab from "./_components/OverviewTab";
import GroupsTab from "./_components/GroupsTab";
import AssignmentsTab from "./_components/AssignmentsTab";
import CreateGroupTab from "./_components/CreateGroupTab";
import CreateAssignmentTab from "./_components/CreateAssignmentTab";
import StatisticsTab from "./_components/StatisticsTab";
import InboxTab from "./_components/InboxTab";
import ProfileTab from "./_components/ProfileTab";
import SettingsTab from "./_components/SettingsTab";

export default function TeacherPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
            background: "#0f0f14",
            color: "#fff",
          }}
        >
          <div className="t-spinner" />
        </div>
      }
    >
      <TeacherDashboard />
    </Suspense>
  );
}

function TeacherDashboard() {
  const { user, loading, role, signOut } = useAuth();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<TeacherTab>("overview");
  const [groups, setGroups] = useState<Group[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Create group form
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");
  const [groupColor, setGroupColor] = useState(COLORS[0]);

  // Create assignment form
  const [assignGroup, setAssignGroup] = useState("");
  const [assignTitle, setAssignTitle] = useState("");
  const [assignDesc, setAssignDesc] = useState("");
  const [assignDeadline, setAssignDeadline] = useState("");
  const [assignXP, setAssignXP] = useState(50);
  const [assignDecks, setAssignDecks] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Statistics state
  const [teacherStats, setTeacherStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Profile state
  const [profileData, setProfileData] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [editNickname, setEditNickname] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Settings state (persisted to localStorage)
  const [settings, setSettings] = useState({
    dailyGoal: 20,
    newCardsPerDay: 20,
    maxReviews: 100,
    cardFontSize: 32,
    tts: true,
    soundEffects: false,
    studyReminders: true,
    assignmentUpdates: true,
    algorithm: "sm-2",
  });

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("ankiflow-teacher-settings");
      if (saved) setSettings((prev) => ({ ...prev, ...JSON.parse(saved) }));
    } catch {}
  }, []);

  const updateSetting = (key: string, value: any) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      try {
        localStorage.setItem("ankiflow-teacher-settings", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const switchTab = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setSidebarOpen(false);
  };

  // Copy join code handler
  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setSuccess("Join code copied!");
    setTimeout(() => setSuccess(""), 2000);
  };

  const copyJoinLink = (code: string) => {
    const link = `${window.location.origin}/join?code=${code}`;
    navigator.clipboard.writeText(link);
    setSuccess("Invite link copied!");
    setTimeout(() => setSuccess(""), 2000);
  };

  const fetchData = useCallback(async () => {
    try {
      const [groupsRes, assignRes, syncRes] = await Promise.all([
        fetch("/api/groups"),
        fetch("/api/assignments"),
        fetch("/api/sync"),
      ]);

      if (groupsRes.ok) {
        const gd = await groupsRes.json();
        setGroups(gd.groups || []);
      }
      if (assignRes.ok) {
        const ad = await assignRes.json();
        setAssignments(ad.assignments || []);
      }
      if (syncRes.ok) {
        const sd = await syncRes.json();
        const allDecks = sd.state?.decks || sd.data?.decks || sd.decks || [];
        console.log("[Teacher] Sync response:", {
          type: sd.type,
          deckCount: allDecks.length,
          decks: allDecks.slice(0, 3),
        });
        // Deduplicate by deck ID and filter out empty/deleted decks
        const seen = new Set<string>();
        const uniqueDecks: Deck[] = [];
        for (const d of allDecks) {
          if (d.id && !seen.has(d.id) && !d.isDeleted) {
            seen.add(d.id);
            uniqueDecks.push({
              id: d.id,
              name: d.name,
              cards_count: d.cards?.length || d.cards_count || 0,
            });
          }
        }
        setDecks(uniqueDecks);
      } else {
        console.error("[Teacher] Sync failed:", syncRes.status, await syncRes.text());
      }
    } catch {
      setError("Failed to load data");
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && user && (role === "teacher" || role === "admin")) {
      fetchData();
    }
  }, [loading, user, role, fetchData]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: groupName, description: groupDesc, color: groupColor }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      setSuccess("Group created successfully!");
      setTimeout(() => setSuccess(""), 3000);
      setGroupName("");
      setGroupDesc("");
      setGroupColor(COLORS[0]);
      setActiveTab("groups");
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignTitle.trim() || !assignGroup) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          group_id: assignGroup,
          title: assignTitle,
          description: assignDesc,
          deadline: assignDeadline || null,
          xp_reward: assignXP,
          deck_ids: assignDecks,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      setSuccess("Assignment created!");
      setTimeout(() => setSuccess(""), 3000);
      setAssignTitle("");
      setAssignDesc("");
      setAssignDeadline("");
      setAssignXP(50);
      setAssignDecks([]);
      setActiveTab("assignments");
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteGroup = async (id: string) => {
    setConfirmModal({
      message: "Delete this group? All assignments and progress will be lost.",
      onConfirm: async () => {
        try {
          await fetch(`/api/groups/${id}`, { method: "DELETE" });
          setSuccess("Group deleted");
          setTimeout(() => setSuccess(""), 2000);
          fetchData();
        } catch {}
      },
    });
  };

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const res = await fetch("/api/teacher/stats");
      if (res.ok) {
        const data = await res.json();
        setTeacherStats(data);
      }
    } catch {
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/profile");
      if (res.ok) {
        const data = await res.json();
        setProfileData(data.profile);
        setEditName(data.profile.display_name || "");
        setEditBio(data.profile.bio || "");
        setEditAvatar(data.profile.avatar_url || "");
        setEditNickname(data.profile.username || data.profile.nickname || "");
        setEditPhone(data.profile.phone || "");
      }
    } catch {}
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: editName,
          bio: editBio,
          avatar_url: editAvatar,
          username: editNickname,
          nickname: editNickname,
          phone: editPhone,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      setSuccess("Profile updated!");
      setTimeout(() => setSuccess(""), 2000);
      fetchProfile();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  // Inbox state
  const [inboxRequests, setInboxRequests] = useState<any[]>([]);
  const [inboxConnections, setInboxConnections] = useState<any[]>([]);
  const [inboxNotifications, setInboxNotifications] = useState<any[]>([]);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [inboxUnread, setInboxUnread] = useState(0);

  const fetchInbox = useCallback(async () => {
    setInboxLoading(true);
    try {
      const [connRes, notifRes] = await Promise.all([
        fetch("/api/connections").catch(() => null),
        fetch("/api/notifications").catch(() => null),
      ]);
      if (connRes?.ok) {
        const d = await connRes.json();
        setInboxRequests(d.pending_requests || []);
        setInboxConnections(d.connections || []);
      }
      if (notifRes?.ok) {
        const d = await notifRes.json();
        setInboxNotifications(d.notifications || []);
        setInboxUnread(d.unread_count || 0);
      }
    } catch {
    } finally {
      setInboxLoading(false);
    }
  }, []);

  const handleAcceptReject = async (connectionId: string, action: "accept" | "reject") => {
    try {
      const res = await fetch("/api/connections", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connection_id: connectionId, action }),
      });
      if (!res.ok) throw new Error("Failed");
      setSuccess(action === "accept" ? "Connection accepted!" : "Request declined");
      setTimeout(() => setSuccess(""), 2000);
      fetchInbox();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const markNotifRead = async (id: string) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      });
      setInboxNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      setInboxUnread((prev) => Math.max(0, prev - 1));
    } catch {}
  };

  const markAllNotifsRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      setInboxNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setInboxUnread(0);
    } catch {}
  };

  // Read query params on mount
  useEffect(() => {
    const tab = searchParams.get("tab");
    const group = searchParams.get("group");
    if (tab === "create") {
      setActiveTab("create-assignment");
      if (group) setAssignGroup(group);
    } else if (tab === "inbox") {
      setActiveTab("inbox");
    }
  }, [searchParams]);

  // Fetch stats/profile/inbox when tab changes
  useEffect(() => {
    if (activeTab === "statistics" && !teacherStats) fetchStats();
    if (activeTab === "profile") {
      if (!profileData) fetchProfile();
      if (!teacherStats) fetchStats();
    }
    if (activeTab === "inbox") fetchInbox();
  }, [activeTab]);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "#0f0f14",
          color: "#fff",
        }}
      >
        <div className="t-spinner" />
        <span style={{ marginTop: 12 }}>Loading...</span>
      </div>
    );
  }

  if (!user) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "#0f0f14",
          color: "#fff",
        }}
      >
        <span>Redirecting to login...</span>
      </div>
    );
  }

  // Role guard: only after loading is done (checked above), redirect non-teachers
  if (role !== "teacher" && role !== "admin") {
    if (typeof window !== "undefined") {
      window.location.href = "/student";
    }
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "#0f0f14",
          color: "#fff",
          gap: 12,
        }}
      >
        <div className="t-spinner" />
        <p style={{ color: "#94a3b8" }}>Redirecting to student dashboard...</p>
      </div>
    );
  }

  const totalStudents = groups.reduce((s, g) => s + (g.member_count - 1), 0);
  const activeAssignments = assignments.filter((a) => a.status === "active").length;
  const overdueCount = assignments.filter(
    (a) => a.deadline && new Date(a.deadline) < new Date() && a.status === "active"
  ).length;

  return (
    <div className="t-dashboard">
      {/* Mobile Header */}
      <div className="t-mobile-header">
        <button className="t-hamburger" onClick={() => setSidebarOpen(true)}>
          <ion-icon name="menu-outline"></ion-icon>
        </button>
        <span className="t-brand-icon">
          <ion-icon name="flash"></ion-icon>
        </span>
        <span className="t-brand-name">AnkiFlow</span>
        <span className="t-role-tag">Teacher</span>
      </div>

      {/* Mobile Overlay */}
      <div
        className={`t-overlay ${sidebarOpen ? "visible" : ""}`}
        onClick={() => setSidebarOpen(false)}
      ></div>

      {/* Sidebar */}
      <aside
        className={`t-sidebar ${sidebarOpen ? "open" : ""} ${sidebarCollapsed && !sidebarOpen ? "collapsed" : ""}`}
      >
        <div className="t-brand">
          <button
            className="t-sidebar-toggle"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title="Toggle sidebar"
          >
            <ion-icon
              name={sidebarCollapsed ? "chevron-forward-outline" : "chevron-back-outline"}
            ></ion-icon>
          </button>
          <span className="t-brand-icon">
            <ion-icon name="flash"></ion-icon>
          </span>
          <span className="t-brand-name">AnkiFlow</span>
          <span className="t-role-tag">Teacher</span>
        </div>

        <nav className="t-nav">
          <button
            className={`t-nav-item ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => switchTab("overview")}
          >
            <ion-icon name="grid-outline"></ion-icon>
            <span>Overview</span>
          </button>
          <button
            className={`t-nav-item ${activeTab === "groups" ? "active" : ""}`}
            onClick={() => switchTab("groups")}
          >
            <ion-icon name="people-outline"></ion-icon>
            <span>Groups</span>
            {groups.length > 0 && <span className="t-nav-count">{groups.length}</span>}
          </button>
          <button
            className={`t-nav-item ${activeTab === "assignments" ? "active" : ""}`}
            onClick={() => switchTab("assignments")}
          >
            <ion-icon name="document-text-outline"></ion-icon>
            <span>Assignments</span>
            {activeAssignments > 0 && <span className="t-nav-count">{activeAssignments}</span>}
          </button>
          <button
            className={`t-nav-item ${activeTab === "statistics" ? "active" : ""}`}
            onClick={() => switchTab("statistics")}
          >
            <ion-icon name="stats-chart-outline"></ion-icon>
            <span>Statistics</span>
          </button>
          <button
            className={`t-nav-item ${activeTab === "inbox" ? "active" : ""}`}
            onClick={() => switchTab("inbox")}
          >
            <ion-icon name="mail-outline"></ion-icon>
            <span>Inbox</span>
            {inboxRequests.length + inboxUnread > 0 && (
              <span className="t-nav-count t-nav-count-alert">
                {inboxRequests.length + inboxUnread}
              </span>
            )}
          </button>
        </nav>

        <div className="t-nav-divider"></div>

        <nav className="t-nav">
          <button
            className={`t-nav-item ${activeTab === "create-group" ? "active" : ""}`}
            onClick={() => switchTab("create-group")}
          >
            <ion-icon name="add-circle-outline"></ion-icon>
            <span>New Group</span>
          </button>
          <button
            className={`t-nav-item ${activeTab === "create-assignment" ? "active" : ""}`}
            onClick={() => switchTab("create-assignment")}
          >
            <ion-icon name="create-outline"></ion-icon>
            <span>New Assignment</span>
          </button>
        </nav>

        <div className="t-nav-divider"></div>

        <nav className="t-nav">
          <a href="/app/study" className="t-nav-item">
            <ion-icon name="flash-outline"></ion-icon>
            <span>Flashcards</span>
          </a>
          <button
            className={`t-nav-item ${activeTab === "profile" ? "active" : ""}`}
            onClick={() => switchTab("profile")}
          >
            <ion-icon name="person-outline"></ion-icon>
            <span>My Profile</span>
          </button>
          <button
            className={`t-nav-item ${activeTab === "settings" ? "active" : ""}`}
            onClick={() => switchTab("settings")}
          >
            <ion-icon name="settings-outline"></ion-icon>
            <span>Settings</span>
          </button>
          {role === "admin" && (
            <a href="/admin/dashboard" className="t-nav-item">
              <ion-icon name="settings-outline"></ion-icon>
              <span>Admin Panel</span>
            </a>
          )}
        </nav>

        <div className="t-sidebar-footer">
          <div className="t-user-info">
            <div className="t-user-avatar">
              {user.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} alt="" />
              ) : (
                <span>
                  {(user.user_metadata?.full_name || user.email || "T").charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="t-user-details">
              <div className="t-user-name">
                {user.user_metadata?.full_name || user.email?.split("@")[0] || "Teacher"}
              </div>
              <div className="t-user-email">{user.email}</div>
            </div>
          </div>
          <button className="t-logout-btn" onClick={signOut} title="Sign out">
            <ion-icon name="log-out-outline"></ion-icon>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="t-main">
        {/* Alerts */}
        {error && (
          <div className="t-alert t-alert-error">
            <ion-icon name="alert-circle"></ion-icon>
            <span>{error}</span>
            <button onClick={() => setError("")}>×</button>
          </div>
        )}
        {success && (
          <div className="t-alert t-alert-success">
            <ion-icon name="checkmark-circle"></ion-icon>
            <span>{success}</span>
            <button onClick={() => setSuccess("")}>×</button>
          </div>
        )}

        {loadingData ? (
          <div className="t-loading-content">
            <div className="t-spinner" />
            <span>Loading your data...</span>
          </div>
        ) : (
          <>
            {activeTab === "overview" && (
              <OverviewTab
                user={user}
                groups={groups}
                assignments={assignments}
                totalStudents={totalStudents}
                activeAssignments={activeAssignments}
                overdueCount={overdueCount}
                setActiveTab={setActiveTab}
                copyCode={copyCode}
                copyJoinLink={copyJoinLink}
              />
            )}

            {activeTab === "groups" && (
              <GroupsTab
                groups={groups}
                totalStudents={totalStudents}
                setActiveTab={setActiveTab}
                copyCode={copyCode}
                copyJoinLink={copyJoinLink}
                handleDeleteGroup={handleDeleteGroup}
              />
            )}

            {activeTab === "assignments" && (
              <AssignmentsTab
                assignments={assignments}
                activeAssignments={activeAssignments}
                setActiveTab={setActiveTab}
              />
            )}

            {activeTab === "create-group" && (
              <CreateGroupTab
                groupName={groupName}
                setGroupName={setGroupName}
                groupDesc={groupDesc}
                setGroupDesc={setGroupDesc}
                groupColor={groupColor}
                setGroupColor={setGroupColor}
                submitting={submitting}
                handleCreateGroup={handleCreateGroup}
              />
            )}

            {activeTab === "create-assignment" && (
              <CreateAssignmentTab
                groups={groups}
                decks={decks}
                assignGroup={assignGroup}
                assignTitle={assignTitle}
                assignDesc={assignDesc}
                assignDeadline={assignDeadline}
                assignXP={assignXP}
                assignDecks={assignDecks}
                setAssignGroup={setAssignGroup}
                setAssignTitle={setAssignTitle}
                setAssignDesc={setAssignDesc}
                setAssignDeadline={setAssignDeadline}
                setAssignXP={setAssignXP}
                setAssignDecks={setAssignDecks}
                handleCreateAssignment={handleCreateAssignment}
                submitting={submitting}
                setActiveTab={setActiveTab}
              />
            )}

            {activeTab === "statistics" && (
              <StatisticsTab
                teacherStats={teacherStats}
                statsLoading={statsLoading}
                fetchStats={fetchStats}
              />
            )}

            {activeTab === "inbox" && (
              <InboxTab
                inboxUnread={inboxUnread}
                inboxLoading={inboxLoading}
                inboxRequests={inboxRequests}
                inboxConnections={inboxConnections}
                inboxNotifications={inboxNotifications}
                markAllNotifsRead={markAllNotifsRead}
                handleAcceptReject={handleAcceptReject}
                markNotifRead={markNotifRead}
              />
            )}

            {activeTab === "profile" && (
              <ProfileTab
                user={user}
                role={role}
                editAvatar={editAvatar}
                editName={editName}
                editNickname={editNickname}
                editBio={editBio}
                editPhone={editPhone}
                profileData={profileData}
                groupsCount={groups.length}
                totalStudents={totalStudents}
                assignmentsCount={assignments.length}
                teacherStats={teacherStats}
                statsLoading={statsLoading}
                fetchStats={fetchStats}
                setActiveTab={setActiveTab}
              />
            )}

            {activeTab === "settings" && (
              <SettingsTab
                user={user}
                role={role}
                signOut={signOut}
                saveProfile={saveProfile}
                savingProfile={savingProfile}
                editName={editName}
                editNickname={editNickname}
                editBio={editBio}
                editPhone={editPhone}
                editAvatar={editAvatar}
                setEditName={setEditName}
                setEditNickname={setEditNickname}
                setEditBio={setEditBio}
                setEditPhone={setEditPhone}
                setEditAvatar={setEditAvatar}
                settings={settings}
                updateSetting={updateSetting}
              />
            )}
          </>
        )}
      </main>

      {/* Confirm Modal */}
      {confirmModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10002,
          }}
          onClick={() => setConfirmModal(null)}
        >
          <div
            style={{
              background: "var(--card-bg, #1a1a2e)",
              borderRadius: 16,
              padding: 24,
              maxWidth: 400,
              width: "90%",
              boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 12px", fontSize: 18, color: "var(--text, #fff)" }}>
              Confirm
            </h3>
            <p
              style={{
                margin: "0 0 20px",
                fontSize: 14,
                color: "var(--text-secondary, #9ca3af)",
                lineHeight: 1.5,
              }}
            >
              {confirmModal.message}
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => setConfirmModal(null)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "1px solid var(--border, #2a2a3a)",
                  background: "transparent",
                  color: "var(--text, #fff)",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(null);
                }}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "none",
                  background: "#EF4444",
                  color: "#fff",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Nav */}
      <nav className="t-bottom-nav">
        <button
          className={`t-bottom-nav-item ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          <ion-icon name="grid-outline"></ion-icon>
          <span>Home</span>
        </button>
        <button
          className={`t-bottom-nav-item ${activeTab === "groups" ? "active" : ""}`}
          onClick={() => setActiveTab("groups")}
        >
          <ion-icon name="people-outline"></ion-icon>
          <span>Groups</span>
        </button>
        <button
          className={`t-bottom-nav-item ${activeTab === "create-assignment" ? "active" : ""}`}
          onClick={() => setActiveTab("create-assignment")}
        >
          <ion-icon name="add-circle-outline"></ion-icon>
          <span>New Task</span>
        </button>
        <button
          className={`t-bottom-nav-item ${activeTab === "inbox" ? "active" : ""}`}
          onClick={() => setActiveTab("inbox")}
          style={{ position: "relative" }}
        >
          <ion-icon name="mail-outline"></ion-icon>
          <span>Inbox</span>
          {inboxRequests.length + inboxUnread > 0 && (
            <span
              style={{
                position: "absolute",
                top: 4,
                right: "50%",
                marginRight: -16,
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#EF4444",
              }}
            ></span>
          )}
        </button>
        <button
          className={`t-bottom-nav-item ${activeTab === "settings" ? "active" : ""}`}
          onClick={() => setActiveTab("settings")}
        >
          <ion-icon name="settings-outline"></ion-icon>
          <span>Settings</span>
        </button>
      </nav>
    </div>
  );
}
