/**
 * Theme Toggle Functionality
 * Supports: Dark, Light, Auto (system preference)
 */

// Get saved theme or default to 'dark'
function getTheme() {
  if (typeof window === "undefined") return "dark";
  const saved = localStorage.getItem("ankiflow-theme");
  if (saved) return saved;

  // Check system preference
  if (window.matchMedia("(prefers-color-scheme: light)").matches) {
    return "light";
  }
  return "dark";
}

// Apply theme
function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("ankiflow-theme", theme);

  // Update icon
  const icon = document.querySelector(".sidebar-theme-btn ion-icon") || document.querySelector(".theme-toggle ion-icon");
  if (icon) {
    icon.setAttribute("name", theme === "light" ? "moon-outline" : "sunny-outline");
  }
}

// Toggle theme
function toggleTheme() {
  const current = getTheme();
  const next = current === "dark" ? "light" : "dark";
  setTheme(next);
}

// Initialize on page load
if (typeof document !== "undefined") {
  // Apply immediately to prevent flash
  setTheme(getTheme());

  // Listen for system preference changes
  window
    .matchMedia("(prefers-color-scheme: light)")
    .addEventListener("change", (e) => {
      const savedTheme = localStorage.getItem("ankiflow-theme");
      if (!savedTheme) {
        // Only auto-switch if user hasn't set preference
        setTheme(e.matches ? "light" : "dark");
      }
    });
}

// Export for use in other modules
if (typeof module !== "undefined") {
  module.exports = { getTheme, setTheme, toggleTheme };
}
