import Link from "next/link";

interface InboxTabProps {
  inboxUnread: number;
  inboxLoading: boolean;
  inboxRequests: any[];
  inboxConnections: any[];
  inboxNotifications: any[];
  markAllNotifsRead: () => Promise<void>;
  handleAcceptReject: (connectionId: string, action: "accept" | "reject") => Promise<void>;
  markNotifRead: (id: string) => Promise<void>;
}

export default function InboxTab({
  inboxUnread,
  inboxLoading,
  inboxRequests,
  inboxConnections,
  inboxNotifications,
  markAllNotifsRead,
  handleAcceptReject,
  markNotifRead,
}: InboxTabProps) {
  return (
    <div className="t-content">
      <div className="t-page-header">
        <div>
          <h1>Inbox</h1>
          <p className="t-subtitle">Friend requests & notifications</p>
        </div>
        {inboxUnread > 0 && (
          <button className="t-btn t-btn-outline" onClick={markAllNotifsRead}>
            Mark All Read
          </button>
        )}
      </div>

      {inboxLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
          <div className="t-spinner" />
        </div>
      ) : (
        <>
          <div className="t-section">
            <h2 className="t-section-title">
              <ion-icon name="person-add-outline" style={{ marginRight: 8 }}></ion-icon>
              Friend Requests{" "}
              {inboxRequests.length > 0 && (
                <span className="t-nav-count t-nav-count-alert" style={{ marginLeft: 8 }}>
                  {inboxRequests.length}
                </span>
              )}
            </h2>
            {inboxRequests.length === 0 ? (
              <div className="t-empty-state" style={{ padding: "2rem" }}>
                <div className="t-empty-icon">
                  <ion-icon name="hand-left-outline" style={{ fontSize: 48 }}></ion-icon>
                </div>
                <p>No pending friend requests</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {inboxRequests.map((req) => (
                  <div
                    key={req.connection_id}
                    className="t-card"
                    style={{ display: "flex", alignItems: "center", gap: 16, padding: 16 }}
                  >
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: "50%",
                        background: "#7C5CFC20",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 20,
                        fontWeight: 600,
                        color: "#7C5CFC",
                        flexShrink: 0,
                      }}
                    >
                      {req.user?.avatar_url ? (
                        <img
                          src={req.user.avatar_url}
                          alt=""
                          style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover" }}
                        />
                      ) : (
                        (req.user?.display_name || "U").charAt(0).toUpperCase()
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Link
                        href={`/profile/${req.user?.username || req.user?.id}`}
                        style={{ fontWeight: 600, color: "#fff", textDecoration: "none" }}
                      >
                        {req.user?.display_name || "Unknown User"}
                      </Link>
                      {req.user?.username && (
                        <div style={{ fontSize: 13, color: "#94a3b8" }}>@{req.user.username}</div>
                      )}
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                        {req.user?.role?.toUpperCase()} ·{" "}
                        {new Date(req.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                      <button
                        className="t-btn t-btn-primary t-btn-sm"
                        onClick={() => handleAcceptReject(req.connection_id, "accept")}
                      >
                        <ion-icon name="checkmark-outline"></ion-icon> Accept
                      </button>
                      <button
                        className="t-btn t-btn-sm"
                        style={{
                          background: "#EF444415",
                          color: "#EF4444",
                          border: "1px solid #EF444430",
                        }}
                        onClick={() => handleAcceptReject(req.connection_id, "reject")}
                      >
                        <ion-icon name="close-outline"></ion-icon> Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {inboxConnections.length > 0 && (
            <div className="t-section">
              <h2 className="t-section-title">
                <ion-icon name="people-outline" style={{ marginRight: 8 }}></ion-icon>
                Friends ({inboxConnections.length})
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {inboxConnections.map((conn) => (
                  <div
                    key={conn.connection_id}
                    className="t-card"
                    style={{ display: "flex", alignItems: "center", gap: 16, padding: 12 }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        background: "#10B98120",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 16,
                        fontWeight: 600,
                        color: "#10B981",
                        flexShrink: 0,
                      }}
                    >
                      {conn.user?.avatar_url ? (
                        <img
                          src={conn.user.avatar_url}
                          alt=""
                          style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }}
                        />
                      ) : (
                        (conn.user?.display_name || "U").charAt(0).toUpperCase()
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Link
                        href={`/profile/${conn.user?.username || conn.user?.id}`}
                        style={{ fontWeight: 600, color: "#fff", textDecoration: "none" }}
                      >
                        {conn.user?.display_name || "Unknown"}
                      </Link>
                      {conn.user?.username && (
                        <span style={{ fontSize: 13, color: "#94a3b8", marginLeft: 8 }}>
                          @{conn.user.username}
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: 12, color: "#64748b" }}>
                      Connected {new Date(conn.since).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="t-section">
            <h2 className="t-section-title">
              <ion-icon name="notifications-outline" style={{ marginRight: 8 }}></ion-icon>
              Notifications
            </h2>
            {inboxNotifications.length === 0 ? (
              <div className="t-empty-state" style={{ padding: "2rem" }}>
                <div className="t-empty-icon">
                  <ion-icon name="notifications-outline" style={{ fontSize: 48 }}></ion-icon>
                </div>
                <p>No notifications yet</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {inboxNotifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => !n.is_read && markNotifRead(n.id)}
                    className="t-card"
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                      padding: 12,
                      cursor: !n.is_read ? "pointer" : "default",
                      opacity: n.is_read ? 0.6 : 1,
                      borderLeft: !n.is_read ? "3px solid #7C5CFC" : "3px solid transparent",
                    }}
                  >
                    <div style={{ fontSize: 20, flexShrink: 0 }}>
                      <ion-icon
                        name={
                          n.type === "connection_request"
                            ? "hand-left-outline"
                            : n.type === "connection_accepted"
                              ? "people-outline"
                              : n.type === "assignment_new"
                                ? "document-text-outline"
                                : n.type === "assignment_graded"
                                  ? "star-outline"
                                  : n.type === "xp_earned"
                                    ? "flash-outline"
                                    : "notifications-outline"
                        }
                      ></ion-icon>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: "#fff", fontSize: 14 }}>{n.title}</div>
                      <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 2 }}>
                        {n.message}
                      </div>
                      <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>
                        {new Date(n.created_at).toLocaleDateString()} ·{" "}
                        {new Date(n.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                    {!n.is_read && (
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: "#7C5CFC",
                          flexShrink: 0,
                          marginTop: 6,
                        }}
                      ></div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
