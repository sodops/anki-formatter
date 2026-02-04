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
    btnExportDeck: document.getElementById('btnExportAnki'), // Mapped to btnExportAnki ID
    
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
    toast: document.getElementById('toast')
};

// Verify all required elements exist
export function verifyDomElements() {
    const missing = [];
    for (const [key, element] of Object.entries(dom)) {
        if (!element) {
            // Filter out optional/dynamic elements
            if(['trashList', 'btnRenameDeck', 'btnDeckColor'].includes(key)) continue;
            missing.push(key);
        }
    }
    
    if (missing.length > 0) {
        console.warn('Missing DOM elements:', missing);
    }
    
    return missing.length === 0;
}
