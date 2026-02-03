/* Core State */
const STATE = {
    decks: [],
    activeDeckId: null,
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
    btnConfirmExport: document.getElementById('btnConfirmExport'),
    exportLoader: document.getElementById('exportLoader'),
    exportLoader: document.getElementById('exportLoader'),
    toast: document.getElementById('toast'),
    commandDropdown: document.getElementById('commandDropdown'),
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
    { id: 'new_deck', label: 'Create New Deck', icon: 'add-circle', desc: 'Start a fresh collection', action: () => dom.btnNewDeck.click() },
    { id: 'export', label: 'Export to Anki', icon: 'download', desc: 'Download .apkg file', action: () => dom.btnExportAnki.click() },
    { id: 'clear', label: 'Clear Current Deck', icon: 'trash', desc: 'Remove all cards', action: () => dom.btnClearDeck.click() },
    { id: 'upload', label: 'Upload File', icon: 'cloud-upload', desc: 'Import from computer', action: () => dom.fileInput.click() },
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

    // Omnibar
    dom.omnibarInput.addEventListener('keydown', handleOmnibarKey);
    dom.omnibarInput.addEventListener('input', handleOmnibarInput); // Added input listener
    dom.omnibarInput.addEventListener('paste', handleOmnibarPaste);
    
    // Global Shortcuts
    document.addEventListener('keydown', (e) => {
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

    // Actions
    dom.btnClearDeck.addEventListener('click', async () => {
        if(await ui.confirm("Are you sure you want to clear this deck?")) {
            const deck = getActiveDeck();
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
        dom.exportModal.classList.remove('hidden');
    });

    dom.btnCancelExport.addEventListener('click', () => dom.exportModal.classList.add('hidden'));
    dom.btnConfirmExport.addEventListener('click', executeExport);
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
        cards: []
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
    
    // Prevent deleting the last deck
    if(STATE.decks.length <= 1) {
        ui.alert("Cannot delete the only deck.");
        return;
    }

    if(await ui.confirm("Permanently delete this deck?")) {
        const index = STATE.decks.findIndex(d => d.id === id);
        if(index > -1) {
            STATE.decks.splice(index, 1);
            
            // If deleted active deck, switch to first one available
            if(STATE.activeDeckId === id) {
                STATE.activeDeckId = STATE.decks[0].id;
            }
            saveState();
            renderSidebar();
            renderWorkspace();
            showToast("Deck Deleted");
        }
    }
};

/* Rendering */
function renderSidebar() {
    dom.deckList.innerHTML = '';
    STATE.decks.forEach(deck => {
        const li = document.createElement('li');
        li.className = `deck-item ${deck.id === STATE.activeDeckId ? 'active' : ''}`;
        
        // Inner content with delete button
        li.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px; flex:1">
                <ion-icon name="folder-open-outline"></ion-icon> 
                ${escapeHtml(deck.name)}
            </div>
            <div class="delete-btn" onclick="deleteDeck('${deck.id}', event)">
                <ion-icon name="trash-outline"></ion-icon>
            </div>
        `;
        
        li.onclick = (e) => {
            if(!e.target.closest('.delete-btn')) switchDeck(deck.id);
        };
        dom.deckList.appendChild(li);
    });
}

function renderWorkspace() {
    const deck = getActiveDeck();
    if (!deck) return;

    dom.currentDeckTitle.textContent = deck.name;
    dom.countTotal.textContent = deck.cards.length;
    
    // Check issues
    const issues = deck.cards.filter(c => !c.term || !c.def).length;
    dom.countIssues.textContent = `${issues} Issues`;
    dom.countIssues.classList.toggle('hidden', issues === 0);

    dom.tableBody.innerHTML = '';

    if (deck.cards.length === 0) {
        dom.emptyState.classList.remove('hidden');
    } else {
        dom.emptyState.classList.add('hidden');
        deck.cards.forEach((card, index) => {
            const tr = document.createElement('tr');
            
            // Check validity
            if (!card.term || !card.def) tr.className = 'row-error';
            else if (!card.term.trim() || !card.def.trim()) tr.className = 'row-warning';
            
            tr.innerHTML = `
                <td><input type="text" class="editable-cell" style="width:100%" value="${escapeHtml(card.term)}" onchange="updateCard(${index}, 'term', this.value)"></td>
                <td><input type="text" class="editable-cell" style="width:100%" value="${escapeHtml(card.def)}" onchange="updateCard(${index}, 'def', this.value)"></td>
                <td><button class="action-btn secondary" onclick="removeCard(${index})" style="padding:4px;"><ion-icon name="close"></ion-icon></button></td>
            `;
            dom.tableBody.appendChild(tr);
        });
    }
}

/* Card Logic */
window.updateCard = function(index, field, value) {
    const deck = getActiveDeck();
    if(field === 'term') deck.cards[index].term = value;
    if(field === 'def') deck.cards[index].def = value;
    saveState();
    // We don't re-render entire table to keep focus, but update stats?
    // For simplicity, let's just save. The row style won't update until refresh or re-render.
    // To make it perfect, we could update row class here.
};

window.removeCard = function(index) {
    const deck = getActiveDeck();
    deck.cards.splice(index, 1);
    saveState();
    renderWorkspace();
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

    lines.forEach(line => {
        if (!line.trim()) return;
        const result = parseLine(line);
        if (result) {
            deck.cards.unshift(result); // Add to top
            addedCount++;
        }
    });

    if (addedCount > 0) {
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
                data.cards.forEach(c => deck.cards.unshift({ term: c.question, def: c.answer }));
            }
            if(data.failures) {
                data.failures.forEach(f => deck.cards.unshift({ term: f, def: "" }));
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
            return { term: parts[0].trim(), def: parts.slice(1).join(sep).trim() };
        }
    }
    
    // No separator found -> Add as Incomplete
    return { term: cleaned, def: "" }; 
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
        
        if(response.ok) {
            const deck = getActiveDeck();
            // Backend returns { cards: [{question, answer}], ... }
            if(data.cards) {
                data.cards.forEach(c => {
                    deck.cards.unshift({ term: c.question, def: c.answer });
                });
            }
            if(data.failures) {
                // Add failures as incomplete cards
                data.failures.forEach(f => {
                    deck.cards.unshift({ term: f, def: "" });
                });
            }
            saveState();
            renderWorkspace();
            showToast(`Imported ${data.cards.length} cards`);
        } else {
            ui.alert("Error parsing file: " + data.error);
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
        window.location.href = data.download_url;
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
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
