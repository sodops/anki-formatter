/**
 * DOM Element References
 * Centralized access to all DOM elements
 */

export const dom = {
    // Sidebar
    get deckList() { return document.getElementById('deckList'); },
    get trashList() { return document.getElementById('trashList'); },
    get btnNewDeck() { return document.getElementById('btnNewDeck'); },
    
    // Workspace
    get workspace() { return document.querySelector('.workspace'); },
    get currentDeckTitle() { return document.getElementById('currentDeckTitle'); },
    get countTotal() { return document.getElementById('countTotal'); },
    get countIssues() { return document.getElementById('countIssues'); },
    get cardTable() { return document.getElementById('cardTable'); },
    get tableBody() { return document.getElementById('tableBody'); },
    get emptyState() { return document.getElementById('emptyState'); },
    
    // Omnibar
    get omnibarContainer() { return document.getElementById('omnibarContainer'); },
    get omnibarInput() { return document.getElementById('omnibarInput'); },
    get omnibarIcon() { return document.getElementById('omnibarIcon'); },
    get fileInput() { return document.getElementById('fileInput'); },
    get commandDropdown() { return document.getElementById('commandDropdown'); },
    
    // Search
    get searchInput() { return document.getElementById('searchInput'); },
    get btnClearSearch() { return document.getElementById('btnClearSearch'); },
    
    // Action Buttons
    get btnRenameDeck() { return document.getElementById('btnRenameDeck'); },
    get btnDeckColor() { return document.getElementById('btnDeckColor'); },
    get btnClearDeck() { return document.getElementById('btnClearDeck'); },
    get btnExportDeck() { return document.getElementById('btnExportDeck'); },
    
    // Export Modal
    get exportModal() { return document.getElementById('exportModal'); },
    get exportFilename() { return document.getElementById('exportFilename'); },
    get btnCancelExport() { return document.getElementById('btnCancelExport'); },
    get btnPreviewExport() { return document.getElementById('btnPreviewExport'); },
    get btnConfirmExport() { return document.getElementById('btnConfirmExport'); },
    get exportLoader() { return document.getElementById('exportLoader'); },
    
    // Export Preview Modal
    get exportPreviewModal() { return document.getElementById('exportPreviewModal'); },
    get previewTotalCards() { return document.getElementById('previewTotalCards'); },
    get previewValidCards() { return document.getElementById('previewValidCards'); },
    get previewIssues() { return document.getElementById('previewIssues'); },
    get previewCardsList() { return document.getElementById('previewCardsList'); },
    get btnClosePreview() { return document.getElementById('btnClosePreview'); },
    get btnConfirmFromPreview() { return document.getElementById('btnConfirmFromPreview'); },
    
    // Custom Modal
    get customModal() { return document.getElementById('customModal'); },
    get customModalTitle() { return document.getElementById('customModalTitle'); },
    get customModalContent() { return document.getElementById('customModalContent'); },
    get customModalInputContainer() { return document.getElementById('customModalInputContainer'); },
    get customModalInput() { return document.getElementById('customModalInput'); },
    get btnModalCancel() { return document.getElementById('btnModalCancel'); },
    get btnModalConfirm() { return document.getElementById('btnModalConfirm'); },
    
    // Import Preview Modal
    get importPreviewModal() { return document.getElementById('importPreviewModal'); },
    get importTotal() { return document.getElementById('importTotal'); },
    get columnMapping() { return document.getElementById('columnMapping'); },
    get termColumnSelect() { return document.getElementById('termColumnSelect'); },
    get defColumnSelect() { return document.getElementById('defColumnSelect'); },
    get importPreviewList() { return document.getElementById('importPreviewList'); },
    get btnCancelImport() { return document.getElementById('btnCancelImport'); },
    get btnConfirmImport() { return document.getElementById('btnConfirmImport'); },

    // Toast
    get toast() { return document.getElementById('toast'); },

    // Study Mode
    get btnStudyDeck() { return document.getElementById('btnStudyDeck'); },
    get studyInterface() { return document.getElementById('studyInterface'); },
    get studyPlaceholder() { return document.getElementById('studyPlaceholder'); },
    get studyDeckTitle() { return document.getElementById('studyDeckTitle'); },
    get flashcard() { return document.getElementById('flashcard'); },
    get studyFront() { return document.getElementById('studyFront'); },
    get studyBack() { return document.getElementById('studyBack'); },
    get studyIndex() { return document.getElementById('studyIndex'); },
    get studyTotal() { return document.getElementById('studyTotal'); },
    get studyProgressBar() { return document.getElementById('studyProgressBar'); },
    get btnStudyFlip() { return document.getElementById('btnStudyFlip'); },
    
    // Session Summary
    get sessionSummary() { return document.getElementById('sessionSummary'); },
    get btnBackToLibrary() { return document.getElementById('btnBackToLibrary'); },
    get btnStudyAgain() { return document.getElementById('btnStudyAgain'); },
    
    // Bulk Operations
    get selectAllCheckbox() { return document.getElementById('selectAllCheckbox'); },
    get bulkActionBar() { return document.getElementById('bulkActionBar'); },
    get bulkCount() { return document.getElementById('bulkCount'); },
    get btnBulkTag() { return document.getElementById('btnBulkTag'); },
    get btnBulkDelete() { return document.getElementById('btnBulkDelete'); },
    get btnBulkCancel() { return document.getElementById('btnBulkCancel'); },
    
    // Stats
    get btnOpenStats() { return document.getElementById('btnOpenStats'); },
    
    // Shortcuts
    get btnCloseShortcuts() { return document.getElementById('btnCloseShortcuts'); },
    
    // Color Picker
    get btnCancelColor() { return document.getElementById('btnCancelColor'); }
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
