interface SettingsTabProps {
  user: any;
  role: string | null;
  signOut: () => Promise<void>;
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
  settings: any;
  updateSetting: (key: string, value: any) => void;
}

export default function SettingsTab({
  user,
  role,
  signOut,
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
  settings,
  updateSetting,
}: SettingsTabProps) {
  return (
    <div className="t-content">
      <div className="t-page-header">
        <h1>Settings</h1>
        <p className="t-subtitle">Manage your account and preferences</p>
      </div>

      <div className="t-section">
        <h2 className="t-section-title">Account</h2>
        <div className="t-settings-card">
          <div className="t-settings-account">
            <div className="t-user-avatar" style={{ width: 48, height: 48, fontSize: 20 }}>
              {user.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} alt="" />
              ) : (
                <span>
                  {(user.user_metadata?.full_name || user.email || "T").charAt(0).toUpperCase()}
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
            <button className="t-btn t-btn-danger" onClick={signOut}>
              <ion-icon name="log-out-outline"></ion-icon>
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="t-section">
        <h2 className="t-section-title">Edit Profile</h2>
        <div className="t-settings-card">
          <form onSubmit={saveProfile} className="t-profile-form">
            <div className="t-form-row">
              <div className="t-form-group">
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
              <div className="t-form-group">
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
                <span className="t-form-hint">
                  {editNickname
                    ? `anki.sodops.uz/profile/${editNickname}`
                    : "Set a username for your public profile URL"}
                </span>
              </div>
            </div>
            <div className="t-form-group">
              <label>Bio</label>
              <textarea
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                placeholder="Tell your students about yourself, your teaching experience..."
                rows={3}
                maxLength={500}
              />
              <span className="t-char-count">{editBio.length}/500</span>
            </div>
            <div className="t-form-row">
              <div className="t-form-group">
                <label>Phone</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="+998 90 123 45 67"
                  maxLength={20}
                />
              </div>
              <div className="t-form-group">
                <label>Avatar URL</label>
                <input
                  type="url"
                  value={editAvatar}
                  onChange={(e) => setEditAvatar(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                />
                <span className="t-form-hint">Paste a link to your profile picture</span>
              </div>
            </div>
            <button
              type="submit"
              className="t-btn t-btn-primary"
              disabled={savingProfile}
              style={{ marginTop: 8 }}
            >
              {savingProfile ? "Saving..." : "Save Profile"}
            </button>
          </form>
        </div>
      </div>

      <div className="t-section">
        <h2 className="t-section-title">Study Preferences</h2>
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
              <div className="t-settings-sublabel">Max new cards introduced daily</div>
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
              <div className="t-settings-sublabel">Max review cards per session</div>
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

      <div className="t-section">
        <h2 className="t-section-title">Appearance</h2>
        <div className="t-settings-card">
          <div className="t-settings-row">
            <div>
              <div className="t-settings-label">Theme</div>
              <div className="t-settings-sublabel">Light or dark mode</div>
            </div>
            <button
              className="t-btn t-btn-outline"
              onClick={() => {
                if (typeof window !== "undefined" && (window as any).toggleTheme) {
                  (window as any).toggleTheme();
                }
              }}
            >
              <ion-icon name="sunny-outline"></ion-icon>
              Toggle
            </button>
          </div>
          <div className="t-settings-row">
            <div>
              <div className="t-settings-label">Card Font Size</div>
              <div className="t-settings-sublabel">Adjust flashcard text size</div>
            </div>
            <input
              type="range"
              value={settings.cardFontSize}
              min={16}
              max={64}
              style={{ width: 120 }}
              onChange={(e) => {
                const val = Number(e.target.value);
                updateSetting("cardFontSize", val);
                document.documentElement.style.setProperty("--card-font-size", val + "px");
              }}
            />
          </div>
        </div>
      </div>

      <div className="t-section">
        <h2 className="t-section-title">Audio & TTS</h2>
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

      <div className="t-section">
        <h2 className="t-section-title">Notifications</h2>
        <div className="t-settings-card">
          <div className="t-settings-row">
            <div>
              <div className="t-settings-label">Study Reminders</div>
              <div className="t-settings-sublabel">Get notified when it&apos;s time to review</div>
            </div>
            <label className="t-toggle">
              <input
                type="checkbox"
                checked={settings.studyReminders}
                onChange={(e) => updateSetting("studyReminders", e.target.checked)}
              />
              <span className="t-toggle-slider"></span>
            </label>
          </div>
          <div className="t-settings-row">
            <div>
              <div className="t-settings-label">Assignment Updates</div>
              <div className="t-settings-sublabel">Notify on student completions</div>
            </div>
            <label className="t-toggle">
              <input
                type="checkbox"
                checked={settings.assignmentUpdates}
                onChange={(e) => updateSetting("assignmentUpdates", e.target.checked)}
              />
              <span className="t-toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>

      <div className="t-section">
        <h2 className="t-section-title">Algorithm</h2>
        <div className="t-settings-card">
          <div className="t-settings-row">
            <div>
              <div className="t-settings-label">Spaced Repetition</div>
              <div className="t-settings-sublabel">Choose between SM-2 and FSRS</div>
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

      <div className="t-section">
        <h2 className="t-section-title">Data Management</h2>
        <div className="t-settings-card">
          <div className="t-settings-row">
            <div>
              <div className="t-settings-label">Export data</div>
              <div className="t-settings-sublabel">Download decks as JSON</div>
            </div>
            <a href="/api/backup/export" className="t-btn t-btn-outline t-btn-sm">
              <ion-icon name="download-outline"></ion-icon> Export
            </a>
          </div>
          <div className="t-settings-row">
            <div>
              <div className="t-settings-label">Import data</div>
              <div className="t-settings-sublabel">Restore from backup</div>
            </div>
            <a href="/app" className="t-btn t-btn-outline t-btn-sm">
              <ion-icon name="cloud-upload-outline"></ion-icon> Import
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
