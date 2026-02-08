/**
 * Storage Module (Compatibility Layer)
 * Wraps new Store for backward compatibility
 * DEPRECATED: Use core/store.js directly in new code
 */

import { store } from '../store.js';

// Proxy STATE to store for backward compatibility
export const STATE = new Proxy({}, {
    get: (target, prop) => {
        // Local properties not in store
        if (prop in target) return target[prop];
        return store.getState()[prop];
    },
    set: (target, prop, value) => {
        // For properties not managed by store (like showingTrash), store locally
        target[prop] = value;
        return true;
    }
});

/**
 * Load state from localStorage
 */
export function loadState() {
    return store.load();
}

/**
 * Save state to localStorage
 */
export function saveState() {
    store.persist();
}

/**
 * Get the currently active deck
 * @returns {Object|null} Active deck or null
 */
export function getActiveDeck() {
    return store.getActiveDeck();
}

/**
 * Set active deck by ID
 * @param {string} id - Deck ID
 */
export function setActiveDeck(id) {
    store.setActiveDeck(id);
}

/**
 * Generate unique ID
 * @returns {string} Unique ID
 */
export function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

/**
 * Add action to history
 * @param {string} action - Action type
 * @param {Object} data - Action data
 * @deprecated Use store.dispatch('UNDO'/'REDO') instead
 */
export function addToHistory(action, data) {
    // Legacy method - just log for now
    console.warn('addToHistory deprecated, use store.dispatch instead');
}

