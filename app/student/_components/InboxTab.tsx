import Link from "next/link";
import { Notification } from "./types";

interface InboxTabProps {
  unreadCount: number;
  markAllRead: () => Promise<void>;
  inboxLoading: boolean;
  pendingRequests: any[];
  myConnections: any[];
  notifications: Notification[];
  handleAcceptReject: (connectionId: string, action: "accept" | "reject") => Promise<void>;
  markOneRead: (id: string) => Promise<void>;
}

export default function InboxTab({
  unreadCount,
  markAllRead,
  inboxLoading,
  pendingRequests,
  myConnections,
  notifications,
  handleAcceptReject,
  markOneRead,
}: InboxTabProps) {
  return (
    <div className="s-content">
      <div className="s-page-header">
        <div>
          <h1>Inbox</h1>
          <p className="s-subtitle">Friend requests & notifications</p>
        </div>
        {unreadCount > 0 && (
          <button className="s-btn s-btn-outline" onClick={markAllRead}>
            Mark All Read
          </button>
        )}
      </div>

      <div className="s-section">
        <h2 className="s-section-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ion-icon name="person-add-outline"></ion-icon>Friend Requests{" "}
          {pendingRequests.length > 0 && (
            <span className="s-nav-count s-nav-count-alert">{pendingRequests.length}</span>
          )}
        </h2>
        {inboxLoading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "1.5rem" }}>
            <div className="s-spinner" />
          </div>
        ) : pendingRequests.length === 0 ? (
          <div style={{ padding: "1.5rem", textAlign: "center", color: "#64748b" }}>
            <p>No pending friend requests</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {pendingRequests.map((req) => (
              <div
                key={req.connection_id}
                className="s-card"
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
                    className="s-btn s-btn-primary s-btn-sm"
                    onClick={() => handleAcceptReject(req.connection_id, "accept")}
                  >
                    <ion-icon name="checkmark-outline"></ion-icon> Accept
                  </button>
                  <button
                    className="s-btn s-btn-sm"
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

      {myConnections.length > 0 && (
        <div className="s-section">
          <h2 className="s-section-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ion-icon name="people-outline"></ion-icon>Friends ({myConnections.length})
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {myConnections.map((conn) => (
              <div
                key={conn.connection_id}
                className="s-card"
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

      <div className="s-section">
        <h2 className="s-section-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ion-icon name="notifications-outline"></ion-icon>Notifications
        </h2>
        {notifications.length === 0 ? (
          <div className="s-empty-state">
            <div className="s-empty-icon">
              <ion-icon name="notifications-outline" style={{ fontSize: 48 }}></ion-icon>
            </div>
            <h3>No notifications</h3>
            <p>You&apos;ll see updates from your teachers and groups here.</p>
          </div>
        ) : (
          <div className="s-notif-list">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`s-notif-item ${!n.is_read ? "unread" : ""}`}
                onClick={() => !n.is_read && markOneRead(n.id)}
                style={{ cursor: !n.is_read ? "pointer" : "default" }}
              >
                <div className="s-notif-icon">
                  <ion-icon
                    name={
                      n.type === "connection_request"
                        ? "hand-left"
                        : n.type === "connection_accepted"
                          ? "people"
                          : n.type === "assignment_new"
                            ? "document-text"
                            : n.type === "assignment_graded"
                              ? "star"
                              : n.type === "xp_earned"
                                ? "flash"
                                : n.type === "group_joined"
                                  ? "people-circle"
                                  : "notifications"
                    }
                  ></ion-icon>
                </div>
                <div className="s-notif-body">
                  <div className="s-notif-title">{n.title}</div>
                  <div className="s-notif-msg">{n.message}</div>
                  <div className="s-notif-time">
                    {new Date(n.created_at).toLocaleDateString()} ·{" "}
                    {new Date(n.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
                {!n.is_read && <div className="s-notif-dot"></div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
