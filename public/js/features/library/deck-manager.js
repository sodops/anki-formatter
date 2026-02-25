/**
 * Deck Operations Module
 * Deck CRUD, Sidebar rendering, Trash management
 */

import { store } from '../../core/store.js';
import { eventBus, EVENTS } from '../../core/events.js';
import { appLogger } from '../../core/logger.js';

import { dom } from '../../utils/dom-helpers.js';
import { ui, escapeHtml, showToast, colorPicker } from '../../ui/components/ui.js';
import { renderWorkspace } from './card-manager.js';
import { getDeckReviewStats } from '../../core/srs/scheduler.js';

/**
 * Create a new deck
 * @param {string} name - Deck name
 */
export function createDeck(name) {
    if (!name || !name.trim()) return;
    
    try {
        const newDeck = store.dispatch('DECK_CREATE', {
            name: name.trim(),
            color: '#7C5CFC'
        });
        
        // Auto-select the newly created deck
        if (newDeck && newDeck.id) {
            store.dispatch('DECK_SELECT', newDeck.id);
        }
        
        // Emit event for subscribers
        eventBus.emit(EVENTS.DECK_CREATED, { name: name.trim() });
        
        renderSidebar();
        renderWorkspace();
        showToast(`Deck "${name.trim()}" created`);
        appLogger.info(`Deck created: ${name.trim()}`);
    } catch (error) {
        appLogger.error("Failed to create deck", error);
        showToast("Failed to create deck");
    }
}

/**
 * Switch to a different deck
 * @param {string} id - Deck ID
 */
export function switchDeck(id) {
    try {
        store.dispatch('DECK_SELECT', id);
        eventBus.emit(EVENTS.DECK_SELECTED, { id });
        
        renderSidebar();
        renderWorkspace();
        
        // Clear file input
        if (dom.fileInput) dom.fileInput.value = '';
        
        // Reset inputs
        if (dom.omnibarInput) {
            dom.omnibarInput.value = '';
            // Only auto-focus on desktop — on mobile it opens the keyboard
            // which blocks other buttons and causes poor UX
            if (window.innerWidth > 768) {
                dom.omnibarInput.focus();
            }
        }
        
        appLogger.info(`Switched to deck: ${id}`);
    } catch (error) {
        appLogger.error("Failed to switch deck", error);
        showToast("Failed to switch deck");
    }
}

/**
 * Rename a deck
 * @param {string} id - Deck ID
 * @param {Event} event - UI event
 */
export async function renameDeck(id, event) {
    if(event) event.stopPropagation();
    
    try {
        const currentState = store.getState();
        const deck = currentState.decks.find(d => d.id === id);
        if (!deck) return;
        
        const newName = await ui.prompt("Rename Deck:", deck.name);
        if (newName && newName.trim() !== "") {
            store.dispatch('DECK_UPDATE', {
                deckId: id,
                updates: { name: newName.trim() }
            });
            
            eventBus.emit(EVENTS.DECK_UPDATED, { id, name: newName.trim() });
            renderSidebar();
            renderWorkspace(); // Update title
            showToast("Deck renamed");
            appLogger.info(`Deck renamed: ${id} -> ${newName.trim()}`);
        }
    } catch (error) {
        appLogger.error("Failed to rename deck", error);
        showToast("Failed to rename deck");
    }
}

/**
 * Delete a deck (move to trash)
 * @param {string} id - Deck ID
 * @param {Event} event - UI event
 */
export async function deleteDeck(id, event) {
    if(event) event.stopPropagation();
    
    try {
        const currentState = store.getState();
        const activeDecks = currentState.decks.filter(d => !d.isDeleted);
        if(activeDecks.length <= 1) {
            ui.alert("Cannot delete the only active deck.");
            return;
        }

        if(await ui.confirm("Move this deck to Trash?")) {
            store.dispatch('DECK_DELETE', { deckId: id });
            eventBus.emit(EVENTS.DECK_DELETED, { id });
            
            renderSidebar();
            renderWorkspace();
            showToast("Deck moved to Trash");
            appLogger.info(`Deck deleted: ${id}`);
        }
    } catch (error) {
        appLogger.error("Failed to delete deck", error);
        showToast("Failed to delete deck");
    }
}

/**
 * Restore a deck from trash
 * @param {string} id - Deck ID
 * @param {Event} event - UI event
 */
export function restoreDeck(id, event) {
    if(event) event.stopPropagation();
    try {
        store.dispatch('DECK_RESTORE', { deckId: id });
        eventBus.emit(EVENTS.DECK_RESTORED, { id });
        
        renderSidebar();
        showToast("Deck Restored");
        appLogger.info(`Deck restored: ${id}`);
    } catch (error) {
        appLogger.error("Failed to restore deck", error);
        showToast("Failed to restore deck");
    }
}

/**
 * Empty trash (permanently delete)
 */
export async function emptyTrash() {
    try {
        if(await ui.confirm("Permanently delete all items in trash?")) {
            // Dispatch for each deleted deck (would be cleaner with TRASH_EMPTY action)
            const currentState = store.getState();
            const deletedDeckIds = currentState.decks
                .filter(d => d.isDeleted)
                .map(d => d.id);
            
            deletedDeckIds.forEach(id => {
                store.dispatch('DECK_PURGE', id);
            });
            
            renderSidebar();
            showToast("Trash emptied");
            appLogger.info("Trash emptied");
        }
    } catch (error) {
        appLogger.error("Failed to empty trash", error);
        showToast("Failed to empty trash");
    }
}

/**
 * Clear all cards in current deck
 */
export async function clearDeck() {
    try {
        if(await ui.confirm("Are you sure you want to clear this deck?")) {
            const currentState = store.getState();
            const activeDeck = currentState.decks.find(d => d.id === currentState.activeDeckId);
            
            if (activeDeck && activeDeck.cards && activeDeck.cards.length > 0) {
                const indices = activeDeck.cards.map((_, i) => i);
                store.dispatch('CARD_BULK_DELETE', {
                    deckId: currentState.activeDeckId,
                    indices
                });
                
                renderWorkspace();
                showToast("Deck cleared");
                appLogger.info(`Deck cleared: ${currentState.activeDeckId}`);
            }
        }
    } catch (error) {
        appLogger.error("Failed to clear deck", error);
        showToast("Failed to clear deck");
    }
}

/**
 * Edit deck settings (daily limits)
 * @param {string} id - Deck ID
 * @param {Event} event - UI event
 */
export async function editDeckSettings(id, event) {
    if(event) event.stopPropagation();
    
    const currentState = store.getState();
    const deck = currentState.decks.find(d => d.id === id);
    if (!deck) return;
    
    // Ensure settings exist (for old decks)
    const deckSettings = deck.settings || {
        newCardsPerDay: 20,
        maxReviewsPerDay: 100
    };
    
    // Create settings modal  
    const content = document.createElement('div');
    content.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 20px;">
            <div>
                <label style="display: block; margin-bottom: 8px; font-weight: 500; color: var(--text-secondary);">
                    New cards per day:
                </label>
                <input type="number" id="deckSettingNewCards" value="${deckSettings.newCardsPerDay}" 
                    min="0" max="999" 
                    style="width: 100%; padding: 10px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-surface); color: var(--text-primary); font-size: 14px;">
            </div>
            <div>
                <label style="display: block; margin-bottom: 8px; font-weight: 500; color: var(--text-secondary);">
                    Max reviews per day:
                </label>
                <input type="number" id="deckSettingMaxReviews" value="${deckSettings.maxReviewsPerDay}" 
                    min="0" max="999" 
                    style="width: 100%; padding: 10px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-surface); color: var(--text-primary); font-size: 14px;">
            </div>
            <div style="padding: 12px; background: var(--bg-surface-2); border-radius: 8px; font-size: 13px; color: var(--text-tertiary);">
                <strong>Note:</strong> Set to 0 for unlimited. These limits apply only to new study sessions.
            </div>
        </div>
    `;
    
    dom.customModalTitle.textContent = `${deck.name} Settings`;
    dom.customModalContent.style.display = 'block';
    dom.customModalContent.innerHTML = '';
    dom.customModalContent.appendChild(content);
    dom.customModalInputContainer.classList.add('hidden');
    
    dom.btnModalCancel.style.display = 'block';
    dom.btnModalConfirm.textContent = 'Save';
    
    // Show modal
    dom.customModal.classList.remove('hidden');
    
    // Promise for user action
    return new Promise((resolve) => {
        const confirmHandler = () => {
            const newCards = parseInt(document.getElementById('deckSettingNewCards').value) || 0;
            const maxReviews = parseInt(document.getElementById('deckSettingMaxReviews').value) || 0;
            
            store.dispatch('DECK_UPDATE', {
                deckId: id,
                updates: {
                    settings: {
                        newCardsPerDay: newCards,
                        maxReviewsPerDay: maxReviews
                    }
                }
            });
            
            showToast("Settings saved");
            cleanup();
            resolve(true);
        };
        
        const cancelHandler = () => {
            cleanup();
            resolve(false);
        };
        
        const cleanup = () => {
            dom.customModal.classList.add('hidden');
            dom.customModalContent.innerHTML = '';
            dom.btnModalConfirm.removeEventListener('click', confirmHandler);
            dom.btnModalCancel.removeEventListener('click', cancelHandler);
        };
        
        dom.btnModalConfirm.addEventListener('click', confirmHandler);
        dom.btnModalCancel.addEventListener('click', cancelHandler);
    });
}

// Module-level UI state (not persisted to cloud)
let _showingTrash = false;

/**
 * Share a deck with another user by username
 * @param {string} deckId
 * @param {string} deckName
 */
export async function shareDeck(deckId, deckName) {
    const username = await ui.prompt(`Share "${deckName}" — Enter the recipient's username:`);
    if (!username || !username.trim()) return;

    try {
        showToast(`Sharing deck...`, 'info');
        const res = await fetch('/api/decks/share', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deck_id: deckId, recipient_username: username.trim() }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to share deck');
        showToast(`✅ ${data.message}`, 'success');
    } catch (err) {
        showToast(`❌ ${err.message}`, 'error');
        appLogger.error('Failed to share deck', err);
    }
}

/**
 * Toggle trash view
 */
export function toggleTrash() {
    _showingTrash = !_showingTrash;
    renderSidebar();
}

/**
 * Render the sidebar with decks
 */
export function renderSidebar() {
    dom.deckList.innerHTML = '';
    
    const currentState = store.getState();
    const filteredDecks = currentState.decks.filter(d => 
        _showingTrash ? d.isDeleted : !d.isDeleted
    );

    // Render deck toolbar for the active deck (action buttons above the list)
    let toolbar = document.getElementById('deckToolbar');
    if (!toolbar) {
        toolbar = document.createElement('div');
        toolbar.id = 'deckToolbar';
        toolbar.className = 'deck-toolbar';
        dom.deckList.parentElement.insertBefore(toolbar, dom.deckList);
    }
    toolbar.innerHTML = '';
    
    const activeDeck = currentState.decks.find(d => d.id === currentState.activeDeckId);
    if (activeDeck && !activeDeck.isDeleted && !_showingTrash) {
        const toolbarLabel = document.createElement('span');
        toolbarLabel.style.cssText = 'flex:1; font-size:12px; color:var(--text-tertiary); font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;';
        toolbarLabel.textContent = activeDeck.name;
        toolbar.appendChild(toolbarLabel);
        
        const colorBtn = document.createElement('button');
        colorBtn.className = 'icon-btn';
        colorBtn.innerHTML = '<ion-icon name="color-palette-outline"></ion-icon>';
        colorBtn.title = 'Change color';
        colorBtn.onclick = () => {
            ui.colorPicker(activeDeck.color || '#7C5CFC', activeDeck.gradient).then(res => {
                if (res) {
                    try {
                        store.dispatch('DECK_UPDATE', { deckId: activeDeck.id, updates: { color: res.color, gradient: res.gradient } });
                        eventBus.emit(EVENTS.DECK_UPDATED, { id: activeDeck.id });
                        renderSidebar();
                    } catch (error) { showToast("Failed to update color"); }
                }
            });
        };
        toolbar.appendChild(colorBtn);
        
        const settingsBtn = document.createElement('button');
        settingsBtn.className = 'icon-btn';
        settingsBtn.innerHTML = '<ion-icon name="settings-outline"></ion-icon>';
        settingsBtn.title = 'Deck settings';
        settingsBtn.onclick = () => editDeckSettings(activeDeck.id);
        toolbar.appendChild(settingsBtn);
        
        const renameBtn = document.createElement('button');
        renameBtn.className = 'icon-btn';
        renameBtn.innerHTML = '<ion-icon name="pencil-outline"></ion-icon>';
        renameBtn.title = 'Rename';
        renameBtn.onclick = () => renameDeck(activeDeck.id);
        toolbar.appendChild(renameBtn);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'icon-btn delete-toolbar-btn';
        deleteBtn.innerHTML = '<ion-icon name="trash-outline"></ion-icon>';
        deleteBtn.title = 'Delete';
        deleteBtn.onclick = () => deleteDeck(activeDeck.id);
        toolbar.appendChild(deleteBtn);
        
        const shareBtn = document.createElement('button');
        shareBtn.className = 'icon-btn share-toolbar-btn';
        shareBtn.innerHTML = '<ion-icon name="share-outline"></ion-icon>';
        shareBtn.title = 'Share deck';
        shareBtn.onclick = () => shareDeck(activeDeck.id, activeDeck.name);
        toolbar.appendChild(shareBtn);
    } else if (_showingTrash && activeDeck && activeDeck.isDeleted) {
        const toolbarLabel = document.createElement('span');
        toolbarLabel.style.cssText = 'flex:1; font-size:12px; color:var(--text-tertiary); font-weight:500;';
        toolbarLabel.textContent = activeDeck.name;
        toolbar.appendChild(toolbarLabel);
        
        const restoreBtn = document.createElement('button');
        restoreBtn.className = 'icon-btn restore-toolbar-btn';
        restoreBtn.innerHTML = '<ion-icon name="refresh-outline"></ion-icon>';
        restoreBtn.title = 'Restore deck';
        restoreBtn.onclick = () => restoreDeck(activeDeck.id);
        toolbar.appendChild(restoreBtn);
    } else {
        toolbar.style.display = 'none';
    }
    if (toolbar.children.length > 0) toolbar.style.display = '';

    filteredDecks.forEach(deck => {
        const li = document.createElement('li');
        li.className = `deck-item ${deck.id === currentState.activeDeckId ? 'active' : ''}`;
        
        // Define styles
        const color = deck.color || '#7C5CFC';
        const backgroundStyle = deck.gradient 
            ? `background: linear-gradient(135deg, ${color}22, ${color}44)` 
            : `background: ${color}15`; // 15 = low opacity hex
        const borderStyle = `border-left: 3px solid ${color}`;
        
        li.style.cssText = `${backgroundStyle}; ${borderStyle}`;
        
        // Create content container
        const contentDiv = document.createElement('div');
        contentDiv.style.cssText = "display:flex; align-items:center; gap:8px; flex:1; min-width:0;";
        
        const icon = document.createElement('ion-icon');
        icon.name = _showingTrash ? 'trash-outline' : 'folder-open-outline';
        contentDiv.appendChild(icon);
        
        const nameSpan = document.createElement('span');
        nameSpan.textContent = deck.name;
        nameSpan.style.cssText = 'overflow:hidden; text-overflow:ellipsis; white-space:nowrap;';
        contentDiv.appendChild(nameSpan);
        
        // Due cards badge
        if (!_showingTrash) {
            const stats = getDeckReviewStats(deck);
            const dueCount = stats.newCards + stats.dueCards;
            
            if (dueCount > 0) {
                const badge = document.createElement('span');
                badge.className = 'due-badge';
                badge.textContent = dueCount;
                badge.title = `${stats.newCards} new, ${stats.dueCards} due`;
                contentDiv.appendChild(badge);
            }
        }
        
        li.appendChild(contentDiv);
        
        // Click handler for switching
        li.onclick = () => {
            if(!_showingTrash) switchDeck(deck.id);
        };
        
        dom.deckList.appendChild(li);
    });

    // Sidebar Footer (Trash Toggle)
    let footer = document.getElementById('sidebarFooter');
    if(!footer) {
        footer = document.createElement('div');
        footer.id = 'sidebarFooter';
        dom.deckList.parentElement.appendChild(footer); // Appends to sidebar-content
        // Actually usually sidebar-footer is separate in HTML?
        // Let's check dom.js or index.html structure. 
        // index.html has <div class="sidebar-footer"> with buttons.
        // It seems `renderSidebar` overwrites usage of sidebar?
        // Wait, line 270 gets element by ID 'sidebarFooter'.
    }
    
    // Check if sidebarFooter exists in DOM (it should be in index.html)
    // If we rely on index.html having it, we should use that.
    
    const trashBtnHtml = `
        <button class="sidebar-trash-btn ${_showingTrash ? 'active' : ''}" id="btnToggleTrash">
            <ion-icon name="${_showingTrash ? 'arrow-back-outline' : 'trash-bin-outline'}"></ion-icon>
            ${_showingTrash ? 'Back to Decks' : 'Trash'}
        </button>
    `;
    
    let emptyTrashHtml = '';
    if (_showingTrash) {
        emptyTrashHtml = `
            <button class="empty-trash-btn" id="btnEmptyTrash" style="margin-top: 8px; width: 100%; color: #ef4444; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); padding: 8px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                <ion-icon name="ban-outline"></ion-icon> Empty Trash
            </button>
        `;
    }

    footer.innerHTML = trashBtnHtml + emptyTrashHtml;
    
    // Attach listeners
    const btnToggle = footer.querySelector('#btnToggleTrash');
    if(btnToggle) btnToggle.onclick = toggleTrash;
    
    const btnEmpty = footer.querySelector('#btnEmptyTrash');
    if(btnEmpty) btnEmpty.onclick = emptyTrash;
}
