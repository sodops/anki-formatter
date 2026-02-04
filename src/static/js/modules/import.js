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

/**
 * Show import preview modal
 * @param {Array} cards 
 * @param {string} fileType 
 * @param {Array} rawData 
 * @param {Array} columns 
 */
export function showImportPreview(cards, fileType, rawData = null, columns = []) {
    pendingImport.cards = cards;
    pendingImport.fileType = fileType;
    pendingImport.rawData = rawData;
    pendingImport.originalHeaders = columns;
    
    const modal = document.getElementById('importPreviewModal');
    if(!modal) {
        console.error("Import Preview Modal not found");
        return;
    }

    // Reset column selectors (if CSV)
    const columnMapping = document.getElementById('columnMapping');
    if (fileType === 'csv' && columns.length > 0) {
        columnMapping.classList.remove('hidden');
        populateColumnSelectors(columns);
    } else {
        columnMapping.classList.add('hidden');
    }
    
    // Total count
    document.getElementById('importTotal').textContent = cards.length;
    
    renderImportPreviewList(cards.slice(0, 10)); // Show first 10
    
    modal.classList.remove('hidden');
}

function renderImportPreviewList(cards) {
    const previewList = document.getElementById('importPreviewList');
    previewList.innerHTML = '';
    
    cards.forEach((card, idx) => {
        const cardEl = document.createElement('div');
        cardEl.className = 'preview-card';
        
        cardEl.innerHTML = `
            <div class="preview-card-number">#${idx + 1}</div>
            <div class="preview-card-content">
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
    
    // Smart default (try to find 'question'/'term' and 'answer'/'definition')
    // Simplified logic for now
}

/**
 * Handle column mapping update
 */
export function updateImportPreview() {
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
    renderImportPreviewList(remappedCards.slice(0, 10));
    document.getElementById('importTotal').textContent = remappedCards.length;
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
    
    // Reset inputs
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
