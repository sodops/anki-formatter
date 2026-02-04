/**
 * Import Operations Module
 * Handle file uploads and import preview
 */

import { STATE, saveState, getActiveDeck } from './state.js';
import { ui, showToast, escapeHtml } from './ui.js';
import { renderWorkspace } from './card.js';
import { dom } from './dom.js';

// Module state for pending import
let pendingImport = {
    cards: [],
    fileType: null, // 'csv', 'txt', 'docx'
    rawData: null, // For CSV re-mapping
    originalHeaders: []
};

/**
 * Handle file upload
 * @param {File} file 
 */
export async function handleFileUpload(file) {
    if (!file) return;

    const fileExt = file.name.split('.').pop().toLowerCase();

    // CSV: Client-side parsing for mapping support
    if (fileExt === 'csv') {
        const text = await file.text();
        const rows = parseCSV(text);
        if (rows.length < 1) {
            ui.alert("Empty CSV file");
            return;
        }

        // Pass raw data to preview. Initial mapping: col 0 -> term, col 1 -> def
        // We pass empty cards list initially, updateImportPreview will generate them
        showImportPreview([], 'csv', rows, rows[0]);
        
        // Auto-select defaults and render
        setTimeout(() => {
            const termSelect = document.getElementById('termColumnSelect');
            const defSelect = document.getElementById('defColumnSelect');
            
            // Try to find headers with 'term'/'question' and 'def'/'answer'
            const headers = rows[0].map(h => h.toLowerCase());
            const termIdx = headers.findIndex(h => h.includes('term') || h.includes('question') || h.includes('front'));
            const defIdx = headers.findIndex(h => h.includes('def') || h.includes('answer') || h.includes('back'));
            
            if(termSelect) termSelect.value = termIdx !== -1 ? termIdx : 0;
            if(defSelect) defSelect.value = defIdx !== -1 ? defIdx : (rows[0].length > 1 ? 1 : 0);
            
            updateImportPreview();
        }, 0);
        return;
    }

    // Other formats: Use Backend
    const formData = new FormData();
    formData.append('file', file);
    formData.append('deck_id', STATE.activeDeckId); 

    showToast("Processing File...", "info");

    try {
        const response = await fetch('/parse', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        
        if(response.ok && data.cards) {
            const cards = data.cards.map(c => ({
                term: c.question,
                def: c.answer,
                tags: []
            }));
            
            if (data.failures) {
                data.failures.forEach(f => {
                    cards.push({ term: f, def: "", tags: [] });
                });
            }
            
            showImportPreview(cards, fileExt);
        } else {
            ui.alert("Error parsing file: " + (data.error || "Unknown error"));
        }

    } catch(e) {
        console.error(e);
        ui.alert("Upload failed");
    }
}

/**
 * Simple CSV Parser
 * Handles quotes and commas
 */
function parseCSV(text) {
    const rows = [];
    let currentRow = [];
    let currentVal = '';
    let insideQuotes = false;
    
    // Normalize newlines
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i+1];
        
        if (char === '"') {
            if (insideQuotes && nextChar === '"') {
                currentVal += '"'; // Escaped quote
                i++;
            } else {
                insideQuotes = !insideQuotes;
            }
        } else if (char === ',' && !insideQuotes) {
            currentRow.push(currentVal.trim());
            currentVal = '';
        } else if (char === '\n' && !insideQuotes) {
            currentRow.push(currentVal.trim());
            if (currentRow.length > 0) rows.push(currentRow);
            currentRow = [];
            currentVal = '';
        } else {
            currentVal += char;
        }
    }
    
    if (currentVal) currentRow.push(currentVal.trim());
    if (currentRow.length > 0) rows.push(currentRow);
    
    return rows;
}

/**
 * Show import preview modal
 */
export function showImportPreview(cards, fileType, rawData = null, columns = []) {
    pendingImport.cards = cards;
    pendingImport.fileType = fileType;
    pendingImport.rawData = rawData;
    pendingImport.originalHeaders = columns;
    
    const modal = document.getElementById('importPreviewModal');
    if(!modal) return;

    // Reset column selectors (if CSV)
    const columnMapping = document.getElementById('columnMapping');
    if (fileType === 'csv' && columns.length > 0) {
        columnMapping.classList.remove('hidden');
        populateColumnSelectors(columns);
    } else {
        columnMapping.classList.add('hidden');
    }
    
    renderImportPreviewList(cards.slice(0, 10)); // Show first 10
    document.getElementById('importTotal').textContent = cards.length;
    
    modal.classList.remove('hidden');
    
    // Attach listeners for mapping
    const termSelect = document.getElementById('termColumnSelect');
    const defSelect = document.getElementById('defColumnSelect');
    termSelect.onchange = updateImportPreview;
    defSelect.onchange = updateImportPreview;
}

function renderImportPreviewList(cards) {
    const previewList = document.getElementById('importPreviewList');
    previewList.innerHTML = '';
    
    const activeDeck = getActiveDeck();
    const existingTerms = new Set(activeDeck.cards.map(c => c.term.toLowerCase()));
    
    cards.forEach((card, idx) => {
        const cardEl = document.createElement('div');
        const isDuplicate = existingTerms.has(card.term.toLowerCase());
        cardEl.className = 'preview-card' + (isDuplicate ? ' duplicate' : '');
        
        cardEl.innerHTML = `
            <div class="preview-card-number">#${idx + 1}</div>
            <div class="preview-card-content">
                <div><strong>Term:</strong> <span class="value">${escapeHtml(card.term) || '<em style="color: #ef4444;">Empty</em>'}</span></div>
                <div><strong>Definition:</strong> <span class="value">${escapeHtml(card.def) || '<em style="color: #ef4444;">Empty</em>'}</span></div>
                ${card.tags && card.tags.length > 0 ? `<div><strong>Tags:</strong> ${card.tags.map(t => `<span class="tag-badge">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
                ${isDuplicate ? '<div class="duplicate-warning"><ion-icon name="alert-circle"></ion-icon> Duplicate Term</div>' : ''}
            </div>
        `;
        
        previewList.appendChild(cardEl);
    });
    
    if (pendingImport.cards.length > 10) {
        const moreEl = document.createElement('div');
        moreEl.style.textAlign = 'center';
        moreEl.style.padding = '12px';
        moreEl.style.color = 'var(--text-tertiary)';
        moreEl.textContent = `... and ${pendingImport.cards.length - 10} more cards`;
        previewList.appendChild(moreEl);
    }
}

function populateColumnSelectors(columns) {
    const termSelect = document.getElementById('termColumnSelect');
    const defSelect = document.getElementById('defColumnSelect');
    
    [termSelect, defSelect].forEach(sel => {
        sel.innerHTML = '';
        columns.forEach((col, idx) => {
            const opt = document.createElement('option');
            opt.value = idx;
            opt.textContent = col || `Column ${idx + 1}`;
            sel.appendChild(opt);
        });
    });
}

/**
 * Handle column mapping update
 */
export function updateImportPreview() {
    if (pendingImport.fileType !== 'csv' || !pendingImport.rawData) return;
    
    const termColIdx = parseInt(document.getElementById('termColumnSelect').value) || 0;
    const defColIdx = parseInt(document.getElementById('defColumnSelect').value) || 1;
    
    // Skip header row usually, but sometimes header is data if no header.
    // For now, heuristic: if we mapped, we assume row 0 is header BUT we might want to let user import it?
    // Let's assume row 0 is header for now and skip it in data.
    const dataRows = pendingImport.rawData.slice(1);
    
    const remappedCards = dataRows.map(row => ({
        term: row[termColIdx] || '',
        def: row[defColIdx] || '',
        tags: []
    })).filter(c => c.term || c.def); // Filter empty rows
    
    pendingImport.cards = remappedCards;
    
    // Update stats
    document.getElementById('importTotal').textContent = remappedCards.length;
    renderImportPreviewList(remappedCards.slice(0, 10)); // Re-render preview
}

/**
 * Confirm import
 */
export function confirmImport() {
    const deck = getActiveDeck();
    if (!deck) {
        showToast('No active deck', 'error');
        closeImportPreview();
        return;
    }
    
    const validCards = pendingImport.cards.filter(c => c.term || c.def);
    
    if (validCards.length === 0) {
        showToast('No valid cards to import', 'error');
        closeImportPreview();
        return;
    }
    
    deck.cards.push(...validCards);
    saveState();
    renderWorkspace();
    showToast(`Imported ${validCards.length} cards`);
    closeImportPreview();
    
    if(dom.fileInput) dom.fileInput.value = '';
    if(dom.omnibarInput) dom.omnibarInput.value = '';
}

/**
 * Close import preview modal
 */
export function closeImportPreview() {
    const modal = document.getElementById('importPreviewModal');
    if(modal) modal.classList.add('hidden');
    pendingImport.cards = [];
    pendingImport.rawData = null;
}

/**
 * Handle Google Doc Import from URL
 * @param {string} url 
 */
export async function handleGoogleDocImport(url) {
    if (!url.includes('docs.google.com')) {
        return false;
    }

    ui.showToast("Fetching from Google Cloud...", "info");

    try {
        const formData = new FormData();
        formData.append('doc_url', url);
        formData.append('deck_id', STATE.activeDeckId);

        const response = await fetch('/parse', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();

        if (response.ok) {
            let cards = [];
            
            if (data.cards && data.cards.length > 0) {
                 cards = data.cards.map(c => ({
                    term: c.question,
                    def: c.answer,
                    tags: []
                }));
            }
            
            if (data.failures) {
                data.failures.forEach(f => {
                    cards.push({ term: f, def: "", tags: [] });
                });
            }

            // If No cards found, but we have a file, maybe it's raw text?
            // If the backend parsed 0 cards, show the "Column Mapping" UI?
            // Backend returns 'cards' and 'failures'.
            // If both empty, show error.
            if (cards.length === 0) {
                 // Fallback: If backend failed to parse but it's a doc, maybe we can treat it as CSV/Text if we had access to raw text?
                 // Current /parse endpoint doesn't return raw text unless we ask?
                 // Actually, if cards is 0, let's warn the user.
                 ui.alert("No flashcards found. Ensure format is 'Term - Definition' per line.");
                 return false;
            }
            
            showImportPreview(cards, 'gdoc');
            return true;
        } else {
            throw new Error(data.error || "Unknown error from server");
        }

    } catch (e) {
        console.error(e);
        ui.alert("Import Failed: " + e.message);
        return false;
    }
}
