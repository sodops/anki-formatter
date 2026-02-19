/**
 * Theme Manager Module
 * Handles light/dark theme switching
 */

import { store } from '../../core/store.js';

// Theme constants
export const THEMES = {
    LIGHT: 'light',
    DARK: 'dark',
    AUTO: 'auto'
};

let currentTheme = THEMES.AUTO;

/**
 * Initialize theme manager
 */
export function initThemeManager() {
    // Load saved theme from settings (primary) or store (fallback)
    const key = store.getScopedKey('ankiflow_settings');
    const settings = JSON.parse(localStorage.getItem(key) || '{}');
    
    // Check global theme keys first (set by layout.tsx inline script / theme.js)
    const globalExplicit = localStorage.getItem('ankiflow-theme-explicit');
    const globalTheme = localStorage.getItem('ankiflow-theme');
    
    // Priority: scoped settings > global explicit choice > store default (auto)
    let savedTheme;
    if (settings.theme) {
        savedTheme = settings.theme;
    } else if (globalExplicit === 'true' && globalTheme) {
        savedTheme = globalTheme;
    } else {
        // No explicit user choice — use auto (system detection)
        savedTheme = THEMES.AUTO;
    }
    
    currentTheme = savedTheme;
    
    // Apply theme
    applyTheme(currentTheme);
    
    // Setup system preference listener for auto mode
    setupSystemThemeListener();
}

/**
 * Apply theme to document
 */
function applyTheme(theme) {
    const html = document.documentElement;
    
    // Remove existing theme classes
    html.classList.remove('theme-light', 'theme-dark', 'theme-auto');
    
    // Add new theme class
    html.classList.add(`theme-${theme}`);
    
    // For auto theme, also check system preference
    if (theme === THEMES.AUTO) {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        html.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
        html.setAttribute('data-theme', theme);
    }
    
    currentTheme = theme;
}

/**
 * Switch theme
 * @param {string} theme - Theme to switch to (light/dark/auto)
 */
export function switchTheme(theme) {
    if (!Object.values(THEMES).includes(theme)) {
        console.error('Invalid theme:', theme);
        return;
    }
    
    applyTheme(theme);
    
    // Save to store state
    store.dispatch('THEME_SET', theme);
    
    // EXPLICITLY Save to settings for cloud sync
    try {
        const key = store.getScopedKey('ankiflow_settings');
        const current = JSON.parse(localStorage.getItem(key) || '{}');
        current.theme = theme;
        localStorage.setItem(key, JSON.stringify(current));
        
        // Trigger sync
        store._scheduleSyncToCloud();
    } catch (e) {
        console.error('Failed to save theme setting:', e);
    }
    
    // Add smooth transition effect
    document.body.style.transition = 'background-color 0.3s ease, color 0.3s ease';
    setTimeout(() => {
        document.body.style.transition = '';
    }, 300);
}

/**
 * Toggle between light and dark
 */
export function toggleTheme() {
    const newTheme = currentTheme === THEMES.LIGHT ? THEMES.DARK : THEMES.LIGHT;
    switchTheme(newTheme);
}

/**
 * Get current theme
 */
export function getCurrentTheme() {
    return currentTheme;
}

/**
 * Setup system theme change listener
 */
function setupSystemThemeListener() {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    mediaQuery.addEventListener('change', (e) => {
        // Only react if in auto mode
        if (currentTheme === THEMES.AUTO) {
            const html = document.documentElement;
            html.setAttribute('data-theme', e.matches ? 'dark' : 'light');
        }
    });
}
