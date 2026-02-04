const STATE = {
    decks: [],
    activeDeckId: null,
    showingTrash: false, // Trash view toggle
    searchQuery: '', // Search filter
    history: [], // Undo/Redo stack
    historyIndex: -1 // Current position in history
};

/* DOM Elements */
const dom = {
    deckList: document.getElementById('deckList'),
    btnNewDeck: document.getElementById('btnNewDeck'),
    omnibarInput: document.getElementById('omnibarInput'),
    omnibarContainer: document.getElementById('omnibarContainer'),
    fileInput: document.getElementById('fileInput'),
    currentDeckTitle: document.getElementById('currentDeckTitle'),
    countTotal: document.getElementById('countTotal'),
    countIssues: document.getElementById('countIssues'),
    cardTable: document.getElementById('cardTable'),
    tableBody: document.getElementById('tableBody'),
    emptyState: document.getElementById('emptyState'),
    btnClearDeck: document.getElementById('btnClearDeck'),
    btnExportAnki: document.getElementById('btnExportAnki'),
    exportModal: document.getElementById('exportModal'),
    exportFilename: document.getElementById('exportFilename'),
    btnCancelExport: document.getElementById('btnCancelExport'),
    btnConfirmExport: document.getElementById('btnConfirmExport'),
    exportLoader: document.getElementById('exportLoader'),
    toast: document.getElementById('toast'),
    commandDropdown: document.getElementById('commandDropdown'),
    searchInput: document.getElementById('searchInput'),
    btnClearSearch: document.getElementById('btnClearSearch'),
    // Modal Elements
    customModal: document.getElementById('customModal'),
    customModalTitle: document.getElementById('customModalTitle'),
    customModalContent: document.getElementById('customModalContent'),
    customModalInputContainer: document.getElementById('customModalInputContainer'),
    customModalInput: document.getElementById('customModalInput'),
    btnModalCancel: document.getElementById('btnModalCancel'),
    btnModalConfirm: document.getElementById('btnModalConfirm'),
};

/* UI Helpers */
const ui = {
    prompt: (title, defaultValue = '') => {
        return new Promise((resolve) => {
            dom.customModalTitle.textContent = title;
            dom.customModalContent.textContent = ''; // Clear text
            dom.customModalInputContainer.classList.remove('hidden');
            dom.customModalInput.value = defaultValue;
            
            dom.btnModalCancel.style.display = 'block';
            dom.btnModalConfirm.textContent = 'OK';
            
            const close = (val) => {
                dom.customModal.classList.add('hidden');
                dom.customModalInput.value = ''; // Reset
                cleanUp();
                resolve(val);
            };

            const confirmHandler = () => close(dom.customModalInput.value);
            const cancelHandler = () => close(null);
            const keyHandler = (e) => {
                if (e.key === 'Enter') confirmHandler();
                if (e.key === 'Escape') cancelHandler();
            };

            const cleanUp = () => {
                dom.btnModalConfirm.removeEventListener('click', confirmHandler);
                dom.btnModalCancel.removeEventListener('click', cancelHandler);
                dom.customModalInput.removeEventListener('keydown', keyHandler);
            };

            dom.btnModalConfirm.addEventListener('click', confirmHandler);
            dom.btnModalCancel.addEventListener('click', cancelHandler);
            dom.customModalInput.addEventListener('keydown', keyHandler);

            dom.customModal.classList.remove('hidden');
            dom.customModalInput.focus();
        });
    },

    confirm: (message) => {
        return new Promise((resolve) => {
            dom.customModalTitle.textContent = 'Confirm';
            dom.customModalContent.textContent = message;
            dom.customModalInputContainer.classList.add('hidden');
            
            dom.btnModalCancel.style.display = 'block';
            dom.btnModalConfirm.textContent = 'Yes';
            
            const close = (val) => {
                dom.customModal.classList.add('hidden');
                cleanUp();
                resolve(val);
            };

            const confirmHandler = () => close(true);
            const cancelHandler = () => close(false);

            const cleanUp = () => {
                dom.btnModalConfirm.removeEventListener('click', confirmHandler);
                dom.btnModalCancel.removeEventListener('click', cancelHandler);
            };

            dom.btnModalConfirm.addEventListener('click', confirmHandler);
            dom.btnModalCancel.addEventListener('click', cancelHandler);

            dom.customModal.classList.remove('hidden');
        });
    },
    
    alert: (message) => {
         // Re-use Toast or simple modal? Let's use Toast for non-critical, but Modal for critical errors. 
         // For now, let's just map "alert" to our Toast if it's simple, or modal if complex.
         // Actually, user wants to replace "annoying alerts", so a simple modal is safer for errors.
        return new Promise((resolve) => {
            dom.customModalTitle.textContent = 'Notice';
            dom.customModalContent.textContent = message;
            dom.customModalInputContainer.classList.add('hidden');
            
            dom.btnModalCancel.style.display = 'none'; // No cancel
            dom.btnModalConfirm.textContent = 'OK';
            
            const close = () => {
                dom.customModal.classList.add('hidden');
                cleanUp();
                resolve();
            };

            const confirmHandler = () => close();
            const cleanUp = () => dom.btnModalConfirm.removeEventListener('click', confirmHandler);

            dom.btnModalConfirm.addEventListener('click', confirmHandler);
            dom.customModal.classList.remove('hidden');
        });
    }
};

/* Command Registry */
const COMMANDS = [
    { id: 'new_deck', label: 'Create New Deck',  desc: 'Add a new flashcard deck', icon: 'folder-outline', shortcut: '',  action: () => document.getElementById('btnNewDeck').click() },
    { id: 'export', label: 'Export to Anki', desc: 'Download as .anki file', icon: 'download-outline', shortcut: '', action: () => document.getElementById('btnExportAnki').click() },
    { id: 'clear', label: 'Clear Current Deck', desc: 'Delete all cards', icon: 'trash-bin-outline', shortcut: '', action: () => document.getElementById('btnClearDeck').click() },
    { id: 'upload', label: 'Upload File', desc: 'Import from TXT/CSV/DOCX', icon: 'cloud-upload-outline', shortcut: '', action: () => document.getElementById('fileInput').click() },
    { id: 'shortcuts', label: 'Keyboard Shortcuts', desc: 'View all keyboard shortcuts', icon: 'help-circle-outline', shortcut: 'Ctrl+/', action: () => openShortcutsModal() },
    { id: 'help', label: 'Help / About', icon: 'help-circle', desc: 'Show documentation', action: () => window.open('https://github.com/sodops/anki-formatter', '_blank') },
];
let activeCommandIndex = 0;
let filteredCommands = [];

/* Initialization */
document.addEventListener('DOMContentLoaded', () => {
    loadState();
    if (STATE.decks.length === 0) {
        createDeck("My First Deck");
    }
    renderSidebar();
    renderWorkspace();
    setupEventListeners();
});

/* Event Listeners */
function setupEventListeners() {
    // Sidebar
    dom.btnNewDeck.addEventListener('click', async () => {
        const name = await ui.prompt("Deck Name:", "New Deck");
        if (name) createDeck(name);
    });
    
    // Shortcuts Modal Close Button
    document.getElementById('btnCloseShortcuts')?.addEventListener('click', closeShortcutsModal);
    
    // Color Picker
    document.getElementById('btnCancelColor')?.addEventListener('click', closeColorPicker);
    document.querySelectorAll('.color-option').forEach(btn => {
        btn.addEventListener('click', () => applyDeckColor(btn.dataset.color));
    });
    
    // Export Preview
    document.getElementById('btnPreviewExport')?.addEventListener('click', showExportPreview);
    document.getElementById('btnClosePreview')?.addEventListener('click', closeExportPreview);
    document.getElementById('btnConfirmFromPreview')?.addEventListener('click', () => {
        closeExportPreview();
        executeExport();
    });

    // Omnibar
    dom.omnibarInput.addEventListener('keydown', handleOmnibarKey);
    dom.omnibarInput.addEventListener('input', handleOmnibarInput); // Added input listener
    dom.omnibarInput.addEventListener('paste', handleOmnibarPaste);
    
    // Make ENTER button (key-hint) clickable
    document.querySelector('.key-hint').addEventListener('click', () => {
        const text = dom.omnibarInput.value.trim();
        if (!text) return;
        if (text.startsWith('>')) {
            // Command mode - execute active command
            if (filteredCommands[activeCommandIndex]) {
                filteredCommands[activeCommandIndex].action();
                closeCommandPalette();
            }
        } else {
            // Normal mode - process text
            processInputText(text);
            dom.omnibarInput.value = '';
        }
    });
    
    // Global Shortcuts
    document.addEventListener('keydown', (e) => {
        // Undo/Redo
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            undo();
            return;
        }
        if ((e.ctrlKey || e.metaKey) && (e.key === 'Z' || (e.shiftKey && e.key === 'z'))) {
            e.preventDefault();
            redo();
            return;
        }
        
        // Ctrl+/ - Keyboard Shortcuts
        if ((e.ctrlKey || e.metaKey) && e.key === '/') {
            e.preventDefault();
            openShortcutsModal();
            return;
        }
        
        // F1 - Command Palette
        if(e.key === 'F1') {
            e.preventDefault();
            dom.omnibarInput.focus();
            openCommandPalette();
        }
    });

    // Drag & Drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dom.omnibarContainer.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false); // Prevent open in browser
    });
    
    dom.omnibarContainer.addEventListener('drop', handleDrop, false);
    dom.omnibarContainer.addEventListener('click', (e) => {
        // If clicked on icon -> Trigger File Input
        if(e.target.closest('#omnibarIcon')) {
            dom.fileInput.click();
            return;
        }
        // Otherwise focus input
        if(e.target === dom.omnibarContainer) {
            dom.omnibarInput.focus();
        }
    });

    // File Input Change
    dom.fileInput.addEventListener('change', (e) => {
        if(dom.fileInput.files.length > 0) {
            handleFileUpload(dom.fileInput.files[0]);
            dom.fileInput.value = ''; // Reset
        }
    });
    
    // Search Input
    dom.searchInput.addEventListener('input', (e) => {
        STATE.searchQuery = e.target.value.trim();
        // Toggle clear button visibility
        dom.btnClearSearch.classList.toggle('hidden', !STATE.searchQuery);
        renderWorkspace();
    });
    
    // Clear Search Button
    dom.btnClearSearch.addEventListener('click', () => {
        STATE.searchQuery = '';
        dom.searchInput.value = '';
        dom.btnClearSearch.classList.add('hidden');
        renderWorkspace();
    });

    // Actions
    dom.btnClearDeck.addEventListener('click', async () => {
        if(await ui.confirm("Are you sure you want to clear this deck?")) {
            const deck = getActiveDeck();
            const oldCards = [...deck.cards]; // Copy before clearing
            
            // Track in history
            pushHistory({
                type: 'clear',
                deckId: deck.id,
                cards: oldCards
            });
            
            deck.cards = [];
            saveState();
            renderWorkspace();
            showToast("Deck Cleared");
        }
    });

    dom.btnExportAnki.addEventListener('click', () => {
        const deck = getActiveDeck();
        if(deck.cards.length === 0) {
            ui.alert("Deck is empty!"); // Custom Alert
            return;
        }
        dom.exportFilename.value = deck.name.replace(/\s+/g, '_').toLowerCase();
        
        // Reset to default
        const defaultRadio = document.querySelector('input[name="exportFormat"][value="apkg"]');
        if(defaultRadio) {
            defaultRadio.checked = true;
            dom.btnConfirmExport.textContent = 'Download .apkg';
        }

        dom.exportModal.classList.remove('hidden');
    });

    dom.btnCancelExport.addEventListener('click', () => dom.exportModal.classList.add('hidden'));
    dom.btnConfirmExport.addEventListener('click', executeExport);

    // Export Format Change Listener
    document.querySelectorAll('input[name="exportFormat"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const format = e.target.value;
            if(format === 'apkg') dom.btnConfirmExport.textContent = 'Download .apkg';
            else if(format === 'txt') dom.btnConfirmExport.textContent = 'Download .txt';
            else if(format === 'md') dom.btnConfirmExport.textContent = 'Download .md';
        });
    });
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

/* State Management */
function loadState() {
    const saved = localStorage.getItem('anki_dashboard_state');
    if (saved) {
        const parsed = JSON.parse(saved);
        STATE.decks = parsed.decks || [];
        STATE.activeDeckId = parsed.activeDeckId || null;
    }
}

function saveState() {
    localStorage.setItem('anki_dashboard_state', JSON.stringify(STATE));
}

function createDeck(name) {
    const newDeck = {
        id: crypto.randomUUID(),
        name: name,
        cards: [],
        color: '#6366F1' // Default indigo accent color
    };
    STATE.decks.push(newDeck);
    STATE.activeDeckId = newDeck.id;
    saveState();
    renderSidebar();
    renderWorkspace();
}

function getActiveDeck() {
    return STATE.decks.find(d => d.id === STATE.activeDeckId);
}

function switchDeck(id) {
    STATE.activeDeckId = id;
    saveState();
    renderSidebar();
    renderWorkspace();
}

/* Deck Management */
window.deleteDeck = async function(id, event) {
    if(event) event.stopPropagation();
    
    // Count active decks
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
                if(nextDeck) STATE.activeDeckId = nextDeck.id;
            }
            saveState();
            renderSidebar();
            renderWorkspace();
            showToast("Moved to Trash");
        }
    }
};

/* Rendering */
function renderSidebar() {
    dom.deckList.innerHTML = '';
    
    // Filter decks based on view mode
    const visibleDecks = STATE.decks.filter(d => 
        STATE.showingTrash ? d.isDeleted : !d.isDeleted
    );

    if(visibleDecks.length === 0) {
        dom.deckList.innerHTML = `<li style="padding:10px; color:var(--text-muted); font-size:12px; text-align:center;">
            ${STATE.showingTrash ? 'Trash is empty' : 'No decks found'}
        </li>`;
    }

    visibleDecks.forEach(deck => {
        const li = document.createElement('li');
        li.className = `deck-item ${deck.id === STATE.activeDeckId ? 'active' : ''}`;
        
        // Ensure deck has color
        if (!deck.color) deck.color = '#6366F1';
        li.style.borderLeft = `4px solid ${deck.color}`;
        
        let actionBtn = '';
        if(STATE.showingTrash) {
            // Restore Button
            actionBtn = `
            <div class="restore-btn" onclick="restoreDeck('${deck.id}', event)" title="Restore Deck">
                <ion-icon name="refresh-outline"></ion-icon>
            </div>`;
        } else {
            // Delete Button
            actionBtn = `
            <div class="delete-btn" onclick="deleteDeck('${deck.id}', event)" title="Move to Trash">
                <ion-icon name="trash-outline"></ion-icon>
            </div>`;
        }

        li.innerHTML = `
            <div style="display:flex; align-items:center; gap:8px; flex:1">
                <ion-icon name="${STATE.showingTrash ? 'trash-outline' : 'folder-open-outline'}"></ion-icon> 
                ${escapeHtml(deck.name)}
            </div>
            ${!STATE.showingTrash ? `<button class="icon-btn color-picker-btn" onclick="openColorPicker('${deck.id}', event)" title="Change color"><ion-icon name="color-palette-outline"></ion-icon></button>` : ''}
            ${actionBtn}
        `;
        
        li.onclick = (e) => {
            if(!e.target.closest('.delete-btn') && !e.target.closest('.restore-btn')) {
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
        dom.deckList.parentElement.appendChild(footer);
    }
    
    footer.innerHTML = `
        <button class="sidebar-trash-btn ${STATE.showingTrash ? 'active' : ''}" onclick="toggleTrash()">
            <ion-icon name="${STATE.showingTrash ? 'arrow-back-outline' : 'trash-bin-outline'}"></ion-icon>
            ${STATE.showingTrash ? 'Back to Decks' : 'Trash'}
        </button>
    `;
}

window.toggleTrash = function() {
    STATE.showingTrash = !STATE.showingTrash;
    renderSidebar();
};

window.restoreDeck = function(id, event) {
    if(event) event.stopPropagation();
    const deck = STATE.decks.find(d => d.id === id);
    if(deck) {
        deck.isDeleted = false;
        saveState();
        renderSidebar();
        showToast("Deck Restored");
        // Maintain trash view
    }
};

/* Helper: Get filtered cards based on search query */
function getFilteredCards(cards) {
    if (!STATE.searchQuery) return cards;
    const query = STATE.searchQuery.toLowerCase();
    return cards.filter(card => 
        card.term.toLowerCase().includes(query) || 
        card.def.toLowerCase().includes(query)
    );
}

function renderWorkspace() {
    const deck = getActiveDeck();
    if (!deck) return;

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
            const tagBadgesHTML = card.tags.map(tag => 
                `<span class="tag-badge">${escapeHtml(tag)}<button class="tag-remove" onclick="removeTag(${originalIndex}, '${escapeHtml(tag)}')">&times;</button></span>`
            ).join('');
            
            // Make row draggable
            tr.setAttribute('draggable', 'true');
            tr.dataset.cardIndex = originalIndex;
            
            tr.innerHTML = `
                <td class="drag-handle">
                    <ion-icon name="reorder-two-outline"></ion-icon>
                </td>
                <td><input type="text" class="editable-cell" style="width:100%" value="${escapeHtml(card.term)}" onchange="updateCard(${originalIndex}, 'term', this.value)"></td>
                <td><input type="text" class="editable-cell" style="width:100%" value="${escapeHtml(card.def)}" onchange="updateCard(${originalIndex}, 'def', this.value)"></td>
                <td class="tags-cell">
                    <div class="tags-container">
                        ${tagBadgesHTML}
                        <input type="text" class="tag-input" placeholder="Add tag..." onkeydown="handleTagInput(event, ${originalIndex})" />
                    </div>
                </td>
                <td><button class="action-btn secondary" onclick="removeCard(${originalIndex})" style="padding:4px;"><ion-icon name="close"></ion-icon></button></td>
            `;
            
            // Add drag event listeners
            tr.addEventListener('dragstart', handleDragStart);
            tr.addEventListener('dragover', handleDragOver);
            tr.addEventListener('drop', handleDrop);
            tr.addEventListener('dragend', handleDragEnd);
            
            dom.tableBody.appendChild(tr);
        });
    }
}

/* Tag Management */
window.handleTagInput = function(event, index) {
    if (event.key === 'Enter' || event.key === ',') {
        event.preventDefault();
        const input = event.target;
        const tag = input.value.trim().replace(/^#/, ''); // Remove # if user typed it
        
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
        }
    }
};

window.removeTag = function(index, tag) {
    const deck = getActiveDeck();
    if (deck.cards[index].tags) {
        deck.cards[index].tags = deck.cards[index].tags.filter(t => t !== tag);
        saveState();
        renderWorkspace();
        showToast(`Tag "${tag}" removed`);
    }
};


/* Card Logic */
window.updateCard = function(index, field, value) {
    const deck = getActiveDeck();
    const oldValue = field === 'term' ? deck.cards[index].term : deck.cards[index].def;
    
    // Track in history
    pushHistory({
        type: 'edit',
        deckId: deck.id,
        index: index,
        field: field,
        oldValue: oldValue,
        newValue: value
    });
    
    if(field === 'term') deck.cards[index].term = value;
    if(field === 'def') deck.cards[index].def = value;
    saveState();
};

window.removeCard = function(index) {
    const deck = getActiveDeck();
    const deletedCard = {...deck.cards[index]}; // Copy before deleting
    
    // Track in history
    pushHistory({
        type: 'delete',
        deckId: deck.id,
        index: index,
        card: deletedCard
    });
    
    deck.cards.splice(index, 1);
    saveState();
    renderWorkspace();
    showToast('Card deleted');
};

/* Omnibar Logic */
function handleOmnibarKey(e) {
    if (e.key === 'F1') {
        e.preventDefault();
        dom.omnibarInput.focus();
        openCommandPalette(); // Use central function
        return;
    }

    const val = e.target.value;
    const isCommandMode = val.startsWith('>');

    if (isCommandMode) {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            activeCommandIndex = (activeCommandIndex + 1) % filteredCommands.length;
            renderCommandDropdown();
            return;
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            activeCommandIndex = (activeCommandIndex - 1 + filteredCommands.length) % filteredCommands.length;
            renderCommandDropdown();
            return;
        }
        if (e.key === 'Enter') {
            e.preventDefault();
            if (filteredCommands[activeCommandIndex]) {
                const cmd = filteredCommands[activeCommandIndex];
                cmd.action();
                closeCommandPalette();
            }
            return;
        }
        if (e.key === 'Escape') {
            closeCommandPalette();
            return;
        }
    } else {
        // Normal Mode
        if (e.key === 'Enter') {
            const text = e.target.value;
            if (!text.trim()) return;
            processInputText(text);
            e.target.value = ''; // Clear input
        }
    }
}

/* Command Palette Functions */
function openCommandPalette() {
    dom.omnibarInput.value = '>';
    // Modal Mode Logic
    dom.omnibarContainer.classList.add('modal-active');
    
    // Create/Show Overlay
    let overlay = document.getElementById('omnibarOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'omnibarOverlay';
        overlay.className = 'omnibar-overlay';
        overlay.onclick = closeCommandPalette; // Click outside to close
        document.body.appendChild(overlay);
    }
    // Small timeout for transition
    requestAnimationFrame(() => overlay.classList.add('active'));

    handleOmnibarInput({ target: dom.omnibarInput });
}

function closeCommandPalette() {
    dom.commandDropdown.classList.add('hidden');
    dom.omnibarInput.value = '';
    
    // Exit Modal Mode
    dom.omnibarContainer.classList.remove('modal-active');
    const overlay = document.getElementById('omnibarOverlay');
    if (overlay) {
        overlay.classList.remove('active');
        // Wait for transition then remove? Or just leave it hidden
        setTimeout(() => { if(!overlay.classList.contains('active')) overlay.remove(); }, 200);
    }
}

function handleOmnibarInput(e) {
    const val = e.target.value;
    if (val.startsWith('>')) {
        const query = val.slice(1).toLowerCase().trim();
        filteredCommands = COMMANDS.filter(c => 
            c.label.toLowerCase().includes(query) || 
            c.desc.toLowerCase().includes(query)
        );
        activeCommandIndex = 0;
        renderCommandDropdown();
    } else {
        dom.commandDropdown.classList.add('hidden');
    }
}

function renderCommandDropdown() {
    if (filteredCommands.length === 0) {
        dom.commandDropdown.classList.add('hidden');
        return;
    }
    dom.commandDropdown.classList.remove('hidden');
    dom.commandDropdown.innerHTML = '';
    
    filteredCommands.forEach((cmd, index) => {
        const div = document.createElement('div');
        div.className = `command-item ${index === activeCommandIndex ? 'active' : ''}`;
        div.innerHTML = `
            <ion-icon name="${cmd.icon}"></ion-icon>
            <div style="display:flex; flex-direction:column; gap:2px;">
                <span style="font-weight:500">${cmd.label}</span>
                <span style="font-size:11px; opacity:0.7">${cmd.desc}</span>
            </div>
            ${cmd.shortcut ? `<span class="command-shortcut">${cmd.shortcut}</span>` : ''}
        `;
        div.onclick = () => {
            cmd.action();
            closeCommandPalette();
        };
        dom.commandDropdown.appendChild(div);
    });
}


function handleOmnibarPaste(e) {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text');
    processInputText(text);
}

async function handleDrop(e) {
    e.preventDefault();
    const dt = e.dataTransfer;
    const files = dt.files;
    if(files.length > 0) {
        handleFileUpload(files[0]);
    }
}

function processInputText(text) {
    const deck = getActiveDeck();
    
    // Check for Google Docs URL
    if (text.trim().match(/^https:\/\/docs\.google\.com\/document\/d\//)) {
        handleGoogleDoc(text.trim());
        return;
    }

    const lines = text.split('\n');
    let addedCount = 0;
    const addedCards = [];

    lines.forEach(line => {
        if (!line.trim()) return;
        const result = parseLine(line);
        if (result) {
            deck.cards.unshift(result); // Add to top
            addedCards.push(result);
            addedCount++;
        }
    });

    if (addedCount > 0) {
        // Track in history
        pushHistory({
            type: 'add',
            deckId: deck.id,
            count: addedCount,
            cards: addedCards
        });
        
        saveState();
        renderWorkspace();
        showToast(`Added ${addedCount} cards`);
        dom.omnibarInput.value = '';
    }
}

// Google Docs Handler
async function handleGoogleDoc(url) {
    const formData = new FormData();
    formData.append('doc_url', url);
    
    showToast("Fetching Google Doc...", "info");

    try {
        const response = await fetch('/parse', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        
        if (response.ok) {
            const deck = getActiveDeck();
            if(data.cards) {
                data.cards.forEach(c => deck.cards.unshift({ term: c.question, def: c.answer, tags: [] }));
            }
            if(data.failures) {
                data.failures.forEach(f => deck.cards.unshift({ term: f, def: "", tags: [] }));
            }
            saveState();
            renderWorkspace();
            showToast(`Imported from Doc: ${data.cards.length} cards`);
            dom.omnibarInput.value = '';
        } else {
            ui.alert("Google Doc Error: " + data.error);
        }
    } catch (e) {
        console.error(e);
        ui.alert("Network Error fetching Doc");
    }
}

function parseLine(line) {
    // Simple client-side parser
    // Remove bullets
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

/* File Handling */
async function handleFileUpload(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('deck_id', STATE.activeDeckId); // Just for context if needed

    showToast("Processing File...", "info");

    try {
        const response = await fetch('/parse', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        
        if(response.ok && data.cards) {
            // Convert backend format to our format
            const cards = data.cards.map(c => ({
                term: c.question,
                def: c.answer,
                tags: []
            }));
            
            // Add failures as incomplete cards
            if (data.failures) {
                data.failures.forEach(f => {
                    cards.push({ term: f, def: "", tags: [] });
                });
            }
            
            //Show preview instead of direct import
            const fileExt = file.name.split('.').pop().toLowerCase();
            showImportPreview(cards, fileExt);
        } else {
            ui.alert("Error parsing file: " + (data.error || "Unknown error"));
        }

    } catch(e) {
        console.error(e);
        ui.alert("Upload failed");
    }
}

/* Export Logic */
async function executeExport() {
    const deck = getActiveDeck();
    const filename = dom.exportFilename.value || 'deck_export';
    const format = document.querySelector('input[name="exportFormat"]:checked').value;
    
    dom.exportLoader.classList.remove('hidden');
    dom.btnConfirmExport.disabled = true;

    try {
        if (format === 'apkg') {
            await downloadApkg(deck, filename);
        } else if (format === 'txt') {
            downloadTxt(deck, filename);
        } else if (format === 'md') {
            downloadMd(deck, filename);
        }
        
        dom.exportModal.classList.add('hidden');
        showToast("Export Successful!");

    } catch(e) {
        console.error(e);
        ui.alert(e.message || "Export failed");
    } finally {
        dom.exportLoader.classList.add('hidden');
        dom.btnConfirmExport.disabled = false;
    }
}

async function downloadApkg(deck, filename) {
    const cards = deck.cards
        .filter(c => c.term && c.def)
        .map(c => ({ question: c.term, answer: c.def }));

    if(cards.length === 0) throw new Error("Deck is empty");

    const response = await fetch('/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            cards, 
            deck_name: deck.name, 
            filename 
        })
    });

    const data = await response.json();
    if(response.ok) {
        // Fetch the file as a blob to give it a proper name client-side
        const fileRes = await fetch(data.download_url);
        const blob = await fileRes.blob();
        triggerDownloadBlob(blob, `${filename}.apkg`);
    } else {
        throw new Error(data.error);
    }
}

function downloadTxt(deck, filename) {
    let content = "";
    deck.cards.forEach(card => {
        if(card.term && card.def) {
            content += `${card.term} - ${card.def}\n`;
        }
    });
    triggerDownload(content, `${filename}.txt`, 'text/plain');
}

function downloadMd(deck, filename) {
    let content = `# ${deck.name}\n\n`;
    content += `| Term | Definition |\n|---|---|\n`;
    deck.cards.forEach(card => {
        if(card.term && card.def) {
            content += `| ${card.term} | ${card.def} |\n`;
        }
    });
    triggerDownload(content, `${filename}.md`, 'text/markdown');
}

function triggerDownload(content, filename, type) {
    const blob = new Blob([content], { type: type });
    triggerDownloadBlob(blob, filename);
}

function triggerDownloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/* Undo/Redo System */
function pushHistory(operation) {
    // Remove any "future" history if we're not at the end
    STATE.history = STATE.history.slice(0, STATE.historyIndex + 1);
    
    // Add new operation
    STATE.history.push(operation);
    STATE.historyIndex++;
    
    // Limit history size (keep last 50 operations)
    if (STATE.history.length > 50) {
        STATE.history.shift();
        STATE.historyIndex--;
    }
}

function undo() {
    if (STATE.historyIndex < 0) {
        showToast('Nothing to undo', 'warning');
        return;
    }
    
    const operation = STATE.history[STATE.historyIndex];
    const deck = STATE.decks.find(d => d.id === operation.deckId);
    if (!deck) {
        showToast('Cannot undo: deck not found', 'warning');
        return;
    }
    
    // Reverse the operation
    switch (operation.type) {
        case 'add':
            // Remove the added cards
            deck.cards.splice(0, operation.count);
            break;
        case 'delete':
            // Restore the deleted card at its original position
            deck.cards.splice(operation.index, 0, operation.card);
            break;
        case 'edit':
            // Restore old value
            if (operation.field === 'term') deck.cards[operation.index].term = operation.oldValue;
            if (operation.field === 'def') deck.cards[operation.index].def = operation.oldValue;
            break;
        case 'clear':
            // Restore all cards
            deck.cards = [...operation.cards];
            break;
    }
    
    STATE.historyIndex--;
    saveState();
    renderWorkspace();
    showToast('Undo successful');
}

function redo() {
    if (STATE.historyIndex >= STATE.history.length - 1) {
        showToast('Nothing to redo', 'warning');
        return;
    }
    
    STATE.historyIndex++;
    const operation = STATE.history[STATE.historyIndex];
    const deck = STATE.decks.find(d => d.id === operation.deckId);
    if (!deck) {
        showToast('Cannot redo: deck not found', 'warning');
        return;
    }
    
    // Re-apply the operation
    switch (operation.type) {
        case 'add':
            // Re-add cards
            operation.cards.forEach(card => deck.cards.unshift(card));
            break;
        case 'delete':
            // Re-delete the card
            deck.cards.splice(operation.index, 1);
            break;
        case 'edit':
            // Re-apply new value
            if (operation.field === 'term') deck.cards[operation.index].term = operation.newValue;
            if (operation.field === 'def') deck.cards[operation.index].def = operation.newValue;
            break;
        case 'clear':
            // Re-clear deck
            deck.cards = [];
            break;
    }
    
    saveState();
    renderWorkspace();
    showToast('Redo successful');
}

/* Keyboard Shortcuts Modal */
function openShortcutsModal() {
    document.getElementById('shortcutsModal').classList.remove('hidden');
}

function closeShortcutsModal() {
    document.getElementById('shortcutsModal').classList.add('hidden');
}

/* Color Picker */
let colorPickerTargetDeckId = null;

window.openColorPicker = function(deckId, event) {
    if (event) event.stopPropagation();
    colorPickerTargetDeckId = deckId;
    document.getElementById('colorPickerModal').classList.remove('hidden');
};

function closeColorPicker() {
    document.getElementById('colorPickerModal').classList.add('hidden');
    colorPickerTargetDeckId = null;
}

function applyDeckColor(color) {
    if (colorPickerTargetDeckId) {
        const deck = STATE.decks.find(d => d.id === colorPickerTargetDeckId);
        if (deck) {
            deck.color = color;
            saveState();
            renderSidebar();
            showToast(`Deck color updated`);
        }
    }
    closeColorPicker();
}

/* Export Preview */
function showExportPreview() {
    const deck = getActiveDeck();
    if (!deck) return;
    
    const allCards = deck.cards;
    const validCards = allCards.filter(c => c.term && c.def && c.term.trim() && c.def.trim());
    const issues = allCards.length - validCards.length;
    
    // Update stats
    document.getElementById('previewTotalCards').textContent = allCards.length;
    document.getElementById('previewValidCards').textContent = validCards.length;
    document.getElementById('previewIssues').textContent = issues;
    
    // Show sample cards (first 5)
    const previewList = document.getElementById('previewCardsList');
    previewList.innerHTML = '';
    
    const sampleCards = allCards.slice(0, 5);
    sampleCards.forEach((card, idx) => {
        const isInvalid = !card.term || !card.def || !card.term.trim() || !card.def.trim();
        const cardEl = document.createElement('div');
        cardEl.className = `preview-card ${isInvalid ? 'invalid' : ''}`;
        
        // Render markdown for term and definition
        const renderedTerm = card.term ? renderMarkdown(card.term) : '<em>Empty</em>';
        const renderedDef = card.def ? renderMarkdown(card.def) : '<em>Empty</em>';
        
        cardEl.innerHTML = `
            <div class="preview-card-number">#${idx + 1}</div>
            <div class="preview-card-content">
                <div><strong>Term:</strong> <span class="markdown-content">${renderedTerm}</span></div>
                <div><strong>Definition:</strong> <span class="markdown-content">${renderedDef}</span></div>
                ${card.tags && card.tags.length > 0 ? `<div class="preview-tags">${card.tags.map(t => `<span class="tag-badge">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
            </div>
            ${isInvalid ? '<div class="preview-warning"><ion-icon name="alert-circle"></ion-icon> Invalid</div>' : ''}
        `;
        previewList.appendChild(cardEl);
    });
    
    if (allCards.length > 5) {
        const moreEl = document.createElement('div');
        moreEl.className = 'preview-more';
        moreEl.textContent = `... and ${allCards.length - 5} more cards`;
        previewList.appendChild(moreEl);
    }
    
    // Show preview modal
    document.getElementById('exportPreviewModal').classList.remove('hidden');
}

function closeExportPreview() {
    document.getElementById('exportPreviewModal').classList.add('hidden');
}

/* Drag & Drop Card Reordering */
let draggedElement = null;
let draggedIndex = null;

function handleDragStart(e) {
    draggedElement = e.currentTarget;
    draggedIndex = parseInt(draggedElement.dataset.cardIndex);
    
    e.currentTarget.style.opacity = '0.5';
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget.innerHTML);
}

function handleDragOver(e) {
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

function handleDrop(e) {
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

function handleDragEnd(e) {
    e.currentTarget.style.opacity = '';
    
    // Remove drag-over class from all rows
    document.querySelectorAll('.drag-over').forEach(row => {
        row.classList.remove('drag-over');
    });
    
    draggedElement = null;
    draggedIndex = null;
}


/* Utilities */
function showToast(msg, type='success') {
    dom.toast.textContent = msg;
    dom.toast.classList.remove('hidden');
    setTimeout(() => {
        dom.toast.classList.add('hidden');
    }, 3000);
}

function escapeHtml(text) {
    if (!text) return "";
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

/* Markdown Utilities */
function renderMarkdown(text) {
    if (!text) return '';
    if (typeof marked === 'undefined') return escapeHtml(text);
    
    try {
        const html = marked.parse(text, { breaks: true, gfm: true });
        return html;
    } catch (e) {
        console.error('Markdown parsing error:', e);
        return escapeHtml(text);
   }
}

// Configure marked.js on load
if (typeof marked !== 'undefined') {
    marked.setOptions({
        breaks: true,
        gfm: true,
        headerIds: false,
        mangle: false
    });
}


/* Import Preview */
var pendingImport = {
    cards: [],
    rawData: null,
    fileType: '',
    columns: []
};

function showImportPreview(cards, fileType, rawData = null, columns = []) {
    pendingImport = { cards, fileType, rawData, columns };
    
    // Update stats
    document.getElementById('importTotal').textContent = cards.length;
    
    // Show column mapping for CSV
    const mappingSection = document.getElementById('columnMapping');
    if (fileType === 'csv' && columns.length > 0) {
        setupColumnMapping(columns);
        mappingSection.classList.remove('hidden');
    } else {
        mappingSection.classList.add('hidden');
    }
    
    // Render preview
    renderImportPreview(cards.slice(0, 10));
    
    // Show modal
    document.getElementById('importPreviewModal').classList.remove('hidden');
}

function setupColumnMapping(columns) {
    const termSelect = document.getElementById('termColumnSelect');
    const defSelect = document.getElementById('defColumnSelect');
    
    // Clear existing options
    termSelect.innerHTML = '';
    defSelect.innerHTML = '';
    
    // Add column options
    columns.forEach((col, idx) => {
        const termOption = document.createElement('option');
        termOption.value = idx;
        termOption.textContent = col || `Column ${idx + 1}`;
        termSelect.appendChild(termOption);
        
        const defOption = document.createElement('option');
        defOption.value = idx;
        defOption.textContent = col || `Column ${idx + 1}`;
        defSelect.appendChild(defOption);
    });
    
    // Set defaults (column 0 = term, column 1 = def)
    if (columns.length >= 2) {
        termSelect.value = 0;
        defSelect.value = 1;
    }
}

function renderImportPreview(cards) {
    const previewList = document.getElementById('importPreviewList');
    previewList.innerHTML = '';
    
    if (cards.length === 0) {
        previewList.innerHTML = '<p style="text-align: center; color: var(--text-tertiary);">No cards to preview</p>';
        return;
    }
    
    cards.forEach((card, idx) => {
        const isInvalid = !card.term || !card.def || !card.term.trim() || !card.def.trim();
        const cardEl = document.createElement('div');
        cardEl.className = `import-card-preview ${isInvalid ? 'invalid' : ''}`;
        
        cardEl.innerHTML = `
            <div class="import-card-number">#${idx + 1}</div>
            <div class="import-card-content">
                <div><strong>Term:</strong> <span class="value">${escapeHtml(card.term) || '<em style="color: #ef4444;">Empty</em>'}</span></div>
                <div><strong>Definition:</strong> <span class="value">${escapeHtml(card.def) || '<em style="color: #ef4444;">Empty</em>'}</span></div>
                ${card.tags && card.tags.length > 0 ? `<div><strong>Tags:</strong> ${card.tags.map(t => `<span class="tag-badge">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
            </div>
        `;
        
        previewList.appendChild(cardEl);
    });
    
    // Show "and X more" if there are more cards
    if (pendingImport.cards.length > 10) {
        const moreEl = document.createElement('div');
        moreEl.style.textAlign = 'center';
        moreEl.style.padding = '12px';
        moreEl.style.color = 'var(--text-tertiary)';
        moreEl.textContent = `... and ${pendingImport.cards.length - 10} more cards`;
        previewList.appendChild(moreEl);
    }
}

function updateImportPreview() {
    if (pendingImport.fileType !== 'csv' || !pendingImport.rawData) return;
    
    const termColIdx = parseInt(document.getElementById('termColumnSelect').value);
    const defColIdx = parseInt(document.getElementById('defColumnSelect').value);
    
    // Re-parse with new column mapping
    const remappedCards = pendingImport.rawData.map(row => ({
        term: row[termColIdx] || '',
        def: row[defColIdx] || '',
        tags: []
    }));
    
    pendingImport.cards = remappedCards;
    renderImportPreview(remappedCards.slice(0, 10));
    document.getElementById('importTotal').textContent = remappedCards.length;
}

function confirmImport() {
    const deck = getActiveDeck();
    if (!deck) {
        showToast('No active deck', 'error');
        closeImportPreview();
        return;
    }
    
    // Filter out completely empty cards
    const validCards = pendingImport.cards.filter(c => c.term || c.def);
    
    if (validCards.length === 0) {
        showToast('No valid cards to import', 'error');
        closeImportPreview();
        return;
    }
    
    // Add to deck
    deck.cards.push(...validCards);
    saveState();
    renderWorkspace();
    
    showToast(`Imported ${validCards.length} cards`);
    closeImportPreview();
}

function closeImportPreview() {
    document.getElementById('importPreviewModal').classList.add('hidden');
    pendingImport = { cards: [], rawData: null, fileType: '', columns: [] };
}
