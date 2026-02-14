/**
 * Theme Toggle Functionality
 * Supports: Dark, Light, Auto (system preference)
 *
 * Default: follows system preference (prefers-color-scheme)
 * Only overrides system when user explicitly toggles via button
 */

// Check if user has EXPLICITLY chosen a theme (not old auto-saved values)
function hasUserExplicitChoice() {
  return localStorage.getItem("ankiflow-theme-explicit") === "true";
}

// Get the effective theme to apply
function getTheme() {
  if (typeof window === "undefined") return "dark";

  // Only use saved theme if user EXPLICITLY toggled it
  if (hasUserExplicitChoice()) {
    const saved = localStorage.getItem("ankiflow-theme");
    if (saved === "light" || saved === "dark") return saved;
  }

  // Follow system preference
  if (window.matchMedia("(prefers-color-scheme: light)").matches) {
    return "light";
  }
  return "dark";
}

// Apply theme to the page (does NOT save to localStorage)
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);

  // Update icon on sidebar button / floating button
  const icon =
    document.querySelector(".sidebar-theme-btn ion-icon") ||
    document.querySelector(".theme-toggle ion-icon");
  if (icon) {
    icon.setAttribute(
      "name",
      theme === "light" ? "moon-outline" : "sunny-outline"
    );
  }
}

// Toggle theme — explicit user action, saves to localStorage
function toggleTheme() {
  const current = getTheme();
  const next = current === "dark" ? "light" : "dark";
  localStorage.setItem("ankiflow-theme", next);
  localStorage.setItem("ankiflow-theme-explicit", "true");
  applyTheme(next);
}

// Expose globally for React onClick handlers
window.toggleTheme = toggleTheme;

// Initialize on page load
if (typeof document !== "undefined") {
  // Clean up old auto-saved values (migration from old code)
  // If theme was saved but no explicit flag exists, remove old saved value
  if (
    localStorage.getItem("ankiflow-theme") &&
    !localStorage.getItem("ankiflow-theme-explicit")
  ) {
    localStorage.removeItem("ankiflow-theme");
  }

  // Apply immediately to prevent flash (FOUC)
  applyTheme(getTheme());

  // Listen for system preference changes
  window
    .matchMedia("(prefers-color-scheme: light)")
    .addEventListener("change", (e) => {
      if (!hasUserExplicitChoice()) {
        applyTheme(e.matches ? "light" : "dark");
      }
    });
}

// Export for use in other modules
if (typeof module !== "undefined") {
  module.exports = { getTheme, applyTheme, toggleTheme };
}
