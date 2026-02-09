/**
 * Deck Operations Module
 * Deck CRUD, Sidebar rendering, Trash management
 */

import { store } from '../../core/store.js';
import { eventBus, EVENTS } from '../../core/events.js';
import { appLogger } from '../../core/logger.js';
import { STATE, saveState, getActiveDeck, setActiveDeck, generateId } from '../../core/storage/storage.js';
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
            color: '#6366f1'
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

/**
 * Toggle trash view
 */
export function toggleTrash() {
    STATE.showingTrash = !STATE.showingTrash;
    renderSidebar();
}

/**
 * Render the sidebar with decks
 */
export function renderSidebar() {
    dom.deckList.innerHTML = '';
    
    const filteredDecks = STATE.decks.filter(d => 
        STATE.showingTrash ? d.isDeleted : !d.isDeleted
    );

    filteredDecks.forEach(deck => {
        const li = document.createElement('li');
        li.className = `deck-item ${deck.id === STATE.activeDeckId ? 'active' : ''}`;
        
        // Define styles
        const color = deck.color || '#6366f1';
        const backgroundStyle = deck.gradient 
            ? `background: linear-gradient(135deg, ${color}22, ${color}44)` 
            : `background: ${color}15`; // 15 = low opacity hex
        const borderStyle = `border-left: 3px solid ${color}`;
        
        li.style.cssText = `${backgroundStyle}; ${borderStyle}`;

        // Action Buttons
        let actionBtn = '';
        if (STATE.showingTrash) {
             // Restore Button (we'll render as HTML string then attach listeners via delegation or onclick for now)
             // Using data-attributes for event delegation would be cleaner, but keeping explicit onclick requires global scope.
             // We will Attach listeners to the created elements.
        }
        
        // Create content container
        const contentDiv = document.createElement('div');
        contentDiv.style.cssText = "display:flex; align-items:center; gap:8px; flex:1";
        
        const icon = document.createElement('ion-icon');
        icon.name = STATE.showingTrash ? 'trash-outline' : 'folder-open-outline';
        contentDiv.appendChild(icon);
        
        const nameSpan = document.createElement('span');
        nameSpan.textContent = deck.name;
        contentDiv.appendChild(nameSpan);
        
        // Due cards badge
        if (!STATE.showingTrash) {
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

        // Buttons Container
        const btnsDiv = document.createElement('div');
        btnsDiv.className = 'deck-actions';
        
        if (!STATE.showingTrash) {
            // Color Picker Button
            const colorBtn = document.createElement('button');
            colorBtn.className = 'icon-btn color-picker-btn';
            colorBtn.innerHTML = '<ion-icon name="color-palette-outline"></ion-icon>';
            colorBtn.title = 'Change color';
            colorBtn.onclick = (e) => {
                e.stopPropagation();
                ui.colorPicker(deck.color || '#6366f1', deck.gradient).then(res => {
                    if (res) {
                        try {
                            store.dispatch('DECK_UPDATE', {
                                deckId: deck.id,
                                updates: { color: res.color, gradient: res.gradient }
                            });
                            eventBus.emit(EVENTS.DECK_UPDATED, { id: deck.id });
                            renderSidebar();
                            appLogger.info(`Deck color updated: ${res.color}`);
                        } catch (error) {
                            appLogger.error("Failed to update deck color", error);
                            showToast("Failed to update color");
                        }
                    }
                });
            };
            btnsDiv.appendChild(colorBtn);
            // Settings Button
            const settingsBtn = document.createElement('button');
            settingsBtn.className = 'icon-btn';
            settingsBtn.innerHTML = '<ion-icon name="settings-outline"></ion-icon>';
            settingsBtn.title = 'Deck settings';
            settingsBtn.onclick = (e) => editDeckSettings(deck.id, e);
            btnsDiv.appendChild(settingsBtn);
            
            // Rename Button
            const renameBtn = document.createElement('button');
            renameBtn.className = 'icon-btn';
            renameBtn.innerHTML = '<ion-icon name="pencil-outline"></ion-icon>';
            renameBtn.title = 'Rename deck';
            renameBtn.setAttribute('aria-label', 'Rename deck');
            renameBtn.onclick = (e) => renameDeck(deck.id, e);
            btnsDiv.appendChild(renameBtn);
            
            // Delete Button
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'icon-btn delete-btn';
            deleteBtn.innerHTML = '<ion-icon name="trash-outline"></ion-icon>';
            deleteBtn.title = 'Delete deck';
            deleteBtn.setAttribute('aria-label', 'Delete deck');
            deleteBtn.onclick = (e) => deleteDeck(deck.id, e);
            btnsDiv.appendChild(deleteBtn);
            
        } else {
            // Restore Button
            const restoreBtn = document.createElement('button');
            restoreBtn.className = 'icon-btn restore-btn';
            restoreBtn.innerHTML = '<ion-icon name="refresh-outline"></ion-icon>';
            restoreBtn.title = 'Restore';
            restoreBtn.onclick = (e) => restoreDeck(deck.id, e);
            btnsDiv.appendChild(restoreBtn);
        }
        
        li.appendChild(btnsDiv);
        
        // Click handler for switching
        li.onclick = (e) => {
            // Check if we clicked an action button
            if (!e.target.closest('button')) {
                if(!STATE.showingTrash) switchDeck(deck.id);
            }
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
        <button class="sidebar-trash-btn ${STATE.showingTrash ? 'active' : ''}" id="btnToggleTrash">
            <ion-icon name="${STATE.showingTrash ? 'arrow-back-outline' : 'trash-bin-outline'}"></ion-icon>
            ${STATE.showingTrash ? 'Back to Decks' : 'Trash'}
        </button>
    `;
    
    let emptyTrashHtml = '';
    if (STATE.showingTrash) {
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
