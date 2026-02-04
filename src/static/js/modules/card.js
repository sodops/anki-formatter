/**
 * Card Operations Module
 * Card CRUD, Workspace Rendering, Tag Management
 */

import { STATE, saveState, getActiveDeck, addToHistory } from './state.js';
import { dom } from './dom.js';
import { ui, escapeHtml, showToast } from './ui.js';
import { renderMarkdown } from './markdown.js';
import { handleDragStart, handleDragOver, handleDrop, handleDragEnd } from './drag-drop.js';

// Bulk Selection State
let selectedIndices = new Set();

/**
 * Render the workspace (card table)
 */
export function renderWorkspace() {
    const deck = getActiveDeck();
    
    // Update Select All Checkbox state
    if (dom.selectAllCheckbox) {
        dom.selectAllCheckbox.checked = false;
        dom.selectAllCheckbox.onclick = toggleSelectAll;
    }
    
    updateBulkActionBar(); // Ensure bar is updated (likely hidden if render cleared selection?)
    // Actually, if we re-render, we should probably keep selection if indices are valid?
    // But indices shift if we delete/move.
    // For simplicity, let's clear selection on full re-render unless we are careful.
    // To be safe: clear selection on re-render to avoid ghost selections.
    selectedIndices.clear();
    updateBulkActionBar();

    if (!deck) {
        // ... (existing empty deck logic)
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
            
            // Drag Handle (First Cell) -> Now Checkbox + Drag
            const dragTd = document.createElement('td');
            dragTd.className = 'drag-handle';
            
            // Checkbox
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'row-checkbox';
            checkbox.style.marginRight = '8px';
            checkbox.dataset.index = originalIndex;
            checkbox.onclick = (e) => {
                e.stopPropagation();
                toggleRowSelection(originalIndex);
            };
            
            // Drag Icon
            const dragIcon = document.createElement('span');
            dragIcon.innerHTML = '<ion-icon name="reorder-two-outline"></ion-icon>';
            dragIcon.style.cursor = 'grab';
            
            dragTd.appendChild(checkbox);
            dragTd.appendChild(dragIcon);

            // Make row draggable (only if handle clicked? or whole row?)
            tr.setAttribute('draggable', 'true');
            tr.dataset.cardIndex = originalIndex;
            
            // Term Cell
            const termTd = document.createElement('td');
            termTd.className = 'markdown-cell';
            
            const termView = document.createElement('div');
            termView.className = 'cell-view';
            termView.innerHTML = renderMarkdown(card.term); // Render Markdown
            
            const termInput = document.createElement('input');
            termInput.type = 'text';
            termInput.className = 'editable-cell hidden';
            termInput.style.width = '100%';
            termInput.value = card.term;
            
            // Toggle Logic
            termView.onclick = () => {
                termView.classList.add('hidden');
                termInput.classList.remove('hidden');
                termInput.focus();
            };
            
            const saveTerm = () => {
                const val = termInput.value;
                updateCard(originalIndex, 'term', val);
                termView.innerHTML = renderMarkdown(val);
                termInput.classList.add('hidden');
                termView.classList.remove('hidden');
            };

            termInput.onblur = saveTerm;
            termInput.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    termInput.blur();
                }
            };

            termTd.appendChild(termView);
            termTd.appendChild(termInput);


            // Def Cell
            const defTd = document.createElement('td');
            defTd.className = 'markdown-cell';
            
            const defView = document.createElement('div');
            defView.className = 'cell-view';
            defView.innerHTML = renderMarkdown(card.def);
            
            const defInput = document.createElement('input');
            defInput.type = 'text';
            defInput.className = 'editable-cell hidden';
            defInput.style.width = '100%';
            defInput.value = card.def;
            
            // Toggle Logic
            defView.onclick = () => {
                defView.classList.add('hidden');
                defInput.classList.remove('hidden');
                defInput.focus();
            };

            const saveDef = () => {
                const val = defInput.value;
                updateCard(originalIndex, 'def', val);
                defView.innerHTML = renderMarkdown(val);
                defInput.classList.add('hidden');
                defView.classList.remove('hidden');
            };

            defInput.onblur = saveDef;
            defInput.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    defInput.blur();
                }
            };

            defTd.appendChild(defView);
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

// --- Selection Logic ---

function toggleRowSelection(index) {
    if (selectedIndices.has(index)) {
        selectedIndices.delete(index);
    } else {
        selectedIndices.add(index);
    }
    updateBulkActionBar();
}

function toggleSelectAll() {
    const deck = getActiveDeck();
    if (!deck) return;
    
    // If all currently visible are selected, deselect all. Otherwise select all.
    // Simplifying: Just Select All or Deselect All based on checkbox state
    
    // We only select FILTERED cards usually? Or ALL deck cards?
    // User expects visible cards to be selected.
    const allCards = deck.cards;
    const filteredCards = getFilteredCards(allCards); 
    
    const visibleIndices = filteredCards.map(c => allCards.indexOf(c));
    
    if (dom.selectAllCheckbox.checked) {
        visibleIndices.forEach(i => selectedIndices.add(i));
    } else {
        visibleIndices.forEach(i => selectedIndices.delete(i));
    }
    
    // Update checkboxes in DOM without full re-render
    const checkboxes = document.querySelectorAll('.row-checkbox');
    checkboxes.forEach(cb => {
        const idx = parseInt(cb.dataset.index);
        cb.checked = selectedIndices.has(idx);
    });
    
    updateBulkActionBar();
}

function updateBulkActionBar() {
    const count = selectedIndices.size;
    dom.bulkCount.textContent = count;
    
    if (count > 0) {
        dom.bulkActionBar.classList.remove('hidden');
    } else {
        dom.bulkActionBar.classList.add('hidden');
    }
}

export function bulkDelete() {
    const deck = getActiveDeck();
    if (selectedIndices.size === 0) return;
    
    ui.confirm(`Delete ${selectedIndices.size} cards?`).then(confirmed => {
        if(confirmed) {
            // Sort indices descending to splice correctly
            const indices = Array.from(selectedIndices).sort((a,b) => b - a);
            
            indices.forEach(idx => {
               deck.cards.splice(idx, 1); 
            });
            
            selectedIndices.clear();
            saveState();
            renderWorkspace();
            showToast(`${indices.length} cards deleted`);
        }
    });
}

export function bulkTag() {
    if (selectedIndices.size === 0) return;
    
    ui.prompt("Enter tag name:", "").then(tag => {
        if(tag) {
             const deck = getActiveDeck();
             selectedIndices.forEach(idx => {
                 const card = deck.cards[idx];
                 if (!card.tags) card.tags = [];
                 if (!card.tags.includes(tag)) card.tags.push(tag);
             });
             
             saveState();
             renderWorkspace();
             showToast(`Tag added to ${selectedIndices.size} cards`);
             // Keep selection? prefer clear
             selectedIndices.clear();
             updateBulkActionBar();
        }
    });
}

export function cancelBulkSelection() {
    selectedIndices.clear();
    // Uncheck all in DOM
    document.querySelectorAll('.row-checkbox').forEach(cb => cb.checked = false);
    if(dom.selectAllCheckbox) dom.selectAllCheckbox.checked = false;
    updateBulkActionBar();
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
    // remove leading numbering logic...
    let cleaned = line.replace(/^[\s]*((?:\d+\.)|[•\-\–\—\>\→\⇒\●\*]+)[\s]*/, '').trim();
    if(!cleaned) return null;

    // Ordered separators. 
    // We want to match " == " before "=", " -> " before "-", etc.
    // Instead of simple string split, let's use a regex that captures the first strong separator.
    
    // Regex explanation:
    // 1. (===?|!==) -> strict equality or not equal (unlikely in cards but possible)
    // 2. (->|=>|→|⇒) -> Arrows
    // 3. (=) -> Single equals (allow tight)
    // 4. (:) -> Colon (allow tight)
    // 5. (\s-\s) -> Dash (MUST have spaces to avoid hyphenated-words: e.g. "semi-colon")
    // 6. (\t) -> Tab
    
    // Regex for Strict Separators
    const separatorRegex = /((?:[\t]|={1,3}|->|=>|→|⇒|:)|(?:\s+(?:-|–|—)\s+))/;
    
    const match = cleaned.match(separatorRegex);
    
    if (match) {
        const sep = match[0];
        const idx = match.index;
        
        let term = cleaned.substring(0, idx).trim();
        let def = cleaned.substring(idx + sep.length).trim();
        
        // Check for empty parts
        if (term && def) {
            return { term, def, tags: [] };
        }
    }
    
    // FALLBACK: Space Separator
    // If no strong separator found, try splitting by the FIRST space.
    // Useful for: "ban taqiqlamoq" -> Term: "ban", Def: "taqiqlamoq"
    // Heuristic: Must have at least one space.
    const firstSpaceIndex = cleaned.indexOf(' ');
    if (firstSpaceIndex !== -1) {
        // We split at the first space
        let term = cleaned.substring(0, firstSpaceIndex).trim();
        let def = cleaned.substring(firstSpaceIndex + 1).trim();
        
        if (term && def) {
             return { term, def, tags: [] };
        }
    }
    
    // No separator found -> Add as Incomplete
    return { term: cleaned, def: "", tags: [] }; 
}

/**
 * Try to parse a string that might contain multiple cards separated by arrows
 * Supports: ->, =>, →, ⇒ (with or without spaces)
 * @param {string} text 
 * @returns {Array|null} Array of card objects or null if not bulk
 */
export function parseBulkLine(text) {
    // Regex for arrow separators: ->, =>, →, ⇒ surrounded by optional whitespace
    const arrowRegex = /[\s\t]*(?:->|=>|→|⇒)[\s\t]*/;
    
    // Check if we have at least one arrow
    if (!arrowRegex.test(text)) return null;
    
    const chunks = text.split(arrowRegex).filter(c => c.trim().length > 0);
    
    // If only 2 chunks, it might be just "Term -> Def" (single card).
    // If 3+ chunks, it's definitely bulk (Term=Def -> Term=Def -> ...)
    // UNLESS the user typed "Term -> Def -> Context" (3 parts for 1 card?).
    // But our system only supports Term/Def.
    
    // So logic:
    // If chunks.length >= 3, assume bulk.
    // If chunks.length == 2, check for inner separators (=, -, :) in BOTH chunks.
    
    if (chunks.length < 2) return null;
    
    if (chunks.length >= 3) {
        // High confidence it's a chain.
        // Try parsing each chunk.
        const cards = chunks.map(chunk => parseLine(chunk));
        // Verify valid cards (must have term AND def)
        // If many fail, maybe it looks like bulk but isn't?
        // E.g. "A -> B -> C" where A, B, C are simple words.
        // parseLine("A") returns {term: "A", def: ""}.
        
        // If more than half have definitions, accept it.
        const validCount = cards.filter(c => c.def).length;
        if (validCount >= cards.length / 2) {
            return cards;
        }
    }
    
    // Length is 2 (or failed above heuristic)
    // Check if parts look like cards: "Term = Def" -> "Term = Def"
    const hasInner = chunks.every(chunk => {
        const c = parseLine(chunk);
        return c && c.def && c.def.length > 0;
    });
    
    if (hasInner) {
         return chunks.map(chunk => parseLine(chunk));
    }
    
    return null;
}
