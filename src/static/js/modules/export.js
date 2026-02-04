/**
 * Export Operations Module
 * Handle exporting decks to files
 */

import { getActiveDeck } from './state.js';
import { dom } from './dom.js';
import { showToast } from './ui.js';
import { renderMarkdown } from './markdown.js';
import { escapeHtml } from './ui.js';

/**
 * Execute export of the current deck
 */
export async function executeExport() {
    const deck = getActiveDeck();
    if (!deck) return;
    
    // Get options
    const filename = dom.exportFilename ? (dom.exportFilename.value || 'deck_export') : 'deck_export';
    // Use optional formatting if selector exists
    let format = 'apkg';
    const formatInput = document.querySelector('input[name="exportFormat"]:checked');
    if (formatInput) format = formatInput.value;
    
    if (dom.exportLoader) dom.exportLoader.classList.remove('hidden');
    if (dom.btnConfirmExport) dom.btnConfirmExport.disabled = true;

    try {
        if (format === 'apkg') {
            await exportToApkg(deck, filename);
        } else if (format === 'txt') {
            exportToTxt(deck, filename);
        } else if (format === 'md') {
            exportToMd(deck, filename);
        }
    } catch(e) {
        console.error(e);
        showToast('Export Failed: ' + e.message, 'error');
    } finally {
        if (dom.exportLoader) dom.exportLoader.classList.add('hidden');
        if (dom.btnConfirmExport) dom.btnConfirmExport.disabled = false;
        if (dom.exportModal) dom.exportModal.classList.add('hidden');
    }
}

async function exportToApkg(deck, filename) {
    // Format cards for backend
    const cards = deck.cards.map(c => ({
        question: c.term,
        answer: c.def,
        tags: c.tags || []
    }));

    const response = await fetch('/generate_apkg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            cards: cards,
            deck_name: deck.name,
            filename: filename
        })
    });

    if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.apkg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showToast('Export successful (.apkg)');
    } else {
        throw new Error("Backend export failed");
    }
}

function exportToTxt(deck, filename) {
    const content = deck.cards.map(c => `${c.term} - ${c.def}`).join('\n');
    downloadFile(content, `${filename}.txt`, 'text/plain');
    showToast('Export successful (.txt)');
}

function exportToMd(deck, filename) {
    const content = `# ${deck.name}\n\n` + deck.cards.map(c => `## ${c.term}\n${c.def}\n`).join('\n');
    downloadFile(content, `${filename}.md`, 'text/markdown');
    showToast('Export successful (.md)');
}

function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type: type });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

/**
 * Show export preview modal
 */
export function showExportPreview() {
    const deck = getActiveDeck();
    if (!deck) return;
    
    // Check if elements exist (might not be in DOM yet if using old HTML)
    const previewList = document.getElementById('previewCardsList');
    if (!previewList) return; // Should log error?

    const allCards = deck.cards;
    const validCards = allCards.filter(c => c.term && c.def && c.term.trim() && c.def.trim());
    const issues = allCards.length - validCards.length;
    
    // Update stats
    const elTotal = document.getElementById('previewTotalCards');
    const elValid = document.getElementById('previewValidCards');
    const elIssues = document.getElementById('previewIssues');
    
    if(elTotal) elTotal.textContent = allCards.length;
    if(elValid) elValid.textContent = validCards.length;
    if(elIssues) elIssues.textContent = issues;
    
    // Show sample cards (first 5)
    previewList.innerHTML = '';
    
    const sampleCards = allCards.slice(0, 5);
    sampleCards.forEach((card, idx) => {
        const isInvalid = !card.term || !card.def || !card.term.trim() || !card.def.trim();
        const cardEl = document.createElement('div');
        cardEl.className = `preview-card ${isInvalid ? 'invalid' : ''}`;
        
        // Render markdown for term and definition
        const renderedTerm = card.term ? renderMarkdown(card.term) : '<em>Empty</em>';
        const renderedDef = card.def ? renderMarkdown(card.def) : '<em>Empty</em>';
        
        cardEl.innerHTML = `
            <div class="preview-card-number">#${idx + 1}</div>
            <div class="preview-card-content">
                <div><strong>Term:</strong> <span class="markdown-content">${renderedTerm}</span></div>
                <div><strong>Definition:</strong> <span class="markdown-content">${renderedDef}</span></div>
                ${card.tags && card.tags.length > 0 ? `<div class="preview-tags">${card.tags.map(t => `<span class="tag-badge">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
            </div>
            ${isInvalid ? '<div class="preview-warning"><ion-icon name="alert-circle"></ion-icon> Invalid</div>' : ''}
        `;
        previewList.appendChild(cardEl);
    });
    
    if (allCards.length > 5) {
        const moreEl = document.createElement('div');
        moreEl.className = 'preview-more';
        moreEl.textContent = `... and ${allCards.length - 5} more cards`;
        previewList.appendChild(moreEl);
    }
    
    // Show preview modal
    const modal = document.getElementById('exportPreviewModal');
    if(modal) modal.classList.remove('hidden');
}

export function closeExportPreview() {
    const modal = document.getElementById('exportPreviewModal');
    if(modal) modal.classList.add('hidden');
}
