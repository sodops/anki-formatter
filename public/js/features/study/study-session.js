/**
 * Study Mode Module
 * SRS-enhanced flashcard session logic
 */

import { store } from '../../core/store.js';
import { eventBus, EVENTS } from '../../core/events.js';
import { appLogger } from '../../core/logger.js';
import { dom } from '../../utils/dom-helpers.js';
import { ui, showToast } from '../../ui/components/ui.js';
import { renderMarkdown } from '../../utils/markdown-parser.js';
import { getDueCards, updateCardAfterReview, getIntervalPreview } from '../../core/srs/scheduler.js';

import { switchView, VIEWS } from '../../ui/navigation/view-manager.js';
import { animateCountUp } from '../../utils/dom-helpers.js';

let sessionCards = [];
let currentIndex = 0;
let isAnswerShown = false;
let reverseMode = false;
let sessionResults = {
    again: 0,
    hard: 0,
    good: 0,
    easy: 0
};

// Track which cards have already been counted toward daily goal in this session
const countedCardKeys = new Set();

/**
 * Get settings from localStorage
 */
function getSettings() {
    try {
        const key = store.getScopedKey('ankiflow_settings');
        return JSON.parse(localStorage.getItem(key) || '{}');
    } catch { return {}; }
}

/**
 * Play a subtle sound effect using Web Audio API
 * @param {'flip'|'again'|'good'|'easy'} type - Type of sound to play
 */
function playSound(type) {
    const settings = getSettings();
    if (!settings.soundEffects) return;
    
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        gainNode.gain.value = 0.08; // Very subtle
        
        switch (type) {
            case 'flip':
                oscillator.frequency.value = 600;
                oscillator.type = 'sine';
                gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
                oscillator.start(ctx.currentTime);
                oscillator.stop(ctx.currentTime + 0.1);
                break;
            case 'again':
                oscillator.frequency.value = 300;
                oscillator.type = 'sine';
                gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
                oscillator.start(ctx.currentTime);
                oscillator.stop(ctx.currentTime + 0.2);
                break;
            case 'good':
                oscillator.frequency.value = 800;
                oscillator.type = 'sine';
                gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
                oscillator.start(ctx.currentTime);
                oscillator.stop(ctx.currentTime + 0.12);
                break;
            case 'easy':
                oscillator.frequency.value = 1000;
                oscillator.type = 'sine';
                gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
                oscillator.start(ctx.currentTime);
                oscillator.stop(ctx.currentTime + 0.15);
                break;
        }
    } catch (e) {
        // Web Audio API not available — silently ignore
    }
}

/**
 * Update daily goal progress
 * @param {Object} card - The card being rated (to deduplicate re-queued cards)
 */
function updateDailyGoal(card) {
    // Deduplicate: don't count Again re-queued cards twice
    const cardKey = card ? `${card.term}::${card.def}` : null;
    if (cardKey && countedCardKeys.has(cardKey)) {
        return; // Already counted this card in this session
    }
    if (cardKey) countedCardKeys.add(cardKey);
    
    const today = new Date().toISOString().split('T')[0];
    const key = store.getScopedKey('ankiflow_daily');
    const stored = JSON.parse(localStorage.getItem(key) || '{}');
    
    if (stored.date !== today) {
        stored.date = today;
        stored.reviewed = 0;
    }
    
    stored.reviewed = (stored.reviewed || 0) + 1;
    localStorage.setItem(key, JSON.stringify(stored));
    
    // Trigger cloud sync for daily progress
    try { store._scheduleSyncToCloud(); } catch (e) { /* ignore if store not ready */ }
    
    // Update sidebar widget
    renderDailyGoalWidget(stored.reviewed);
}

/**
 * Render the daily goal widget with given reviewed count
 */
function renderDailyGoalWidget(reviewed) {
    const key = store.getScopedKey('ankiflow_settings');
    const settings = JSON.parse(localStorage.getItem(key) || '{}');
    const goal = settings.dailyGoal || 20;
    const percent = Math.min(100, Math.round((reviewed / goal) * 100));
    const completed = reviewed >= goal;
    
    const goalBar = document.getElementById('goalProgressBar');
    const goalText = document.getElementById('goalText');
    
    if (goalBar) goalBar.style.width = `${percent}%`;
    if (goalText) {
        if (completed) {
            goalText.textContent = `✅ ${goal} / ${goal} — Goal reached!`;
        } else {
            goalText.textContent = `${reviewed} / ${goal} cards today`;
        }
    }
}

/**
 * Load daily goal on init
 */
export function loadDailyGoal() {
    const today = new Date().toISOString().split('T')[0];
    const key = store.getScopedKey('ankiflow_daily');
    const stored = JSON.parse(localStorage.getItem(key) || '{}');
    
    if (stored.date !== today) {
        stored.date = today;
        stored.reviewed = 0;
        localStorage.setItem(key, JSON.stringify(stored));
    }
    
    const reviewed = stored.reviewed || 0;
    renderDailyGoalWidget(reviewed);
    
    // Load streak
    updateStreakDisplay();
}

/**
 * Update streak display
 */
function updateStreakDisplay() {
    const streakBadge = document.getElementById('streakBadge');
    if (!streakBadge) return;
    
    const currentState = store.getState();
    const decks = currentState.decks || [];
    const reviewDates = new Set();
    
    decks.forEach(deck => {
        if (deck.isDeleted) return;
        (deck.cards || []).forEach(card => {
            const rh = card.reviewData?.reviewHistory || [];
            rh.forEach(r => {
                reviewDates.add(new Date(r.timestamp).toISOString().split('T')[0]);
            });
        });
    });
    
    // Count streak
    const sorted = Array.from(reviewDates).sort().reverse();
    let streak = 0;
    const today = new Date().toISOString().split('T')[0];
    let checkDate = new Date(today);
    
    for (const dateStr of sorted) {
        const expected = checkDate.toISOString().split('T')[0];
        if (dateStr === expected) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
        } else if (dateStr < expected) {
            break;
        }
    }
    
    streakBadge.textContent = `🔥 ${streak}`;
}

/**
 * Update progress bar
 */
function updateProgressBar() {
    const total = sessionCards.length;
    const current = currentIndex + 1;
    const percent = total > 0 ? Math.round((current / total) * 100) : 0;
    
    const bar = document.getElementById('studyProgressBar');
    const text = document.getElementById('studyProgressText');
    const percentEl = document.getElementById('studyProgressPercent');
    
    if (bar) bar.style.width = `${percent}%`;
    if (text) text.textContent = `${current} / ${total}`;
    if (percentEl) percentEl.textContent = `${percent}%`;
}

/**
 * Start a new SRS study session
 * @param {boolean} skipViewSwitch - If true, don't switch view (already in study view)
 */
export function startStudySession(skipViewSwitch = false) {
    const deck = store.getActiveDeck();
    if (!deck) {
        ui.alert('Please select a deck first! / Avval deck tanlang!');
        return;
    }
    
    // Get only due cards (includes new cards)
    const dueCards = getDueCards(deck);
    
    if (dueCards.length === 0) {
        ui.alert("No cards are due for review right now! 🎉\n\nCome back later or add new cards.");
        return;
    }
    
    // Shuffle due cards
    sessionCards = [...dueCards].sort(() => Math.random() - 0.5);
    currentIndex = 0;
    isAnswerShown = false;
    
    // Reset session results and dedup tracker
    sessionResults = { again: 0, hard: 0, good: 0, easy: 0 };
    countedCardKeys.clear();
    
    // Switch to study view only if not already there
    if (!skipViewSwitch) {
        window._studySessionStartedManually = true;
        switchView(VIEWS.STUDY);
    }
    
    // Read reverse mode setting
    const settings = getSettings();
    reverseMode = !!settings.reverseMode;
    
    // Update UI
    if (dom.studyDeckTitle) dom.studyDeckTitle.textContent = `Studying: ${deck.name}${reverseMode ? ' (Reverse)' : ''}`;
    if (dom.studyPlaceholder) dom.studyPlaceholder.classList.add('hidden');
    if (dom.studyInterface) dom.studyInterface.classList.remove('hidden');
    
    // Hide session summary
    const summary = document.getElementById('sessionSummary');
    if (summary) summary.classList.add('hidden');
    
    // Show progress
    const progressContainer = document.getElementById('studyProgressContainer');
    if (progressContainer) progressContainer.style.display = '';
    
    renderStudyCard();
    updateProgressBar();
    setupStudyListeners();
    

}

/**
 * Render current card
 */
function renderStudyCard() {
    // Safety check
    if (!sessionCards || sessionCards.length === 0 || currentIndex >= sessionCards.length) {
        console.warn('No cards to render');
        return;
    }
    
    const card = sessionCards[currentIndex];
    if (!card) {
        console.warn('Card not found at index:', currentIndex);
        return;
    }
    
    // Reset answer shown
    isAnswerShown = false;
    
    // Reset flip instantly (no animation) to prevent showing answer of next card
    const inner = dom.flashcard?.querySelector('.flashcard-inner');
    if (inner) {
        inner.style.transition = 'none';
    }
    if (dom.flashcard) dom.flashcard.classList.remove('flipped');
    
    // Render Front/Back (swap if reverse mode)
    const frontText = reverseMode ? (card.def || '') : (card.term || '');
    const backText = reverseMode ? (card.term || '') : (card.def || '');
    if (dom.studyFront) dom.studyFront.innerHTML = renderMarkdown(frontText);
    if (dom.studyBack) dom.studyBack.innerHTML = renderMarkdown(backText);
    
    // Re-enable transition after a frame so the "Show Answer" flip animates normally
    requestAnimationFrame(() => {
        if (inner) inner.style.transition = '';
    });
    
    // Update Progress
    if (dom.studyIndex) dom.studyIndex.textContent = currentIndex + 1;
    if (dom.studyTotal) dom.studyTotal.textContent = sessionCards.length;
    
    // Update UI for answer-hidden state
    updateButtonsForAnswerState();
}

/**
 * Update buttons based on answer shown/hidden
 */
function updateButtonsForAnswerState() {
    // Safety check
    if (!sessionCards || sessionCards.length === 0 || currentIndex >= sessionCards.length) {
        return;
    }
    
    const card = sessionCards[currentIndex];
    if (!card) return;
    
    const buttonsContainer = document.querySelector('.study-rating-buttons');
    
    if (!isAnswerShown) {
        // Show "Show Answer" button
        if (dom.btnStudyFlip) {
            dom.btnStudyFlip.textContent = "Show Answer (Space)";
            dom.btnStudyFlip.classList.remove('hidden');
        }
        
        if (buttonsContainer) {
            buttonsContainer.classList.add('hidden');
        }
    } else {
        // Hide flip button, show rating buttons
        if (dom.btnStudyFlip) {
            dom.btnStudyFlip.classList.add('hidden');
        }
        
        if (buttonsContainer) {
            buttonsContainer.classList.remove('hidden');
            
            // Update button intervals
            const btnAgain = document.getElementById('btnAgain');
            const btnHard = document.getElementById('btnHard');
            const btnGood = document.getElementById('btnGood');
            const btnEasy = document.getElementById('btnEasy');
            
            if (btnAgain) btnAgain.innerHTML = 
                `<ion-icon name="close-circle"></ion-icon> Again (${getIntervalPreview(card, 0)}) <kbd class="rating-kbd">1</kbd>`;
            if (btnHard) btnHard.innerHTML = 
                `<ion-icon name="sad-outline"></ion-icon> Hard (${getIntervalPreview(card, 2)}) <kbd class="rating-kbd">2</kbd>`;
            if (btnGood) btnGood.innerHTML = 
                `<ion-icon name="checkmark-circle"></ion-icon> Good (${getIntervalPreview(card, 3)}) <kbd class="rating-kbd">3</kbd>`;
            if (btnEasy) btnEasy.innerHTML = 
                `<ion-icon name="happy-outline"></ion-icon> Easy (${getIntervalPreview(card, 5)}) <kbd class="rating-kbd">4</kbd>`;
            
            // Apply keyboard hints visibility setting
            const settings = getSettings();
            const showHints = settings.keyboardHints !== false;
            buttonsContainer.querySelectorAll('.rating-kbd').forEach(el => {
                el.style.display = showHints ? '' : 'none';
            });
        }
    }
}

/**
 * Show answer
 */
export function showAnswer() {
    if (!isAnswerShown && sessionCards.length > 0) {
        isAnswerShown = true;
        if (dom.flashcard) dom.flashcard.classList.add('flipped');
        updateButtonsForAnswerState();
        playSound('flip');
    }
}

/**
 * Rate card and move to next
 * @param {number} quality - Quality rating (0, 2, 3, 5 for Again, Hard, Good, Easy)
 */
export function rateCard(quality) {
    try {
        const deck = store.getActiveDeck();
        const card = sessionCards[currentIndex];
        
        // Find card in deck by ID (reliable) with term/def fallback
        let deckCardIndex = card.id 
            ? deck.cards.findIndex(c => c.id === card.id)
            : -1;
        if (deckCardIndex === -1) {
            // Fallback for old cards without IDs
            deckCardIndex = deck.cards.findIndex(c => 
                c.term === card.term && c.def === card.def
            );
        }
        
        if (deckCardIndex !== -1) {
            // Update card with new review data
            const updatedCard = updateCardAfterReview(card, quality);
            
            // Use store to persist (don't mutate directly)
            store.dispatch('CARD_UPDATE', {
                deckId: deck.id,
                cardIndex: deckCardIndex,
                updates: {
                    reviewData: updatedCard.reviewData,
                    lastReview: updatedCard.lastReview,
                    interval: updatedCard.interval,
                    easeFactor: updatedCard.easeFactor
                }
            });
            
            // Track session stats
            if (quality === 0) { sessionResults.again++; playSound('again'); }
            else if (quality === 2) { sessionResults.hard++; playSound('good'); }
            else if (quality === 3) { sessionResults.good++; playSound('good'); }
            else if (quality === 5) { sessionResults.easy++; playSound('easy'); }
            
            // Update daily goal (pass card to deduplicate re-queued cards)
            updateDailyGoal(card);
            
            // Log the review for analytics
            store.dispatch('LOG_REVIEW', {
                cardId: card.id,
                deckId: deck.id,
                grade: quality, // 0=Again, 2=Hard, 3=Good, 5=Easy. Note: DB expects 1-4 mapped below or updated check
                // Mapping: Again(0)->1, Hard(2)->2, Good(3)->3, Easy(5)->4
                // But wait, my DB check says grade >= 1 AND grade <= 4.
                // Let's map it safely:
                grade: quality === 0 ? 1 : (quality === 2 ? 2 : (quality === 3 ? 3 : 4)),
                reviewState: card.reviewData?.isLearning ? 'learning' : 'review',
                elapsedTime: 0 // TODO: Track actual time spent
            });

            eventBus.emit(EVENTS.STUDY_CARD_RATED, { 
                cardId: deck.cards[deckCardIndex].id,
                quality,
                newInterval: updatedCard.interval
            });
            
            // === AGAIN RE-QUEUING ===
            // If rated "Again" (quality=0), re-insert this card later in the session
            // This mimics Anki's learning queue: failed cards reappear within the session
            if (quality === 0) {
                // Get fresh copy of the card from deck (with updated reviewData)
                const freshDeck = store.getActiveDeck();
                const freshCard = freshDeck.cards[deckCardIndex];
                
                // Insert the card 3-8 positions ahead (random for variety)
                const reinsertOffset = Math.min(
                    3 + Math.floor(Math.random() * 6), // 3-8 positions ahead
                    sessionCards.length - currentIndex   // don't go past end
                );
                const reinsertPos = currentIndex + reinsertOffset;
                
                // Insert the card back into the session queue
                sessionCards.splice(reinsertPos, 0, { ...freshCard });
                
                showToast("Card will appear again shortly", "info");
            }
        }
        
        // Move to next card or end session
        if (currentIndex < sessionCards.length - 1) {
            currentIndex++;
            renderStudyCard();
            updateProgressBar();
        } else {
            endSession();
        }
    } catch (error) {
        appLogger.error("Failed to rate card", error);
        showToast("Failed to rate card");
    }
}

/**
 * End study session and show summary
 */
function endSession() {
    const total = sessionResults.again + sessionResults.hard + sessionResults.good + sessionResults.easy;
    const goodEasy = sessionResults.good + sessionResults.easy;
    const accuracy = total > 0 ? Math.round((goodEasy / total) * 100) : 0;
    
    // Hide study interface
    if (dom.studyInterface) dom.studyInterface.classList.add('hidden');
    
    // Hide progress bar
    const progressContainer = document.getElementById('studyProgressContainer');
    if (progressContainer) progressContainer.style.display = 'none';
    
    // Show session summary
    const summary = document.getElementById('sessionSummary');
    if (summary) {
        summary.classList.remove('hidden');
        
        // Populate stats
        document.getElementById('summarySubtitle').textContent = `You reviewed ${total} cards`;
        document.getElementById('summaryAgain').textContent = sessionResults.again;
        document.getElementById('summaryHard').textContent = sessionResults.hard;
        document.getElementById('summaryGood').textContent = sessionResults.good;
        document.getElementById('summaryEasy').textContent = sessionResults.easy;
        document.getElementById('accuracyText').textContent = `${accuracy}%`;
        
        // Animate accuracy ring
        const path = document.getElementById('accuracyPath');
        if (path) {
            setTimeout(() => {
                path.setAttribute('stroke-dasharray', `${accuracy}, 100`);
            }, 100);
        }
        
        // Animate count-up for stat values
        animateCountUp('summaryAgain', sessionResults.again);
        animateCountUp('summaryHard', sessionResults.hard);
        animateCountUp('summaryGood', sessionResults.good);
        animateCountUp('summaryEasy', sessionResults.easy);
        
        // Setup summary buttons
        const btnBack = document.getElementById('btnBackToLibrary');
        const btnAgainStudy = document.getElementById('btnStudyAgain');
        
        if (btnBack) btnBack.onclick = () => {
            summary.classList.add('hidden');
            closeStudySession();
        };
        
        if (btnAgainStudy) btnAgainStudy.onclick = () => {
            summary.classList.add('hidden');
            startStudySession(true);
        };
    }
    
    // Update streak display
    updateStreakDisplay();
    
    // Confetti celebration!
    launchConfetti();
    
    removeStudyListeners();
}

/**
 * Launch confetti animation on session complete
 */
function launchConfetti() {
    const canvas = document.createElement('canvas');
    canvas.id = 'confettiCanvas';
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:10000;';
    document.body.appendChild(canvas);
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');
    const colors = ['#6366F1','#EC4899','#F59E0B','#22C55E','#3B82F6','#F43F5E','#14B8A6'];
    const particles = [];
    for (let i = 0; i < 120; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            vx: (Math.random() - 0.5) * 6,
            vy: Math.random() * 4 + 2,
            color: colors[Math.floor(Math.random() * colors.length)],
            size: Math.random() * 8 + 3,
            rot: Math.random() * 360,
            rotSpeed: (Math.random() - 0.5) * 10,
            opacity: 1
        });
    }
    let frame = 0;
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let alive = false;
        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.08;
            p.rot += p.rotSpeed;
            if (frame > 60) p.opacity -= 0.015;
            if (p.opacity <= 0) return;
            alive = true;
            ctx.save();
            ctx.globalAlpha = Math.max(0, p.opacity);
            ctx.translate(p.x, p.y);
            ctx.rotate((p.rot * Math.PI) / 180);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
            ctx.restore();
        });
        frame++;
        if (alive && frame < 180) {
            requestAnimationFrame(animate);
        } else {
            canvas.remove();
        }
    }
    requestAnimationFrame(animate);
}



/**
 * Close Session
 */
export function closeStudySession() {
    // Hide interface, show placeholder
    if (dom.studyInterface) dom.studyInterface.classList.add('hidden');
    if (dom.studyPlaceholder) dom.studyPlaceholder.classList.remove('hidden');
    if (dom.studyDeckTitle) dom.studyDeckTitle.textContent = "Study Session";
    
    // Hide summary and progress
    const summary = document.getElementById('sessionSummary');
    if (summary) summary.classList.add('hidden');
    
    const progressContainer = document.getElementById('studyProgressContainer');
    if (progressContainer) progressContainer.style.display = 'none';
    
    removeStudyListeners();
    
    // Switch back to library
    switchView(VIEWS.LIBRARY);
}

// --- Event Listeners ---

let listenersSetup = false;

function handleKeydown(e) {
    // If not in study view, ignore
    const studyView = document.getElementById('view-study');
    if (studyView && studyView.classList.contains('hidden')) return;
    
    // Ignore if no cards loaded
    if (sessionCards.length === 0) return;

    if (e.code === 'Space') {
        e.preventDefault();
        e.stopPropagation();
        if (!isAnswerShown) {
            showAnswer();
        }
    } else if (e.code === 'Digit1' && isAnswerShown) {
        e.preventDefault();
        rateCard(0); // Again
    } else if (e.code === 'Digit2' && isAnswerShown) {
        e.preventDefault();
        rateCard(2); // Hard
    } else if (e.code === 'Digit3' && isAnswerShown) {
        e.preventDefault();
        rateCard(3); // Good
    } else if (e.code === 'Digit4' && isAnswerShown) {
        e.preventDefault();
        rateCard(5); // Easy
    } else if (e.code === 'Escape') {
        closeStudySession();
    }
}

function setupStudyListeners() {
    // Always remove old listeners first to prevent duplicates
    removeStudyListeners();
    listenersSetup = true;
    
    document.addEventListener('keydown', handleKeydown);
    
    // Button click
    if (dom.btnStudyFlip) {
        dom.btnStudyFlip.onclick = (e) => {
            e.preventDefault();
            showAnswer();
        };
    }
    
    // Flashcard click to flip
    if (dom.flashcard) {
        dom.flashcard.onclick = (e) => {
            if (!isAnswerShown) {
                showAnswer();
            }
        };
    }
    
    // Rating buttons
    const btnAgain = document.getElementById('btnAgain');
    const btnHard = document.getElementById('btnHard');
    const btnGood = document.getElementById('btnGood');
    const btnEasy = document.getElementById('btnEasy');
    
    if (btnAgain) btnAgain.onclick = () => rateCard(0);
    if (btnHard) btnHard.onclick = () => rateCard(2);
    if (btnGood) btnGood.onclick = () => rateCard(3);
    if (btnEasy) btnEasy.onclick = () => rateCard(5);
    

}

function removeStudyListeners() {
    listenersSetup = false;
    document.removeEventListener('keydown', handleKeydown);
    if (dom.btnStudyFlip) dom.btnStudyFlip.onclick = null;
    if (dom.flashcard) dom.flashcard.onclick = null;
}
