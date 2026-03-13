import { COLORS } from "./types";

interface CreateGroupTabProps {
  groupName: string;
  setGroupName: (v: string) => void;
  groupDesc: string;
  setGroupDesc: (v: string) => void;
  groupColor: string;
  setGroupColor: (v: string) => void;
  submitting: boolean;
  handleCreateGroup: (e: React.FormEvent) => void;
}

export default function CreateGroupTab({
  groupName,
  setGroupName,
  groupDesc,
  setGroupDesc,
  groupColor,
  setGroupColor,
  submitting,
  handleCreateGroup,
}: CreateGroupTabProps) {
  return (
    <div className="t-content">
      <div className="t-page-header">
        <h1>Create New Group</h1>
      </div>
      <div className="t-form-card">
        <form onSubmit={handleCreateGroup}>
          <div className="t-form-group">
            <label>Group Name *</label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g., English 101"
              required
            />
          </div>
          <div className="t-form-group">
            <label>Description</label>
            <textarea
              value={groupDesc}
              onChange={(e) => setGroupDesc(e.target.value)}
              placeholder="Describe the group purpose..."
              rows={3}
            />
          </div>
          <div className="t-form-group">
            <label>Color</label>
            <div className="t-color-picker">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`t-color-swatch ${groupColor === c ? "active" : ""}`}
                  style={{ background: c }}
                  onClick={() => setGroupColor(c)}
                />
              ))}
            </div>
          </div>
          <button
            type="submit"
            className="t-btn t-btn-primary t-btn-lg"
            disabled={submitting || !groupName.trim()}
          >
            {submitting ? "Creating..." : "Create Group"}
          </button>
        </form>
      </div>
    </div>
  );
}
