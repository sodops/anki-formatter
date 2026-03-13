interface ProfileTabProps {
  user: any;
  role: string | null;
  editAvatar: string;
  editName: string;
  editNickname: string;
  editBio: string;
  editPhone: string;
  profileData: any;
  groupsCount: number;
  totalStudents: number;
  assignmentsCount: number;
  teacherStats: any;
  statsLoading: boolean;
  fetchStats: () => Promise<void>;
  setActiveTab: (tab: string) => void;
}

export default function ProfileTab({
  user,
  role,
  editAvatar,
  editName,
  editNickname,
  editBio,
  editPhone,
  profileData,
  groupsCount,
  totalStudents,
  assignmentsCount,
  teacherStats,
  statsLoading,
  fetchStats,
  setActiveTab,
}: ProfileTabProps) {
  return (
    <div className="t-content">
      <div className="t-page-header">
        <h1>My Profile</h1>
        <p className="t-subtitle">Your profile overview</p>
      </div>

      <div className="t-profile-card">
        <div className="t-profile-header">
          <div className="t-profile-avatar-lg">
            {editAvatar ? (
              <img
                src={editAvatar}
                alt="Avatar"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <span>{(editName || user?.email || "T").charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="t-profile-header-info">
            <h2>{editName || user?.email?.split("@")[0]}</h2>
            <p className="t-profile-role">
              {role?.toUpperCase()} · {user?.email}
            </p>
            {editNickname && <p className="t-profile-username">@{editNickname}</p>}
            {profileData && (
              <p className="t-profile-joined">
                Joined {new Date(profileData.created_at).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        <div className="t-profile-details">
          {editBio && (
            <div className="t-profile-detail-row">
              <span className="t-profile-detail-label">Bio</span>
              <p className="t-profile-detail-value">{editBio}</p>
            </div>
          )}
          <div className="t-profile-detail-row">
            <span className="t-profile-detail-label">Email</span>
            <p className="t-profile-detail-value">{profileData?.email || user?.email || "—"}</p>
          </div>
          {editPhone && (
            <div className="t-profile-detail-row">
              <span className="t-profile-detail-label">Phone</span>
              <p className="t-profile-detail-value">{editPhone}</p>
            </div>
          )}
          {editNickname && (
            <div className="t-profile-detail-row">
              <span className="t-profile-detail-label">Profile URL</span>
              <p className="t-profile-detail-value">
                <a
                  href={`/profile/${editNickname}`}
                  style={{ color: "#7C5CFC", textDecoration: "none" }}
                >
                  anki.sodops.uz/profile/{editNickname}
                </a>
              </p>
            </div>
          )}
        </div>

        <button
          className="t-btn t-btn-outline"
          onClick={() => setActiveTab("settings")}
          style={{ marginTop: 16 }}
        >
          <ion-icon name="settings-outline"></ion-icon> Edit Profile in Settings
        </button>
      </div>

      <div className="t-section">
        <h2 className="t-section-title">Quick Stats</h2>
        <div className="t-stats-row">
          <div className="t-stat-card">
            <div className="t-stat-icon" style={{ background: "#7C5CFC20", color: "#7C5CFC" }}>
              <ion-icon name="people"></ion-icon>
            </div>
            <div>
              <div className="t-stat-value">{groupsCount}</div>
              <div className="t-stat-label">Groups</div>
            </div>
          </div>
          <div className="t-stat-card">
            <div className="t-stat-icon" style={{ background: "#10B98120", color: "#10B981" }}>
              <ion-icon name="school"></ion-icon>
            </div>
            <div>
              <div className="t-stat-value">{totalStudents}</div>
              <div className="t-stat-label">Students</div>
            </div>
          </div>
          <div className="t-stat-card">
            <div className="t-stat-icon" style={{ background: "#F59E0B20", color: "#F59E0B" }}>
              <ion-icon name="document-text"></ion-icon>
            </div>
            <div>
              <div className="t-stat-value">{assignmentsCount}</div>
              <div className="t-stat-label">Assignments</div>
            </div>
          </div>
        </div>
      </div>

      <div className="t-section">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <h2 className="t-section-title" style={{ margin: 0 }}>
            <ion-icon name="bar-chart-outline" style={{ marginRight: 8 }}></ion-icon> Performance
            Analytics
          </h2>
          <button
            className="t-btn t-btn-outline t-btn-sm"
            onClick={fetchStats}
            disabled={statsLoading}
          >
            <ion-icon name="refresh-outline"></ion-icon> {statsLoading ? "Loading..." : "Refresh"}
          </button>
        </div>

        {statsLoading && !teacherStats ? (
          <div className="t-loading-content">
            <div className="t-spinner" />
            <span>Loading statistics...</span>
          </div>
        ) : teacherStats ? (
          <>
            <div className="t-stats-row">
              <div className="t-stat-card">
                <div className="t-stat-icon" style={{ background: "#7C5CFC20", color: "#7C5CFC" }}>
                  <ion-icon name="checkmark-done"></ion-icon>
                </div>
                <div>
                  <div className="t-stat-value">{teacherStats.overall.completion_rate}%</div>
                  <div className="t-stat-label">Completion Rate</div>
                </div>
              </div>
              <div className="t-stat-card">
                <div className="t-stat-icon" style={{ background: "#F59E0B20", color: "#F59E0B" }}>
                  <ion-icon name="ribbon"></ion-icon>
                </div>
                <div>
                  <div className="t-stat-value">{teacherStats.overall.avg_accuracy}%</div>
                  <div className="t-stat-label">Avg Accuracy</div>
                </div>
              </div>
              <div className="t-stat-card">
                <div className="t-stat-icon" style={{ background: "#9B7FFF20", color: "#9B7FFF" }}>
                  <ion-icon name="layers"></ion-icon>
                </div>
                <div>
                  <div className="t-stat-value">{teacherStats.overall.total_reviews}</div>
                  <div className="t-stat-label">Total Reviews</div>
                </div>
              </div>
            </div>

            {teacherStats.group_stats.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <h3 className="t-section-title" style={{ fontSize: 14 }}>
                  Group Performance
                </h3>
                <div className="t-stats-table">
                  <div className="t-stats-table-header">
                    <span>Group</span>
                    <span>Students</span>
                    <span>Completion</span>
                    <span>Accuracy</span>
                  </div>
                  {teacherStats.group_stats.map((g: any) => (
                    <div key={g.id} className="t-stats-table-row">
                      <span className="t-stats-group-name">
                        <span className="t-group-dot" style={{ background: g.color }}></span>
                        {g.name}
                      </span>
                      <span>{g.member_count}</span>
                      <span>
                        <div className="t-mini-progress" style={{ width: 50 }}>
                          <div
                            className="t-mini-progress-fill"
                            style={{
                              width: `${g.completion_rate}%`,
                              background:
                                g.completion_rate >= 70
                                  ? "#10B981"
                                  : g.completion_rate >= 40
                                    ? "#F59E0B"
                                    : "#EF4444",
                            }}
                          ></div>
                        </div>
                        <span className="t-pct">{g.completion_rate}%</span>
                      </span>
                      <span
                        className={`t-accuracy-badge ${g.avg_accuracy >= 80 ? "good" : g.avg_accuracy >= 60 ? "mid" : "low"}`}
                      >
                        {g.avg_accuracy}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {teacherStats.top_students.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <h3 className="t-section-title" style={{ fontSize: 14 }}>
                  Top Students
                </h3>
                <div className="t-leaderboard">
                  {teacherStats.top_students.slice(0, 5).map((s: any, i: number) => (
                    <div
                      key={s.id}
                      className={`t-leaderboard-item ${i < 3 ? "top-" + (i + 1) : ""}`}
                    >
                      <span className="t-lb-rank">{`#${i + 1}`}</span>
                      <div className="t-lb-avatar">
                        {s.avatar_url ? (
                          <img src={s.avatar_url} alt="" />
                        ) : (
                          <span>{(s.name || "?").charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="t-lb-info">
                        <div className="t-lb-name">{s.name}</div>
                        <div className="t-lb-meta">
                          {s.completed_tasks}/{s.total_tasks} tasks · {s.avg_accuracy}%
                        </div>
                      </div>
                      <div className="t-lb-xp">
                        <ion-icon name="flash" style={{ fontSize: 14 }}></ion-icon> {s.total_xp} XP
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              className="t-btn t-btn-outline"
              onClick={() => setActiveTab("statistics")}
              style={{ marginTop: 16 }}
            >
              <ion-icon name="analytics-outline"></ion-icon> View Full Statistics
            </button>
          </>
        ) : (
          <div className="t-empty-state" style={{ padding: 24 }}>
            <p style={{ color: "var(--t-text-muted)" }}>
              Statistics will appear once students join and start studying.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
