/**
 * Offline Indicator and Sync Status Manager
 * Displays user-facing UI for connection status and pending cloud sync operations
 * 
 * @typedef {'idle'|'syncing'|'success'|'error'} SyncStatus
 * @typedef {'success'|'error'|'warning'|'info'} ToastType
 * 
 * Features:
 * - Shows/hides indicator based on online status and pending changes
 * - Auto-syncs when connection restored
 * - Displays modal with detailed sync status on click
 * - Shows toast notifications for state transitions
 * - Listens to global sync events (ankiflow:sync-start, ankiflow:sync-success, etc.)
 * 
 * Events Emitted:
 * - ankiflow:sync-start - When sync begins
 * - ankiflow:sync-success - When sync completes
 * - ankiflow:sync-error - When sync fails
 * - ankiflow:change-pending - When pending changes count updates
 * 
 * @example
 * // Update pending changes
 * offlineManager.setPendingChanges(5);
 * 
 * // Update sync status
 * offlineManager.setSyncStatus('syncing');
 */
class OfflineManager {
  /**
   * Initialize offline manager
   * @constructor
   */
  constructor() {
    /** @type {boolean} - True if device has internet connection */
    this.isOnline = navigator.onLine;
    
    /** @type {number} - Count of unsaved local changes */
    this.pendingChanges = 0;
    
    /** @type {HTMLElement|null} - DOM element for status indicator */
    this.indicator = null;
    
    /** @type {SyncStatus} - Current sync operation status */
    this.syncStatus = "idle"; // idle, syncing, success, error
    
    this.init();
  }

  /**
   * Initialize the offline manager
   * Creates DOM indicator and sets up event listeners
   */
  init() {
    this.createIndicator();
    this.setupEventListeners();
    this.updateIndicator();
  }

  /**
   * Create and inject indicator DOM element into page
   * Shows fixed position indicator in bottom-right corner
   * @private
   */
  createIndicator() {
    this.indicator = document.createElement("div");
    this.indicator.id = "offline-indicator";
    this.indicator.style.cssText = `
      position: fixed;
      bottom: 1rem;
      right: 1rem;
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 0.75rem 1rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 9000;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.3s ease;
      opacity: 0;
      transform: translateY(20px);
      pointer-events: none;
    `;

    this.indicator.onclick = () => this.showDetails();
    document.body.appendChild(this.indicator);
  }

  /**
   * Attach listeners for online/offline events and sync updates
   * @private
   */
  setupEventListeners() {
    window.addEventListener("online", () => {
      this.isOnline = true;
      this.updateIndicator();
      this.showToast("✓ Internet qayta ulandi", "success");
      // Auto-sync when back online
      if (this.pendingChanges > 0) {
        setTimeout(() => this.triggerSync(), 1000);
      }
    });

    window.addEventListener("offline", () => {
      this.isOnline = false;
      this.updateIndicator();
      this.showToast("⚠ Offline rejim. O'zgarishlar keshda saqlanadi", "warning");
    });

    // Listen for sync events
    window.addEventListener("ankiflow:sync-start", () => {
      this.syncStatus = "syncing";
      this.updateIndicator();
    });

    window.addEventListener("ankiflow:sync-success", () => {
      this.syncStatus = "success";
      this.pendingChanges = 0;
      this.updateIndicator();
      setTimeout(() => {
        this.syncStatus = "idle";
        this.updateIndicator();
      }, 3000);
    });

    window.addEventListener("ankiflow:sync-error", (e) => {
      this.syncStatus = "error";
      this.updateIndicator();
      setTimeout(() => {
        this.syncStatus = "idle";
        this.updateIndicator();
      }, 5000);
    });

    // Listen for pending changes
    window.addEventListener("ankiflow:change-pending", (e) => {
      this.pendingChanges = e.detail?.count || this.pendingChanges + 1;
      this.updateIndicator();
    });
  }

  updateIndicator() {
    if (!this.indicator) return;

    const shouldShow = !this.isOnline || this.syncStatus !== "idle" || this.pendingChanges > 0;

    if (shouldShow) {
      this.indicator.style.opacity = "1";
      this.indicator.style.transform = "translateY(0)";
      this.indicator.style.pointerEvents = "auto";
    } else {
      this.indicator.style.opacity = "0";
      this.indicator.style.transform = "translateY(20px)";
      this.indicator.style.pointerEvents = "none";
    }

    let icon = "";
    let text = "";
    let color = "var(--text-primary)";
    let bgColor = "var(--bg-secondary)";

    if (!this.isOnline) {
      icon = "📡";
      text = "Offline";
      color = "#f59e0b";
      bgColor = "#fef3c7";
    } else if (this.syncStatus === "syncing") {
      icon = "🔄";
      text = "Sinxronlanmoqda...";
      color = "#3b82f6";
    } else if (this.syncStatus === "success") {
      icon = "✓";
      text = "Saqlandi";
      color = "#22c55e";
    } else if (this.syncStatus === "error") {
      icon = "⚠";
      text = "Sync xatosi";
      color = "#ef4444";
    } else if (this.pendingChanges > 0) {
      icon = "💾";
      text = `${this.pendingChanges} o'zgarish saqlanmagan`;
      color = "#f59e0b";
    }

    this.indicator.innerHTML = `
      <span style="font-size: 1.25rem;">${icon}</span>
      <span style="color: ${color}; font-weight: 600;">${text}</span>
    `;

    if (!this.isOnline) {
      this.indicator.style.background = bgColor;
      this.indicator.style.borderColor = color;
    } else {
      this.indicator.style.background = "var(--bg-secondary)";
      this.indicator.style.borderColor = "var(--border)";
    }
  }

  showDetails() {
    const modal = document.createElement("div");
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      animation: fadeIn 0.2s ease-out;
    `;

    const content = document.createElement("div");
    content.style.cssText = `
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 2rem;
      max-width: 450px;
      width: 90%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    `;

    const statusIcon = this.isOnline ? "✓" : "⚠";
    const statusColor = this.isOnline ? "#22c55e" : "#f59e0b";
    const statusText = this.isOnline ? "Online" : "Offline";

    content.innerHTML = `
      <div style="text-align: center; margin-bottom: 1.5rem;">
        <div style="font-size: 3rem; margin-bottom: 0.5rem;">${statusIcon}</div>
        <h2 style="margin: 0; font-size: 1.5rem; color: ${statusColor};">${statusText}</h2>
      </div>
      
      <div style="background: var(--bg-primary); border: 1px solid var(--border); border-radius: 8px; padding: 1rem; margin-bottom: 1rem;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 0.75rem;">
          <span style="color: var(--text-secondary);">Internet</span>
          <span style="font-weight: 600; color: ${statusColor};">${statusText}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 0.75rem;">
          <span style="color: var(--text-secondary);">Saqlanmagan o'zgarishlar</span>
          <span style="font-weight: 600;">${this.pendingChanges}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: var(--text-secondary);">Sync holati</span>
          <span style="font-weight: 600;">${this.getSyncStatusText()}</span>
        </div>
      </div>

      ${!this.isOnline ? `
        <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 1rem; margin-bottom: 1rem;">
          <p style="margin: 0; font-size: 0.875rem; color: #92400e;">
            <strong>Offline rejim:</strong><br>
            Barcha o'zgarishlar lokal keshda saqlanadi va internet qaytganda avtomatik sinxronlanadi.
          </p>
        </div>
      ` : ""}

      <div style="display: flex; gap: 0.75rem;">
        ${this.pendingChanges > 0 && this.isOnline ? `
          <button id="sync-now-btn" style="
            flex: 1;
            padding: 0.75rem;
            background: var(--accent);
            color: white;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
          ">Hozir sinxronlash</button>
        ` : ""}
        <button id="close-sync-modal" style="
          flex: 1;
          padding: 0.75rem;
          background: var(--bg-tertiary);
          color: var(--text-primary);
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
        ">Yopish</button>
      </div>
    `;

    modal.appendChild(content);
    document.body.appendChild(modal);

    modal.onclick = (e) => {
      if (e.target === modal) modal.remove();
    };

    const closeBtn = content.querySelector("#close-sync-modal");
    if (closeBtn) closeBtn.onclick = () => modal.remove();

    const syncBtn = content.querySelector("#sync-now-btn");
    if (syncBtn) {
      syncBtn.onclick = () => {
        this.triggerSync();
        modal.remove();
      };
    }
  }

  getSyncStatusText() {
    switch (this.syncStatus) {
      case "syncing":
        return "Sinxronlanmoqda...";
      case "success":
        return "Muvaffaqiyatli ✓";
      case "error":
        return "Xatolik ⚠";
      default:
        return "Tayyor";
    }
  }

  /**
   * Trigger a cloud sync operation
   * Calls global sync function if available, no-op otherwise
   * @public
   */
  triggerSync() {
    // Trigger sync via global function if available
    if (window.__ankiflow_triggerSync) {
      window.__ankiflow_triggerSync();
    } else {
      console.log("Sync function not available");
    }
  }

  /**
   * Show toast notification at top-right
   * @param {string} message - Message text to display
   * @param {ToastType} [type='info'] - Toast type (determines color)
   * @public
   */
  showToast(message, type = "info") {
    const toast = document.createElement("div");
    const colors = {
      success: "#22c55e",
      error: "#ef4444",
      warning: "#f59e0b",
      info: "#3b82f6",
    };

    toast.style.cssText = `
      position: fixed;
      top: 1rem;
      right: 1rem;
      background: ${colors[type] || colors.info};
      color: white;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 10001;
      animation: slideInRight 0.3s ease-out;
      font-size: 0.875rem;
      font-weight: 500;
    `;
    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = "slideOutRight 0.3s ease-out";
      setTimeout(() => toast.remove(), 300);
    }, 4000);

    // Add animations if not present
    if (!document.getElementById("toast-animations-offline")) {
      const style = document.createElement("style");
      style.id = "toast-animations-offline";
      style.textContent = `
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOutRight {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }
  }

  /**
   * Update pending changes count and refresh indicator
   * @param {number} count - New pending changes count
   * @public
   */
  setPendingChanges(count) {
    this.pendingChanges = count;
    this.updateIndicator();
  }

  /**
   * Update sync status and refresh indicator
   * @param {SyncStatus} status - New sync status
   * @public
   */
  setSyncStatus(status) {
    this.syncStatus = status;
    this.updateIndicator();
  }
}

// Initialize and export
export const offlineManager = new OfflineManager();
