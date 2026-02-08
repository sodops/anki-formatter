/**
 * Statistics Module
 * Analyze deck data and render dashboard
 */

import { store } from '../../core/store.js';
import { eventBus, EVENTS } from '../../core/events.js';
import { appLogger } from '../../core/logger.js';
import { STATE } from '../../core/storage/storage.js';
import { dom } from '../../utils/dom-helpers.js';
import { escapeHtml } from '../../ui/components/ui.js';

import { switchView, VIEWS } from '../../ui/navigation/view-manager.js';

/**
 * Animate a stat value count-up
 */
function animateStatValue(el, target, duration = 600) {
    if (!el) return;
    if (target === 0) { el.textContent = '0'; return; }
    
    const start = 0;
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(start + (target - start) * eased);
        
        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            el.textContent = target;
        }
    }
    
    requestAnimationFrame(update);
}

/**
 * Open Stats View
 */
export function openStats() {
    calculateAndRenderStats();
    switchView(VIEWS.STATISTICS);
}

/**
 * Calculate and render stats (Public)
 */
export function calculateAndRenderStats() {
    try {
        const currentState = store.getState();
        const decks = currentState.decks;
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

        // Overview numbers with count-up animation
    const tabTotalCards = document.getElementById('tabStatTotalCards');
    if (tabTotalCards) {
        const target = totalCards;
        animateStatValue(tabTotalCards, target);
    }
    
    const tabTotalDecks = document.getElementById('tabStatTotalDecks');
    if (tabTotalDecks) {
        animateStatValue(tabTotalDecks, totalDecks);
    }
    
    // Enhanced statistics
    const enhancedStats = calculateEnhancedStats(decks);
    renderEnhancedStats(enhancedStats, 'tabEnhancedStats');

    // Deck Distribution Bar Chart
    renderDeckChart(cardsPerDeck, totalCards, 'tabStatDeckChart');

    // Card Maturity Chart
    renderMaturityChart(decks, 'tabStatMaturity');

    // Top Tags
    renderTopTags(tagCounts, 'tabStatTagCloud');
    } catch (error) {
        console.error('Failed to calculate stats:', error);
    }
}

/**
 * Calculate enhanced SRS statistics
 */
function calculateEnhancedStats(decks) {
    let totalReviewed = 0;
    let goodOrEasy = 0;
    let upcomingToday = 0;
    let upcomingWeek = 0;
    
    const now = new Date();
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);
    
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);
    
    decks.forEach(deck => {
        if (deck.isDeleted) return;
        
        deck.cards.forEach(card => {
            const reviewData = card.reviewData;
            if (!reviewData) return;
            
            // Count reviewed cards
            if (reviewData.lastReview) {
                totalReviewed++;
                
                // Calculate accuracy (Good=3 or Easy=5)
                const history = reviewData.reviewHistory || [];
                const lastReview = history[history.length - 1];
                if (lastReview && (lastReview.quality === 3 || lastReview.quality === 5)) {
                    goodOrEasy++;
                }
            }
            
            // Upcoming reviews
            if (reviewData.nextReview) {
                const nextReviewDate = new Date(reviewData.nextReview);
                
                if (nextReviewDate <= todayEnd) {
                    upcomingToday++;
                } else if (nextReviewDate <= weekEnd) {
                    upcomingWeek++;
                }
            }
        });
    });
    
    // Calculate study streak
    const streak = calculateStudyStreak(decks);
    
    // Calculate accuracy percentage
    const accuracy = totalReviewed > 0 
        ? Math.round((goodOrEasy / totalReviewed) * 100) 
        : 0;
    
    return {
        streak,
        accuracy,
        totalReviewed,
        upcomingToday,
        upcomingWeek
    };
}

/**
 * Calculate study streak (consecutive days)
 */
function calculateStudyStreak(decks) {
    const reviewDates = new Set();
    
    decks.forEach(deck => {
        if (deck.isDeleted) return;
        
        deck.cards.forEach(card => {
            const reviewData = card.reviewData;
            if (!reviewData || !reviewData.reviewHistory) return;
            
            reviewData.reviewHistory.forEach(review => {
                const date = new Date(review.timestamp);
                const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
                reviewDates.add(dateStr);
            });
        });
    });
    
    // Sort dates descending
    const sortedDates = Array.from(reviewDates).sort().reverse();
    if (sortedDates.length === 0) return 0;
    
    // Count consecutive days from today
    let streak = 0;
    const today = new Date().toISOString().split('T')[0];
    let checkDate = new Date(today);
    
    for (const dateStr of sortedDates) {
        const expectedDate = checkDate.toISOString().split('T')[0];
        if (dateStr === expectedDate) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
        } else if (dateStr < expectedDate) {
            break; // Gap found
        }
    }
    
    return streak;
}

/**
 * Render enhanced stats in modal or tab
 */
function renderEnhancedStats(stats, containerId = 'tabEnhancedStats') {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = `
        <div class="stat-grid">
            <div class="stat-card">
                <div class="stat-icon"></div>
                <div class="stat-label">Study Streak</div>
                <div class="stat-value">${stats.streak} ${stats.streak === 1 ? 'day' : 'days'}</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon"></div>
                <div class="stat-label">Accuracy</div>
                <div class="stat-value">${stats.accuracy}%</div>
                <div class="stat-sublabel">${stats.totalReviewed} reviewed</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon"></div>
                <div class="stat-label">Today</div>
                <div class="stat-value">${stats.upcomingToday}</div>
                <div class="stat-sublabel">cards due</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon"></div>
                <div class="stat-label">This Week</div>
                <div class="stat-value">${stats.upcomingWeek}</div>
                <div class="stat-sublabel">upcoming</div>
            </div>
        </div>
    `;
}

/**
 * Render card maturity distribution chart
 * Categories: New, Learning, Young (<21d), Mature (>=21d)
 */
function renderMaturityChart(decks, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    let newCount = 0, learningCount = 0, youngCount = 0, matureCount = 0;
    
    decks.forEach(deck => {
        if (deck.isDeleted) return;
        deck.cards.forEach(card => {
            const rd = card.reviewData;
            if (!rd || !rd.nextReview) {
                newCount++;
            } else if (rd.isLearning) {
                learningCount++;
            } else if (rd.interval && rd.interval >= 21) {
                matureCount++;
            } else {
                youngCount++;
            }
        });
    });
    
    const total = newCount + learningCount + youngCount + matureCount;
    if (total === 0) {
        container.innerHTML = '<div class="empty-chart">No data available</div>';
        return;
    }
    
    const segments = [
        { label: 'New', count: newCount, color: '#3B82F6' },
        { label: 'Learning', count: learningCount, color: '#F59E0B' },
        { label: 'Young', count: youngCount, color: '#22C55E' },
        { label: 'Mature', count: matureCount, color: '#6366F1' }
    ];
    
    // Build horizontal stacked bar
    const barHtml = segments.map(s => {
        const pct = total > 0 ? (s.count / total * 100) : 0;
        if (pct === 0) return '';
        return `<div class="maturity-segment" style="width:${pct}%;background:${s.color};" title="${s.label}: ${s.count} (${Math.round(pct)}%)"></div>`;
    }).join('');
    
    const legendHtml = segments.map(s => {
        const pct = total > 0 ? Math.round(s.count / total * 100) : 0;
        return `<div class="maturity-legend-item">
            <span class="maturity-dot" style="background:${s.color};"></span>
            <span>${s.label}</span>
            <strong>${s.count}</strong>
            <span class="maturity-pct">(${pct}%)</span>
        </div>`;
    }).join('');
    
    container.innerHTML = `
        <div class="maturity-bar">${barHtml}</div>
        <div class="maturity-legend">${legendHtml}</div>
    `;
}

function renderDeckChart(data, total, containerId = 'tabStatDeckChart') {
    const container = document.getElementById(containerId);
    if (!container) return;
    
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

function renderTopTags(tagCounts, containerId = 'tabStatTagCloud') {
    const container = document.getElementById(containerId);
    if (!container) return;
    
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
