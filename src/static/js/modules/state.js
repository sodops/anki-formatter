/**
 * State Management Module
 * Handles application state, localStorage persistence, and state accessors
 */

// Default state structure
const DEFAULT_STATE = {
    decks: [],
    activeDeckId: null,
    searchQuery: '',
    history: []
};

// Global state
export let STATE = { ...DEFAULT_STATE };

/**
 * Load state from localStorage
 */
export function loadState() {
    const saved = localStorage.getItem('ankiState');
    if (saved) {
        try {
            STATE = JSON.parse(saved);
            // Migration: add missing fields
            if (!STATE.searchQuery) STATE.searchQuery = '';
            if (!STATE.history) STATE.history = [];
        } catch (e) {
            console.error('Failed to load state:', e);
            STATE = { ...DEFAULT_STATE };
        }
    }
}

/**
 * Save state to localStorage
 */
export function saveState() {
    try {
        localStorage.setItem('ankiState', JSON.stringify(STATE));
    } catch (e) {
        console.error('Failed to save state:', e);
    }
}

/**
 * Get the currently active deck
 * @returns {Object|null} Active deck or null
 */
export function getActiveDeck() {
    return STATE.decks.find(d => d.id === STATE.activeDeckId) || null;
}

/**
 * Set active deck by ID
 * @param {string} id - Deck ID
 */
export function setActiveDeck(id) {
    STATE.activeDeckId = id;
    saveState();
}

/**
 * Generate unique ID
 * @returns {string} Unique ID
 */
export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Add action to history
 * @param {string} action - Action type
 * @param {Object} data - Action data
 */
export function addToHistory(action, data) {
    STATE.history.push({
        action,
        data,
        timestamp: Date.now()
    });
    // Keep only last 50 actions
    if (STATE.history.length > 50) {
        STATE.history = STATE.history.slice(-50);
    }
    saveState();
}
