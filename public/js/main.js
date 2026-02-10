/**
 * Main Entry Point
 * App initialization, event listeners, and command palette
 */

// Core Store Management
import { store } from './core/store.js';
import { eventBus, EVENTS } from './core/events.js';
import { appLogger, uiLogger } from './core/logger.js';

// Legacy storage (deprecated - use store instead)
import { STATE, loadState, saveState, getActiveDeck, addToHistory } from './core/storage/storage.js';

import { dom, verifyDomElements } from './utils/dom-helpers.js';
import { ui } from './ui/components/ui.js'; // Default export object
import { renderSidebar, createDeck, switchDeck, renameDeck, deleteDeck, restoreDeck, emptyTrash, clearDeck, toggleTrash } from './features/library/deck-manager.js';
import { renderWorkspace, addCard, updateCard, removeCard, handleTagInput, removeTag, parseLine, parseBulkLine, bulkDelete, bulkTag, cancelBulkSelection, findAndReplace, moveCard, copyCard, setTagFilter, suspendCard } from './features/library/card-manager.js';
import { setupDragDrop, handleDrop } from './ui/interactions/drag-drop.js';
import { setupMarked, insertMarkdown, renderMarkdown } from './utils/markdown-parser.js';
import { executeExport, showExportPreview, closeExportPreview } from './features/export/export-handler.js';
import { handleFileUpload, showImportPreview, updateImportPreview, confirmImport, closeImportPreview, handleGoogleDocImport } from './features/import/import-handler.js';
import { undo, redo } from './core/history/history-manager.js';
import { startStudySession } from './features/study/study-session.js';
import { loadDailyGoal } from './features/study/study-session.js';
import { openStats, calculateAndRenderStats } from './features/stats/stats-calculator.js';
import { initViewManager, initTabNavigation, switchView, VIEWS } from './ui/navigation/view-manager.js';
import { initThemeManager, switchTheme, toggleTheme, getCurrentTheme, THEMES } from './ui/theme/theme-manager.js';


// --- Command Registry ---
const COMMANDS = [
    { id: 'new_deck', label: 'Create New Deck',  desc: 'Add a new flashcard deck', icon: 'folder-outline', shortcut: '',  action: () => window.createDeck() },
    { id: 'export', label: 'Export to Anki', desc: 'Download as .anki file', icon: 'download-outline', shortcut: '', action: () => { if(dom.btnExportDeck) dom.btnExportDeck.click() } },
    { id: 'clear', label: 'Clear Current Deck', desc: 'Delete all cards', icon: 'trash-bin-outline', shortcut: '', action: () => clearDeck() },
    { id: 'upload', label: 'Upload File', desc: 'Import from TXT/CSV/DOCX', icon: 'cloud-upload-outline', shortcut: '', action: () => { if(dom.fileInput) dom.fileInput.click() } },
    { id: 'find_replace', label: 'Find & Replace', desc: 'Bulk text editing across cards', icon: 'search-outline', shortcut: '', action: () => openFindReplaceModal() },
    { id: 'shortcuts', label: 'Keyboard Shortcuts', desc: 'View all keyboard shortcuts', icon: 'help-circle-outline', shortcut: 'Ctrl+/', action: () => openShortcutsModal() },
    { id: 'help', label: 'Help / About', icon: 'help-circle', desc: 'Show documentation', action: () => window.open('https://github.com/sodops/anki-formatter', '_blank') },
];

let activeCommandIndex = 0;
let filteredCommands = [];

// --- Initialization ---

function initAnkiFlow() {
    appLogger.info("AnkiFlow Initializing...");
    
    try {
        verifyDomElements();
        setupMarked();
        
        // Load state from localStorage into store
        loadState();
        
        // Default Deck if none exists
        const currentState = store.getState();
        if (!currentState.decks || currentState.decks.length === 0) {
            const newDeck = store.dispatch('DECK_CREATE', { 
                name: "My First Deck",
                color: '#6366F1'
            });
            // Auto-select the new deck
            if (newDeck && newDeck.id) {
                store.dispatch('DECK_SELECT', newDeck.id);
            }
        }
        
        // If decks exist but no active deck, select the first one
        const stateAfterLoad = store.getState();
        if (stateAfterLoad.decks.length > 0 && !stateAfterLoad.activeDeckId) {
            const firstDeck = stateAfterLoad.decks.find(d => !d.isDeleted);
            if (firstDeck) {
                store.dispatch('DECK_SELECT', firstDeck.id);
            }
        }
        
        // Setup Global Scoping for HTML onclicks inside init to ensure deps are ready
        setupGlobalExports();

        try { setupEventListeners(); }
        catch (e) { console.error('[INIT] setupEventListeners FAILED:', e); }
        
        try { setupDragDrop(); } catch (e) { console.error('[INIT] setupDragDrop FAILED:', e); }
        
        try { renderSidebar(); renderWorkspace(); }
        catch (e) { console.error('[INIT] render FAILED:', e); }
        
        // Initialize theme system
        try { initThemeManager(); }
        catch (e) { console.error('[INIT] initThemeManager FAILED:', e); }
        
        // Initialize multi-view navigation
        try { initViewManager(); initTabNavigation(); }
        catch (e) { console.error('[INIT] initViewManager FAILED:', e); }
        
        // Initialize daily goal widget
        try { loadDailyGoal(); } catch (e) { console.error('[INIT] loadDailyGoal FAILED:', e); }
        
        // Initialize settings from localStorage
        try { initSettings(); }
        catch (e) { console.error('[INIT] initSettings FAILED:', e); }
        
        // Setup hamburger menu
        try { setupHamburgerMenu(); } catch (e) { console.error('[INIT] setupHamburgerMenu FAILED:', e); }
        
        // Hide skeleton, show app
        const skeleton = document.getElementById('appSkeleton');
        const appContainer = document.getElementById('appContainer');
        if (skeleton) skeleton.classList.add('hidden');
        if (appContainer) {
            appContainer.style.visibility = 'visible';
            appContainer.style.position = 'static';
            appContainer.removeAttribute('aria-hidden');
        }
        
        // Subscribe to store changes for real-time updates
        store.subscribe((newState) => {
            appLogger.debug("Store updated", newState);
            // Auto-save indicator
            showAutoSaveIndicator();
        });
        
        // === EVENT-DRIVEN UI UPDATES ===
        // Deck operations
        eventBus.on(EVENTS.DECK_CREATED, () => {
            renderSidebar();
        });
        
        eventBus.on(EVENTS.DECK_UPDATED, () => {
            renderSidebar();
            renderWorkspace();
        });
        
        eventBus.on(EVENTS.DECK_DELETED, () => {
            renderSidebar();
            renderWorkspace();
        });
        
        eventBus.on(EVENTS.DECK_RESTORED, () => {
            renderSidebar();
        });
        
        eventBus.on(EVENTS.DECK_SELECTED, () => {
            renderWorkspace();
        });
        
        // Card operations — these events are for external listeners only.
        // addCard/removeCard/suspendCard do targeted DOM updates,
        // so we do NOT call renderWorkspace() here to avoid double-render.
        eventBus.on(EVENTS.CARD_ADDED, () => {
            // Targeted DOM insert handled in addCard()
        });
        
        eventBus.on(EVENTS.CARD_UPDATED, () => {
            // Inline edit handled in createCardRow saveTerm/saveDef
        });
        
        eventBus.on(EVENTS.CARD_DELETED, () => {
            // Targeted DOM removal handled in removeCard()
        });
        
        // Study session
        eventBus.on(EVENTS.STUDY_CARD_RATED, () => {
            appLogger.info("Card rated, session continues");
        });
        
        // Search
        eventBus.on(EVENTS.SEARCH_UPDATED, () => {
            renderWorkspace();
        });
        
        // Cloud sync: re-render everything when cloud data loads
        window.addEventListener('ankiflow:state-loaded', () => {
            appLogger.info('Cloud state loaded, refreshing UI');
            try {
                renderSidebar();
                renderWorkspace();
                loadDailyGoal();
                initSettings();
            } catch (e) {
                console.error('[SYNC] UI refresh after cloud load failed:', e);
            }
        });
        
        appLogger.info("AnkiFlow Ready");
    } catch (error) {
        appLogger.error("Initialization failed", error);
        uiLogger.error("Failed to initialize app", error);
    }
}

// Support both: normal page load and Next.js dynamic script injection
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAnkiFlow);
} else {
    initAnkiFlow();
}

function setupGlobalExports() {
    window.createDeck = () => {
        ui.prompt("Enter deck name:", "New Deck").then(name => {
            if(name && name.trim()) {
                createDeck(name.trim());
            }
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
    window.handleFileUpload = (e) => {
        handleFileUpload(e.target.files[0]);
    };
    window.executeExport = executeExport;
    window.showExportPreview = showExportPreview;
    window.closeExportPreview = closeExportPreview;
    window.showImportPreview = showImportPreview; 
    window.updateImportPreview = updateImportPreview;
    window.confirmImport = confirmImport;
    window.closeImportPreview = closeImportPreview;

    window.undo = undo;
    window.redo = redo;
    window.findAndReplace = findAndReplace;
    window.moveCard = moveCard;
    window.copyCard = copyCard;
    window.setTagFilter = setTagFilter;
    window.suspendCard = suspendCard;
    
    // Statistics refresh
    window.refreshStats = calculateAndRenderStats;
    
    // Study view initialization
    window.initStudyView = () => {
        const currentState = store.getState();
        const activeDeck = currentState.decks.find(d => d.id === currentState.activeDeckId);
        
        if (activeDeck && activeDeck.cards && activeDeck.cards.length > 0) {
            // skipViewSwitch=true because we're already in study view
            startStudySession(true);
        } else {
            uiLogger.warn("No cards in active deck to study");
            ui.showToast("No cards to study in this deck");
        }
    };
    
    // Theme switching
    window.switchTheme = switchTheme;
    window.toggleTheme = toggleTheme;
    window.getCurrentTheme = getCurrentTheme;
    
    // Render theme options UI
    window.renderThemeOptions = () => {
        const container = document.getElementById('themeOptions');
        if (!container) return;
        
        const currentTheme = getCurrentTheme();
        const options = [
            { value: 'dark', icon: '', label: 'Dark Mode', desc: 'Easy on the eyes' },
            { value: 'light', icon: '', label: 'Light Mode', desc: 'Better in bright environments' },
            { value: 'auto', icon: '', label: 'Auto', desc: 'Match system preference' }
        ];
        
        container.innerHTML = options.map(opt => `
            <label class="theme-option" style="display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 8px; cursor: pointer; transition: background 0.2s ease; background: ${currentTheme === opt.value ? 'var(--bg-hover)' : 'transparent'}">
                <input type="radio" name="theme" value="${opt.value}" ${currentTheme === opt.value ? 'checked' : ''} onchange="window.switchTheme('${opt.value}'); window.renderThemeOptions();" style="cursor: pointer;">
                <div style="flex: 1;">
                    <div style="color: var(--text-primary); font-weight: 500;">${opt.icon} ${opt.label}</div>
                    <div style="color: var(--text-tertiary); font-size: 13px;">${opt.desc}</div>
                </div>
            </label>
        `).join('');
    };
    
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
    
    // Study Button — use getElementById as fallback for reliability
    const studyBtn = dom.btnStudyDeck || document.getElementById('btnStudyDeck');
    if(studyBtn) studyBtn.addEventListener('click', () => startStudySession());
    else console.warn('[INIT] btnStudyDeck not found');

    // Stats Button
    if(dom.btnOpenStats) dom.btnOpenStats.addEventListener('click', openStats);
    
    // Import Button (opens file picker)
    const btnImport = document.getElementById('btnImportCards');
    if(btnImport) btnImport.addEventListener('click', () => {
        if(dom.fileInput) dom.fileInput.click();
    });
    else console.warn('[INIT] btnImportCards not found');
    
    // Export Button (opens export modal)
    const btnExport = document.getElementById('btnExportDeck');
    if(btnExport) btnExport.addEventListener('click', () => {
        if(dom.exportModal) dom.exportModal.classList.remove('hidden');
    });
    
    // Trash Button (this might be dynamic, check dom.js) - dom.btnTrash might be null if not in HTML
    // It's created in deck.js renderSidebar.
    
    // Clear Deck Button
    if(dom.btnClearDeck) dom.btnClearDeck.addEventListener('click', clearDeck);
    
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
                else if(format === 'csv') dom.btnConfirmExport.textContent = 'Download .csv';
            }
        });
    });

    // Import Preview Buttons
    if(dom.btnConfirmImport) dom.btnConfirmImport.addEventListener('click', () => confirmImport());
    if(dom.btnCancelImport) dom.btnCancelImport.addEventListener('click', () => closeImportPreview());
    
    // File Input
    if(dom.fileInput) dom.fileInput.addEventListener('change', window.handleFileUpload);

    // Omnibar Input
    if(dom.omnibarInput) {
        dom.omnibarInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !dom.omnibarInput.value.startsWith('>')) {
                e.preventDefault();
                // Add Card
                const line = dom.omnibarInput.value.trim();
                const deck = getActiveDeck();
                
                if (!deck) {
                    ui.showToast("Select or create a deck first");
                    return;
                }
                
                if (!line) return;

                // Check for URL
                if (line.startsWith('http') && line.includes('docs.google.com')) {
                    handleGoogleDocImport(line);
                    dom.omnibarInput.value = '';
                    return;
                }

                const parsedBulk = parseBulkLine(line);
                
                if (parsedBulk && parsedBulk.length > 1) {
                     // Bulk add — use batch dispatch for performance
                     const validCards = parsedBulk.filter(p => p.term || p.def).map(p => ({
                         term: p.term || '',
                         def: p.def || '',
                         tags: []
                     }));
                     
                     if (validCards.length > 0) {
                         const deck = getActiveDeck();
                         if (deck) {
                             store.dispatch('CARD_BATCH_ADD', {
                                 deckId: deck.id,
                                 cards: validCards
                             });
                             renderWorkspace();
                             ui.showToast(`${validCards.length} cards added`);
                         } else {
                             ui.showToast('Select or create a deck first');
                         }
                     } else {
                         ui.showToast("Could not parse cards. Use format: term - definition");
                     }
                     dom.omnibarInput.value = '';
                } else {
                    const parsed = parseLine(line);
                    if (parsed && (parsed.term || parsed.def)) {
                        addCard(parsed.term || '', parsed.def || '');
                        dom.omnibarInput.value = '';
                        if (parsed.def) {
                            ui.showToast("Card added");
                        } else {
                            ui.showToast("Card added (missing definition — edit in table)");
                        }
                    } else {
                        ui.showToast("Could not parse. Use format: term - definition");
                    }
                }
            }
            handleOmnibarKey(e);
        });
        
        // Handle paste of multi-line content (e.g. 300 cards pasted at once)
        dom.omnibarInput.addEventListener('paste', (e) => {
            const pastedText = (e.clipboardData || window.clipboardData).getData('text');
            if (!pastedText) return;
            
            const lines = pastedText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
            
            // If 3+ lines pasted, treat as bulk import via import preview
            if (lines.length >= 3) {
                e.preventDefault();
                const deck = getActiveDeck();
                if (!deck) {
                    ui.showToast('Select or create a deck first');
                    return;
                }
                
                ui.showLoading(`Parsing ${lines.length} lines...`, 'Sending to server for parsing');
                
                // Use server-side parse API for robust parsing
                fetch('/api/parse', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ raw_text: pastedText })
                })
                .then(res => res.json())
                .then(data => {
                    ui.hideLoading();
                    if (data.cards && data.cards.length > 0) {
                        const cards = data.cards.map(c => ({
                            term: c.question,
                            def: c.answer,
                            tags: []
                        }));
                        // Add failures as term-only cards
                        if (data.failures) {
                            data.failures.forEach(f => {
                                cards.push({ term: f.replace(/^\[.*?\]\s*/, ''), def: '', tags: [] });
                            });
                        }
                        // Show import preview for review before adding
                        showImportPreview(cards, 'txt');
                    } else {
                        // Fallback: client-side parse each line
                        const cards = [];
                        for (const line of lines) {
                            const parsed = parseLine(line);
                            if (parsed && (parsed.term || parsed.def)) {
                                cards.push({ term: parsed.term || '', def: parsed.def || '', tags: [] });
                            }
                        }
                        if (cards.length > 0) {
                            showImportPreview(cards, 'txt');
                        } else {
                            ui.showToast('No parseable cards found in pasted content');
                        }
                    }
                    dom.omnibarInput.value = '';
                })
                .catch(() => {
                    ui.hideLoading();
                    // Offline fallback: client-side batch add
                    const cards = [];
                    for (const line of lines) {
                        const parsed = parseLine(line);
                        if (parsed && (parsed.term || parsed.def)) {
                            cards.push({ term: parsed.term || '', def: parsed.def || '', tags: [] });
                        }
                    }
                    if (cards.length > 0) {
                        showImportPreview(cards, 'txt');
                    } else {
                        ui.showToast('Could not parse pasted content');
                    }
                    dom.omnibarInput.value = '';
                });
            }
        });

        dom.omnibarInput.addEventListener('input', (e) => {
            const val = e.target.value;
            if (val.startsWith('>')) {
                // Command Mode
                const query = val.slice(1).toLowerCase();
                filteredCommands = COMMANDS.filter(c => c.label.toLowerCase().includes(query));
                activeCommandIndex = 0;
                renderCommandDropdown();
                hideOmnibarPreview();
            } else {
                closeCommandPalette();
                updateOmnibarPreview(val);
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
            const query = e.target.value;
            store.dispatch('SEARCH_SET', query);
            
            if(dom.btnClearSearch) {
                if(query) dom.btnClearSearch.classList.remove('hidden');
                else dom.btnClearSearch.classList.add('hidden');
            }
            renderWorkspace();
            
            // Emit search event for subscribers
            eventBus.emit(EVENTS.SEARCH_UPDATED, { query });
        });
    }
    
    if(dom.btnClearSearch) {
        dom.btnClearSearch.addEventListener('click', () => {
            store.dispatch('SEARCH_SET', '');
            if(dom.searchInput) dom.searchInput.value = '';
            dom.btnClearSearch.classList.add('hidden');
            renderWorkspace();
            eventBus.emit(EVENTS.SEARCH_UPDATED, { query: '' });
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
        
        // Undo/Redo (Ctrl+Z, Ctrl+Y) — skip inside inputs
        const isInputFocused = document.activeElement && 
            (document.activeElement.tagName === 'INPUT' || 
             document.activeElement.tagName === 'TEXTAREA' || 
             document.activeElement.isContentEditable);
        
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !isInputFocused) {
            e.preventDefault();
            undo();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'y' && !isInputFocused) {
            e.preventDefault();
            redo();
        }

        // Ctrl+F for Search
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            if(dom.searchInput) {
                dom.searchInput.focus();
                // Optional: Scroll to search bar if off screen
                dom.searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }

        // Global Escape Handler for Feature Modals
        if (e.key === 'Escape') {
            // 1. High Priority: UI confirmation modals (handled by their own listeners, mostly)
            if (dom.customModal && !dom.customModal.classList.contains('hidden')) {
                return; 
            }

            // 2. Feature Modals
            const modals = [
                document.getElementById('shortcutsModal'),
                dom.exportModal,
                dom.exportPreviewModal,
                dom.importPreviewModal,
                document.getElementById('colorPickerModal')
            ];

            let handled = false;
            modals.forEach(m => {
                if (m && !m.classList.contains('hidden')) {
                    m.classList.add('hidden');
                    handled = true;
                }
            });

            if (handled) {
                e.preventDefault();
                return;
            }

            // 3. Command Palette
            if (dom.commandDropdown && !dom.commandDropdown.classList.contains('hidden')) {
                closeCommandPalette();
                if(dom.omnibarInput) dom.omnibarInput.value = '';
                e.preventDefault();
                return;
            }
            
            // 4. Bulk Selection
            if (dom.bulkActionBar && !dom.bulkActionBar.classList.contains('hidden')) {
                cancelBulkSelection();
                e.preventDefault();
            }
        }
    });

    // Markdown Toolbar
    document.querySelectorAll('.md-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent focus loss
            const marker = btn.dataset.md;
            if (dom.omnibarInput && marker) {
                insertMarkdown(dom.omnibarInput, marker);
            }
        });
    });

    // Close Modals on click outside
    window.addEventListener('click', (e) => {
        if (dom.commandDropdown && !dom.commandDropdown.classList.contains('hidden')) {
             if (!e.target.closest('#omnibarContainer')) {
                 closeCommandPalette();
             }
        }
    });

    // Bulk Operations
    if(dom.btnBulkDelete) dom.btnBulkDelete.onclick = bulkDelete;
    if(dom.btnBulkTag) dom.btnBulkTag.onclick = bulkTag;
    if(dom.btnBulkCancel) dom.btnBulkCancel.onclick = cancelBulkSelection;

    // Find & Replace
    const btnFindReplace = document.getElementById('btnFindReplace');
    if (btnFindReplace) {
        btnFindReplace.addEventListener('click', openFindReplaceModal);
    }

    // Shortcuts Modal Close
    if(dom.btnCloseShortcuts) dom.btnCloseShortcuts.addEventListener('click', () => {
        const modal = document.getElementById('shortcutsModal');
        if(modal) modal.classList.add('hidden');
    });
    
    // Color Picker Close
    if(dom.btnCancelColor) dom.btnCancelColor.addEventListener('click', () => {
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



// --- Hamburger Menu ---

function setupHamburgerMenu() {
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const closeBtn = document.getElementById('sidebarCloseBtn');
    
    function openSidebar() {
        if (sidebar) sidebar.classList.add('open');
        if (overlay) overlay.classList.add('active');
    }
    
    function closeSidebar() {
        if (sidebar) sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('active');
    }
    
    if (hamburgerBtn) hamburgerBtn.addEventListener('click', openSidebar);
    if (overlay) overlay.addEventListener('click', closeSidebar);
    if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
    
    // Close sidebar when a deck is selected on mobile
    document.addEventListener('click', (e) => {
        if (e.target.closest('.deck-item') && window.innerWidth <= 768) {
            setTimeout(closeSidebar, 150);
        }
    });
}

// --- Settings Management ---

function initSettings() {
    // Read from cloud-synced settings first, fallback to local
    const cloudSettings = store.getState()?.settings || {};
    const key = store.getScopedKey('ankiflow_settings');
    const localSettings = JSON.parse(localStorage.getItem(key) || '{}');
    const settings = { ...localSettings, ...cloudSettings };
    
    // Populate settings fields
    const fields = {
        settingNewCards: { key: 'newCards', default: 20 },
        settingMaxReviews: { key: 'maxReviews', default: 100 },
        settingDailyGoal: { key: 'dailyGoal', default: 20 },
        settingIntervalMod: { key: 'intervalMod', default: 100 },
        settingLearningSteps: { key: 'learningSteps', default: '1, 10' },
        settingFontSize: { key: 'fontSize', default: 32 },
        settingSoundEffects: { key: 'soundEffects', default: false },
        settingKeyboardHints: { key: 'keyboardHints', default: true },
        settingReverseMode: { key: 'reverseMode', default: false }
    };
    
    for (const [id, config] of Object.entries(fields)) {
        const el = document.getElementById(id);
        if (!el) continue;
        
        const value = settings[config.key] !== undefined ? settings[config.key] : config.default;
        
        if (el.type === 'checkbox') {
            el.checked = value;
        } else {
            el.value = value;
        }
        
        // Save setting helper
        const saveSetting = () => {
            const key = store.getScopedKey('ankiflow_settings');
            const current = JSON.parse(localStorage.getItem(key) || '{}');
            current[config.key] = el.type === 'checkbox' ? el.checked : (el.type === 'number' || el.type === 'range' ? Number(el.value) : el.value);
            localStorage.setItem(key, JSON.stringify(current));
            
            // Trigger cloud sync for settings
            store._scheduleSyncToCloud();
            
            // Apply font size immediately
            if (config.key === 'fontSize') {
                document.documentElement.style.setProperty('--card-font-size', el.value + 'px');
                const fontSizeValue = document.getElementById('fontSizeValue');
                if (fontSizeValue) fontSizeValue.textContent = el.value + 'px';
            }
            
            // Update daily goal widget
            if (config.key === 'dailyGoal') {
                loadDailyGoal();
            }
            
            // Apply keyboard hints
            if (config.key === 'keyboardHints') {
                applyKeyboardHints(el.checked);
            }
            
            // Update range display labels
            if (config.key === 'intervalMod') {
                const display = document.getElementById('intervalModValue');
                if (display) display.textContent = el.value + '%';
            }
        };
        
        // Save on both change AND input so settings persist even on quick refresh
        el.addEventListener('change', saveSetting);
        
        if (el.type === 'range' || el.type === 'number' || el.type === 'text') {
            el.addEventListener('input', saveSetting);
        }
    }
    
    // Update display values on init
    const intervalModValue = document.getElementById('intervalModValue');
    if (intervalModValue) intervalModValue.textContent = (settings.intervalMod || 100) + '%';
    
    const fontSizeValue = document.getElementById('fontSizeValue');
    if (fontSizeValue) fontSizeValue.textContent = (settings.fontSize || 32) + 'px';
    
    // Apply font size
    if (settings.fontSize) {
        document.documentElement.style.setProperty('--card-font-size', settings.fontSize + 'px');
    }
    
    // Apply keyboard hints visibility
    applyKeyboardHints(settings.keyboardHints !== false);
    
    // Export all data button
    const btnExportAll = document.getElementById('btnExportAllData');
    if (btnExportAll) {
        btnExportAll.addEventListener('click', () => {
            const state = store.getState();
            const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ankiflow-backup-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            ui.showToast('Backup downloaded');
        });
    }
    
    // Import backup button
    const btnImportBackup = document.getElementById('btnImportBackup');
    const backupFileInput = document.getElementById('backupFileInput');
    if (btnImportBackup && backupFileInput) {
        btnImportBackup.addEventListener('click', () => backupFileInput.click());
        backupFileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            try {
                const text = await file.text();
                const data = JSON.parse(text);
                if (!data.decks || !Array.isArray(data.decks)) {
                    ui.alert('Invalid backup file — missing decks array.');
                    return;
                }
                const confirmed = await ui.confirm(
                    `Import ${data.decks.length} decks from backup?\n\nThis will REPLACE all current data.`
                );
                if (confirmed) {
                    const stateKey = store._getStateKey ? store._getStateKey() : 'ankiState';
                    localStorage.setItem(stateKey, JSON.stringify(data));
                    window.location.reload();
                }
            } catch (err) {
                ui.alert('Failed to read backup file: ' + err.message);
            }
            backupFileInput.value = '';
        });
    }
    
    // Reset all data button
    const btnResetAll = document.getElementById('btnResetAllData');
    if (btnResetAll) {
        btnResetAll.addEventListener('click', () => {
            ui.confirm('Are you sure you want to delete ALL data? This cannot be undone!').then(confirmed => {
                if (confirmed) {
                    // Only remove AnkiFlow-specific keys (preserve other apps' data)
                    const stateKey = store._getStateKey ? store._getStateKey() : 'ankiState';
                    const settingsKey = store.getScopedKey('ankiflow_settings');
                    const dailyKey = store.getScopedKey('ankiflow_daily');
                    
                    // Clear both scoped (current user) and legacy keys
                    const keysToClear = [
                        stateKey, 'ankiState', 
                        settingsKey, 'ankiflow_settings', 
                        dailyKey, 'ankiflow_daily'
                    ];
                    
                    keysToClear.forEach(key => localStorage.removeItem(key));
                    
                    window.location.reload();
                }
            });
        });
    }
}

/**
 * Apply keyboard hints visibility
 * @param {boolean} show - Whether to show keyboard hints on buttons
 */
function applyKeyboardHints(show) {
    document.querySelectorAll('.rating-kbd, .key-hint, kbd').forEach(el => {
        // Only target rating keyboard badges, not all kbd elements
        if (el.classList.contains('rating-kbd')) {
            el.style.display = show ? '' : 'none';
        }
    });
}

// --- Count-up Animation Utility ---

export function animateCountUp(elementId, target, duration = 500) {
    const el = document.getElementById(elementId);
    if (!el || target === 0) { if(el) el.textContent = target; return; }
    
    const start = 0;
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
        const current = Math.round(start + (target - start) * eased);
        el.textContent = current;
        
        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            el.textContent = target;
        }
    }
    
    requestAnimationFrame(update);
}


function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

// --- Auto-Save Indicator ---
let autoSaveTimeout = null;
function showAutoSaveIndicator() {
    const el = document.getElementById('autoSaveText');
    if (!el) return;
    el.textContent = 'Saving...';
    el.parentElement.classList.add('saving');
    
    if (autoSaveTimeout) clearTimeout(autoSaveTimeout);
    autoSaveTimeout = setTimeout(() => {
        el.textContent = 'Saved ✓';
        el.parentElement.classList.remove('saving');
        el.parentElement.classList.add('saved');
        setTimeout(() => {
            el.textContent = 'System Ready';
            el.parentElement.classList.remove('saved');
        }, 2000);
    }, 500);
}

// --- Omnibar Markdown Preview ---
// renderMarkdown already imported at top via markdown-parser.js

function updateOmnibarPreview(text) {
    const preview = document.getElementById('omnibarPreview');
    if (!preview) return;
    
    if (!text || text.length < 3) {
        preview.classList.add('hidden');
        return;
    }
    
    // Check if text has markdown formatting
    const hasMd = /[*_`#\[\]]/.test(text);
    if (!hasMd) {
        preview.classList.add('hidden');
        return;
    }
    
    // Parse and show preview
    const parsed = parseLine(text);
    if (parsed) {
        let html = '';
        if (parsed.term) html += `<div class="preview-term">${renderMarkdown(parsed.term)}</div>`;
        if (parsed.def) html += `<div class="preview-sep">→</div><div class="preview-def">${renderMarkdown(parsed.def)}</div>`;
        preview.innerHTML = html;
        preview.classList.remove('hidden');
    } else {
        preview.innerHTML = renderMarkdown(text);
        preview.classList.remove('hidden');
    }
}

function hideOmnibarPreview() {
    const preview = document.getElementById('omnibarPreview');
    if (preview) preview.classList.add('hidden');
}

// --- Find & Replace Modal ---
function openFindReplaceModal() {
    const modal = document.getElementById('findReplaceModal');
    if (!modal) return;
    
    modal.classList.remove('hidden');
    const findInput = document.getElementById('findInput');
    if (findInput) { findInput.value = ''; findInput.focus(); }
    
    const replaceInput = document.getElementById('replaceInput');
    if (replaceInput) replaceInput.value = '';
    
    // Setup handlers
    const btnExecute = document.getElementById('btnExecuteFindReplace');
    const btnCancel = document.getElementById('btnCancelFindReplace');
    
    const execute = () => {
        const find = document.getElementById('findInput')?.value;
        const replace = document.getElementById('replaceInput')?.value ?? '';
        const caseSensitive = document.getElementById('findCaseSensitive')?.checked || false;
        const wholeWord = document.getElementById('findWholeWord')?.checked || false;
        const field = document.getElementById('findField')?.value || 'both';
        
        if (!find) {
            ui.showToast('Enter search text');
            return;
        }
        
        const count = findAndReplace(find, replace, { caseSensitive, wholeWord, field });
        modal.classList.add('hidden');
        
        if (count > 0) {
            ui.showToast(`Replaced in ${count} cards`);
        } else {
            ui.showToast('No matches found');
        }
        cleanup();
    };
    
    const cancel = () => {
        modal.classList.add('hidden');
        cleanup();
    };
    
    const cleanup = () => {
        btnExecute?.removeEventListener('click', execute);
        btnCancel?.removeEventListener('click', cancel);
        findInput?.removeEventListener('keydown', keyHandler);
        replaceInput?.removeEventListener('keydown', keyHandler);
    };
    
    btnExecute?.addEventListener('click', execute);
    btnCancel?.addEventListener('click', cancel);
    
    // Enter to execute
    const keyHandler = (e) => {
        if (e.key === 'Enter') execute();
        if (e.key === 'Escape') cancel();
    };
    findInput?.addEventListener('keydown', keyHandler);
    replaceInput?.addEventListener('keydown', keyHandler);
}

