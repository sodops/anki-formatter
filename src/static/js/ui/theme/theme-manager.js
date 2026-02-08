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
    // Load saved theme from store (persisted in localStorage via ankiState)
    const savedTheme = store.getState().theme;
    currentTheme = savedTheme || THEMES.AUTO;
    
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
    
    // Save to store (persisted to localStorage automatically)
    store.dispatch('THEME_SET', theme);
    
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
