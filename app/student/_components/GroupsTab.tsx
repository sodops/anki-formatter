import Link from "next/link";
import { Group } from "./types";

interface GroupsTabProps {
  groups: Group[];
  joinCode: string;
  setJoinCode: (v: string) => void;
  handleJoinGroup: (e: React.FormEvent) => Promise<void>;
  joiningGroup: boolean;
  joinError: string;
  joinSuccess: string;
  handleLeaveGroup: (groupId: string, groupName: string) => Promise<void>;
}

export default function GroupsTab({
  groups,
  joinCode,
  setJoinCode,
  handleJoinGroup,
  joiningGroup,
  joinError,
  joinSuccess,
  handleLeaveGroup,
}: GroupsTabProps) {
  return (
    <div className="s-content">
      <div className="s-page-header">
        <h1>My Groups</h1>
        <p className="s-subtitle">
          {groups.length} group{groups.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="s-join-card">
        <h3>Join a Group</h3>
        <p className="s-join-desc">
          Use an invite link from your teacher, or enter the code manually
        </p>
        <form onSubmit={handleJoinGroup} className="s-join-form">
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="Paste invite code"
            maxLength={10}
            className="s-join-input"
          />
          <button
            type="submit"
            className="s-btn s-btn-primary"
            disabled={joiningGroup || !joinCode.trim()}
          >
            {joiningGroup ? "Joining..." : "Join"}
          </button>
        </form>
        {joinError && <div className="s-join-msg s-join-error">{joinError}</div>}
        {joinSuccess && <div className="s-join-msg s-join-success">{joinSuccess}</div>}
      </div>

      {groups.length > 0 && (
        <div className="s-card-grid">
          {groups.map((g) => (
            <Link
              key={g.id}
              href={`/groups/${g.id}`}
              className="s-group-card"
              style={{ borderTopColor: g.color, textDecoration: "none", color: "inherit" }}
            >
              <div className="s-group-header">
                <div className="s-group-dot" style={{ background: g.color }}></div>
                <h3>{g.name}</h3>
              </div>
              {g.description && <p className="s-group-desc">{g.description}</p>}
              <div className="s-group-stats">
                <span>
                  <ion-icon name="people-outline"></ion-icon> {g.member_count} members
                </span>
                <span>
                  <ion-icon name="document-text-outline"></ion-icon> {g.assignment_count} tasks
                </span>
              </div>
              <div className="s-group-footer">
                <span className="s-group-joined">
                  Joined {new Date(g.joined_at).toLocaleDateString()}
                </span>
                {!g.is_owner && (
                  <button
                    className="s-btn s-btn-danger s-btn-sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleLeaveGroup(g.id, g.name);
                    }}
                    title="Leave this group"
                  >
                    <ion-icon name="exit-outline"></ion-icon> Leave
                  </button>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
