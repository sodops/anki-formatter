interface StatisticsTabProps {
  teacherStats: any;
  statsLoading: boolean;
  fetchStats: () => Promise<void>;
}

export default function StatisticsTab({
  teacherStats,
  statsLoading,
  fetchStats,
}: StatisticsTabProps) {
  return (
    <div className="t-content">
      <div className="t-page-header">
        <h1>Statistics & Analytics</h1>
        <p className="t-subtitle">Track student performance across your classes</p>
        <button className="t-btn t-btn-outline" onClick={fetchStats} disabled={statsLoading}>
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
                <ion-icon name="school"></ion-icon>
              </div>
              <div>
                <div className="t-stat-value">{teacherStats.overall.total_students}</div>
                <div className="t-stat-label">Total Students</div>
              </div>
            </div>
            <div className="t-stat-card">
              <div className="t-stat-icon" style={{ background: "#10B98120", color: "#10B981" }}>
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
            <div className="t-section">
              <h2 className="t-section-title">
                <ion-icon name="bar-chart-outline" style={{ marginRight: 8 }}></ion-icon> Group
                Performance
              </h2>
              <div className="t-stats-table">
                <div className="t-stats-table-header">
                  <span>Group</span>
                  <span>Students</span>
                  <span>Tasks</span>
                  <span>Completion</span>
                  <span>Avg Accuracy</span>
                  <span>Reviews</span>
                </div>
                {teacherStats.group_stats.map((g: any) => (
                  <div key={g.id} className="t-stats-table-row">
                    <span className="t-stats-group-name">
                      <span className="t-group-dot" style={{ background: g.color }}></span>
                      {g.name}
                    </span>
                    <span>{g.member_count}</span>
                    <span>{g.assignment_count}</span>
                    <span>
                      <div className="t-mini-progress" style={{ width: 60 }}>
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
                    <span>{g.total_reviews}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {teacherStats.top_students.length > 0 && (
            <div className="t-section">
              <h2 className="t-section-title">
                <ion-icon name="trophy-outline" style={{ marginRight: 8 }}></ion-icon> Top Students
              </h2>
              <div className="t-leaderboard">
                {teacherStats.top_students.map((s: any, i: number) => (
                  <div key={s.id} className={`t-leaderboard-item ${i < 3 ? "top-" + (i + 1) : ""}`}>
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
                        {s.completed_tasks}/{s.total_tasks} tasks · {s.avg_accuracy}% accuracy
                        {s.current_streak > 0 && (
                          <span>
                            {" "}
                            ·{" "}
                            <ion-icon
                              name="flame"
                              style={{ fontSize: 14, verticalAlign: "middle", color: "#F59E0B" }}
                            ></ion-icon>
                            {s.current_streak}
                          </span>
                        )}
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

          {teacherStats.students.length > 0 && (
            <div className="t-section">
              <h2 className="t-section-title">
                <ion-icon name="people-outline" style={{ marginRight: 8 }}></ion-icon> All Students
                ({teacherStats.students.length})
              </h2>
              <div className="t-stats-table">
                <div className="t-stats-table-header">
                  <span>Student</span>
                  <span>Tasks Done</span>
                  <span>Accuracy</span>
                  <span>Reviews</span>
                  <span>Time</span>
                  <span>XP</span>
                </div>
                {teacherStats.students.map((s: any) => (
                  <div key={s.id} className="t-stats-table-row">
                    <span className="t-stats-student-name">
                      <div className="t-lb-avatar" style={{ width: 28, height: 28, fontSize: 12 }}>
                        {s.avatar_url ? (
                          <img src={s.avatar_url} alt="" />
                        ) : (
                          <span>{(s.name || "?").charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      {s.name}
                    </span>
                    <span>
                      {s.completed_tasks}/{s.total_tasks}
                    </span>
                    <span
                      className={`t-accuracy-badge ${s.avg_accuracy >= 80 ? "good" : s.avg_accuracy >= 60 ? "mid" : "low"}`}
                    >
                      {s.avg_accuracy}%
                    </span>
                    <span>{s.total_reviews}</span>
                    <span>{Math.round(s.total_time_seconds / 60)}m</span>
                    <span>
                      <ion-icon name="flash" style={{ fontSize: 12 }}></ion-icon> {s.total_xp}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {teacherStats.students.length === 0 && (
            <div className="t-empty-state">
              <div className="t-empty-icon">
                <ion-icon name="bar-chart-outline" style={{ fontSize: 48 }}></ion-icon>
              </div>
              <h3>No student data yet</h3>
              <p>Statistics will appear once students join your groups and start studying.</p>
            </div>
          )}
        </>
      ) : (
        <div className="t-empty-state">
          <div className="t-empty-icon">
            <ion-icon name="bar-chart-outline" style={{ fontSize: 48 }}></ion-icon>
          </div>
          <h3>No statistics available</h3>
          <p>Create groups and assignments to see student analytics.</p>
        </div>
      )}
    </div>
  );
}
