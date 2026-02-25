/**
 * Main Entry Point
 * App initialization, event listeners, and command palette
 */

// Core Store Management
import { store } from './core/store.js';
import { eventBus, EVENTS } from './core/events.js';
import { appLogger, uiLogger } from './core/logger.js';

import { dom, verifyDomElements } from './utils/dom-helpers.js';
import { ui } from './ui/components/ui.js'; // Default export object
import { renderSidebar, createDeck, switchDeck, renameDeck, deleteDeck, restoreDeck, emptyTrash, clearDeck, toggleTrash } from './features/library/deck-manager.js';
import { renderWorkspace, addCard, updateCard, removeCard, handleTagInputUI, removeTag, parseLine, parseBulkLine, bulkDelete, bulkTag, cancelBulkSelection, findAndReplace, moveCard, copyCard, setTagFilter, suspendCard } from './features/library/card-manager.js';
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
import { setSpeechLanguage, setSpeechRate, setSpeechPitch, getAvailableVoices } from './utils/tts-helper.js';
import { createKeyboardShortcutsModal } from './ui/components/keyboard-shortcuts.js';
import { offlineManager } from './core/offline-manager.js';
import { initDictionary } from './features/dictionary/dictionary.js';


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
        
        // Cloud is the source of truth — auth events handle loading.
        // localStorage cache is loaded by _loadLocalCache() for instant render.
        // Cloud data will override when _loadFromCloud() completes.
        
        // Default Deck if none exists
        const currentState = store.getState();
        if (!currentState.decks || currentState.decks.length === 0) {
            const newDeck = store.dispatch('DECK_CREATE', { 
                name: "My First Deck",
                color: '#7C5CFC'
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
        
        // Initialize dictionary
        try { initDictionary(); }
        catch (e) { console.error('[INIT] initDictionary FAILED:', e); }
        
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
                // Ensure at least one deck exists after cloud load
                const s = store.getState();
                if (!s.decks || s.decks.length === 0) {
                    const newDeck = store.dispatch('DECK_CREATE', {
                        name: "My First Deck",
                        color: '#7C5CFC'
                    });
                    if (newDeck && newDeck.id) {
                        store.dispatch('DECK_SELECT', newDeck.id);
                    }
                } else if (!s.activeDeckId) {
                    const first = s.decks.find(d => !d.isDeleted);
                    if (first) store.dispatch('DECK_SELECT', first.id);
                }

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

// Expose for manual re-init by Next.js SPA navigation
window.initAnkiFlow = initAnkiFlow;

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
    window.handleTagInputUI = handleTagInputUI;
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
    
    // TTS exports for settings
    window.setSpeechLanguage = setSpeechLanguage;
    window.setSpeechRate = setSpeechRate;
    window.setSpeechPitch = setSpeechPitch;

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
    let debounceTimer;
    let cachedTranslation = null; // Store last translation

    if(dom.omnibarInput) {
        dom.omnibarInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !dom.omnibarInput.value.startsWith('>')) {
                e.preventDefault();
                // Add Card
                const line = dom.omnibarInput.value.trim();
                const deck = store.getActiveDeck();
                
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
                     // Bulk add logic...
                     const validCards = parsedBulk.filter(p => p.term || p.def).map(p => ({
                         term: p.term || '',
                         def: p.def || '',
                         tags: []
                     }));
                     if (validCards.length > 0) {
                         store.dispatch('CARD_BATCH_ADD', { deckId: deck.id, cards: validCards });
                         renderWorkspace();
                         ui.showToast(`${validCards.length} cards added`);
                     }
                     dom.omnibarInput.value = '';
                } else {
                    // Single card logic
                    const parsed = parseLine(line);
                    
                    // AUTO-TRANSLATE LOGIC:
                    // If user typed a single word (no def) AND we have a cached translation
                    if ((!parsed.def) && cachedTranslation && cachedTranslation.original.toLowerCase() === parsed.term.toLowerCase()) {
                        addCard(cachedTranslation.original, cachedTranslation.translated);
                        ui.showToast(`Auto-translated: ${cachedTranslation.translated}`);
                        dom.omnibarInput.value = '';
                        cachedTranslation = null;
                        hideOmnibarPreview();
                        return;
                    }

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
                cachedTranslation = null; // Clear cache on enter
            }
            handleOmnibarKey(e);
        });
        
        // Paste handler: Intercept multi-line paste before <input> strips newlines
        dom.omnibarInput.addEventListener('paste', (e) => {
            const clipboardText = (e.clipboardData || window.clipboardData).getData('text');
            if (!clipboardText) return;

            const lines = clipboardText.split('\n').map(l => l.trim()).filter(Boolean);
            
            // If only 1 line, let default input behavior handle it
            if (lines.length <= 1) return;

            // Multi-line paste detected — prevent default (input would collapse newlines)
            e.preventDefault();
            
            const deck = store.getActiveDeck();
            if (!deck) {
                ui.showToast('Select a deck first');
                return;
            }

            // Check for Google Docs URL
            if (lines.length === 1 && clipboardText.includes('docs.google.com')) {
                dom.omnibarInput.value = clipboardText.trim();
                return;
            }

            // Parse all lines using parseLine
            const parsed = lines.map(line => parseLine(line)).filter(p => p && (p.term || p.def));
            
            if (parsed.length === 0) {
                ui.showToast('No valid cards found in pasted text');
                return;
            }

            const validCards = parsed.map(p => ({
                term: p.term || '',
                def: p.def || '',
                tags: []
            }));

            // For large pastes, use import preview; for small ones, add directly
            if (validCards.length > 20) {
                // Use import preview for large pastes
                import('./features/import/import-handler.js').then(({ showImportPreview }) => {
                    showImportPreview(validCards, 'paste');
                });
            } else {
                // Direct bulk add for small pastes
                store.dispatch('CARD_BATCH_ADD', { deckId: deck.id, cards: validCards });
                renderWorkspace();
                ui.showToast(`${validCards.length} cards added`);
            }
            
            dom.omnibarInput.value = '';
        });

        dom.omnibarInput.addEventListener('input', (e) => {
            const val = e.target.value;
            
            // Reset translation cache on input change
            if (!cachedTranslation || val.trim().toLowerCase() !== cachedTranslation.original.toLowerCase()) {
                cachedTranslation = null;
            }

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
                
                // Live Translation Debounce
                clearTimeout(debounceTimer);
                
                // Only translate if: 
                // 1. Not a command
                // 2. Not empty
                // 3. Doesn't contain separator (already has definition)
                // 4. Not a URL (checking http, https, and common domains)
                const trimmed = val.trim();
                const isUrl = trimmed.startsWith('http') || 
                              trimmed.startsWith('www.') || 
                              trimmed.includes('docs.google.com') ||
                              trimmed.includes('.com') || // simple heuristic
                              trimmed.includes('.org');

                if (trimmed.length > 1 && !trimmed.includes('-') && !isUrl) {
                    debounceTimer = setTimeout(() => {
                        fetchTranslation(trimmed);
                    }, 600); // Wait 600ms after typing stops
                }
            }
        });
    }

    // Translation Helper
    async function fetchTranslation(text) {
        const preview = document.getElementById('omnibarPreview');
        if (!preview) return;

        try {
            // Show loading indicator in preview
            preview.innerHTML = `<div class="preview-loading"><ion-icon name="sync" class="spin"></ion-icon> Translating...</div>`;
            preview.classList.remove('hidden');

            const res = await fetch('/api/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });
            
            if (!res.ok) throw new Error('Network');
            
            const data = await res.json();
            
            // Update Cache
            cachedTranslation = {
                original: text,
                translated: data.translated
            };

            // Show Result
            preview.innerHTML = `
                <div class="preview-translation" style="display:flex;align-items:center;gap:10px;justify-content:center;">
                    <span style="opacity:0.7">${data.sourceLang === 'uz' ? '🇺🇿' : '🇬🇧'} ${data.original}</span>
                    <ion-icon name="arrow-forward-outline"></ion-icon>
                    <span style="font-weight:bold;color:var(--accent)">${data.targetLang === 'uz' ? '🇺🇿' : '🇬🇧'} ${data.translated}</span>
                    <span class="key-hint" style="font-size:10px;margin-left:auto">ENTER to add</span>
                </div>
            `;
            preview.classList.remove('hidden');

        } catch (e) {
            console.error(e);
            // Don't show error to user, just hide preview or show generic
            preview.innerHTML = renderMarkdown(text); 
        }
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
        // Debug logging
        const isInputFocused = document.activeElement && 
            (document.activeElement.tagName === 'INPUT' || 
             document.activeElement.tagName === 'TEXTAREA' || 
             document.activeElement.isContentEditable);
        
        console.log('🎹 Keyboard event:', {
            key: e.key,
            code: e.code,
            ctrl: e.ctrlKey,
            meta: e.metaKey,
            shift: e.shiftKey,
            alt: e.altKey,
            isInputFocused
        });
        
        // Ctrl+/ for shortcuts help
        if ((e.ctrlKey || e.metaKey) && e.key === '/') {
            e.preventDefault();
            console.log('🔧 Opening shortcuts modal');
            openShortcutsModal();
            return;
        }
        
        // Ctrl+K for Command Palette
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            console.log('🔧 Opening command palette (Ctrl+K)');
            openCommandPalette();
            return;
        }
        
        // F1 for Command Palette (alternative)
        if (e.key === 'F1') {
            e.preventDefault();
            console.log('🔧 Opening command palette (F1)');
            openCommandPalette();
            return;
        }
        
        // Ctrl+S for Sync
        if ((e.ctrlKey || e.metaKey) && e.key === 's' && !isInputFocused) {
            e.preventDefault();
            console.log('🔄 Triggering sync');
            // Trigger sync
            if (window.__ankiflow_triggerSync) {
                window.__ankiflow_triggerSync();
            }
            return;
        }
        
        // Ctrl+N for New Deck
        if ((e.ctrlKey || e.metaKey) && e.key === 'n' && !isInputFocused) {
            e.preventDefault();
            console.log('➕ Creating new deck');
            if (window.createDeck) window.createDeck();
            return;
        }
        
        // Ctrl+Enter for Add Card
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !isInputFocused) {
            e.preventDefault();
            console.log('➕ Adding card');
            if (dom.btnAddCard) dom.btnAddCard.click();
            return;
        }
        
        // Ctrl+B for Toggle Sidebar
        if ((e.ctrlKey || e.metaKey) && e.key === 'b' && !isInputFocused) {
            e.preventDefault();
            console.log('🔄 Toggle sidebar');
            const sidebar = document.getElementById('sidebar');
            if (sidebar) sidebar.classList.toggle('open');
            return;
        }
        
        // Ctrl+T for Theme Toggle
        if ((e.ctrlKey || e.metaKey) && e.key === 't' && !isInputFocused) {
            e.preventDefault();
            console.log('🎨 Toggle theme');
            if (window.toggleTheme) window.toggleTheme();
            return;
        }
        
        // Ctrl+1, 2, 3 for View Switching
        if ((e.ctrlKey || e.metaKey) && ['1', '2', '3'].includes(e.key) && !isInputFocused) {
            e.preventDefault();
            const views = ['library', 'study', 'stats'];
            const index = parseInt(e.key) - 1;
            console.log('👁️ Switching view to:', views[index]);
            if (window.switchView && views[index]) {
                window.switchView(views[index]);
            }
            return;
        }
        
        // Ctrl+O for Import File
        if ((e.ctrlKey || e.metaKey) && e.key === 'o' && !isInputFocused) {
            e.preventDefault();
            console.log('📥 Opening import');
            if (dom.fileInput) dom.fileInput.click();
            return;
        }
        
        // Ctrl+Shift+E for Export
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'E' && !isInputFocused) {
            e.preventDefault();
            console.log('📤 Opening export');
            if (dom.btnExportDeck) dom.btnExportDeck.click();
            return;
        }
        
        // Undo/Redo (Ctrl+Z, Ctrl+Y)
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !isInputFocused) {
            e.preventDefault();
            console.log('⏪ Undo');
            undo();
            return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'y' && !isInputFocused) {
            e.preventDefault();
            console.log('⏩ Redo');
            redo();
            return;
        }

        // Ctrl+F for Search
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            console.log('🔍 Focus search');
            if(dom.searchInput) {
                dom.searchInput.focus();
                dom.searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        }
        
        // Ctrl+A for Select All Cards (in library view)
        if ((e.ctrlKey || e.metaKey) && e.key === 'a' && !isInputFocused) {
            e.preventDefault();
            console.log('✅ Select all cards');
            // Select all cards logic can be added here
            return;
        }
        
        // Delete key for Delete Card
        if (e.key === 'Delete' && !isInputFocused) {
            // Check if a card is selected
            const selectedCard = document.querySelector('.card-item.selected');
            if (selectedCard) {
                e.preventDefault();
                const cardId = selectedCard.dataset.cardId;
                console.log('🗑️ Deleting card:', cardId);
                if (cardId && window.removeCard) {
                    window.removeCard(cardId);
                }
            }
            return;
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
    createKeyboardShortcutsModal();
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
        settingReverseMode: { key: 'reverseMode', default: false },
        settingTtsEnabled: { key: 'ttsEnabled', default: true },
        settingTtsLanguage: { key: 'ttsLanguage', default: 'en-US' },
        settingTtsRate: { key: 'ttsRate', default: 1 }, // New Rate setting
        settingTtsPitch: { key: 'ttsPitch', default: 1 }, // New Pitch setting
        settingAlgorithm: { key: 'algorithm', default: 'sm-2' },
        settingFsrsRetention: { key: 'fsrsRetention', default: 0.9 }
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
            
            // Apply TTS language
            if (config.key === 'ttsLanguage') {
                window.setSpeechLanguage(el.value);
            }

            // Apply TTS Rate
            if (config.key === 'ttsRate') {
                const val = Number(el.value);
                window.setSpeechRate(val);
                const display = document.getElementById('ttsRateValue');
                if (display) display.textContent = val + 'x';
            }

            // Apply TTS Pitch
            if (config.key === 'ttsPitch') {
                const val = Number(el.value);
                window.setSpeechPitch(val);
                const display = document.getElementById('ttsPitchValue');
                if (display) display.textContent = val;
            }
            
            // Update range display labels
            if (config.key === 'intervalMod') {
                const display = document.getElementById('intervalModValue');
                if (display) display.textContent = el.value + '%';
            }
            
            // Handle Algorithm Change
            if (config.key === 'algorithm') {
                const retentionContainer = document.getElementById('containerFsrsRetention');
                if (retentionContainer) {
                    retentionContainer.style.display = el.value === 'fsrs' ? 'flex' : 'none';
                }
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

    // Initialize FSRS visibility
    const algoEl = document.getElementById('settingAlgorithm');
    const retentionBase = document.getElementById('containerFsrsRetention');
    if (algoEl && retentionBase) {
        retentionBase.style.display = algoEl.value === 'fsrs' ? 'flex' : 'none';
    }
    
    // Export all data button
    const btnExportAll = document.getElementById('btnExportAllData');
    if (btnExportAll) {
        btnExportAll.addEventListener('click', async () => {
            ui.showToast('Preparing backup...', 'info');
            try {
                const response = await fetch('/api/backup/export');
                if (!response.ok) {
                    const err = await response.json().catch(() => ({}));
                    throw new Error(err.error || 'Export failed');
                }
                const data = await response.json();
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `ankiflow-backup-${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
                ui.showToast('Backup downloaded');
            } catch (err) {
                ui.showToast('Backup failed: ' + err.message, 'error');
            }
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
                if (!data.data || !Array.isArray(data.data.decks)) {
                    ui.alert('Invalid backup file — missing decks array.');
                    return;
                }
                const confirmed = await ui.confirm(
                    `Import ${data.data.decks.length} decks from backup?\n\nThis will REPLACE all current data in cloud.`
                );
                if (confirmed) {
                    ui.showToast('Restoring backup...', 'info');
                    const response = await fetch('/api/backup/import', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    });
                    if (!response.ok) {
                        const err = await response.json().catch(() => ({}));
                        throw new Error(err.error || 'Import failed');
                    }
                    ui.showToast('Backup restored. Reloading...');
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

    // --- Devices Management ---
    initDevicesPanel();

    // --- TTS Voice Population ---
    const ttsSelect = document.getElementById('settingTtsLanguage');
    if (ttsSelect) {
        const populateVoices = () => {
            const voices = getAvailableVoices();
            if (voices.length === 0) return; // Not loaded yet

            // Keep current selection
            const currentVal = ttsSelect.value || settings.ttsLanguage;
            
            ttsSelect.innerHTML = ''; // Clear static options
            
            // Group by language for cleaner UI (optional, but let's list them all)
            voices.forEach(voice => {
                const option = document.createElement('option');
                option.value = voice.voiceURI; // Use specific URI
                option.textContent = `${voice.name} (${voice.lang})`;
                ttsSelect.appendChild(option);
            });

            // Restore selection or default to first English
            const hasOption = Array.from(ttsSelect.options).some(o => o.value === currentVal);
            if (hasOption) {
                ttsSelect.value = currentVal;
            } else {
                // Fallback to first English voice
                const enVoice = voices.find(v => v.lang.startsWith('en'));
                if (enVoice) ttsSelect.value = enVoice.voiceURI;
            }
            
            // Update helper immediately
            window.setSpeechLanguage(ttsSelect.value);
        };

        // Populate initially (if ready)
        populateVoices();

        // Populate when voices change/load
        window.addEventListener('ankiflow:voices-changed', populateVoices);
    }
}

/**
 * Initialize devices management panel in settings
 */
function initDevicesPanel() {
    // Register this device on cloud load
    if (store._authUser) {
        store.registerDevice();
        renderDevicesList();
    }

    // Re-render devices list when cloud state loads
    window.addEventListener('ankiflow:state-loaded', () => {
        if (store._authUser) {
            // 1. Register this device FIRST
            store.registerDevice();
            
            // 2. Then check revocation (after device is registered)
            if (store._lastCloudSettings) {
                store._checkDeviceRevocation(store._lastCloudSettings);
                store._lastCloudSettings = null; // Clear
            }
            
            // 3. Finally render devices list
            renderDevicesList();
        }
    });

    // Sign out all devices button
    const btnLogoutAll = document.getElementById('btnLogoutAllDevices');
    if (btnLogoutAll) {
        btnLogoutAll.addEventListener('click', async () => {
            const confirmed = await ui.confirm(
                'Sign out from all devices?\n\nYou will need to log in again on each device.'
            );
            if (!confirmed) return;

            // Clear all devices from settings
            const key = store.getScopedKey('ankiflow_settings');
            const settings = JSON.parse(localStorage.getItem(key) || '{}');
            settings.devices = {};
            localStorage.setItem(key, JSON.stringify(settings));
            store._scheduleSyncToCloud();

            // Sign out current device
            if (window.__ankiflow_signOut) {
                window.__ankiflow_signOut();
            }
        });
    }
}

/**
 * Render devices list in settings panel
 */
function renderDevicesList() {
    const container = document.getElementById('devicesListContainer');
    if (!container) return;

    const devices = store.getDevices();
    const currentDeviceId = store.getDeviceId();
    const entries = Object.entries(devices);

    if (entries.length === 0) {
        container.innerHTML = '<div class="devices-empty">No devices registered yet</div>';
        return;
    }

    // Sort: current device first, then by lastActive descending
    entries.sort(([idA], [idB]) => {
        if (idA === currentDeviceId) return -1;
        if (idB === currentDeviceId) return 1;
        const a = devices[idA].lastActive || '';
        const b = devices[idB].lastActive || '';
        return b.localeCompare(a);
    });

    container.innerHTML = entries.map(([deviceId, info]) => {
        const isCurrent = deviceId === currentDeviceId;
        const iconName = info.deviceType === 'phone' ? 'phone-portrait-outline'
            : info.deviceType === 'tablet' ? 'tablet-portrait-outline'
            : 'desktop-outline';

        const lastActive = info.lastActive ? formatTimeAgo(new Date(info.lastActive)) : 'Unknown';
        const deviceLabel = `${info.browser} · ${info.os}`;

        return `
            <div class="device-item ${isCurrent ? 'current-device' : ''}" data-device-id="${deviceId}">
                <div class="device-info">
                    <div class="device-icon"><ion-icon name="${iconName}"></ion-icon></div>
                    <div class="device-details">
                        <div class="device-name">
                            ${deviceLabel}
                            ${isCurrent ? '<span class="device-current-badge">This device</span>' : ''}
                        </div>
                        <div class="device-meta">Last active: ${lastActive}</div>
                    </div>
                </div>
                ${!isCurrent ? `
                    <button class="device-remove-btn" data-remove-device="${deviceId}" title="Remove this device">
                        <ion-icon name="close-circle-outline"></ion-icon>
                    </button>
                ` : ''}
            </div>
        `;
    }).join('');

    // Attach remove handlers
    container.querySelectorAll('[data-remove-device]').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.removeDevice;
            store.removeDevice(id);
            renderDevicesList();
            ui.showToast('Device removed');
        });
    });
}

/**
 * Format a date as relative time (e.g., "2 hours ago", "Just now")
 */
function formatTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin} min ago`;
    if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? 's' : ''} ago`;
    if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
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
// Moved to utils/dom-helpers.js to avoid circular imports


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
    
    // Check for URLs to prevent previewing them as content
    const isUrl = text.startsWith('http') || text.includes('docs.google.com') || text.includes('www.');

    if (!hasMd || isUrl) {
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

