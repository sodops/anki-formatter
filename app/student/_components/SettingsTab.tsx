interface SettingsTabProps {
  saveProfile: (e: React.FormEvent) => Promise<void>;
  savingProfile: boolean;
  editName: string;
  editNickname: string;
  editBio: string;
  editPhone: string;
  editAvatar: string;
  setEditName: (v: string) => void;
  setEditNickname: (v: string) => void;
  setEditBio: (v: string) => void;
  setEditPhone: (v: string) => void;
  setEditAvatar: (v: string) => void;
  user: any;
  role: string | null;
  signOut: () => Promise<void>;
  settings: any;
  updateSetting: (key: string, value: any) => void;
}

export default function SettingsTab({
  saveProfile,
  savingProfile,
  editName,
  editNickname,
  editBio,
  editPhone,
  editAvatar,
  setEditName,
  setEditNickname,
  setEditBio,
  setEditPhone,
  setEditAvatar,
  user,
  role,
  signOut,
  settings,
  updateSetting,
}: SettingsTabProps) {
  return (
    <div className="s-content">
      <div className="s-page-header">
        <h1>Settings</h1>
        <p className="s-subtitle">Manage your account and preferences</p>
      </div>

      <div className="s-section">
        <h2 className="s-section-title">Edit Profile</h2>
        <div className="t-settings-card">
          <form onSubmit={saveProfile} className="s-profile-form">
            <div className="s-form-row">
              <div className="s-form-group">
                <label>Display Name *</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Your full name"
                  maxLength={100}
                  required
                />
              </div>
              <div className="s-form-group">
                <label>Username</label>
                <input
                  type="text"
                  value={editNickname}
                  onChange={(e) =>
                    setEditNickname(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ""))
                  }
                  placeholder="username"
                  maxLength={50}
                />
                <span className="s-form-hint">
                  {editNickname
                    ? `anki.sodops.uz/profile/${editNickname}`
                    : "Set a username for your public profile URL"}
                </span>
              </div>
            </div>
            <div className="s-form-group">
              <label>Bio</label>
              <textarea
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                placeholder="Tell others about yourself..."
                rows={3}
                maxLength={500}
              />
              <span className="s-char-count">{editBio.length}/500</span>
            </div>
            <div className="s-form-row">
              <div className="s-form-group">
                <label>Phone</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="+998 90 123 45 67"
                  maxLength={20}
                />
              </div>
              <div className="s-form-group">
                <label>Avatar URL</label>
                <input
                  type="url"
                  value={editAvatar}
                  onChange={(e) => setEditAvatar(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                />
                <span className="s-form-hint">Paste a link to your profile picture</span>
              </div>
            </div>
            <button
              type="submit"
              className="s-btn s-btn-primary"
              disabled={savingProfile}
              style={{ marginTop: 8 }}
            >
              {savingProfile ? "Saving..." : "Save Profile"}
            </button>
          </form>
        </div>
      </div>

      <div className="s-section">
        <h2 className="s-section-title">Account</h2>
        <div className="t-settings-card">
          <div className="t-settings-account">
            <div className="s-user-avatar" style={{ width: 48, height: 48, fontSize: 20 }}>
              {user.user_metadata?.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url}
                  alt=""
                  style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
                />
              ) : (
                <span>
                  {(user.user_metadata?.full_name || user.email || "S").charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <div className="t-settings-account-name">
                {user.user_metadata?.full_name || user.email?.split("@")[0]}
              </div>
              <div className="t-settings-account-email">{user.email}</div>
              <div className="t-settings-account-role">Role: {role?.toUpperCase()}</div>
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <button className="s-btn s-btn-danger" onClick={signOut}>
              <ion-icon name="log-out-outline"></ion-icon>Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="s-section">
        <h2 className="s-section-title">Study Preferences</h2>
        <div className="t-settings-card">
          <div className="t-settings-row">
            <div>
              <div className="t-settings-label">Daily Goal</div>
              <div className="t-settings-sublabel">Cards to study per day</div>
            </div>
            <input
              type="number"
              className="t-settings-input"
              value={settings.dailyGoal}
              min={5}
              max={200}
              onChange={(e) => updateSetting("dailyGoal", Number(e.target.value))}
            />
          </div>
          <div className="t-settings-row">
            <div>
              <div className="t-settings-label">New Cards / Day</div>
              <div className="t-settings-sublabel">Max new cards introduced</div>
            </div>
            <input
              type="number"
              className="t-settings-input"
              value={settings.newCardsPerDay}
              min={0}
              max={100}
              onChange={(e) => updateSetting("newCardsPerDay", Number(e.target.value))}
            />
          </div>
          <div className="t-settings-row">
            <div>
              <div className="t-settings-label">Max Reviews / Day</div>
              <div className="t-settings-sublabel">Max reviews per session</div>
            </div>
            <input
              type="number"
              className="t-settings-input"
              value={settings.maxReviews}
              min={10}
              max={500}
              onChange={(e) => updateSetting("maxReviews", Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      <div className="s-section">
        <h2 className="s-section-title">Appearance</h2>
        <div className="t-settings-card">
          <div className="t-settings-row">
            <div>
              <div className="t-settings-label">Theme</div>
              <div className="t-settings-sublabel">Light or dark mode</div>
            </div>
            <button
              className="s-btn s-btn-outline"
              onClick={() => {
                if (typeof window !== "undefined" && (window as any).toggleTheme)
                  (window as any).toggleTheme();
              }}
            >
              <ion-icon name="sunny-outline"></ion-icon>Toggle
            </button>
          </div>
          <div className="t-settings-row">
            <div>
              <div className="t-settings-label">Card Font Size</div>
              <div className="t-settings-sublabel">Adjust flashcard text</div>
            </div>
            <input
              type="range"
              value={settings.cardFontSize}
              min={16}
              max={64}
              style={{ width: 120 }}
              onChange={(e) => {
                updateSetting("cardFontSize", Number(e.target.value));
                document.documentElement.style.setProperty(
                  "--card-font-size",
                  e.target.value + "px"
                );
              }}
            />
          </div>
        </div>
      </div>

      <div className="s-section">
        <h2 className="s-section-title">Audio & TTS</h2>
        <div className="t-settings-card">
          <div className="t-settings-row">
            <div>
              <div className="t-settings-label">Text-to-Speech</div>
              <div className="t-settings-sublabel">Auto-read cards aloud</div>
            </div>
            <label className="t-toggle">
              <input
                type="checkbox"
                checked={settings.tts}
                onChange={(e) => updateSetting("tts", e.target.checked)}
              />
              <span className="t-toggle-slider"></span>
            </label>
          </div>
          <div className="t-settings-row">
            <div>
              <div className="t-settings-label">Sound Effects</div>
              <div className="t-settings-sublabel">Sounds on correct/wrong</div>
            </div>
            <label className="t-toggle">
              <input
                type="checkbox"
                checked={settings.soundEffects}
                onChange={(e) => updateSetting("soundEffects", e.target.checked)}
              />
              <span className="t-toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>

      <div className="s-section">
        <h2 className="s-section-title">Algorithm</h2>
        <div className="t-settings-card">
          <div className="t-settings-row">
            <div>
              <div className="t-settings-label">Spaced Repetition</div>
              <div className="t-settings-sublabel">SM-2 or FSRS algorithm</div>
            </div>
            <select
              className="t-settings-select"
              value={settings.algorithm}
              onChange={(e) => updateSetting("algorithm", e.target.value)}
            >
              <option value="sm-2">SM-2 (Classic)</option>
              <option value="fsrs">FSRS (Modern)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="s-section">
        <h2 className="s-section-title">Data Management</h2>
        <div className="t-settings-card">
          <div className="t-settings-row">
            <div>
              <div className="t-settings-label">Export data</div>
              <div className="t-settings-sublabel">Download decks as JSON</div>
            </div>
            <a href="/api/backup/export" className="s-btn s-btn-outline s-btn-sm">
              <ion-icon name="download-outline"></ion-icon> Export
            </a>
          </div>
          <div className="t-settings-row">
            <div>
              <div className="t-settings-label">Import data</div>
              <div className="t-settings-sublabel">Restore from backup</div>
            </div>
            <a href="/app" className="s-btn s-btn-outline s-btn-sm">
              <ion-icon name="cloud-upload-outline"></ion-icon> Import
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
