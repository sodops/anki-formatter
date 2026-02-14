/**
 * Theme Toggle Functionality
 * Supports: Dark, Light, Auto (system preference)
 * 
 * Default: follows system preference (prefers-color-scheme)
 * Only saves to localStorage when user explicitly toggles
 */

// Get the effective theme to apply
function getTheme() {
  if (typeof window === "undefined") return "dark";

  // Check if user has explicitly set a preference
  const saved = localStorage.getItem("ankiflow-theme");
  if (saved === "light" || saved === "dark") return saved;

  // No explicit preference — follow system
  if (window.matchMedia("(prefers-color-scheme: light)").matches) {
    return "light";
  }
  return "dark";
}

// Apply theme to the page (does NOT save to localStorage)
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);

  // Update icon on both sidebar button and floating button (if present)
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

// Toggle theme (user explicit action — saves to localStorage)
function toggleTheme() {
  const current = getTheme();
  const next = current === "dark" ? "light" : "dark";
  localStorage.setItem("ankiflow-theme", next);
  applyTheme(next);
}

// Expose globally for React onClick handlers
window.toggleTheme = toggleTheme;

// Initialize on page load
if (typeof document !== "undefined") {
  // Apply immediately to prevent flash (FOUC)
  applyTheme(getTheme());

  // Listen for system preference changes — auto-switch if user hasn't set preference
  window
    .matchMedia("(prefers-color-scheme: light)")
    .addEventListener("change", (e) => {
      const saved = localStorage.getItem("ankiflow-theme");
      if (!saved) {
        // Only auto-switch if user hasn't explicitly toggled
        applyTheme(e.matches ? "light" : "dark");
      }
    });
}

// Export for use in other modules
if (typeof module !== "undefined") {
  module.exports = { getTheme, applyTheme, toggleTheme };
}
