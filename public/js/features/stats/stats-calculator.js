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
            if (deck.isDeleted) return;

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

    // Review Heatmap
    renderReviewHeatmap(decks, 'tabStatHeatmap');
    
    // Review Forecast
    renderReviewForecast(decks, 'tabStatForecast');
    
    // Per-Deck Stats
    renderPerDeckStats(decks, 'tabStatPerDeck');

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
                
                // Calculate accuracy from ALL reviews (not just last)
                const history = reviewData.reviewHistory || [];
                history.forEach(r => {
                    if (r.quality >= 3) goodOrEasy++;
                });
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
    
    // Calculate accuracy percentage (goodOrEasy / total reviews, not per-card)
    const totalReviewAttempts = goodOrEasy + (function() {
        let bad = 0;
        decks.forEach(d => {
            if (d.isDeleted) return;
            d.cards.forEach(c => {
                (c.reviewData?.reviewHistory || []).forEach(r => {
                    if (r.quality < 3) bad++;
                });
            });
        });
        return bad;
    })();
    
    const accuracy = totalReviewAttempts > 0 
        ? Math.round((goodOrEasy / totalReviewAttempts) * 100) 
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

/**
 * Render review heatmap (GitHub-style contribution calendar)
 * Shows last 90 days of review activity
 */
function renderReviewHeatmap(decks, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Collect review counts per day
    const dayCounts = {};
    decks.forEach(deck => {
        if (deck.isDeleted) return;
        deck.cards.forEach(card => {
            const rh = card.reviewData?.reviewHistory || [];
            rh.forEach(r => {
                const day = new Date(r.timestamp).toISOString().split('T')[0];
                dayCounts[day] = (dayCounts[day] || 0) + 1;
            });
        });
    });
    
    const today = new Date();
    const days = 91; // ~13 weeks
    const maxCount = Math.max(1, ...Object.values(dayCounts));
    
    // Build grid: 7 rows (Mon-Sun) x 13 columns (weeks)
    const cells = [];
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const key = date.toISOString().split('T')[0];
        const count = dayCounts[key] || 0;
        const level = count === 0 ? 0 : Math.min(4, Math.ceil((count / maxCount) * 4));
        cells.push({ key, count, level, dow: date.getDay() });
    }
    
    // Month labels
    const months = [];
    let lastMonth = -1;
    cells.forEach((cell, i) => {
        const month = new Date(cell.key).getMonth();
        if (month !== lastMonth) {
            const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            months.push({ name: names[month], offset: Math.floor(i / 7) });
            lastMonth = month;
        }
    });
    
    const totalReviews = Object.values(dayCounts).reduce((a, b) => a + b, 0);
    const activeDays = Object.keys(dayCounts).length;
    
    container.innerHTML = `
        <div class="heatmap-meta">
            <span>${totalReviews} reviews in last ${days} days</span>
            <span>${activeDays} active days</span>
        </div>
        <div class="heatmap-months">
            ${months.map(m => `<span style="grid-column:${m.offset + 2}">${m.name}</span>`).join('')}
        </div>
        <div class="heatmap-grid">
            ${cells.map(c => 
                `<div class="heatmap-cell level-${c.level}" title="${c.key}: ${c.count} reviews"></div>`
            ).join('')}
        </div>
        <div class="heatmap-legend">
            <span>Less</span>
            <div class="heatmap-cell level-0"></div>
            <div class="heatmap-cell level-1"></div>
            <div class="heatmap-cell level-2"></div>
            <div class="heatmap-cell level-3"></div>
            <div class="heatmap-cell level-4"></div>
            <span>More</span>
        </div>
    `;
}

/**
 * Render review forecast — upcoming due cards over next 14 days
 */
function renderReviewForecast(decks, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const now = new Date();
    const forecastDays = 14;
    const dayCounts = Array(forecastDays).fill(0);
    const labels = [];
    
    for (let i = 0; i < forecastDays; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() + i);
        labels.push(i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }));
    }
    
    decks.forEach(deck => {
        if (deck.isDeleted) return;
        deck.cards.forEach(card => {
            if (card.suspended) return;
            const rd = card.reviewData;
            if (!rd || !rd.nextReview) {
                dayCounts[0]++; // New cards are due today
                return;
            }
            const nextReview = new Date(rd.nextReview);
            const diffMs = nextReview - now;
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            if (diffDays >= 0 && diffDays < forecastDays) {
                dayCounts[diffDays]++;
            }
        });
    });
    
    const maxVal = Math.max(1, ...dayCounts);
    
    container.innerHTML = `
        <div class="forecast-chart">
            ${dayCounts.map((count, i) => {
                const height = Math.max(4, (count / maxVal) * 100);
                return `<div class="forecast-bar-group" title="${labels[i]}: ${count} cards">
                    <div class="forecast-bar" style="height:${height}%"></div>
                    <div class="forecast-count">${count}</div>
                    <div class="forecast-label">${i === 0 ? 'Today' : i < 7 ? ['S','M','T','W','T','F','S'][(now.getDay() + i) % 7] : ''}</div>
                </div>`;
            }).join('')}
        </div>
        <div class="forecast-summary">
            <span><strong>${dayCounts[0]}</strong> due today</span>
            <span><strong>${dayCounts.slice(0, 7).reduce((a, b) => a + b, 0)}</strong> this week</span>
            <span><strong>${dayCounts.reduce((a, b) => a + b, 0)}</strong> next ${forecastDays} days</span>
        </div>
    `;
}

/**
 * Render per-deck statistics table
 */
function renderPerDeckStats(decks, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const activeDecks = decks.filter(d => !d.isDeleted);
    if (activeDecks.length === 0) {
        container.innerHTML = '<div class="empty-chart">No decks</div>';
        return;
    }
    
    const rows = activeDecks.map(deck => {
        const total = deck.cards.length;
        let newCount = 0, learningCount = 0, reviewCount = 0, suspendedCount = 0;
        let totalReviews = 0, goodEasy = 0;
        const now = new Date();
        
        deck.cards.forEach(card => {
            if (card.suspended) { suspendedCount++; return; }
            const rd = card.reviewData;
            if (!rd || !rd.nextReview) { newCount++; }
            else if (rd.isLearning) { learningCount++; }
            else { reviewCount++; }
            
            // Accuracy from all reviews
            const rh = rd?.reviewHistory || [];
            rh.forEach(r => {
                totalReviews++;
                if (r.quality >= 3) goodEasy++;
            });
        });
        
        const accuracy = totalReviews > 0 ? Math.round((goodEasy / totalReviews) * 100) : 0;
        
        return `<tr>
            <td style="padding:8px 12px;">
                <div style="display:flex;align-items:center;gap:8px;">
                    <span style="width:10px;height:10px;border-radius:50%;background:${deck.color || '#6366F1'};display:inline-block;"></span>
                    <strong>${escapeHtml(deck.name)}</strong>
                </div>
            </td>
            <td style="padding:8px 12px;text-align:center;">${total}</td>
            <td style="padding:8px 12px;text-align:center;color:#3B82F6;">${newCount}</td>
            <td style="padding:8px 12px;text-align:center;color:#F59E0B;">${learningCount}</td>
            <td style="padding:8px 12px;text-align:center;color:#22C55E;">${reviewCount}</td>
            <td style="padding:8px 12px;text-align:center;color:var(--text-tertiary);">${suspendedCount}</td>
            <td style="padding:8px 12px;text-align:center;">${accuracy}%</td>
        </tr>`;
    }).join('');
    
    container.innerHTML = `
        <table style="width:100%;font-size:13px;border-collapse:collapse;">
            <thead><tr style="border-bottom:1px solid var(--border-default);color:var(--text-tertiary);">
                <th style="padding:8px 12px;text-align:left;">Deck</th>
                <th style="padding:8px 12px;text-align:center;">Total</th>
                <th style="padding:8px 12px;text-align:center;">New</th>
                <th style="padding:8px 12px;text-align:center;">Learning</th>
                <th style="padding:8px 12px;text-align:center;">Review</th>
                <th style="padding:8px 12px;text-align:center;">Suspended</th>
                <th style="padding:8px 12px;text-align:center;">Accuracy</th>
            </tr></thead>
            <tbody>${rows}</tbody>
        </table>
    `;
}
