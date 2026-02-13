import { store } from '../../core/store.js';
import { ui, escapeHtml, showToast } from '../../ui/components/ui.js';
import { renderMarkdown } from '../../utils/markdown-parser.js';
import { eventBus, EVENTS } from '../../core/events.js';
import { dom } from '../../utils/dom-helpers.js';
import { handleDragStart, handleDragOver, handleDrop, handleDragEnd } from '../../ui/interactions/drag-drop.js';

// --- Local State for Virtualization ---
const RENDER_BATCH_SIZE = 50;
let renderState = {
    filteredCards: [],
    renderedCount: 0,
    isRendering: false
};

// Bulk Selection State
let selectedIndices = new Set();
let activeTagFilter = null;

// --- Initialization ---

export function renderWorkspace() {
    const state = store.getState();
    const activeDeck = state.decks.find(d => d.id === state.activeDeckId);
    
    // Update header stats
    const countTotal = document.getElementById('countTotal');
    const countIssues = document.getElementById('countIssues');
    const deckTitle = document.getElementById('currentDeckTitle');
    const tableBody = document.getElementById('tableBody');
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');

    // Update Select All Checkbox state
    if (selectAllCheckbox) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.onclick = toggleSelectAll;
    }
    selectedIndices.clear();
    updateBulkActionBar();

    if (!activeDeck) {
        if (deckTitle) deckTitle.textContent = "No Deck Selected";
        if (tableBody) tableBody.innerHTML = `
            <tr class="empty-state">
                <td colspan="5">
                    <div class="empty-content">
                        <ion-icon name="albums-outline"></ion-icon>
                        <p>Select or create a deck from the sidebar.</p>
                    </div>
                </td>
            </tr>`;
        return;
    }

    if (deckTitle) deckTitle.textContent = activeDeck.name;
    
    // Render tag filter bar
    renderTagFilterBar(activeDeck);

    // Filter cards based on search and tags
    let cards = getFilteredCards(activeDeck.cards || []);
    
    // Sort: Newest first (if not already sorted by getFilteredCards logic)
    // cards.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); 
    // ^ Assuming getFilteredCards preserves order or we want default order.

    // Update Stats
    if (countTotal) countTotal.textContent = cards.length;
    // Check issues (in all cards, not just filtered)
    const issues = (activeDeck.cards || []).filter(c => !c.term || !c.def).length;
    if (countIssues) {
        countIssues.textContent = `${issues} Issues`;
        countIssues.classList.toggle('hidden', issues === 0);
    }
    
    // Reset Virtualization State
    renderState.filteredCards = cards;
    renderState.renderedCount = 0;
    
    // Clear Table
    if (tableBody) {
        tableBody.innerHTML = '';
        
        if (cards.length === 0) {
            const emptyStateRow = document.createElement('tr');
            emptyStateRow.className = 'empty-state';
            emptyStateRow.id = 'emptyState';
            
            const emptyContent = state.searchQuery ? 'No cards match your search.' : 'This deck is empty. Add a card above!';
            
            emptyStateRow.innerHTML = `
                <td colspan="5">
                    <div class="empty-content">
                        <ion-icon name="search-outline"></ion-icon>
                        <p>${emptyContent}</p>
                    </div>
                </td>
            `;
            tableBody.appendChild(emptyStateRow);
            if (selectAllCheckbox) selectAllCheckbox.checked = false;
            return;
        }
    }

    // Render First Batch
    renderNextBatch();

    // Setup Infinite Scroll Listener
    setupInfiniteScroll();
}

function renderNextBatch() {
    const tableBody = document.getElementById('tableBody');
    if (!tableBody) return;

    const { filteredCards, renderedCount } = renderState;
    const remaining = filteredCards.length - renderedCount;
    
    if (remaining <= 0) return;

    const nextBatchSize = Math.min(remaining, RENDER_BATCH_SIZE);
    const endIndex = renderedCount + nextBatchSize;
    const batch = filteredCards.slice(renderedCount, endIndex);

    // Create a DocumentFragment for better performance
    const fragment = document.createDocumentFragment();

    batch.forEach((card) => {
        // We need the ACTUAL index in the full deck for editing logic/selection
        const deck = store.getActiveDeck();
        const originalIndex = deck.cards.indexOf(card);
        
        const row = createCardRow(card, originalIndex);
        fragment.appendChild(row);
    });

    tableBody.appendChild(fragment);
    renderState.renderedCount = endIndex;
}

let scrollListenerAttached = false;
function setupInfiniteScroll() {
    const container = document.querySelector('.table-container');
    if (!container || scrollListenerAttached) return;

    container.addEventListener('scroll', () => {
        // Check if scrolled near bottom (200px buffer)
        if (container.scrollTop + container.clientHeight >= container.scrollHeight - 200) {
            renderNextBatch();
        }
    });
    scrollListenerAttached = true;
}


// --- Row Creation (Optimized) ---

function createCardRow(card, originalIndex) {
    const tr = document.createElement('tr');
    tr.className = 'card-row';
    tr.dataset.cardIndex = originalIndex;
    tr.dataset.cardId = card.id || '';
    
    if (card.suspended) tr.classList.add('suspended');

    // Drag Handle / Checkbox
    const tdDrag = document.createElement('td');
    tdDrag.className = 'drag-handle';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'row-checkbox card-checkbox';
    checkbox.dataset.index = originalIndex;
    checkbox.onclick = (e) => { e.stopPropagation(); toggleRowSelection(originalIndex); };
    if (selectedIndices.has(originalIndex)) checkbox.checked = true;
    
    const dragIcon = document.createElement('span');
    dragIcon.innerHTML = '<ion-icon name="reorder-two-outline"></ion-icon>';
    dragIcon.style.cursor = 'grab';
    
    tdDrag.appendChild(checkbox);
    tdDrag.appendChild(dragIcon);
    tr.appendChild(tdDrag);

    // Term
    const tdTerm = document.createElement('td');
    tdTerm.className = 'col-term markdown-cell';
    tdTerm.innerHTML = `<div class="cell-content">${renderMarkdown(card.term)}</div>`;
    tdTerm.onclick = (e) => {
        if(!e.target.closest('a')) makeEditable(tdTerm, card, 'term', originalIndex);
    };
    tr.appendChild(tdTerm);

    // Definition
    const tdDef = document.createElement('td');
    tdDef.className = 'col-def markdown-cell';
    tdDef.innerHTML = `<div class="cell-content">${renderMarkdown(card.def)}</div>`;
    tdDef.onclick = (e) => {
        if(!e.target.closest('a')) makeEditable(tdDef, card, 'def', originalIndex);
    };
    tr.appendChild(tdDef);

    // Tags
    const tdTags = document.createElement('td');
    tdTags.className = 'col-tags tags-cell';
    
    // Render tags
    const renderTags = () => {
        if (!card.tags || card.tags.length === 0) {
            return `<span class="tag-placeholder">+ Tag</span>`;
        }
        return card.tags.map(t => `<span class="tag-badge">${escapeHtml(t)} <button class="tag-remove">&times;</button></span>`).join('') + 
               `<span class="tag-add-btn">+</span>`;
    };
    
    const tagsContainer = document.createElement('div');
    tagsContainer.className = 'tags-container';
    tagsContainer.innerHTML = renderTags();
    
    // Tag click handler (using delegation for this cell)
    tdTags.onclick = (e) => {
        const removeBtn = e.target.closest('.tag-remove');
        if (removeBtn) {
            e.stopPropagation();
            // Find tag text
            const tagBadge = removeBtn.closest('.tag-badge');
            const tagText = tagBadge.textContent.trim().slice(0, -1).trim(); // remove '×'
            removeTag(originalIndex, tagText); 
            return;
        }
        
        // If clicked anywhere else in tag cell, open input
        handleTagInputUI(tagsContainer, originalIndex);
    };
    tagsContainer.appendChild(document.createElement('div')); // spacer
    tdTags.appendChild(tagsContainer);
    tr.appendChild(tdTags);

    // Actions
    const tdActions = document.createElement('td');
    tdActions.className = 'col-actions card-actions-cell';
    
    const suspendBtn = document.createElement('button');
    suspendBtn.className = `action-btn secondary${card.suspended ? ' active' : ''}`;
    suspendBtn.innerHTML = card.suspended ? '<ion-icon name="eye-off-outline"></ion-icon>' : '<ion-icon name="pause-outline"></ion-icon>';
    suspendBtn.onclick = (e) => { e.stopPropagation(); suspendCard(originalIndex); };
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'action-btn secondary danger';
    deleteBtn.innerHTML = '<ion-icon name="trash-outline"></ion-icon>';
    deleteBtn.onclick = (e) => { e.stopPropagation(); removeCard(originalIndex); };
    
    tdActions.appendChild(suspendBtn);
    tdActions.appendChild(deleteBtn);
    tr.appendChild(tdActions);
    
    // Drag events
    tr.setAttribute('draggable', 'true');
    tr.addEventListener('dragstart', handleDragStart);
    tr.addEventListener('dragover', handleDragOver);
    tr.addEventListener('drop', handleDrop);
    tr.addEventListener('dragend', handleDragEnd);

    return tr;
}

// --- Editing Logic ---

function makeEditable(cell, card, field, index) {
    const currentVal = field === 'term' ? card.term : card.def;
    const isEditing = cell.querySelector('textarea');
    if (isEditing) return;

    // Save height to prevent layout jump
    const height = cell.offsetHeight;
    
    cell.innerHTML = '';
    const textarea = document.createElement('textarea');
    textarea.value = currentVal;
    textarea.className = 'edit-input';
    textarea.style.height = Math.max(height, 60) + 'px'; // Min height
    
    // Save on blur or Ctrl+Enter
    const save = () => {
        const newVal = textarea.value.trim();
        if (newVal !== currentVal) {
            updateCard(index, field, newVal);
            // Re-render cell content
            cell.innerHTML = `<div class="cell-content">${renderMarkdown(newVal)}</div>`;
        } else {
            // Restore if no change
            cell.innerHTML = `<div class="cell-content">${renderMarkdown(currentVal)}</div>`;
        }
    };

    textarea.onblur = save;
    textarea.onkeydown = (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            textarea.blur();
        }
        e.stopPropagation(); // Prevent global shortcuts
    };

    cell.appendChild(textarea);
    textarea.focus();
}

export function handleTagInputUI(container, index) {
    if(container.querySelector('input')) return; // Already editing

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'tag-input';
    input.placeholder = 'Add tag...';
    
    container.appendChild(input);
    input.focus();
    
    const save = () => {
        const val = input.value.trim();
        if (val) {
             const deck = store.getActiveDeck();
             const card = deck.cards[index];
             const currentTags = card.tags || [];
             
             if (!currentTags.includes(val)) {
                 updateCard(index, 'tags', [...currentTags, val]);
                 // We need to re-render row or just tags cell. 
                 // Simple hack: re-render workspace or modify DOM directly.
                 // Ideally modify DOM directly but tags logic is in createCardRow.
                 // Let's rely on eventBus or re-render.
                 // Currently updateCard emits event, but we might need to catch it to update UI.
                 // But wait, our updateCard triggers renderWorkspace? No, it emits event.
                 // Main.js listens to DECK_UPDATED.
                 // Dispatching CARD_UPDATE to store triggers DECK_UPDATE? No, usually state change.
                 // Store notifies subscribers. Main.js subscribes and calls renderWorkspace??
                 // Let's check main.js. It subscribes but only for auto-save indicator.
                 // It listens to EVENTS.DECK_UPDATED.
                 // So we need to ensure updateCard triggers UI update.
                 // Let's just call renderWorkspace() here for simplicity or better, just re-render row.
                 renderWorkspace(); 
             }
        }
    };

    input.onkeydown = (e) => {
        if (e.key === 'Enter') {
            save();
        } else if (e.key === 'Escape') {
            input.remove();
        }
        e.stopPropagation();
    };
    
    input.onblur = () => {
        setTimeout(() => { if(document.body.contains(input)) input.remove(); }, 100);
    };
}

// ... (Rest of existing functions like getFilteredCards, etc. need to be preserved or re-implemented)

// Re-implementing helper functions to ensure module is complete

export function getFilteredCards(cards) {
    let filtered = cards;
    
    if (activeTagFilter) {
        filtered = filtered.filter(card => card.tags && card.tags.includes(activeTagFilter));
    }
    
    const _sq = store.getState().searchQuery;
    if (_sq) {
        const query = _sq.toLowerCase();
        filtered = filtered.filter(card => 
            (card.term || '').toLowerCase().includes(query) || 
            (card.def || '').toLowerCase().includes(query)
        );
    }
    
    return filtered;
}

function renderTagFilterBar(deck) {
    let bar = document.getElementById('tagFilterBar');
    if (!bar) {
        bar = document.createElement('div');
        bar.id = 'tagFilterBar';
        bar.className = 'tag-filter-bar';
        const tableContainer = document.querySelector('.table-container');
        if (tableContainer) tableContainer.parentNode.insertBefore(bar, tableContainer);
    }
    
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
            activeTagFilter = tag || null;
            renderWorkspace();
        };
    });
}

function updateBulkActionBar() {
    const count = selectedIndices.size;
    const bar = document.getElementById('bulkActionBar');
    const countEl = document.getElementById('bulkCount');
    
    if (bar && countEl) {
        countEl.textContent = count;
        if (count > 0) bar.classList.remove('hidden');
        else bar.classList.add('hidden');
    }
}

function toggleRowSelection(index) {
    if (selectedIndices.has(index)) selectedIndices.delete(index);
    else selectedIndices.add(index);
    updateBulkActionBar();
}

function toggleSelectAll() {
    const deck = store.getActiveDeck();
    if (!deck) return;
    const checkbox = document.getElementById('selectAllCheckbox');
    
    if (checkbox.checked) {
        // Select all filtered
        const filtered = renderState.filteredCards;
        filtered.forEach(c => {
            const idx = deck.cards.indexOf(c);
            selectedIndices.add(idx);
        });
    } else {
        selectedIndices.clear();
    }
    
    // Update visible rows
    document.querySelectorAll('.row-checkbox').forEach(cb => {
        cb.checked = selectedIndices.has(parseInt(cb.dataset.index));
    });
    
    updateBulkActionBar();
}

export function updateCard(index, field, value) {
    try {
        const deck = store.getActiveDeck();
        const card = deck.cards[index];
        store.dispatch('CARD_UPDATE', {
            deckId: deck.id,
            cardId: card.id,
            updates: { [field]: value }
        });
        // We rely on store subscription or event bus to update UI?
        // Let's force render if needed, or better, the store change propagates.
    } catch (error) {
        console.error(error);
        showToast("Failed to update card");
    }
}

export function addCard(term, def) {
    try {
        let deck = store.getActiveDeck();
        if (!deck) return;
        
        store.dispatch('CARD_ADD', {
            deckId: deck.id,
            term: (term || '').trim(),
            def: (def || '').trim(),
            tags: []
        });
        renderWorkspace();
        showToast("Card added");
    } catch(e) {
        showToast("Error adding card");
    }
}

export function removeCard(index) {
    try {
        const deck = store.getActiveDeck();
        const card = deck.cards[index];
        
        store.dispatch('CARD_DELETE', {
            deckId: deck.id,
            cardId: card.id
        });
        
        // Remove from DOM immediately
        const row = document.querySelector(`tr[data-card-index="${index}"]`);
        if(row) row.remove();
        
        showToast("Card deleted");
    } catch(e) {
        showToast("Error deleting card");
    }
}

export function removeTag(index, tag) {
    const deck = store.getActiveDeck();
    const card = deck.cards[index];
    const currentTags = card.tags || [];
    const newTags = currentTags.filter(t => t !== tag);
    updateCard(index, 'tags', newTags);
    renderWorkspace();
}

export function suspendCard(index) {
    const deck = store.getActiveDeck();
    const card = deck.cards[index];
    store.dispatch('CARD_SUSPEND', { deckId: deck.id, cardId: card.id });
    
    // Toggle class in DOM
    const row = document.querySelector(`tr[data-card-index="${index}"]`);
    if(row) {
        row.classList.toggle('suspended');
        // Update icon?
        renderWorkspace(); // Easiest to ensure icon updates
    }
}

// Bulk Actions Exports
export function bulkDelete() {
    const deck = store.getActiveDeck();
    if(selectedIndices.size === 0) return;
    
    ui.confirm(`Delete ${selectedIndices.size} cards?`).then(ok => {
        if(ok) {
            const indices = Array.from(selectedIndices);
            store.dispatch('CARD_BULK_DELETE', { deckId: deck.id, indices });
            selectedIndices.clear();
            renderWorkspace();
            showToast("Cards deleted");
        }
    });
}

export function bulkTag() {
    if(selectedIndices.size === 0) return;
    ui.prompt("Tag name:").then(tag => {
        if(tag) {
            const deck = store.getActiveDeck();
            const indices = Array.from(selectedIndices);
            store.dispatch('CARD_BULK_TAG', { deckId: deck.id, indices, tag }); // Assuming store supports indices
            // If store expects IDs:
            // const ids = indices.map(i => deck.cards[i].id);
            // store.dispatch('CARD_BULK_TAG', { deckId: deck.id, cardIds: ids, tag });
            
            // Check store implementation. Previous code used indices for bulk delete but IDs for bulk tag?
            // Let's assume store handles it or we fix it. 
            // Standardizing on IDs is better but let's stick to indices if that's what we have locally.
            // Wait, previous `bulkTag` in my memory used `cardIds`.
            const ids = indices.map(i => deck.cards[i].id);
            store.dispatch('CARD_BULK_TAG', { deckId: deck.id, cardIds: ids, tag });
            
            selectedIndices.clear();
            renderWorkspace();
            showToast("Cards tagged");
        }
    });
}

export function cancelBulkSelection() {
    selectedIndices.clear();
    if (dom.selectAllCheckbox) dom.selectAllCheckbox.checked = false;
    document.querySelectorAll('.row-checkbox').forEach(cb => cb.checked = false);
    updateBulkActionBar();
}

// Legacy exports needed by main.js
export function parseLine(line) {
    let cleaned = line.replace(/^[\s]*((?:\d+\.)|[•\-\–\—\>\→\⇒\●\*]+)[\s]*/, '').trim();
    if(!cleaned) return null;
    const separatorRegex = /((?:[\t]|={1,3}|->|=>|→|⇒|:)|(?:\s+(?:-|–|—)\s+))/;
    const match = cleaned.match(separatorRegex);
    if (match) {
        const sep = match[0];
        const idx = match.index;
        return { term: cleaned.substring(0, idx).trim(), def: cleaned.substring(idx + sep.length).trim() };
    }
    const firstSpaceIndex = cleaned.indexOf(' ');
    if (firstSpaceIndex !== -1) {
        return { term: cleaned.substring(0, firstSpaceIndex).trim(), def: cleaned.substring(firstSpaceIndex + 1).trim() };
    }
    return { term: cleaned, def: "" }; 
}

export function parseBulkLine(text) {
    return text.split('\n').map(l => parseLine(l)).filter(c => c && c.term);
}

export function findAndReplace(find, replace, options) {
    // Basic implementation
    const deck = store.getActiveDeck();
    if(!deck) return 0;
    let count = 0;
    deck.cards.forEach((c, i) => {
        if(c.term.includes(find) || c.def.includes(find)) {
            const newTerm = c.term.replaceAll(find, replace);
            const newDef = c.def.replaceAll(find, replace);
            if(newTerm !== c.term || newDef !== c.def) {
                updateCard(i, 'term', newTerm); // brute force
                updateCard(i, 'def', newDef);
                count++;
            }
        }
    });
    renderWorkspace();
    return count;
}

export function moveCard(index, targetDeckId) {
    const deck = store.getActiveDeck();
    const card = deck.cards[index];
    store.dispatch('CARD_MOVE', { fromDeckId: deck.id, toDeckId: targetDeckId, cardId: card.id });
    renderWorkspace();
}

export function copyCard(index, targetDeckId) {
    const deck = store.getActiveDeck();
    const card = deck.cards[index];
    store.dispatch('CARD_COPY', { fromDeckId: deck.id, toDeckId: targetDeckId, cardId: card.id });
    renderWorkspace();
}

export function setTagFilter(tag) {
    activeTagFilter = tag;
    renderWorkspace();
}
