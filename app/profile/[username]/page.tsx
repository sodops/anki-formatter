"use client";

import { useAuth } from "@/components/AuthProvider";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/Skeleton";

interface PublicProfile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string;
  username: string;
  role: string;
  total_xp: number;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  created_at: string;
  completed_assignments: number;
  connections_count: number;
}

interface GroupInfo {
  id: string;
  name: string;
  color: string;
  role: string;
}

interface Achievement {
  id: string;
  name: string;
  icon: string;
}

interface XPEvent {
  event_type: string;
  xp_amount: number;
  created_at: string;
}

export default function PublicProfilePage({ params }: { params: { username: string } }) {
  const username = params.username;
  const { user, role } = useAuth();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [recentXP, setRecentXP] = useState<XPEvent[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);
  const [connectionDirection, setConnectionDirection] = useState<string | null>(null);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const showConfirm = (message: string, onConfirm: () => void) => {
    setConfirmModal({ message, onConfirm });
  };

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch(`/api/profile/${encodeURIComponent(username)}`);
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setProfile(data.profile);
      setGroups(data.groups || []);
      setAchievements(data.achievements || []);
      setRecentXP(data.recent_xp || []);
      setConnectionStatus(data.connection_status);
      setConnectionDirection(data.connection_direction);
      setConnectionId(data.connection_id);
      setIsOwnProfile(data.is_own_profile);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleConnect = async () => {
    if (!user || !profile) return;
    setConnecting(true);
    try {
      const res = await fetch("/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_id: profile.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setConnectionStatus("pending");
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setConnecting(false);
    }
  };

  const handleAcceptReject = async (action: "accept" | "reject") => {
    if (!connectionId) return;
    setConnecting(true);
    try {
      const res = await fetch("/api/connections", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connection_id: connectionId, action }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      if (action === "accept") {
        setConnectionStatus("accepted");
        setConnectionDirection(null);
      } else {
        setConnectionStatus(null);
        setConnectionDirection(null);
        setConnectionId(null);
      }
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!user || !profile) return;
    showConfirm("Remove this connection?", async () => {
      setConnecting(true);
      try {
        const listRes = await fetch("/api/connections");
        if (!listRes.ok) throw new Error("Failed");
        const listData = await listRes.json();
        const conn = [...(listData.connections || []), ...(listData.sent_requests || [])].find(
          (c: any) => c.user?.id === profile.id
        );
        if (conn) {
          await fetch(`/api/connections?id=${conn.connection_id}`, { method: "DELETE" });
        }
        setConnectionStatus(null);
        showToast('success', 'Connection removed');
      } catch (err: any) {
        showToast('error', err.message);
      } finally {
        setConnecting(false);
      }
    });
  };

  const level = profile ? Math.floor(profile.total_xp / 100) + 1 : 1;

  if (loading) {
    return (
      <div className="teacher-container" style={{ padding: '2rem', maxWidth: 720, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Skeleton width={96} height={96} borderRadius="50%" className="" />
          <div style={{ marginTop: '1rem' }}><Skeleton width="40%" height="1.5rem" />
          </div>
          <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
            <Skeleton width={60} height="1rem" /><Skeleton width={80} height="1rem" />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.25rem', textAlign: 'center' }}>
              <Skeleton width="50%" height="1.5rem" />
              <div style={{ marginTop: '0.5rem' }}><Skeleton width="70%" height="0.875rem" /></div>
            </div>
          ))}
        </div>
        <Skeleton width="30%" height="1.25rem" />
        <div style={{ marginTop: '1rem' }}><Skeleton width="100%" height="3rem" /></div>
        <div style={{ marginTop: '0.75rem' }}><Skeleton width="100%" height="3rem" /></div>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="teacher-loading">
        <div style={{ fontSize: '48px', marginBottom: '16px' }}><ion-icon name="person-outline"></ion-icon></div>
        <h2 style={{ color: 'var(--text-primary, #1e293b)', margin: '0 0 8px' }}>Profile Not Found</h2>
        <p style={{ color: '#64748b', margin: '0 0 20px' }}>This user doesn&apos;t exist or hasn&apos;t set up their profile yet.</p>
        <Link href="/" className="teacher-btn teacher-btn-primary">
          <ion-icon name="home-outline"></ion-icon> Go Home
        </Link>
      </div>
    );
  }

  return (
    <div className="profile-page">
      {/* Header / Navigation */}
      <header className="profile-topbar">
        <Link href={user ? (role === 'teacher' ? '/teacher' : '/student') : '/'} className="profile-back-btn">
          <ion-icon name="arrow-back-outline"></ion-icon>
          <span>Back</span>
        </Link>
        <span className="profile-topbar-brand">
          <span><ion-icon name="flash" style={{ verticalAlign: 'middle' }}></ion-icon></span> AnkiFlow
        </span>
      </header>

      <main className="profile-main">
        {/* Profile Hero */}
        <div className="profile-hero">
          <div className="profile-hero-bg" style={{ background: `linear-gradient(135deg, ${profile.role === 'teacher' ? '#7C5CFC' : '#7C5CFC'}, ${profile.role === 'teacher' ? '#9B7FFF' : '#9B7FFF'})` }}></div>
          <div className="profile-hero-content">
            <div className="profile-avatar-container">
              <div className="profile-avatar-xl">
                {profile.avatar_url && !avatarError ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.display_name}
                    onError={() => setAvatarError(true)}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span>{(profile.display_name || "?")[0].toUpperCase()}</span>
                )}
              </div>
              <div className="profile-level-badge">Lv.{level}</div>
            </div>
            
            <div className="profile-hero-info">
              <h1>{profile.display_name}</h1>
              {profile.username && <span className="profile-username">@{profile.username}</span>}
              <span className="profile-role-tag" style={{ background: profile.role === 'teacher' ? '#10B98120' : '#7C5CFC20', color: profile.role === 'teacher' ? '#10B981' : '#7C5CFC' }}>
                {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
              </span>
              {profile.bio && <p className="profile-bio">{profile.bio}</p>}
            </div>

            {/* Connection Button */}
            {user && !isOwnProfile && (
              <div className="profile-action-buttons">
                {connectionStatus === "accepted" ? (
                  <button className="profile-btn profile-btn-connected" onClick={handleDisconnect} disabled={connecting}>
                    <ion-icon name="checkmark-circle"></ion-icon>
                    {connecting ? "..." : "Connected"}
                  </button>
                ) : connectionStatus === "pending" && connectionDirection === "received" ? (
                  <>
                    <button className="profile-btn profile-btn-connect" onClick={() => handleAcceptReject("accept")} disabled={connecting}>
                      <ion-icon name="checkmark-outline"></ion-icon>
                      {connecting ? "..." : "Accept"}
                    </button>
                    <button className="profile-btn profile-btn-reject" onClick={() => handleAcceptReject("reject")} disabled={connecting}>
                      <ion-icon name="close-outline"></ion-icon>
                      Decline
                    </button>
                  </>
                ) : connectionStatus === "pending" ? (
                  <button className="profile-btn profile-btn-pending" disabled>
                    <ion-icon name="time-outline"></ion-icon>
                    Request Sent
                  </button>
                ) : (
                  <button className="profile-btn profile-btn-connect" onClick={handleConnect} disabled={connecting}>
                    <ion-icon name="person-add-outline"></ion-icon>
                    {connecting ? "Sending..." : "Connect"}
                  </button>
                )}
              </div>
            )}

            {isOwnProfile && (
              <div className="profile-action-buttons">
                <Link href={profile.role === 'teacher' ? '/teacher' : '/student'} className="profile-btn profile-btn-edit">
                  <ion-icon name="create-outline"></ion-icon>
                  Edit Profile
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="profile-stats-row">
          {profile.role === 'teacher' ? (
            <>
              <div className="profile-stat">
                <div className="profile-stat-value">{groups.length}</div>
                <div className="profile-stat-label">Groups</div>
              </div>
              <div className="profile-stat">
                <div className="profile-stat-value">{profile.connections_count}</div>
                <div className="profile-stat-label">Connections</div>
              </div>
            </>
          ) : (
            <>
              <div className="profile-stat">
                <div className="profile-stat-value">{profile.total_xp}</div>
                <div className="profile-stat-label">Total XP</div>
              </div>
              <div className="profile-stat">
                <div className="profile-stat-value">{profile.current_streak}</div>
                <div className="profile-stat-label">Day Streak</div>
              </div>
              <div className="profile-stat">
                <div className="profile-stat-value">{profile.longest_streak}</div>
                <div className="profile-stat-label">Best Streak</div>
              </div>
              <div className="profile-stat">
                <div className="profile-stat-value">{profile.completed_assignments}</div>
                <div className="profile-stat-label">Tasks Done</div>
              </div>
              <div className="profile-stat">
                <div className="profile-stat-value">{profile.connections_count}</div>
                <div className="profile-stat-label">Connections</div>
              </div>
            </>
          )}
        </div>

        {/* Achievements */}
        {achievements.length > 0 && (
          <div className="profile-section">
            <h2 className="profile-section-title">
              <ion-icon name="ribbon-outline"></ion-icon> Achievements
            </h2>
            <div className="profile-achievements">
              {achievements.map(a => (
                <div key={a.id} className="profile-ach-item">
                  <span className="profile-ach-icon">{a.icon}</span>
                  <span className="profile-ach-name">{a.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Groups */}
        {groups.length > 0 && (
          <div className="profile-section">
            <h2 className="profile-section-title">
              <ion-icon name="people-outline"></ion-icon> Groups
            </h2>
            <div className="profile-groups-list">
              {groups.map(g => (
                <Link key={g.id} href={`/groups/${g.id}`} className="profile-group-chip-lg">
                  <span className="profile-group-dot" style={{ background: g.color }}></span>
                  <span className="profile-group-name">{g.name}</span>
                  <span className="profile-group-role">{g.role}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        {recentXP.length > 0 && (
          <div className="profile-section">
            <h2 className="profile-section-title">
              <ion-icon name="time-outline"></ion-icon> Recent Activity
            </h2>
            <div className="profile-activity">
              {recentXP.map((ev, i) => (
                <div key={i} className="profile-activity-item">
                  <span className="profile-activity-type">{ev.event_type.replace(/_/g, ' ')}</span>
                  <span className="profile-activity-xp">+{ev.xp_amount} XP</span>
                  <span className="profile-activity-date">{new Date(ev.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Member Since */}
        <div className="profile-footer-info">
          <ion-icon name="calendar-outline"></ion-icon>
          <span>Member since {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
        </div>
      </main>

      {/* Toast Notification */}
      {toast && (
        <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 10001, pointerEvents: 'none' }}>
          <div style={{ pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 20px', borderRadius: 12, background: toast.type === 'error' ? '#FEE2E2' : toast.type === 'success' ? '#D1FAE5' : '#DBEAFE', color: toast.type === 'error' ? '#DC2626' : toast.type === 'success' ? '#059669' : '#2563EB', fontSize: 14, fontWeight: 500, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', animation: 'slideInRight 0.3s ease' }}>
            <ion-icon name={toast.type === 'success' ? 'checkmark-circle' : toast.type === 'error' ? 'close-circle' : 'information-circle'}></ion-icon>
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10002 }} onClick={() => setConfirmModal(null)}>
          <div style={{ background: 'var(--card-bg, #1a1a2e)', borderRadius: 16, padding: 24, maxWidth: 400, width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 12px', fontSize: 18, color: 'var(--text, #fff)' }}>Confirm</h3>
            <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--text-secondary, #9ca3af)' }}>{confirmModal.message}</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmModal(null)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border, #2a2a3a)', background: 'transparent', color: 'var(--text, #fff)', cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => { confirmModal.onConfirm(); setConfirmModal(null); }} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#7C5CFC', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
