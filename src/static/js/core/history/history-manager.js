/**
 * History Management Module
 * Undo/Redo functionality for the store
 */

import { store } from '../store.js';

/**
 * Undo the last action
 */
export function undo() {
    store.dispatch('UNDO');
}

/**
 * Redo the last undone action
 */
export function redo() {
    store.dispatch('REDO');
}

