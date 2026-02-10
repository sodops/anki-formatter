/**
 * DOM Element References
 * Centralized access to all DOM elements
 */

export const dom = {
    // Sidebar
    deckList: document.getElementById('deckList'),
    trashList: document.getElementById('trashList'), // Might not exist in HTML if dynamic
    btnNewDeck: document.getElementById('btnNewDeck'),
    // btnTrash not in HTML, dynamic in deck.js
    
    // Workspace
    workspace: document.querySelector('.workspace'), // Class selector as fallback
    currentDeckTitle: document.getElementById('currentDeckTitle'),
    countTotal: document.getElementById('countTotal'),
    countIssues: document.getElementById('countIssues'),
    cardTable: document.getElementById('cardTable'),
    tableBody: document.getElementById('tableBody'), // Correct ID
    emptyState: document.getElementById('emptyState'),
    
    // Omnibar
    omnibarContainer: document.getElementById('omnibarContainer'),
    omnibarInput: document.getElementById('omnibarInput'),
    omnibarIcon: document.getElementById('omnibarIcon'),
    fileInput: document.getElementById('fileInput'),
    commandDropdown: document.getElementById('commandDropdown'),
    
    // Search
    searchInput: document.getElementById('searchInput'),
    btnClearSearch: document.getElementById('btnClearSearch'),
    
    // Action Buttons
    btnRenameDeck: document.getElementById('btnRenameDeck'),
    btnDeckColor: document.getElementById('btnDeckColor'),
    btnClearDeck: document.getElementById('btnClearDeck'),
    btnExportDeck: document.getElementById('btnExportDeck'),
    
    // Export Modal
    exportModal: document.getElementById('exportModal'),
    exportFilename: document.getElementById('exportFilename'),
    btnCancelExport: document.getElementById('btnCancelExport'),
    btnPreviewExport: document.getElementById('btnPreviewExport'),
    btnConfirmExport: document.getElementById('btnConfirmExport'),
    exportLoader: document.getElementById('exportLoader'),
    
    // Export Preview Modal
    exportPreviewModal: document.getElementById('exportPreviewModal'),
    previewTotalCards: document.getElementById('previewTotalCards'),
    previewValidCards: document.getElementById('previewValidCards'),
    previewIssues: document.getElementById('previewIssues'),
    previewCardsList: document.getElementById('previewCardsList'),
    btnClosePreview: document.getElementById('btnClosePreview'),
    btnConfirmFromPreview: document.getElementById('btnConfirmFromPreview'),
    
    // Custom Modal (Prompt/Confirm/Alert)
    customModal: document.getElementById('customModal'),
    customModalTitle: document.getElementById('customModalTitle'),
    customModalContent: document.getElementById('customModalContent'),
    customModalInputContainer: document.getElementById('customModalInputContainer'),
    customModalInput: document.getElementById('customModalInput'),
    btnModalCancel: document.getElementById('btnModalCancel'),
    btnModalConfirm: document.getElementById('btnModalConfirm'),
    
    // Import Preview Modal
    importPreviewModal: document.getElementById('importPreviewModal'),
    importTotal: document.getElementById('importTotal'),
    columnMapping: document.getElementById('columnMapping'),
    termColumnSelect: document.getElementById('termColumnSelect'),
    defColumnSelect: document.getElementById('defColumnSelect'),
    importPreviewList: document.getElementById('importPreviewList'),
    btnCancelImport: document.getElementById('btnCancelImport'),
    btnConfirmImport: document.getElementById('btnConfirmImport'),

    // Toast
    toast: document.getElementById('toast'),

    // Study Mode
    // Study Mode
    btnStudyDeck: document.getElementById('btnStudyDeck'),
    // studyModal removed, using view directly
    studyInterface: document.getElementById('studyInterface'),
    studyPlaceholder: document.getElementById('studyPlaceholder'),
    studyDeckTitle: document.getElementById('studyDeckTitle'),
    flashcard: document.getElementById('flashcard'),
    studyFront: document.getElementById('studyFront'),
    studyBack: document.getElementById('studyBack'),
    studyIndex: document.getElementById('studyIndex'),
    studyTotal: document.getElementById('studyTotal'),
    studyProgressBar: document.getElementById('studyProgressBar'),
    btnStudyFlip: document.getElementById('btnStudyFlip'),
    
    // Session Summary
    sessionSummary: document.getElementById('sessionSummary'),
    btnBackToLibrary: document.getElementById('btnBackToLibrary'),
    btnStudyAgain: document.getElementById('btnStudyAgain'),
    
    // Bulk Operations
    selectAllCheckbox: document.getElementById('selectAllCheckbox'),
    bulkActionBar: document.getElementById('bulkActionBar'),
    bulkCount: document.getElementById('bulkCount'),
    btnBulkTag: document.getElementById('btnBulkTag'),
    btnBulkDelete: document.getElementById('btnBulkDelete'),
    btnBulkCancel: document.getElementById('btnBulkCancel'),
    
    // Stats
    btnOpenStats: document.getElementById('btnOpenStats'),
    
    // Shortcuts
    btnCloseShortcuts: document.getElementById('btnCloseShortcuts'),
    
    // Color Picker
    btnCancelColor: document.getElementById('btnCancelColor')
};

// Verify all required elements exist
export function verifyDomElements() {
    const missing = [];
    for (const [key, element] of Object.entries(dom)) {
        if (!element) {
            // Filter out optional/dynamic elements
            if(['trashList', 'btnRenameDeck', 'btnDeckColor', 'btnClearDeck'].includes(key)) continue;
            missing.push(key);
        }
    }
    
    if (missing.length > 0) {
        console.warn('Missing DOM elements:', missing);
    }
    
    return missing.length === 0;
}

/**
 * Animate a count-up effect on an element
 * @param {string} elementId - DOM element ID
 * @param {number} target - Target number
 * @param {number} duration - Animation duration in ms
 */
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
