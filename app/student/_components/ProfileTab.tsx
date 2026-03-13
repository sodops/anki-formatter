import { Assignment, Group, XPData } from "./types";

interface ProfileTabProps {
  user: any;
  editAvatar: string;
  editName: string;
  editNickname: string;
  editBio: string;
  editPhone: string;
  profileData: any;
  level: number;
  xpInLevel: number;
  xp: XPData;
  assignments: Assignment[];
  groups: Group[];
  completedAssignments: Assignment[];
  overdueAssignments: Assignment[];
  setActiveTab: (tab: string) => void;
}

export default function ProfileTab({
  user,
  editAvatar,
  editName,
  editNickname,
  editBio,
  editPhone,
  profileData,
  level,
  xpInLevel,
  xp,
  assignments,
  groups,
  completedAssignments,
  overdueAssignments,
  setActiveTab,
}: ProfileTabProps) {
  return (
    <div className="s-content">
      <div className="s-page-header">
        <h1>My Profile</h1>
        <p className="s-subtitle">Your profile &amp; learning analytics</p>
      </div>

      <div className="s-profile-card">
        <div className="s-profile-header">
          <div className="s-profile-avatar-lg">
            {editAvatar ? (
              <img
                src={editAvatar}
                alt="Avatar"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <span>{(editName || user?.email || "S").charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="s-profile-header-info">
            <h2>{editName || user?.email?.split("@")[0]}</h2>
            <p className="s-profile-role">STUDENT · Level {level}</p>
            {editNickname && <p className="s-profile-username">@{editNickname}</p>}
            <div className="s-profile-badges">
              <span className="s-profile-badge">
                <ion-icon name="flash" style={{ color: "#F59E0B" }}></ion-icon> {xp.total_xp} XP
              </span>
              {xp.current_streak > 0 && (
                <span className="s-profile-badge">
                  <ion-icon name="flame" style={{ color: "#EF4444" }}></ion-icon>{" "}
                  {xp.current_streak} day streak
                </span>
              )}
              <span className="s-profile-badge">
                <ion-icon name="checkmark-circle" style={{ color: "#10B981" }}></ion-icon>{" "}
                {completedAssignments.length} completed
              </span>
            </div>
          </div>
        </div>

        <div className="s-profile-details">
          {editBio && (
            <div className="s-profile-detail-row">
              <span className="s-profile-detail-label">Bio</span>
              <p className="s-profile-detail-value">{editBio}</p>
            </div>
          )}
          <div className="s-profile-detail-row">
            <span className="s-profile-detail-label">Email</span>
            <p className="s-profile-detail-value">{profileData?.email || user?.email || "—"}</p>
          </div>
          {editPhone && (
            <div className="s-profile-detail-row">
              <span className="s-profile-detail-label">Phone</span>
              <p className="s-profile-detail-value">{editPhone}</p>
            </div>
          )}
          {editNickname && (
            <div className="s-profile-detail-row">
              <span className="s-profile-detail-label">Profile URL</span>
              <p className="s-profile-detail-value">
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
          className="s-btn s-btn-outline"
          onClick={() => setActiveTab("settings")}
          style={{ marginTop: 16 }}
        >
          <ion-icon name="settings-outline"></ion-icon> Edit Profile in Settings
        </button>
      </div>

      <div className="s-level-card">
        <div className="s-level-circle-lg">
          <span className="s-level-num-lg">{level}</span>
          <span className="s-level-label">LEVEL</span>
        </div>
        <div className="s-level-details">
          <h2>{xp.total_xp} XP Total</h2>
          <div className="s-xp-bar-lg-wrap">
            <div className="s-xp-bar-lg">
              <div className="s-xp-bar-fill-lg" style={{ width: `${xpInLevel}%` }}></div>
            </div>
            <span className="s-xp-bar-label">
              {xpInLevel}/100 to Level {level + 1}
            </span>
          </div>
          {xp.today_xp > 0 && <span className="s-today-xp">+{xp.today_xp} XP today</span>}
        </div>
      </div>

      <div className="s-stats-grid-4">
        <div className="s-stat-card-mini">
          <div className="s-stat-icon" style={{ background: "#3B82F620", color: "#3B82F6" }}>
            <ion-icon name="bar-chart"></ion-icon>
          </div>
          <div className="s-stat-value-sm">{assignments.length}</div>
          <div className="s-stat-label-sm">Total Tasks</div>
        </div>
        <div className="s-stat-card-mini">
          <div className="s-stat-icon" style={{ background: "#10B98120", color: "#10B981" }}>
            <ion-icon name="checkmark-done"></ion-icon>
          </div>
          <div className="s-stat-value-sm">{completedAssignments.length}</div>
          <div className="s-stat-label-sm">Completed</div>
        </div>
        <div className="s-stat-card-mini">
          <div className="s-stat-icon" style={{ background: "#F59E0B20", color: "#F59E0B" }}>
            <ion-icon name="flame"></ion-icon>
          </div>
          <div className="s-stat-value-sm">{xp.current_streak}</div>
          <div className="s-stat-label-sm">Day Streak</div>
        </div>
        <div className="s-stat-card-mini">
          <div className="s-stat-icon" style={{ background: "#9B7FFF20", color: "#9B7FFF" }}>
            <ion-icon name="trophy"></ion-icon>
          </div>
          <div className="s-stat-value-sm">{xp.longest_streak}</div>
          <div className="s-stat-label-sm">Best Streak</div>
        </div>
      </div>

      <div className="s-chart-card">
        <h3 className="s-chart-title">Assignment Progress</h3>
        {assignments.length === 0 ? (
          <div className="s-chart-empty">No assignments yet</div>
        ) : (
          <div className="s-bar-chart">
            {(() => {
              const completed = completedAssignments.length;
              const inProgress = assignments.filter(
                (a) => a.my_progress?.status === "in_progress"
              ).length;
              const notStarted = assignments.filter(
                (a) =>
                  !a.my_progress ||
                  a.my_progress.status === "pending" ||
                  a.my_progress.status === "not_started"
              ).length;
              const overdue = overdueAssignments.length;
              const total = assignments.length || 1;
              return (
                <>
                  <div className="s-bar-row">
                    <span className="s-bar-label">Completed</span>
                    <div className="s-bar-track">
                      <div
                        className="s-bar-fill"
                        style={{ width: `${(completed / total) * 100}%`, background: "#10B981" }}
                      ></div>
                    </div>
                    <span className="s-bar-value">{completed}</span>
                  </div>
                  <div className="s-bar-row">
                    <span className="s-bar-label">In Progress</span>
                    <div className="s-bar-track">
                      <div
                        className="s-bar-fill"
                        style={{ width: `${(inProgress / total) * 100}%`, background: "#3B82F6" }}
                      ></div>
                    </div>
                    <span className="s-bar-value">{inProgress}</span>
                  </div>
                  <div className="s-bar-row">
                    <span className="s-bar-label">Not Started</span>
                    <div className="s-bar-track">
                      <div
                        className="s-bar-fill"
                        style={{ width: `${(notStarted / total) * 100}%`, background: "#6B7280" }}
                      ></div>
                    </div>
                    <span className="s-bar-value">{notStarted}</span>
                  </div>
                  {overdue > 0 && (
                    <div className="s-bar-row">
                      <span className="s-bar-label">Overdue</span>
                      <div className="s-bar-track">
                        <div
                          className="s-bar-fill"
                          style={{ width: `${(overdue / total) * 100}%`, background: "#EF4444" }}
                        ></div>
                      </div>
                      <span className="s-bar-value">{overdue}</span>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </div>

      {xp.recent_events && xp.recent_events.length > 0 && (
        <div className="s-chart-card">
          <h3 className="s-chart-title">Recent XP Activity</h3>
          <div className="s-activity-list">
            {xp.recent_events.slice(0, 10).map((ev, i) => (
              <div key={i} className="s-activity-item">
                <span className="s-activity-type">{ev.event_type.replace(/_/g, " ")}</span>
                <span className="s-activity-xp">+{ev.xp_amount} XP</span>
                <span className="s-activity-time">
                  {new Date(ev.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="s-section">
        <h2 className="s-section-title">
          <ion-icon
            name="ribbon"
            style={{ marginRight: 6, verticalAlign: "middle", color: "#F59E0B" }}
          ></ion-icon>
          Achievements
        </h2>
        <div className="s-achievements-grid">
          <div
            className={`s-achievement ${completedAssignments.length >= 1 ? "unlocked" : "locked"}`}
          >
            <span className="s-ach-icon">
              <ion-icon name="flag"></ion-icon>
            </span>
            <div>
              <strong>First Task</strong>
              <span>Complete your first assignment</span>
            </div>
          </div>
          <div
            className={`s-achievement ${completedAssignments.length >= 5 ? "unlocked" : "locked"}`}
          >
            <span className="s-ach-icon">
              <ion-icon name="library"></ion-icon>
            </span>
            <div>
              <strong>Scholar</strong>
              <span>Complete 5 assignments</span>
            </div>
          </div>
          <div className={`s-achievement ${xp.current_streak >= 3 ? "unlocked" : "locked"}`}>
            <span className="s-ach-icon">
              <ion-icon name="flame"></ion-icon>
            </span>
            <div>
              <strong>On Fire</strong>
              <span>3-day study streak</span>
            </div>
          </div>
          <div className={`s-achievement ${xp.current_streak >= 7 ? "unlocked" : "locked"}`}>
            <span className="s-ach-icon">
              <ion-icon name="flash"></ion-icon>
            </span>
            <div>
              <strong>Week Warrior</strong>
              <span>7-day study streak</span>
            </div>
          </div>
          <div className={`s-achievement ${xp.total_xp >= 100 ? "unlocked" : "locked"}`}>
            <span className="s-ach-icon">
              <ion-icon name="speedometer"></ion-icon>
            </span>
            <div>
              <strong>Century</strong>
              <span>Earn 100 XP total</span>
            </div>
          </div>
          <div className={`s-achievement ${xp.total_xp >= 500 ? "unlocked" : "locked"}`}>
            <span className="s-ach-icon">
              <ion-icon name="star"></ion-icon>
            </span>
            <div>
              <strong>Star Student</strong>
              <span>Earn 500 XP total</span>
            </div>
          </div>
          <div className={`s-achievement ${groups.length >= 3 ? "unlocked" : "locked"}`}>
            <span className="s-ach-icon">
              <ion-icon name="people"></ion-icon>
            </span>
            <div>
              <strong>Social Learner</strong>
              <span>Join 3 groups</span>
            </div>
          </div>
          <div
            className={`s-achievement ${assignments.some((a) => (a.my_progress?.accuracy || 0) === 100) ? "unlocked" : "locked"}`}
          >
            <span className="s-ach-icon">
              <ion-icon name="trophy"></ion-icon>
            </span>
            <div>
              <strong>Perfect Score</strong>
              <span>100% accuracy on an assignment</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
