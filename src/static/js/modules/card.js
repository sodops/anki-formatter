/**
 * Card Operations Module
 * Card CRUD, Workspace Rendering, Tag Management
 */

import { STATE, saveState, getActiveDeck, addToHistory } from './state.js';
import { dom } from './dom.js';
import { ui, escapeHtml, showToast } from './ui.js';
import { renderMarkdown } from './markdown.js';
import { handleDragStart, handleDragOver, handleDrop, handleDragEnd } from './drag-drop.js';

/**
 * Render the workspace (card table)
 */
export function renderWorkspace() {
    const deck = getActiveDeck();
    if (!deck) {
        // Hide workspace if no deck active
        // But usually we just show empty state or placeholder
        dom.currentDeckTitle.textContent = "Select a Deck";
        dom.tableBody.innerHTML = '';
        dom.countTotal.textContent = '0';
        dom.countIssues.classList.add('hidden');
        dom.emptyState.classList.remove('hidden');
        dom.emptyState.querySelector('p').textContent = 'Select or create a deck to get started.';
        return;
    }

    dom.currentDeckTitle.textContent = deck.name;
    
    // Get filtered cards
    const allCards = deck.cards;
    const filteredCards = getFilteredCards(allCards);
    
    // Update counts
    dom.countTotal.textContent = STATE.searchQuery 
        ? `${filteredCards.length} / ${allCards.length}` 
        : allCards.length;
    
    // Check issues (in all cards, not just filtered)
    const issues = allCards.filter(c => !c.term || !c.def).length;
    dom.countIssues.textContent = `${issues} Issues`;
    dom.countIssues.classList.toggle('hidden', issues === 0);

    dom.tableBody.innerHTML = '';

    if (filteredCards.length === 0) {
        dom.emptyState.classList.remove('hidden');
        // Update empty state message if searching
        if (STATE.searchQuery) {
            dom.emptyState.querySelector('p').textContent = 'No cards match your search.';
        } else {
            dom.emptyState.querySelector('p').textContent = 'No cards yet. Type "word - definition" above to add your first card!';
        }
    } else {
        dom.emptyState.classList.add('hidden');
        filteredCards.forEach((card) => {
            const tr = document.createElement('tr');
            const originalIndex = allCards.indexOf(card); // Get original index for editing
            
            // Check validity
            if (!card.term || !card.def) tr.className = 'row-error';
            else if (!card.term.trim() || !card.def.trim()) tr.className = 'row-warning';
            
            // Ensure tags array exists
            if (!card.tags) card.tags = [];
            
            // Create tag badges HTML
            // Note: onclick handlers need to be attached differently or exposed globally if we use onclick string
            // We'll use event delegation for tags in setupEventListeners normally, but here we can't easily.
            // Best approach: Create elements safely.
            
            // Make row draggable
            tr.setAttribute('draggable', 'true');
            tr.dataset.cardIndex = originalIndex;
            
            // Term Cell
            const termTd = document.createElement('td');
            const termInput = document.createElement('input');
            termInput.type = 'text';
            termInput.className = 'editable-cell';
            termInput.style.width = '100%';
            termInput.value = card.term;
            termInput.onchange = (e) => updateCard(originalIndex, 'term', e.target.value);
            termTd.appendChild(termInput);

            // Def Cell
            const defTd = document.createElement('td');
            const defInput = document.createElement('input');
            defInput.type = 'text';
            defInput.className = 'editable-cell';
            defInput.style.width = '100%';
            defInput.value = card.def;
            defInput.onchange = (e) => updateCard(originalIndex, 'def', e.target.value);
            defTd.appendChild(defInput);

            // Tags Cell
            const tagsTd = document.createElement('td');
            tagsTd.className = 'tags-cell';
            const tagsContainer = document.createElement('div');
            tagsContainer.className = 'tags-container';
            
            card.tags.forEach(tag => {
                const tagSpan = document.createElement('span');
                tagSpan.className = 'tag-badge';
                tagSpan.innerHTML = `${escapeHtml(tag)} <button class="tag-remove">&times;</button>`;
                tagSpan.querySelector('.tag-remove').onclick = () => removeTag(originalIndex, tag);
                tagsContainer.appendChild(tagSpan);
            });

            const tagInput = document.createElement('input');
            tagInput.type = 'text';
            tagInput.className = 'tag-input';
            tagInput.placeholder = 'Add tag...';
            tagInput.onkeydown = (e) => handleTagInput(e, originalIndex);
            tagsContainer.appendChild(tagInput);
            
            tagsTd.appendChild(tagsContainer);

            // Actions Cell
            const actionTd = document.createElement('td');
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'action-btn secondary';
            deleteBtn.style.padding = '4px';
            deleteBtn.innerHTML = '<ion-icon name="close"></ion-icon>';
            deleteBtn.onclick = () => removeCard(originalIndex);
            actionTd.appendChild(deleteBtn);

            // Drag Handle
            const dragTd = document.createElement('td');
            dragTd.className = 'drag-handle';
            dragTd.innerHTML = '<ion-icon name="reorder-two-outline"></ion-icon>';

            // Assemble Row
            tr.appendChild(dragTd);
            tr.appendChild(termTd);
            tr.appendChild(defTd);
            tr.appendChild(tagsTd);
            tr.appendChild(actionTd);
            
            // Add drag event listeners
            tr.addEventListener('dragstart', handleDragStart);
            tr.addEventListener('dragover', handleDragOver);
            tr.addEventListener('drop', handleDrop);
            tr.addEventListener('dragend', handleDragEnd);
            
            dom.tableBody.appendChild(tr);
        });
    }
}

/**
 * Filter cards based on search query
 * @param {Array} cards - List of cards
 * @returns {Array} Filtered cards
 */
export function getFilteredCards(cards) {
    if (!STATE.searchQuery) return cards;
    const query = STATE.searchQuery.toLowerCase();
    return cards.filter(card => 
        (card.term || '').toLowerCase().includes(query) || 
        (card.def || '').toLowerCase().includes(query)
    );
}

/**
 * Update a card field
 * @param {number} index - Card index
 * @param {string} field - Field name ('term' or 'def')
 * @param {string} value - New value
 */
export function updateCard(index, field, value) {
    const deck = getActiveDeck();
    const oldValue = field === 'term' ? deck.cards[index].term : deck.cards[index].def;
    
    // Track in history
    addToHistory('edit', {
        deckId: deck.id,
        index: index,
        field: field,
        oldValue: oldValue,
        newValue: value
    });
    
    if(field === 'term') deck.cards[index].term = value;
    if(field === 'def') deck.cards[index].def = value;
    saveState();
    // No need to renderWorkspace for simple text change if using input.value
    // But to be safe and update counts/status
    // renderWorkspace(); // Might lose focus? 
    // Usually we don't re-render entire table on single cell edit to keep focus.
    // If we re-render, focus is lost.
    // So separate logic:
    // Only saveState is strictly needed. State is updated.
    
    // Check if we need to update status (warning/error row class)
    // We can do this without full re-render
    const tr = dom.tableBody.children[index]; // Note: index matches if not filtered. If filtered, this map is wrong.
    // If filtered, index passed here is originalIndex. We need to find the row with data-cardIndex == originalIndex
    if (STATE.searchQuery) {
        // pass
    }
}

/**
 * Add a new card
 * @param {string} term 
 * @param {string} def 
 */
export function addCard(term, def) {
    const deck = getActiveDeck();
    if (!deck) return;

    if (!term && !def) return; // Ignore empty

    const newCard = { term, def, tags: [] };
    deck.cards.unshift(newCard);
    
    addToHistory('add', {
        deckId: deck.id,
        count: 1,
        cards: [newCard]
    });
    
    saveState();
    renderWorkspace();
}

/**
 * Remove a card
 * @param {number} index - Card index
 */
export function removeCard(index) {
    const deck = getActiveDeck();
    const deletedCard = {...deck.cards[index]}; // Copy before deleting
    
    // Track in history
    addToHistory('delete', {
        deckId: deck.id,
        index: index,
        card: deletedCard
    });
    
    deck.cards.splice(index, 1);
    saveState();
    renderWorkspace();
    showToast('Card deleted');
}

/**
 * Handle tag input keydown
 * @param {Event} event 
 * @param {number} index 
 */
export function handleTagInput(event, index) {
    if (event.key === 'Enter' || event.key === ',') {
        event.preventDefault();
        const input = event.target;
        const tag = input.value.trim().replace(/^#/, '');
        
        if (tag) {
            const deck = getActiveDeck();
            if (!deck.cards[index].tags) deck.cards[index].tags = [];
            
            // Avoid duplicates
            if (!deck.cards[index].tags.includes(tag)) {
                deck.cards[index].tags.push(tag);
                saveState();
                renderWorkspace();
                showToast(`Tag "${tag}" added`);
            }
            
            input.value = '';
            // Focus logic? Re-render kills focus.
            // Ideally we should just update DOM, but renderWorkspace is easier.
            // To keep focus, we need to find the input again after render.
            // For now, let's accept focus loss or improve renderWorkspace later.
        }
    }
}

/**
 * Remove a tag
 * @param {number} index 
 * @param {string} tag 
 */
export function removeTag(index, tag) {
    const deck = getActiveDeck();
    if (deck.cards[index].tags) {
        deck.cards[index].tags = deck.cards[index].tags.filter(t => t !== tag);
        saveState();
        renderWorkspace();
        showToast(`Tag "${tag}" removed`);
    }
}

/**
 * Parse one line of input "term - definition"
 * @param {string} line 
 * @returns {Object|null} {term, def, tags}
 */
export function parseLine(line) {
    // Simple client-side parser
    let cleaned = line.replace(/^[\s]*((?:\d+\.)|[•\-\–\—\>\→\⇒\●\*]+)[\s]*/, '').trim();
    if(!cleaned) return null;

    const separators = [' == ', '==', ' -> ', '->', ' => ', '=>', ' : ', ' = ', '\t', ' - '];
    
    for (const sep of separators) {
        if (cleaned.includes(sep)) {
            const parts = cleaned.split(sep);
            return { term: parts[0].trim(), def: parts.slice(1).join(sep).trim(), tags: [] };
        }
    }
    
    // No separator found -> Add as Incomplete
    return { term: cleaned, def: "", tags: [] }; 
}
