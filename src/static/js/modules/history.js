/**
 * History Management Module
 * Handles Undo/Redo operations
 */

import { STATE, saveState, getActiveDeck } from './state.js';
import { renderWorkspace } from './card.js';
import { showToast } from './ui.js';

// Maximum history stack size
const MAX_HISTORY = 50;

/**
 * Add an action to history
 * @param {string} type - 'add', 'edit', 'delete'
 * @param {Object} data - details of the action
 */
export function addToHistory(type, data) {
    if(!STATE.history) STATE.history = [];
    
    // If we are in the middle of history stack (after undo), trunk it
    if (STATE.historyIndex < STATE.history.length - 1) {
        STATE.history = STATE.history.slice(0, STATE.historyIndex + 1);
    }
    
    STATE.history.push({ type, data, timestamp: Date.now() });
    
    // Limit size
    if (STATE.history.length > MAX_HISTORY) {
        STATE.history.shift();
    }
    
    STATE.historyIndex = STATE.history.length - 1;
}

/**
 * Undo last action
 */
export function undo() {
    if (STATE.historyIndex < 0 || !STATE.history || STATE.history.length === 0) {
        showToast('Nothing to undo', 'info');
        return;
    }
    
    const action = STATE.history[STATE.historyIndex];
    const deck = STATE.decks.find(d => d.id === action.data.deckId); // Use find directly in case active deck changed
    
    if (!deck) {
        showToast('Cannot undo: Deck not found', 'error');
        return;
    }
    
    // Inverse Logic
    switch(action.type) {
        case 'add':
            // Added cards -> Remove them
            // We need to identify them. data.cards contains added card objects.
            // Simplified: we just remove the top N cards if assuming they are at top?
            // No, unshift was used. So they are at index 0.
            if(action.data.cards) {
                deck.cards.splice(0, action.data.cards.length);
            }
            break;
            
        case 'delete':
            // Deleted card -> Add back
            // We need to put it back at original index
            if(action.data.card && action.data.index !== undefined) {
                deck.cards.splice(action.data.index, 0, action.data.card);
            }
            break;
            
        case 'edit':
            // Edited field -> Revert value
            if(action.data.index !== undefined && action.data.field) {
               if(action.data.field === 'term') deck.cards[action.data.index].term = action.data.oldValue;
               if(action.data.field === 'def') deck.cards[action.data.index].def = action.data.oldValue;
            }
            break;
    }
    
    STATE.historyIndex--;
    saveState();
    renderWorkspace();
    showToast('Undo successful');
}

/**
 * Redo last action
 */
export function redo() {
    if (!STATE.history || STATE.historyIndex >= STATE.history.length - 1) {
        showToast('Nothing to redo', 'info');
        return;
    }
    
    STATE.historyIndex++;
    const action = STATE.history[STATE.historyIndex];
    const deck = STATE.decks.find(d => d.id === action.data.deckId);
    
    if (!deck) {
        showToast('Cannot redo: Deck not found', 'error');
        return;
    }
    
    // Re-apply Logic
    switch(action.type) {
        case 'add':
             if(action.data.cards) {
                // Add back to top
                deck.cards.unshift(...action.data.cards);
            }
            break;
            
        case 'delete':
             if(action.data.index !== undefined) {
                deck.cards.splice(action.data.index, 1);
            }
            break;
            
        case 'edit':
            if(action.data.index !== undefined && action.data.field) {
               if(action.data.field === 'term') deck.cards[action.data.index].term = action.data.newValue;
               if(action.data.field === 'def') deck.cards[action.data.index].def = action.data.newValue;
            }
            break;
    }
    
    saveState();
    renderWorkspace();
    showToast('Redo successful');
}
