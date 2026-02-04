/**
 * DOM Element References
 * Centralized access to all DOM elements
 */

export const dom = {
    // Sidebar
    sidebar: document.getElementById('sidebar'),
    deckList: document.getElementById('deckList'),
    trashList: document.getElementById('trashList'),
    btnNewDeck: document.getElementById('btnNewDeck'),
    btnTrash: document.getElementById('btnTrash'),
    
    // Workspace
    workspace: document.getElementById('workspace'),
    workspaceTitle: document.getElementById('workspaceTitle'),
    deckInfo: document.getElementById('deckInfo'),
    liveTableBody: document.getElementById('liveTableBody'),
    
    // Omnibar
    omnibarContainer: document.getElementById('omnibarContainer'),
    omnibarInput: document.getElementById('omnibarInput'),
    omnibarIcon: document.getElementById('omnibarIcon'),
    fileInput: document.getElementById('fileInput'),
    
    // Search
    searchInput: document.getElementById('searchInput'),
    btnClearSearch: document.getElementById('btnClearSearch'),
    
    // Action Buttons
    btnRenameDeck: document.getElementById('btnRenameDeck'),
    btnDeckColor: document.getElementById('btnDeckColor'),
    btnClearDeck: document.getElementById('btnClearDeck'),
    btnExportDeck: document.getElementById('btnExportDeck'),
    
    // Modals
    exportModal: document.getElementById('exportModal'),
    btnCancelExport: document.getElementById('btnCancelExport'),
    btnPreviewExport: document.getElementById('btnPreviewExport'),
    btnConfirmExport: document.getElementById('btnConfirmExport'),
    
    // Toast
    toast: document.getElementById('toast')
};

// Verify all required elements exist
export function verifyDomElements() {
    const missing = [];
    for (const [key, element] of Object.entries(dom)) {
        if (!element) {
            missing.push(key);
        }
    }
    
    if (missing.length > 0) {
        console.warn('Missing DOM elements:', missing);
    }
    
    return missing.length === 0;
}
