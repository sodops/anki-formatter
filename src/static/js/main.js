/**
 * Main Entry Point
 * App initialization, event listeners, and command palette
 */

import { STATE, loadState, saveState, getActiveDeck, addToHistory } from './modules/state.js';
import { dom, verifyDomElements } from './modules/dom.js';
import { ui } from './modules/ui.js'; // Default export object
import { renderSidebar, createDeck, switchDeck, renameDeck, deleteDeck, restoreDeck, emptyTrash, clearDeck, toggleTrash } from './modules/deck.js';
import { renderWorkspace, addCard, updateCard, removeCard, handleTagInput, removeTag, parseLine } from './modules/card.js';
import { setupDragDrop, handleDrop } from './modules/drag-drop.js';
import { setupMarked } from './modules/markdown.js';
import { executeExport, showExportPreview, closeExportPreview } from './modules/export.js';
import { handleFileUpload, showImportPreview, updateImportPreview, confirmImport, closeImportPreview } from './modules/import.js';
import { undo, redo } from './modules/history.js';

// --- Command Registry ---
const COMMANDS = [
    { id: 'new_deck', label: 'Create New Deck',  desc: 'Add a new flashcard deck', icon: 'folder-outline', shortcut: '',  action: () => window.createDeck() },
    { id: 'export', label: 'Export to Anki', desc: 'Download as .anki file', icon: 'download-outline', shortcut: '', action: () => { if(dom.btnExportDeck) dom.btnExportDeck.click() } },
    { id: 'clear', label: 'Clear Current Deck', desc: 'Delete all cards', icon: 'trash-bin-outline', shortcut: '', action: () => clearDeck() },
    { id: 'upload', label: 'Upload File', desc: 'Import from TXT/CSV/DOCX', icon: 'cloud-upload-outline', shortcut: '', action: () => { if(dom.fileInput) dom.fileInput.click() } },
    { id: 'shortcuts', label: 'Keyboard Shortcuts', desc: 'View all keyboard shortcuts', icon: 'help-circle-outline', shortcut: 'Ctrl+/', action: () => openShortcutsModal() },
    { id: 'help', label: 'Help / About', icon: 'help-circle', desc: 'Show documentation', action: () => window.open('https://github.com/sodops/anki-formatter', '_blank') },
];

let activeCommandIndex = 0;
let filteredCommands = [];

// --- Initialization ---

document.addEventListener('DOMContentLoaded', () => {
    console.log("AnkiFlow Initializing...");
    
    verifyDomElements();
    setupMarked();
    loadState();
    
    // Default Deck if none
    if (!STATE.decks || STATE.decks.length === 0) {
        createDeck("My First Deck");
    }
    
    // Setup Global Scoping for HTML onclicks inside init to ensure deps are ready
    setupGlobalExports();

    setupEventListeners();
    setupDragDrop();
    
    renderSidebar();
    renderWorkspace();
    
    console.log("AnkiFlow Ready");
});

function setupGlobalExports() {
    window.createDeck = () => {
        ui.prompt("Enter deck name:", "New Deck").then(name => {
            if(name) createDeck(name);
        });
    };
    window.switchDeck = switchDeck;
    window.renameDeck = renameDeck;
    window.deleteDeck = deleteDeck;
    window.restoreDeck = restoreDeck;
    window.toggleTrash = toggleTrash;
    window.removeCard = removeCard;
    window.updateCard = updateCard;
    window.handleTagInput = handleTagInput;
    window.removeTag = removeTag;
    window.handleFileUpload = (e) => handleFileUpload(e.target.files[0]);
    window.executeExport = executeExport;
    window.showExportPreview = showExportPreview;
    window.closeExportPreview = closeExportPreview;
    window.showImportPreview = showImportPreview; 
    window.updateImportPreview = updateImportPreview;
    window.confirmImport = confirmImport;
    window.closeImportPreview = closeImportPreview;

    window.undo = undo;
    window.redo = redo;
    
    // Helper to open color picker from HTML onclick
    window.openColorPicker = (color, gradient) => {
         // This assumes the calling element handling.
         // Since deck.js creates the button with onclick, we need to support it.
         ui.colorPicker(color, gradient).then(res => {
             // We need to apply it. But we don't know the deck ID here easily without context.
             // deck.js handles the promise if it called ui.colorPicker directly.
             // If HTML onclick calls window.openColorPicker, it expects us to handle it.
             // BUT in deck.js I wrote: colorBtn.onclick = (e) => { ui.colorPicker(...) }
             // So I don't need window.openColorPicker!
         });
    };
}

function setupEventListeners() {
    // New Deck Button
    if(dom.btnNewDeck) dom.btnNewDeck.addEventListener('click', window.createDeck);
    
    // Trash Button (this might be dynamic, check dom.js) - dom.btnTrash might be null if not in HTML
    // It's created in deck.js renderSidebar.
    
    // Clear Deck Button
    if(dom.btnClearDeck) dom.btnClearDeck.addEventListener('click', clearDeck);
    
    // Export Button (Open Modal)
    if(dom.btnExportDeck) dom.btnExportDeck.addEventListener('click', () => {
        if(dom.exportModal) dom.exportModal.classList.remove('hidden');
    });
    
    // Export Modal Actions
    if(dom.btnCancelExport) dom.btnCancelExport.addEventListener('click', () => {
         dom.exportModal.classList.add('hidden');
    });
    if(dom.btnPreviewExport) dom.btnPreviewExport.addEventListener('click', showExportPreview);
    if(dom.btnConfirmExport) dom.btnConfirmExport.addEventListener('click', executeExport);
    
    // Export Format Change Listener
    document.querySelectorAll('input[name="exportFormat"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const format = e.target.value;
            if(dom.btnConfirmExport) {
                if(format === 'apkg') dom.btnConfirmExport.textContent = 'Download .apkg';
                else if(format === 'txt') dom.btnConfirmExport.textContent = 'Download .txt';
                else if(format === 'md') dom.btnConfirmExport.textContent = 'Download .md';
            }
        });
    });

    // Import Preview Buttons
    if(dom.btnConfirmImport) dom.btnConfirmImport.addEventListener('click', confirmImport);
    if(dom.btnCancelImport) dom.btnCancelImport.addEventListener('click', closeImportPreview);
    
    // File Input
    if(dom.fileInput) dom.fileInput.addEventListener('change', window.handleFileUpload);

    // Omnibar Input
    if(dom.omnibarInput) {
        dom.omnibarInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !dom.omnibarInput.value.startsWith('>')) {
                // Add Card
                const line = dom.omnibarInput.value.trim();
                const deck = getActiveDeck();
                if (line && deck) {
                    const parsed = parseLine(line);
                    if (parsed) {
                        addCard(parsed.term, parsed.def);
                        dom.omnibarInput.value = '';
                        ui.showToast("Card added");
                    } else {
                        // Maybe just add as term if simple text? logic in parseLine handles it (returns term, empty def)
                        // addCard(line, "");
                    }
                }
            }
            handleOmnibarKey(e);
        });
        
        dom.omnibarInput.addEventListener('input', (e) => {
            const val = e.target.value;
            if (val.startsWith('>')) {
                // Command Mode
                const query = val.slice(1).toLowerCase();
                filteredCommands = COMMANDS.filter(c => c.label.toLowerCase().includes(query));
                activeCommandIndex = 0;
                renderCommandDropdown();
            } else {
                closeCommandPalette();
            }
        });
    }

    // Omnibar Icon
    if(dom.omnibarIcon) dom.omnibarIcon.addEventListener('click', () => {
        if(dom.fileInput) dom.fileInput.click();
    });

    // Search Input
    if(dom.searchInput) {
        dom.searchInput.addEventListener('input', (e) => {
            STATE.searchQuery = e.target.value;
            if(dom.btnClearSearch) {
                if(STATE.searchQuery) dom.btnClearSearch.classList.remove('hidden');
                else dom.btnClearSearch.classList.add('hidden');
            }
            saveState();
            renderWorkspace();
        });
    }
    
    if(dom.btnClearSearch) {
        dom.btnClearSearch.addEventListener('click', () => {
            STATE.searchQuery = '';
            if(dom.searchInput) dom.searchInput.value = '';
            dom.btnClearSearch.classList.add('hidden');
            renderWorkspace();
        });
    }

    // Shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl+/ for shortcuts
        if ((e.ctrlKey || e.metaKey) && e.key === '/') {
            e.preventDefault();
            openShortcutsModal();
        }
        
        // F1 for Command Palette
        if (e.key === 'F1') {
            e.preventDefault();
            openCommandPalette();
        }
        
        // Undo/Redo (Ctrl+Z, Ctrl+Y)
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
            e.preventDefault();
            undo(); // Call local function
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
            e.preventDefault();
            redo();
        }
    });

    // Close Modals on click outside
    window.addEventListener('click', (e) => {
        if (dom.commandDropdown && !dom.commandDropdown.classList.contains('hidden')) {
             if (!e.target.closest('#omnibarContainer')) {
                 closeCommandPalette();
             }
        }
    });

    // Shortcuts Modal Close
    if(dom.btnCloseShortcuts) dom.btnCloseShortcuts.addEventListener('click', () => {
        const modal = document.getElementById('shortcutsModal');
        if(modal) modal.classList.add('hidden');
    });
    
    // Color Picker Close (if exists independently)
    const btnCancelColor = document.getElementById('btnCancelColor');
    if(btnCancelColor) btnCancelColor.addEventListener('click', () => {
        const modal = document.getElementById('colorPickerModal');
        if(modal) modal.classList.add('hidden');
    });

    // Export Preview Close
    if(dom.btnClosePreview) dom.btnClosePreview.addEventListener('click', closeExportPreview);
    if(dom.btnConfirmFromPreview) dom.btnConfirmFromPreview.addEventListener('click', () => {
        closeExportPreview();
        executeExport();
    });
}

// --- Command Palette Logic ---

function handleOmnibarKey(e) {
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
                if(dom.omnibarInput) dom.omnibarInput.value = '';
            }
            return;
        }
        if (e.key === 'Escape') {
            closeCommandPalette();
            if(dom.omnibarInput) dom.omnibarInput.value = '';
            return;
        }
    }
}

function openCommandPalette() {
    if(dom.omnibarInput) {
        dom.omnibarInput.value = '>';
        dom.omnibarInput.focus();
        dom.omnibarInput.dispatchEvent(new Event('input'));
    }
}

function closeCommandPalette() {
    if(dom.commandDropdown) dom.commandDropdown.classList.add('hidden');
    filteredCommands = [];
}

function renderCommandDropdown() {
    if(!dom.commandDropdown) return;

    if (filteredCommands.length === 0) {
        dom.commandDropdown.classList.add('hidden');
        return;
    }

    dom.commandDropdown.innerHTML = filteredCommands.map((cmd, i) => `
        <div class="command-item ${i === activeCommandIndex ? 'active' : ''}" onclick="window.executeCommand(${i})">
            <div style="display:flex; align-items:center; gap:12px;">
                <ion-icon name="${cmd.icon}"></ion-icon>
                <div>
                    <div class="cmd-label">${cmd.label}</div>
                    <div class="cmd-desc">${cmd.desc}</div>
                </div>
            </div>
            ${cmd.shortcut ? `<span class="cmd-shortcut">${cmd.shortcut}</span>` : ''}
        </div>
    `).join('');
    
    // Add global click handler
    window.executeCommand = (index) => {
        if(filteredCommands[index]) {
            filteredCommands[index].action();
            closeCommandPalette();
            if(dom.omnibarInput) dom.omnibarInput.value = '';
        }
    };

    dom.commandDropdown.classList.remove('hidden');
}

// --- Utils ---

function openShortcutsModal() {
    const modal = document.getElementById('shortcutsModal');
    if(modal) {
        modal.classList.remove('hidden');
        modal.onclick = (e) => {
            if(e.target === modal) modal.classList.add('hidden');
        };
    }
}

// --- Undo / Redo ---



function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

