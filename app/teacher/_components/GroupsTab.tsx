import Link from "next/link";
import { Group } from "./types";

interface GroupsTabProps {
  groups: Group[];
  totalStudents: number;
  setActiveTab: any;
  copyCode: any;
  copyJoinLink: any;
  handleDeleteGroup: any;
}

export default function GroupsTab({
  groups,
  totalStudents,
  setActiveTab,
  copyCode,
  copyJoinLink,
  handleDeleteGroup,
}: GroupsTabProps) {
  return (
    <div className="t-content">
      <div className="t-page-header">
        <div>
          <h1>Your Groups</h1>
          <p className="t-subtitle">
            {groups.length} group{groups.length !== 1 ? "s" : ""} · {totalStudents} student
            {totalStudents !== 1 ? "s" : ""}
          </p>
        </div>
        <button className="t-btn t-btn-primary" onClick={() => setActiveTab("create-group")}>
          <ion-icon name="add-circle-outline"></ion-icon>
          New Group
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="t-empty-state">
          <div className="t-empty-icon">
            <ion-icon name="people-outline" style={{ fontSize: 48 }}></ion-icon>
          </div>
          <h3>No groups yet</h3>
          <p>Create a group and share the join code with your students.</p>
          <button className="t-btn t-btn-primary" onClick={() => setActiveTab("create-group")}>
            Create Group
          </button>
        </div>
      ) : (
        <div className="t-card-grid">
          {groups.map((g) => (
            <div key={g.id} className="t-group-card" style={{ borderTopColor: g.color }}>
              <div className="t-group-card-header">
                <div className="t-group-dot" style={{ background: g.color }}></div>
                <h3>{g.name}</h3>
              </div>
              <p className="t-group-desc">{g.description || "No description"}</p>
              <div className="t-group-footer">
                <span>
                  <ion-icon name="people-outline"></ion-icon> {g.member_count} members
                </span>
                <span>
                  <ion-icon name="document-text-outline"></ion-icon> {g.assignment_count} tasks
                </span>
              </div>
              <div className="t-group-code" onClick={() => copyCode(g.join_code)}>
                <span>
                  Join Code: <strong>{g.join_code}</strong>
                </span>
                <ion-icon name="copy-outline"></ion-icon>
              </div>
              <div className="t-group-code t-group-link" onClick={() => copyJoinLink(g.join_code)}>
                <span>
                  <ion-icon name="link-outline"></ion-icon> Copy Invite Link
                </span>
              </div>
              <div className="t-group-actions">
                <Link href={`/groups/${g.id}`} className="t-btn t-btn-sm t-btn-outline">
                  <ion-icon name="eye-outline"></ion-icon> Details
                </Link>
                <button
                  className="t-btn t-btn-sm t-btn-danger"
                  onClick={() => handleDeleteGroup(g.id)}
                >
                  <ion-icon name="trash-outline"></ion-icon> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
