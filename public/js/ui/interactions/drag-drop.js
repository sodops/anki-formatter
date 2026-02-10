/**
 * Drag & Drop Module
 * Handles card reordering via drag and drop
 */

import { store } from '../../core/store.js';
import { renderWorkspace } from '../../features/library/card-manager.js';
import { showToast } from '../components/ui.js';

let draggedElement = null;
let draggedIndex = null;

/**
 * Initialize drag and drop listeners
 * Only prevent defaults on the card table, not globally
 */
export function setupDragDrop() {
    const tableBody = document.getElementById('tableBody');
    if (tableBody) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            tableBody.addEventListener(eventName, (e) => {
                e.preventDefault();
            }, false);
        });
    }
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
        
        // Reorder cards in deck via store
        const deck = store.getActiveDeck();
        if (deck && draggedIndex !== null && !isNaN(targetIndex) && draggedIndex !== targetIndex) {
            const newCards = [...deck.cards];
            const [movedCard] = newCards.splice(draggedIndex, 1);
            newCards.splice(targetIndex, 0, movedCard);
            
            store.dispatch('DECK_UPDATE', {
                deckId: deck.id,
                updates: { cards: newCards }
            });
            
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
