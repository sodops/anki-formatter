/**
 * Card Operations Module
 * Card CRUD, Workspace Rendering, Tag Management
 */

import { store } from '../../core/store.js';
import { eventBus, EVENTS } from '../../core/events.js';
import { appLogger } from '../../core/logger.js';
import { STATE, saveState, getActiveDeck, addToHistory } from '../../core/storage/storage.js';
import { dom } from '../../utils/dom-helpers.js';
import { ui, escapeHtml, showToast } from '../../ui/components/ui.js';
import { renderMarkdown } from '../../utils/markdown-parser.js';
import { handleDragStart, handleDragOver, handleDrop, handleDragEnd } from '../../ui/interactions/drag-drop.js';
import { initializeReviewData } from '../../core/srs/scheduler.js';

// Bulk Selection State
let selectedIndices = new Set();
let activeTagFilter = null;

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
    
    // Render tag filter bar
    renderTagFilterBar(deck);
    
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
            if (card.suspended) tr.className = 'row-suspended';
            else if (!card.term || !card.def) tr.className = 'row-error';
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
            checkbox.setAttribute('aria-label', `Select card ${i + 1}`);
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
            termInput.setAttribute('aria-label', 'Edit term');
            
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
            defInput.setAttribute('aria-label', 'Edit definition');
            
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
            tagInput.setAttribute('aria-label', 'Add tag');
            tagInput.onkeydown = (e) => handleTagInput(e, originalIndex);
            tagsContainer.appendChild(tagInput);
            
            tagsTd.appendChild(tagsContainer);

            // Actions Cell
            const actionTd = document.createElement('td');
            actionTd.className = 'card-actions-cell';
            
            // Suspend/unsuspend button
            const suspendBtn = document.createElement('button');
            suspendBtn.className = `action-btn secondary${card.suspended ? ' active' : ''}`;
            suspendBtn.style.padding = '4px';
            suspendBtn.innerHTML = card.suspended 
                ? '<ion-icon name="eye-off-outline"></ion-icon>'
                : '<ion-icon name="pause-outline"></ion-icon>';
            suspendBtn.title = card.suspended ? 'Unsuspend card' : 'Suspend card (skip in study)';
            suspendBtn.onclick = (e) => {
                e.stopPropagation();
                suspendCard(originalIndex);
            };
            actionTd.appendChild(suspendBtn);
            
            // Move/Copy button
            const moveBtn = document.createElement('button');
            moveBtn.className = 'action-btn secondary';
            moveBtn.style.padding = '4px';
            moveBtn.innerHTML = '<ion-icon name="arrow-forward-outline"></ion-icon>';
            moveBtn.title = 'Move/Copy to deck';
            moveBtn.onclick = (e) => {
                e.stopPropagation();
                showMoveMenu(originalIndex, moveBtn);
            };
            actionTd.appendChild(moveBtn);
            
            // Review history button
            const histBtn = document.createElement('button');
            histBtn.className = 'action-btn secondary';
            histBtn.style.padding = '4px';
            histBtn.innerHTML = '<ion-icon name="time-outline"></ion-icon>';
            histBtn.title = 'Review history';
            histBtn.onclick = (e) => {
                e.stopPropagation();
                showReviewHistory(card);
            };
            actionTd.appendChild(histBtn);
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'action-btn secondary';
            deleteBtn.style.padding = '4px';
            deleteBtn.innerHTML = '<ion-icon name="close"></ion-icon>';
            deleteBtn.title = 'Delete card';
            deleteBtn.setAttribute('aria-label', 'Delete card');
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
    try {
        const deck = getActiveDeck();
        if (selectedIndices.size === 0) return;
        
        ui.confirm(`Delete ${selectedIndices.size} cards?`).then(confirmed => {
            if(confirmed) {
                // Sort indices descending to splice correctly
                const indices = Array.from(selectedIndices).sort((a,b) => b - a);
                
                indices.forEach(idx => {
                    const card = deck.cards[idx];
                    store.dispatch('CARD_DELETE', {
                        deckId: deck.id,
                        cardId: card.id || idx
                    });
                });
                
                selectedIndices.clear();
                renderWorkspace();
                showToast(`${indices.length} cards deleted`);
                eventBus.emit(EVENTS.CARD_BULK_DELETED, { count: indices.length });
                appLogger.info(`Bulk deleted ${indices.length} cards`);
            }
        });
    } catch (error) {
        appLogger.error("Failed to bulk delete", error);
        showToast("Failed to delete cards");
    }
}

export function bulkTag() {
    try {
        if (selectedIndices.size === 0) return;
        
        ui.prompt("Enter tag name:", "").then(tag => {
            if(tag) {
                const deck = getActiveDeck();
                selectedIndices.forEach(idx => {
                    const card = deck.cards[idx];
                    if (!card.tags) card.tags = [];
                    if (!card.tags.includes(tag)) {
                        store.dispatch('CARD_TAG', {
                            deckId: deck.id,
                            cardId: card.id || idx,
                            tag: tag.trim()
                        });
                    }
                });
                
                renderWorkspace();
                showToast(`Tag added to ${selectedIndices.size} cards`);
                eventBus.emit(EVENTS.CARD_BULK_TAGGED, { count: selectedIndices.size, tag });
                appLogger.info(`Bulk tagged ${selectedIndices.size} cards with "${tag}"`);
                selectedIndices.clear();
                updateBulkActionBar();
            }
        });
    } catch (error) {
        appLogger.error("Failed to bulk tag", error);
        showToast("Failed to tag cards");
    }
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
    let filtered = cards;
    
    // Tag filter
    if (activeTagFilter) {
        filtered = filtered.filter(card => 
            card.tags && card.tags.includes(activeTagFilter)
        );
    }
    
    // Search query filter
    if (STATE.searchQuery) {
        const query = STATE.searchQuery.toLowerCase();
        filtered = filtered.filter(card => 
            (card.term || '').toLowerCase().includes(query) || 
            (card.def || '').toLowerCase().includes(query)
        );
    }
    
    return filtered;
}

/**
 * Set active tag filter
 * @param {string|null} tag 
 */
export function setTagFilter(tag) {
    activeTagFilter = tag;
    renderWorkspace();
}

/**
 * Get current tag filter
 */
export function getActiveTagFilter() {
    return activeTagFilter;
}

/**
 * Update a card field
 * @param {number} index - Card index
 * @param {string} field - Field name ('term' or 'def')
 * @param {string} value - New value
 */
export function updateCard(index, field, value) {
    try {
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
        
        // Use store to update card
        const card = deck.cards[index];
        const updatedCard = {
            ...card,
            [field]: value
        };
        
        store.dispatch('CARD_UPDATE', {
            deckId: deck.id,
            cardId: card.id,
            updates: { [field]: value }
        });
        
        eventBus.emit(EVENTS.CARD_UPDATED, { index, field, value });
        appLogger.debug(`Card updated: field=${field}`);
    } catch (error) {
        appLogger.error("Failed to update card", error);
        showToast("Failed to update card");
    }
}

/**
 * Add a new card
 * @param {string} term 
 * @param {string} def 
 */
export function addCard(term, def) {
    try {
        let deck = getActiveDeck();
        
        // Auto-select first deck if none active
        if (!deck) {
            const state = store.getState();
            const firstDeck = state.decks.find(d => !d.isDeleted);
            if (firstDeck) {
                store.dispatch('DECK_SELECT', firstDeck.id);
                deck = store.getActiveDeck();
            }
        }
        
        if (!deck) {
            showToast("Select a deck first");
            return;
        }

        if (!term && !def) return;

        const result = store.dispatch('CARD_ADD', {
            deckId: deck.id,
            term: (term || '').trim(),
            def: (def || '').trim(),
            tags: []
        });
        
        if (!result) {
            showToast("Failed to add card");
            return;
        }
        
        eventBus.emit(EVENTS.CARD_ADDED, { term, def });
        renderWorkspace();
        appLogger.info(`Card added: ${term} -> ${def}`);
    } catch (error) {
        appLogger.error("Failed to add card", error);
        showToast("Failed to add card: " + error.message);
    }
}

/**
 * Remove a card
 * @param {number} index - Card index
 */
export function removeCard(index) {
    try {
        const deck = getActiveDeck();
        const card = deck.cards[index];
        const deletedCard = {...card}; // Copy before deleting
        
        // Track in history
        addToHistory('delete', {
            deckId: deck.id,
            index: index,
            card: deletedCard
        });
        
        store.dispatch('CARD_DELETE', {
            deckId: deck.id,
            cardId: card.id || index
        });
        
        eventBus.emit(EVENTS.CARD_DELETED, { index, card: deletedCard });
        renderWorkspace();
        showToast('Card deleted');
        appLogger.info(`Card deleted at index ${index}`);
    } catch (error) {
        appLogger.error("Failed to remove card", error);
        showToast("Failed to delete card");
    }
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
            if (!deck || !deck.cards[index]) return;
            
            const card = deck.cards[index];
            const currentTags = Array.isArray(card.tags) ? card.tags : [];
            
            // Avoid duplicates
            if (!currentTags.includes(tag)) {
                store.dispatch('CARD_UPDATE', {
                    deckId: deck.id,
                    cardId: card.id,
                    updates: { tags: [...currentTags, tag] }
                });
                renderWorkspace();
                showToast(`Tag "${tag}" added`);
            }
            
            input.value = '';
        }
    }
}

/**
 * Remove a tag
 * @param {number} index 
 * @param {string} tag 
 */
export function removeTag(index, tag) {
    try {
        const deck = getActiveDeck();
        const card = deck.cards[index];
        
        if (card.tags && card.tags.includes(tag)) {
            store.dispatch('CARD_TAG_REMOVE', {
                deckId: deck.id,
                cardId: card.id || index,
                tag
            });
            
            renderWorkspace();
            showToast(`Tag "${tag}" removed`);
            eventBus.emit(EVENTS.CARD_UPDATED, { index, field: 'tags' });
            appLogger.info(`Tag removed: ${tag}`);
        }
    } catch (error) {
        appLogger.error("Failed to remove tag", error);
        showToast("Failed to remove tag");
    }
}

/**
 * Show move/copy deck menu
 */
function showMoveMenu(cardIndex, anchorEl) {
    // Remove existing menu
    const existing = document.getElementById('moveCardMenu');
    if (existing) existing.remove();
    
    const currentDeck = getActiveDeck();
    if (!currentDeck) return;
    
    const state = store.getState();
    const otherDecks = state.decks.filter(d => !d.isDeleted && d.id !== currentDeck.id);
    
    if (otherDecks.length === 0) {
        showToast('No other decks available');
        return;
    }
    
    const menu = document.createElement('div');
    menu.id = 'moveCardMenu';
    menu.className = 'context-menu';
    
    menu.innerHTML = `
        <div class="context-menu-header">Move / Copy to...</div>
        ${otherDecks.map(d => `
            <div class="context-menu-item" data-deck="${d.id}" data-action="move">
                <ion-icon name="arrow-forward-outline"></ion-icon> Move to ${d.name}
            </div>
            <div class="context-menu-item" data-deck="${d.id}" data-action="copy">
                <ion-icon name="copy-outline"></ion-icon> Copy to ${d.name}
            </div>
        `).join('<div class="context-menu-divider"></div>')}
    `;
    
    // Position
    const rect = anchorEl.getBoundingClientRect();
    menu.style.top = rect.bottom + 4 + 'px';
    menu.style.left = Math.min(rect.left, window.innerWidth - 240) + 'px';
    document.body.appendChild(menu);
    
    menu.querySelectorAll('.context-menu-item').forEach(item => {
        item.onclick = () => {
            const deckId = item.dataset.deck;
            const action = item.dataset.action;
            if (action === 'move') moveCard(cardIndex, deckId);
            else copyCard(cardIndex, deckId);
            menu.remove();
        };
    });
    
    // Close on click outside
    setTimeout(() => {
        const closeHandler = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeHandler);
            }
        };
        document.addEventListener('click', closeHandler);
    }, 0);
}

/**
 * Show review history for a card
 */
function showReviewHistory(card) {
    const history = card.reviewData?.reviewHistory || [];
    
    if (history.length === 0) {
        ui.alert('<div style="text-align:center;"><p>No review history yet.</p><p style="color:var(--text-tertiary);margin-top:8px;">Study this card to see its history here.</p></div>');
        return;
    }
    
    const qualityLabels = { 0: 'Again', 2: 'Hard', 3: 'Good', 5: 'Easy' };
    const qualityColors = { 0: '#ef4444', 2: '#f59e0b', 3: '#22c55e', 5: '#3b82f6' };
    
    const rows = history.slice(-20).reverse().map(r => {
        const date = new Date(r.timestamp);
        const label = qualityLabels[r.quality] || 'Unknown';
        const color = qualityColors[r.quality] || '#888';
        const interval = r.interval > 0 ? (r.interval < 30 ? `${r.interval}d` : `${Math.round(r.interval/30)}mo`) : '<1d';
        return `<tr>
            <td style="padding:6px 10px;">${date.toLocaleDateString()} ${date.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</td>
            <td style="padding:6px 10px;"><span style="color:${color};font-weight:600;">${label}</span></td>
            <td style="padding:6px 10px;">${interval}</td>
            <td style="padding:6px 10px;">${r.easeFactor?.toFixed(2) || '-'}</td>
        </tr>`;
    }).join('');
    
    const html = `
        <div style="max-height:400px;overflow:auto;">
            <p style="margin-bottom:12px;color:var(--text-secondary);">
                <strong>${card.term}</strong> — ${history.length} reviews total
            </p>
            <table style="width:100%;font-size:13px;border-collapse:collapse;">
                <thead><tr style="border-bottom:1px solid var(--border-default);color:var(--text-tertiary);">
                    <th style="padding:6px 10px;text-align:left;">Date</th>
                    <th style="padding:6px 10px;text-align:left;">Rating</th>
                    <th style="padding:6px 10px;text-align:left;">Interval</th>
                    <th style="padding:6px 10px;text-align:left;">Ease</th>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    `;
    
    ui.alert(html);
}

/**
 * Render tag filter pills above card table
 */
function renderTagFilterBar(deck) {
    let bar = document.getElementById('tagFilterBar');
    if (!bar) {
        bar = document.createElement('div');
        bar.id = 'tagFilterBar';
        bar.className = 'tag-filter-bar';
        const tableContainer = document.querySelector('.table-container');
        if (tableContainer) tableContainer.parentNode.insertBefore(bar, tableContainer);
    }
    
    // Collect all tags from deck
    const tagSet = new Set();
    deck.cards.forEach(c => (c.tags || []).forEach(t => tagSet.add(t)));
    const tags = Array.from(tagSet).sort();
    
    if (tags.length === 0) {
        bar.classList.add('hidden');
        return;
    }
    
    bar.classList.remove('hidden');
    bar.innerHTML = `
        <span class="tag-filter-label">Filter:</span>
        <button class="tag-filter-pill ${!activeTagFilter ? 'active' : ''}" data-tag="">All</button>
        ${tags.map(t => `<button class="tag-filter-pill ${activeTagFilter === t ? 'active' : ''}" data-tag="${t}">${t}</button>`).join('')}
    `;
    
    bar.querySelectorAll('.tag-filter-pill').forEach(btn => {
        btn.onclick = () => {
            const tag = btn.dataset.tag;
            setTagFilter(tag || null);
        };
    });
}

/**
 * Suspend/unsuspend a card
 * @param {number} cardIndex
 */
export function suspendCard(cardIndex) {
    const deck = getActiveDeck();
    if (!deck) return;
    const card = deck.cards[cardIndex];
    if (!card) return;
    
    store.dispatch('CARD_SUSPEND', {
        deckId: deck.id,
        cardId: card.id
    });
    
    renderWorkspace();
    showToast(card.suspended ? 'Card unsuspended' : 'Card suspended');
}

/**
 * Move a card to another deck
 * @param {number} cardIndex
 * @param {string} targetDeckId
 */
export function moveCard(cardIndex, targetDeckId) {
    const deck = getActiveDeck();
    if (!deck) return;
    const card = deck.cards[cardIndex];
    if (!card) return;
    
    store.dispatch('CARD_MOVE', {
        fromDeckId: deck.id,
        toDeckId: targetDeckId,
        cardId: card.id
    });
    
    renderWorkspace();
    showToast('Card moved');
}

/**
 * Copy a card to another deck
 * @param {number} cardIndex
 * @param {string} targetDeckId
 */
export function copyCard(cardIndex, targetDeckId) {
    const deck = getActiveDeck();
    if (!deck) return;
    const card = deck.cards[cardIndex];
    if (!card) return;
    
    store.dispatch('CARD_COPY', {
        fromDeckId: deck.id,
        toDeckId: targetDeckId,
        cardId: card.id
    });
    
    renderWorkspace();
    showToast('Card copied');
}

/**
 * Find & Replace across all cards in active deck
 * @param {string} find
 * @param {string} replace
 * @param {Object} options
 * @returns {number} Number of replacements made
 */
export function findAndReplace(find, replace, options = {}) {
    if (!find) return 0;
    const deck = getActiveDeck();
    if (!deck) return 0;
    
    const { caseSensitive = false, wholeWord = false, field = 'both' } = options;
    let count = 0;
    const flags = caseSensitive ? 'g' : 'gi';
    const pattern = wholeWord ? `\\b${find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b` : find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(pattern, flags);
    
    deck.cards.forEach((card, idx) => {
        let newTerm = card.term;
        let newDef = card.def;
        let changed = false;
        
        if (field === 'both' || field === 'term') {
            const result = (newTerm || '').replace(regex, replace);
            if (result !== newTerm) { newTerm = result; changed = true; }
        }
        if (field === 'both' || field === 'def') {
            const result = (newDef || '').replace(regex, replace);
            if (result !== newDef) { newDef = result; changed = true; }
        }
        
        if (changed) {
            store.dispatch('CARD_UPDATE', {
                deckId: deck.id,
                cardId: card.id,
                updates: { term: newTerm, def: newDef }
            });
            count++;
        }
    });
    
    if (count > 0) renderWorkspace();
    return count;
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
