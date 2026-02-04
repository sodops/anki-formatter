/**
 * Statistics Module
 * Analyze deck data and render dashboard
 */

import { STATE } from './state.js';
import { dom } from './dom.js';
import { escapeHtml } from './ui.js';

/**
 * Open Stats Modal
 */
export function openStats() {
    calculateAndRenderStats();
    dom.statsModal.classList.remove('hidden');
}

/**
 * Close Stats Modal
 */
export function closeStats() {
    dom.statsModal.classList.add('hidden');
}

/**
 * Calculate stats and render HTML
 */
function calculateAndRenderStats() {
    const decks = STATE.decks;
    const totalDecks = decks.length;
    let totalCards = 0;
    let tagCounts = {};
    let cardsPerDeck = [];

    // Aggregate Data
    decks.forEach(deck => {
        // Skip Trash
        if (deck.id === 'trash' || deck.isTrash) return;

        const count = deck.cards.length;
        totalCards += count;
        cardsPerDeck.push({ name: deck.name, count: count, color: deck.color || '#6366F1' });
        
        // Tags
        deck.cards.forEach(card => {
            if (card.tags) {
                card.tags.forEach(tag => {
                    tagCounts[tag] = (tagCounts[tag] || 0) + 1;
                });
            }
        });
    });

    // Overview numbers
    document.getElementById('statTotalCards').textContent = totalCards;
    document.getElementById('statTotalDecks').textContent = totalDecks;

    // Deck Distribution Bar Chart
    renderDeckChart(cardsPerDeck, totalCards);

    // Top Tags
    renderTopTags(tagCounts);
}

function renderDeckChart(data, total) {
    const container = document.getElementById('statDeckChart');
    container.innerHTML = '';
    
    if (total === 0) {
        container.innerHTML = '<div class="empty-chart">No data available</div>';
        return;
    }

    // Sort by count desc
    data.sort((a,b) => b.count - a.count);

    data.forEach(item => {
        if (item.count === 0) return;
        
        const percent = Math.round((item.count / total) * 100);
        
        const row = document.createElement('div');
        row.className = 'chart-row';
        
        row.innerHTML = `
            <div class="chart-label">${escapeHtml(item.name)}</div>
            <div class="chart-bar-container">
                <div class="chart-bar" style="width: ${percent}%; background-color: ${item.color}"></div>
            </div>
            <div class="chart-value">${item.count} (${percent}%)</div>
        `;
        
        container.appendChild(row);
    });
}

function renderTopTags(tagCounts) {
    const container = document.getElementById('statTagCloud');
    container.innerHTML = '';
    
    const sortedTags = Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8); // Top 8
        
    if (sortedTags.length === 0) {
        container.innerHTML = '<div class="empty-chart">No tags found</div>';
        return;
    }

    sortedTags.forEach(([tag, count]) => {
        const span = document.createElement('span');
        span.className = 'stat-tag';
        span.innerHTML = `${escapeHtml(tag)} <span class="count">${count}</span>`;
        container.appendChild(span);
    });
}
