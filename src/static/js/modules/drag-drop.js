/**
 * Drag & Drop Module
 * Handles card reordering via drag and drop
 */

import { getActiveDeck, saveState } from './state.js';
import { renderWorkspace } from './card.js';
import { showToast } from './ui.js';

let draggedElement = null;
let draggedIndex = null;

/**
 * Initialize drag and drop listeners
 * @param {HTMLElement} container - Container to attach listeners to (optional)
 */
export function setupDragDrop() {
    // Global prevention of default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        document.body.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
        }, false);
    });
}

/**
 * Handle drag start event
 */
export function handleDragStart(e) {
    draggedElement = e.currentTarget;
    draggedIndex = parseInt(draggedElement.dataset.cardIndex);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', draggedElement.innerHTML);
    e.currentTarget.style.opacity = '0.4';
}

/**
 * Handle drag over event
 */
export function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    
    // Add visual indicator
    const targetRow = e.currentTarget;
    if (targetRow && targetRow !== draggedElement) {
        targetRow.classList.add('drag-over');
    }
    
    return false;
}

/**
 * Handle drop event
 */
export function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }
    
    const targetRow = e.currentTarget;
    targetRow.classList.remove('drag-over');
    
    if (draggedElement && draggedElement !== targetRow) {
        const targetIndex = parseInt(targetRow.dataset.cardIndex);
        
        // Reorder cards in deck
        const deck = getActiveDeck();
        if (deck && draggedIndex !== null && targetIndex !== null) {
            const [movedCard] = deck.cards.splice(draggedIndex, 1);
            deck.cards.splice(targetIndex, 0, movedCard);
            
            saveState();
            renderWorkspace();
            showToast(`Card reordered`);
        }
    }
    
    return false;
}

/**
 * Handle drag end event
 */
export function handleDragEnd(e) {
    e.currentTarget.style.opacity = '';
    
    // Remove drag-over class from all rows
    document.querySelectorAll('.drag-over').forEach(row => {
        row.classList.remove('drag-over');
    });
    
    draggedElement = null;
    draggedIndex = null;
}
