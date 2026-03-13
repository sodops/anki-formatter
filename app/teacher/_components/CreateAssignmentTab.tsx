import Link from "next/link";
import { Deck, Group } from "./types";

interface CreateAssignmentTabProps {
  groups: Group[];
  decks: Deck[];
  assignGroup: string;
  assignTitle: string;
  assignDesc: string;
  assignDeadline: string;
  assignXP: number;
  assignDecks: string[];
  setAssignGroup: (value: string) => void;
  setAssignTitle: (value: string) => void;
  setAssignDesc: (value: string) => void;
  setAssignDeadline: (value: string) => void;
  setAssignXP: (value: number) => void;
  setAssignDecks: React.Dispatch<React.SetStateAction<string[]>>;
  handleCreateAssignment: (e: React.FormEvent) => Promise<void>;
  submitting: boolean;
  setActiveTab: (tab: string) => void;
}

export default function CreateAssignmentTab({
  groups,
  decks,
  assignGroup,
  assignTitle,
  assignDesc,
  assignDeadline,
  assignXP,
  assignDecks,
  setAssignGroup,
  setAssignTitle,
  setAssignDesc,
  setAssignDeadline,
  setAssignXP,
  setAssignDecks,
  handleCreateAssignment,
  submitting,
  setActiveTab,
}: CreateAssignmentTabProps) {
  return (
    <div className="t-content">
      <div className="t-page-header">
        <h1>Create New Assignment</h1>
      </div>
      {groups.length === 0 ? (
        <div className="t-empty-state">
          <div className="t-empty-icon">
            <ion-icon name="alert-circle-outline" style={{ fontSize: 48 }}></ion-icon>
          </div>
          <h3>Create a group first</h3>
          <p>You need at least one group before creating assignments.</p>
          <button className="t-btn t-btn-primary" onClick={() => setActiveTab("create-group")}>
            Create Group
          </button>
        </div>
      ) : (
        <div className="t-form-card">
          <form onSubmit={handleCreateAssignment}>
            <div className="t-form-group">
              <label>Group *</label>
              <select value={assignGroup} onChange={(e) => setAssignGroup(e.target.value)} required>
                <option value="">Select a group...</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.member_count} members)
                  </option>
                ))}
              </select>
            </div>
            <div className="t-form-group">
              <label>Title *</label>
              <input
                type="text"
                value={assignTitle}
                onChange={(e) => setAssignTitle(e.target.value)}
                placeholder="e.g., Week 1 Vocabulary"
                required
              />
            </div>
            <div className="t-form-group">
              <label>Description</label>
              <textarea
                value={assignDesc}
                onChange={(e) => setAssignDesc(e.target.value)}
                placeholder="Instructions for students..."
                rows={3}
              />
            </div>
            <div className="t-form-row">
              <div className="t-form-group">
                <label>Deadline</label>
                <input
                  type="datetime-local"
                  value={assignDeadline}
                  onChange={(e) => setAssignDeadline(e.target.value)}
                />
              </div>
              <div className="t-form-group">
                <label>XP Reward</label>
                <input
                  type="number"
                  value={assignXP}
                  onChange={(e) => setAssignXP(Number(e.target.value))}
                  min={0}
                  max={1000}
                />
              </div>
            </div>
            <div className="t-form-group">
              <label>
                Decks to Study {assignDecks.length > 0 && `(${assignDecks.length} selected)`}
              </label>
              {decks.length > 0 ? (
                <div className="t-deck-select">
                  {decks.map((d) => (
                    <label
                      key={d.id}
                      className={`t-deck-option ${assignDecks.includes(d.id) ? "selected" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={assignDecks.includes(d.id)}
                        onChange={(e) => {
                          if (e.target.checked) setAssignDecks((prev) => [...prev, d.id]);
                          else setAssignDecks((prev) => prev.filter((id) => id !== d.id));
                        }}
                      />
                      <span className="t-deck-option-name">{d.name}</span>
                      {d.cards_count !== undefined && (
                        <span className="t-deck-option-count">{d.cards_count} cards</span>
                      )}
                    </label>
                  ))}
                </div>
              ) : (
                <div className="t-deck-select-empty">
                  <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "14px" }}>
                    No decks available. Go to{" "}
                    <Link
                      href="/app/study"
                      style={{ color: "var(--primary)", textDecoration: "underline" }}
                    >
                      Flashcards
                    </Link>{" "}
                    to create or import decks first.
                  </p>
                </div>
              )}
            </div>
            <button
              type="submit"
              className="t-btn t-btn-primary t-btn-lg"
              disabled={
                submitting || !assignTitle.trim() || !assignGroup || assignDecks.length === 0
              }
            >
              {submitting ? "Creating..." : "Create Assignment"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
