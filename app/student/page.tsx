"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { Assignment, Group, Notification, StudentTab, XPData } from "./_components/types";
import DashboardTab from "./_components/DashboardTab";
import AssignmentsTab from "./_components/AssignmentsTab";
import GroupsTab from "./_components/GroupsTab";
import ProfileTab from "./_components/ProfileTab";
import InboxTab from "./_components/InboxTab";
import SettingsTab from "./_components/SettingsTab";

export default function StudentPage() {
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
          <div className="s-spinner" />
        </div>
      }
    >
      <StudentDashboard />
    </Suspense>
  );
}

function StudentDashboard() {
  const { user, loading, role, signOut } = useAuth();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<StudentTab>("dashboard");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [xp, setXP] = useState<XPData>({
    total_xp: 0,
    today_xp: 0,
    level: 1,
    xp_to_next: 100,
    current_streak: 0,
    longest_streak: 0,
    recent_events: [],
  });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingData, setLoadingData] = useState(true);
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joinSuccess, setJoinSuccess] = useState("");
  const [joiningGroup, setJoiningGroup] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);

  // Profile state
  const [profileData, setProfileData] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [editNickname, setEditNickname] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Settings state (persisted to localStorage)
  const [settings, setSettings] = useState({
    dailyGoal: 20,
    newCardsPerDay: 20,
    maxReviews: 100,
    cardFontSize: 32,
    tts: true,
    soundEffects: false,
    algorithm: "sm-2",
  });

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("ankiflow-student-settings");
      if (saved) setSettings((prev) => ({ ...prev, ...JSON.parse(saved) }));
    } catch {}
  }, []);

  const updateSetting = (key: string, value: any) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      try {
        localStorage.setItem("ankiflow-student-settings", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Inbox / connections state
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [myConnections, setMyConnections] = useState<any[]>([]);
  const [inboxLoading, setInboxLoading] = useState(false);

  // Modern toast/modal state (replaces native alert/confirm)
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    message: string;
    onConfirm: () => void;
    onCancel?: () => void;
  } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const showConfirm = (message: string, onConfirm: () => void) => {
    setConfirmModal({ message, onConfirm });
  };

  const handleCompleteAssignment = async (assignmentId: string, title: string) => {
    showConfirm(`Mark "${title}" as completed? You'll earn XP for this!`, async () => {
      await doCompleteAssignment(assignmentId);
    });
  };

  const doCompleteAssignment = async (assignmentId: string) => {
    setCompletingId(assignmentId);
    try {
      const res = await fetch(`/api/assignments/${assignmentId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to complete");

      // Update local state
      setAssignments((prev) =>
        prev.map((a) =>
          a.id === assignmentId
            ? {
                ...a,
                my_progress: {
                  ...(a.my_progress || {
                    cards_studied: 0,
                    cards_mastered: 0,
                    cards_total: 0,
                    accuracy: 0,
                    total_reviews: 0,
                    time_spent_seconds: 0,
                    xp_earned: 0,
                  }),
                  status: "completed",
                  xp_earned: data.xp_awarded || 0,
                },
              }
            : a
        )
      );

      // Refresh XP data
      const xRes = await fetch("/api/xp").catch(() => null);
      if (xRes?.ok) {
        const d = await xRes.json();
        setXP(d);
      }

      showToast(`Assignment completed! +${data.xp_awarded || 0} XP earned!`, "success");
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setCompletingId(null);
    }
  };

  const switchTab = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setSidebarOpen(false);
  };

  const fetchData = useCallback(async () => {
    try {
      const [aRes, gRes, xRes, nRes] = await Promise.all([
        fetch("/api/assignments").catch(() => null),
        fetch("/api/groups").catch(() => null),
        fetch("/api/xp").catch(() => null),
        fetch("/api/notifications").catch(() => null),
      ]);

      if (aRes?.ok) {
        const d = await aRes.json();
        setAssignments(d.assignments || []);
      }
      if (gRes?.ok) {
        const d = await gRes.json();
        setGroups(d.groups || []);
      }
      if (xRes?.ok) {
        const d = await xRes.json();
        setXP(d);
      }
      if (nRes?.ok) {
        const d = await nRes.json();
        setNotifications(d.notifications || []);
        setUnreadCount(d.unread_count || 0);
      }
    } catch {
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && user) fetchData();
  }, [loading, user, fetchData]);

  // Redirect teacher/admin to their dashboard (only after auth is fully loaded)
  useEffect(() => {
    if (!loading && user && (role === "teacher" || role === "admin")) {
      window.location.href = "/teacher";
    }
  }, [loading, user, role]);

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setJoiningGroup(true);
    setJoinError("");
    setJoinSuccess("");
    try {
      const res = await fetch("/api/groups/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ join_code: joinCode.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to join");
      setJoinSuccess(`Joined "${data.group?.name || "group"}" successfully!`);
      setJoinCode("");
      fetchData();
    } catch (err: any) {
      setJoinError(err.message);
    } finally {
      setJoiningGroup(false);
    }
  };

  const handleLeaveGroup = async (groupId: string, groupName: string) => {
    showConfirm(
      `Are you sure you want to leave "${groupName}"? You will lose access to assignments in this group.`,
      async () => {
        try {
          const res = await fetch(`/api/groups/${groupId}/members/${user?.id}`, {
            method: "DELETE",
          });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || "Failed to leave group");
          }
          setGroups((prev) => prev.filter((g) => g.id !== groupId));
          showToast(`Left "${groupName}"`, "info");
        } catch (err: any) {
          showToast(err.message, "error");
        }
      }
    );
  };

  const markAllRead = async () => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        setUnreadCount(0);
      }
    } catch {}
  };

  const markOneRead = async (id: string) => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch {}
  };

  const fetchInbox = useCallback(async () => {
    setInboxLoading(true);
    try {
      const res = await fetch("/api/connections").catch(() => null);
      if (res?.ok) {
        const d = await res.json();
        setPendingRequests(d.pending_requests || []);
        setMyConnections(d.connections || []);
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
      fetchInbox();
    } catch (err: any) {
      showToast(err.message, "error");
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
      showToast("Profile updated!", "success");
      fetchProfile();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSavingProfile(false);
    }
  };

  useEffect(() => {
    if (activeTab === "profile" && !profileData) fetchProfile();
    if (activeTab === "inbox") fetchInbox();
  }, [activeTab]);

  // Read query params on mount
  useEffect(() => {
    const tab = searchParams.get("tab");
    const validTabs: StudentTab[] = [
      "dashboard",
      "assignments",
      "groups",
      "inbox",
      "profile",
      "settings",
    ];
    if (tab && validTabs.includes(tab as StudentTab)) setActiveTab(tab as StudentTab);
  }, [searchParams]);

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
        <div className="s-spinner" />
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

  // Role guard: teacher on student page → redirect (loading is guaranteed false here)
  if (role === "teacher" || role === "admin") {
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
        <div className="s-spinner" />
        <p style={{ color: "#94a3b8" }}>Redirecting to teacher dashboard...</p>
      </div>
    );
  }

  const level = xp.level || Math.floor(xp.total_xp / 100) + 1;
  const xpInLevel = xp.total_xp % 100;
  const overdueAssignments = assignments.filter(
    (a) => a.deadline && new Date(a.deadline) < new Date() && a.my_progress?.status !== "completed"
  );
  const activeAssignments = assignments.filter(
    (a) => a.status === "active" && a.my_progress?.status !== "completed"
  );
  const completedAssignments = assignments.filter((a) => a.my_progress?.status === "completed");

  return (
    <div className="s-dashboard">
      {/* Mobile Header */}
      <div className="s-mobile-header">
        <button className="s-hamburger" onClick={() => setSidebarOpen(true)}>
          <ion-icon name="menu-outline"></ion-icon>
        </button>
        <ion-icon name="flash" className="s-brand-icon"></ion-icon>
        <span className="s-brand-name">AnkiFlow</span>
        <span className="s-role-tag">Student</span>
      </div>

      {/* Mobile Overlay */}
      <div
        className={`s-overlay ${sidebarOpen ? "visible" : ""}`}
        onClick={() => setSidebarOpen(false)}
      ></div>

      {/* Sidebar */}
      <aside
        className={`s-sidebar ${sidebarOpen ? "open" : ""} ${sidebarCollapsed && !sidebarOpen ? "collapsed" : ""}`}
      >
        <div className="s-brand">
          <button
            className="s-sidebar-toggle"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title="Toggle sidebar"
          >
            <ion-icon
              name={sidebarCollapsed ? "chevron-forward-outline" : "chevron-back-outline"}
            ></ion-icon>
          </button>
          <ion-icon name="flash" className="s-brand-icon"></ion-icon>
          <span className="s-brand-name">AnkiFlow</span>
          <span className="s-role-tag">Student</span>
        </div>

        {/* XP Summary in Sidebar */}
        <div className="s-xp-sidebar">
          <div className="s-level-circle">
            <span className="s-level-num">{level}</span>
          </div>
          <div className="s-xp-info">
            <div className="s-xp-total">{xp.total_xp} XP</div>
            <div className="s-xp-bar-mini">
              <div className="s-xp-bar-fill-mini" style={{ width: `${xpInLevel}%` }}></div>
            </div>
          </div>
          {xp.current_streak > 0 && (
            <div className="s-streak-mini">
              <ion-icon name="flame"></ion-icon> {xp.current_streak}
            </div>
          )}
        </div>

        <nav className="s-nav">
          <button
            className={`s-nav-item ${activeTab === "dashboard" ? "active" : ""}`}
            onClick={() => switchTab("dashboard")}
          >
            <ion-icon name="home-outline"></ion-icon>
            <span>Dashboard</span>
          </button>
          <button
            className={`s-nav-item ${activeTab === "assignments" ? "active" : ""}`}
            onClick={() => switchTab("assignments")}
          >
            <ion-icon name="document-text-outline"></ion-icon>
            <span>Assignments</span>
            {activeAssignments.length > 0 && (
              <span className="s-nav-count">{activeAssignments.length}</span>
            )}
          </button>
          <button
            className={`s-nav-item ${activeTab === "groups" ? "active" : ""}`}
            onClick={() => switchTab("groups")}
          >
            <ion-icon name="people-outline"></ion-icon>
            <span>My Groups</span>
            {groups.length > 0 && <span className="s-nav-count">{groups.length}</span>}
          </button>
          <button
            className={`s-nav-item ${activeTab === "inbox" ? "active" : ""}`}
            onClick={() => switchTab("inbox")}
          >
            <ion-icon name="mail-outline"></ion-icon>
            <span>Inbox</span>
            {unreadCount + pendingRequests.length > 0 && (
              <span className="s-nav-count s-nav-count-alert">
                {unreadCount + pendingRequests.length}
              </span>
            )}
          </button>
        </nav>

        <div className="s-nav-divider"></div>

        <nav className="s-nav">
          <a href="/app/study" className="s-nav-item">
            <ion-icon name="flash-outline"></ion-icon>
            <span>Flashcards</span>
          </a>
          <button
            className={`s-nav-item ${activeTab === "profile" ? "active" : ""}`}
            onClick={() => switchTab("profile")}
          >
            <ion-icon name="person-outline"></ion-icon>
            <span>My Profile</span>
          </button>
          <button
            className={`s-nav-item ${activeTab === "settings" ? "active" : ""}`}
            onClick={() => switchTab("settings")}
          >
            <ion-icon name="settings-outline"></ion-icon>
            <span>Settings</span>
          </button>
        </nav>

        <div className="s-sidebar-footer">
          <div className="s-user-info">
            <div className="s-user-avatar">
              {user.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} alt="" />
              ) : (
                <span>
                  {(user.user_metadata?.full_name || user.email || "S").charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="s-user-details">
              <div className="s-user-name">
                {user.user_metadata?.full_name || user.email?.split("@")[0] || "Student"}
              </div>
              <div className="s-user-email">{user.email}</div>
            </div>
          </div>
          <button className="s-logout-btn" onClick={signOut} title="Sign out">
            <ion-icon name="log-out-outline"></ion-icon>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="s-main">
        {loadingData ? (
          <div className="s-loading-content">
            <div className="s-spinner" />
            <span>Loading your data...</span>
          </div>
        ) : (
          <>
            {activeTab === "dashboard" && (
              <DashboardTab
                user={user}
                activeAssignments={activeAssignments}
                completedAssignments={completedAssignments}
                overdueAssignments={overdueAssignments}
                assignments={assignments}
                groups={groups}
                xp={xp}
                setActiveTab={setActiveTab}
                handleCompleteAssignment={handleCompleteAssignment}
                completingId={completingId}
              />
            )}

            {activeTab === "assignments" && (
              <AssignmentsTab
                assignments={assignments}
                activeAssignments={activeAssignments}
                completedAssignments={completedAssignments}
                overdueAssignments={overdueAssignments}
                handleCompleteAssignment={handleCompleteAssignment}
                completingId={completingId}
              />
            )}

            {activeTab === "groups" && (
              <GroupsTab
                groups={groups}
                joinCode={joinCode}
                setJoinCode={setJoinCode}
                handleJoinGroup={handleJoinGroup}
                joiningGroup={joiningGroup}
                joinError={joinError}
                joinSuccess={joinSuccess}
                handleLeaveGroup={handleLeaveGroup}
              />
            )}

            {activeTab === "profile" && (
              <ProfileTab
                user={user}
                editAvatar={editAvatar}
                editName={editName}
                editNickname={editNickname}
                editBio={editBio}
                editPhone={editPhone}
                profileData={profileData}
                level={level}
                xpInLevel={xpInLevel}
                xp={xp}
                assignments={assignments}
                groups={groups}
                completedAssignments={completedAssignments}
                overdueAssignments={overdueAssignments}
                setActiveTab={setActiveTab}
              />
            )}

            {activeTab === "inbox" && (
              <InboxTab
                unreadCount={unreadCount}
                markAllRead={markAllRead}
                inboxLoading={inboxLoading}
                pendingRequests={pendingRequests}
                myConnections={myConnections}
                notifications={notifications}
                handleAcceptReject={handleAcceptReject}
                markOneRead={markOneRead}
              />
            )}

            {activeTab === "settings" && (
              <SettingsTab
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
                user={user}
                role={role}
                signOut={signOut}
                settings={settings}
                updateSetting={updateSetting}
              />
            )}
          </>
        )}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="s-bottom-nav">
        <button
          className={`s-bottom-nav-item ${activeTab === "dashboard" ? "active" : ""}`}
          onClick={() => switchTab("dashboard")}
        >
          <ion-icon name="home-outline"></ion-icon>
          <span>Home</span>
        </button>
        <button
          className={`s-bottom-nav-item ${activeTab === "assignments" ? "active" : ""}`}
          onClick={() => switchTab("assignments")}
        >
          <ion-icon name="document-text-outline"></ion-icon>
          <span>Tasks</span>
        </button>
        <button
          className={`s-bottom-nav-item ${activeTab === "groups" ? "active" : ""}`}
          onClick={() => switchTab("groups")}
        >
          <ion-icon name="people-outline"></ion-icon>
          <span>Groups</span>
        </button>
        <button
          className={`s-bottom-nav-item ${activeTab === "inbox" ? "active" : ""}`}
          onClick={() => switchTab("inbox")}
          style={{ position: "relative" }}
        >
          <ion-icon name="mail-outline"></ion-icon>
          <span>Inbox</span>
          {unreadCount + pendingRequests.length > 0 && (
            <span
              style={{
                position: "absolute",
                top: 4,
                right: "50%",
                marginRight: -12,
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#EF4444",
              }}
            ></span>
          )}
        </button>
        <button
          className={`s-bottom-nav-item ${activeTab === "settings" ? "active" : ""}`}
          onClick={() => switchTab("settings")}
        >
          <ion-icon name="settings-outline"></ion-icon>
          <span>Settings</span>
        </button>
      </nav>

      {/* Toast Notification */}
      {toast && (
        <div className="s-toast-overlay">
          <div className={`s-toast s-toast-${toast.type}`}>
            <span className="s-toast-icon">
              <ion-icon
                name={
                  toast.type === "success"
                    ? "checkmark-circle"
                    : toast.type === "error"
                      ? "close-circle"
                      : "information-circle"
                }
              ></ion-icon>
            </span>
            <span className="s-toast-msg">{toast.message}</span>
            <button className="s-toast-close" onClick={() => setToast(null)}>
              ×
            </button>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmModal && (
        <div
          className="s-modal-overlay"
          onClick={() => {
            confirmModal.onCancel?.();
            setConfirmModal(null);
          }}
        >
          <div className="s-modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="s-modal-title">Confirm</h3>
            <p className="s-modal-message">{confirmModal.message}</p>
            <div className="s-modal-actions">
              <button
                className="s-btn s-btn-outline"
                onClick={() => {
                  confirmModal.onCancel?.();
                  setConfirmModal(null);
                }}
              >
                Cancel
              </button>
              <button
                className="s-btn s-btn-primary"
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(null);
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
