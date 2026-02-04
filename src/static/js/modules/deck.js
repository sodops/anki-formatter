/**
 * Deck Operations Module
 * Deck CRUD, Sidebar rendering, Trash management
 */

import { STATE, saveState, getActiveDeck, setActiveDeck, generateId } from './state.js';
import { dom } from './dom.js';
import { ui, escapeHtml, showToast, colorPicker } from './ui.js';
import { renderWorkspace } from './card.js';

/**
 * Create a new deck
 * @param {string} name - Deck name
 */
export function createDeck(name) {
    if (!name) return;
    
    const newDeck = {
        id: generateId(),
        name: name,
        cards: [],
        color: '#6366f1', // Default color
        gradient: false,
        created: Date.now(),
        isDeleted: false
    };
    
    STATE.decks.push(newDeck);
    
    // Switch to new deck
    setActiveDeck(newDeck.id);
    saveState();
    
    renderSidebar();
    renderWorkspace();
    showToast(`Deck "${name}" created`);
}

/**
 * Switch to a different deck
 * @param {string} id - Deck ID
 */
export function switchDeck(id) {
    setActiveDeck(id);
    renderSidebar();
    renderWorkspace();
    
    // Clear file input
    if (dom.fileInput) dom.fileInput.value = '';
    
    // Reset inputs
    if (dom.omnibarInput) {
         dom.omnibarInput.value = '';
         dom.omnibarInput.focus();
    }
}

/**
 * Rename a deck
 * @param {string} id - Deck ID
 * @param {Event} event - UI event
 */
export async function renameDeck(id, event) {
    if(event) event.stopPropagation();
    
    const deck = STATE.decks.find(d => d.id === id);
    if (!deck) return;
    
    const newName = await ui.prompt("Rename Deck:", deck.name);
    if (newName && newName.trim() !== "") {
        deck.name = newName.trim();
        saveState();
        renderSidebar();
        renderWorkspace(); // Update title
        showToast("Deck renamed");
    }
}

/**
 * Delete a deck (move to trash)
 * @param {string} id - Deck ID
 * @param {Event} event - UI event
 */
export async function deleteDeck(id, event) {
    if(event) event.stopPropagation();
    
    const activeDecks = STATE.decks.filter(d => !d.isDeleted);
    if(activeDecks.length <= 1) {
        ui.alert("Cannot delete the only active deck.");
        return;
    }

    if(await ui.confirm("Move this deck to Trash?")) {
        const deck = STATE.decks.find(d => d.id === id);
        if(deck) {
            deck.isDeleted = true;
            
            // If deleted active deck, switch to another
            if(STATE.activeDeckId === id) {
                const nextDeck = STATE.decks.find(d => !d.isDeleted && d.id !== id);
                if(nextDeck) setActiveDeck(nextDeck.id);
            }
            
            saveState();
            renderSidebar();
            renderWorkspace();
            showToast("Deck moved to Trash");
        }
    }
}

/**
 * Restore a deck from trash
 * @param {string} id - Deck ID
 * @param {Event} event - UI event
 */
export function restoreDeck(id, event) {
    if(event) event.stopPropagation();
    const deck = STATE.decks.find(d => d.id === id);
    if(deck) {
        deck.isDeleted = false;
        saveState();
        renderSidebar();
        showToast("Deck Restored");
    }
}

/**
 * Empty trash (permanently delete)
 */
export async function emptyTrash() {
    if(await ui.confirm("Permanently delete all items in trash?")) {
        STATE.decks = STATE.decks.filter(d => !d.isDeleted);
        saveState();
        renderSidebar();
        showToast("Trash emptied");
    }
}

/**
 * Clear all cards in current deck
 */
export async function clearDeck() {
    if(await ui.confirm("Are you sure you want to clear this deck?")) {
        const deck = getActiveDeck();
        // Here we could track history, but keeping it simple for modularity first
        // Ideally import addToHistory from state or history module
        
        deck.cards = [];
        saveState();
        renderWorkspace();
        showToast("Deck cleared");
    }
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
                        deck.color = res.color;
                        deck.gradient = res.gradient;
                        saveState();
                        renderSidebar();
                    }
                });
            };
            btnsDiv.appendChild(colorBtn);
            
            // Rename Button
            const renameBtn = document.createElement('button');
            renameBtn.className = 'icon-btn';
            renameBtn.innerHTML = '<ion-icon name="pencil-outline"></ion-icon>';
            renameBtn.onclick = (e) => renameDeck(deck.id, e);
            btnsDiv.appendChild(renameBtn);
            
            // Delete Button
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'icon-btn delete-btn';
            deleteBtn.innerHTML = '<ion-icon name="trash-outline"></ion-icon>';
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
