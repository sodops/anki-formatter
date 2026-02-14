/**
 * SRS Scheduler Module
 * Implements SM-2 algorithm for spaced repetition
 * Enhanced with learning steps for vocabulary memorization
 */

import { store } from '../store.js';
import { FSRS, Rating, createEmptyCard, generatorParameters } from '../../utils/lib/ts-fsrs.mjs';

/**
 * Get user settings from localStorage
 * @returns {Object} Settings with defaults
 */
function getSettings() {
    try {
        const key = store.getScopedKey('ankiflow_settings');
        const saved = JSON.parse(localStorage.getItem(key) || '{}');
        return {
            intervalMod: (saved.intervalMod || 100) / 100, // Convert % to multiplier
            learningSteps: parseLearningSteps(saved.learningSteps || '1, 10'),
            newCards: parseInt(saved.newCards) || 20,
            maxReviews: parseInt(saved.maxReviews) || 100,
            algorithm: saved.algorithm || 'sm-2', // 'sm-2' or 'fsrs'
            fsrsParams: {
                request_retention: parseFloat(saved.fsrsRetention) || 0.9,
                ...saved.fsrsParams
            }
        };
    } catch {
        return { intervalMod: 1, learningSteps: [1, 10], newCards: 20, maxReviews: 100, algorithm: 'sm-2' };
    }
}

/**
 * Parse learning steps string like "1, 10" into array of minutes
 * @param {string} stepsStr 
 * @returns {number[]} Array of step intervals in minutes
 */
function parseLearningSteps(stepsStr) {
    if (Array.isArray(stepsStr)) return stepsStr;
    try {
        return stepsStr.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n > 0);
    } catch {
        return [1, 10];
    }
}

/**
 * Calculate next review schedule
 * Wrapper that delegates to selected algorithm
 */
export function calculateNextReview(card, quality) {
    const settings = getSettings();
    if (settings.algorithm === 'fsrs') {
        return calculateNextReviewFSRS(card, quality, settings);
    }
    return calculateNextReviewSM2(card, quality, settings);
}

/**
 * FSRS Implementation
 */
function calculateNextReviewFSRS(card, quality, settings) {
    const retention = settings.fsrsParams.request_retention || 0.9;
    const params = generatorParameters({ 
        request_retention: retention,
        maximum_interval: 36500,
        enable_fuzz: true
    });
    const f = new FSRS(params);
    
    // Map existing card to FSRS Card
    let fsrsCard;
    const now = new Date();

    if (card.reviewData && card.reviewData.fsrs) {
        fsrsCard = card.reviewData.fsrs;
        
        // Fix dates/enums from JSON
        // We use TypeConvert helper from library or manual reconstruction
        // ts-fsrs objects are plain JSON safe usually, but Dates need restoration
        fsrsCard.due = new Date(fsrsCard.due);
        if (fsrsCard.last_review) fsrsCard.last_review = new Date(fsrsCard.last_review);
    } else {
        // Migrate or Create New
        // Start with empty
        fsrsCard = createEmptyCard(now);
        
        // Best effort migration from SM-2
        if (card.reviewData) {
            const ivl = card.reviewData.interval || 0;
            const isLearning = card.reviewData.isLearning;
            
            // If card is graduating or review, treat as review state
            if (!isLearning && ivl > 0) {
                fsrsCard.state = 2; // State.Review
                fsrsCard.stability = ivl; // Approximation
                fsrsCard.difficulty = 5.5;
                fsrsCard.scheduled_days = ivl;
                fsrsCard.elapsed_days = ivl; // Assume due now
                
                if (card.reviewData.lastReview) {
                     const last = new Date(card.reviewData.lastReview);
                     const diff = (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24);
                     fsrsCard.elapsed_days = diff;
                     fsrsCard.last_review = last;
                } else {
                     fsrsCard.elapsed_days = ivl; // fallback
                }
            }
        }
    }

    // Map Quality (App 0,2,3,5 -> FSRS 1,2,3,4)
    let rating = Rating.Good;
    if (quality === 0) rating = Rating.Again; // 1
    else if (quality === 2) rating = Rating.Hard; // 2
    else if (quality === 3) rating = Rating.Good; // 3
    else if (quality === 5) rating = Rating.Easy; // 4

    // Reschedule
    // f.repeat returns RecordLog (all ratings). We pick the one user chose.
    const schedulingCards = f.repeat(fsrsCard, now);
    const resultLog = schedulingCards[rating];
    const resultCard = resultLog.card;

    // Return combined data structure
    return {
        // Native keys for compatibility
        nextReview: resultCard.due.toISOString(),
        interval: resultCard.scheduled_days, 
        easeFactor: 0, // Not used in FSRS
        repetitions: resultCard.reps,
        step: 0, 
        // Map FSRS state to isLearning
        // New(0), Learning(1), Review(2), Relearning(3)
        // AnkiFlow isLearning: true if Learning or Relearning. (or New implicitly)
        isLearning: (resultCard.state === 0 || resultCard.state === 1 || resultCard.state === 3),

        // FSRS specific state (persisted)
        fsrs: {
            ...resultCard,
            due: resultCard.due.toISOString(),
            last_review: resultCard.last_review ? resultCard.last_review.toISOString() : null
        },
        
        // Append history
        reviewHistory: [
            ...(card.reviewData?.reviewHistory || []),
            {
                timestamp: now.toISOString(),
                quality,
                interval: resultCard.scheduled_days,
                isLearning: (resultCard.state !== 2),
                algorithm: 'fsrs'
            }
        ]
    };
}

/**
 * SM-2 Algorithm Implementation with Learning Steps
 */
function calculateNextReviewSM2(card, quality, settings) {
    const learningSteps = settings.learningSteps;
    const intervalMod = settings.intervalMod;
    
    // Get current review data or initialize defaults
    const reviewData = card.reviewData || {
        interval: 0,
        easeFactor: 2.5,
        repetitions: 0,
        step: 0,          // Current learning step
        isLearning: true,  // In learning phase
        nextReview: null,
        lastReview: null,
        reviewHistory: []
    };

    let { easeFactor, interval, repetitions } = reviewData;
    let step = reviewData.step !== undefined ? reviewData.step : 0;
    let isLearning = reviewData.isLearning !== undefined ? reviewData.isLearning : true;
    const now = new Date();
    let nextReview;

    if (isLearning) {
        // === LEARNING / RELEARNING PHASE ===
        if (quality === 0) {
            // Again: Reset to first learning step
            step = 0;
            const stepMinutes = learningSteps[0] || 1;
            nextReview = new Date(now.getTime() + stepMinutes * 60 * 1000);
            interval = 0;
        } else if (quality >= 3) {
            // Good/Easy: Advance to next learning step
            step++;
            
            if (step >= learningSteps.length) {
                // Graduate to review queue!
                isLearning = false;
                step = 0; // Reset step as it's no longer relevant
                
                if (quality === 5) {
                    // Easy: Graduate with longer interval (4 days)
                    interval = 4;
                } else {
                    // Good: Graduate with standard interval
                    if (repetitions === 0) {
                        interval = 1; // 1 day
                    } else {
                        interval = 1; // Graduating interval
                    }
                }
                repetitions = 1;
                
                nextReview = new Date(now);
                nextReview.setDate(nextReview.getDate() + Math.round(interval * intervalMod));
            } else {
                // Still in learning: next step
                const stepMinutes = learningSteps[step] || 10;
                nextReview = new Date(now.getTime() + stepMinutes * 60 * 1000);
                interval = 0;
            }
        } else {
            // Hard (quality=2): Stay on current step, but repeat sooner
            const stepMinutes = Math.max(1, (learningSteps[step] || 1) * 0.5);
            nextReview = new Date(now.getTime() + stepMinutes * 60 * 1000);
            interval = 0;
        }
    } else {
        // === REVIEW PHASE (Graduated cards) ===
        if (quality >= 3) {
            // Correct response
            if (repetitions === 0) {
                interval = 1;
            } else if (repetitions === 1) {
                interval = 6;
            } else {
                interval = Math.round(interval * easeFactor * intervalMod);
            }
            repetitions++;
            
            // Easy bonus: multiply interval by 1.3
            if (quality === 5) {
                interval = Math.round(interval * 1.3);
            }
            
            nextReview = new Date(now);
            nextReview.setDate(nextReview.getDate() + interval);
        } else {
            // Incorrect response: enter relearning
            isLearning = true;  // Back to learning phase
            step = 0;           // Start from first learning step
            repetitions = 0;
            
            // Lapse penalty: reduce interval
            interval = Math.max(1, Math.round(interval * 0.5));
            
            const stepMinutes = learningSteps[0] || 1;
            nextReview = new Date(now.getTime() + stepMinutes * 60 * 1000);
        }
    }

    // Update ease factor (SM-2 formula) — only for graduated review cards
    // Learning-phase cards should not have their ease factor modified
    if (!isLearning) {
        easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
        easeFactor = Math.max(1.3, easeFactor);
    }

    // Add to review history
    const reviewHistory = reviewData.reviewHistory || [];
    reviewHistory.push({
        timestamp: now.toISOString(),
        quality,
        interval,
        easeFactor,
        isLearning
    });

    return {
        interval,
        easeFactor,
        repetitions,
        step,
        isLearning,
        nextReview: nextReview.toISOString(),
        lastReview: now.toISOString(),
        reviewHistory
    };
}

/**
 * Get cards that are due for review
 * @param {Object} deck - Deck object with cards array
 * @param {Object} options - Optional limits { newCardsLimit, reviewsLimit }
 * @returns {Array} Cards that are due for review (or new cards)
 */
export function getDueCards(deck, options = {}) {
    if (!deck || !deck.cards) return [];

    const now = new Date();
    const settings = getSettings();
    const newCards = [];
    const learningCards = [];
    const dueCards = [];
    
    // Separate new, learning, and due cards
    deck.cards.forEach(card => {
        // Skip suspended cards
        if (card.suspended) return;
        
        if (!card.reviewData || !card.reviewData.nextReview) {
            // New card (never reviewed)
            newCards.push(card);
        } else if (card.reviewData.isLearning) {
            // Learning/relearning card — always include if due
            const nextReview = new Date(card.reviewData.nextReview);
            if (nextReview <= now) {
                learningCards.push(card);
            }
        } else {
            // Review card
            const nextReview = new Date(card.reviewData.nextReview);
            if (nextReview <= now) {
                dueCards.push(card);
            }
        }
    });
    
    // Apply limits from options or settings
    let newCardsLimit = options.newCardsLimit;
    let reviewsLimit = options.reviewsLimit;
    
    if (newCardsLimit === undefined) {
        newCardsLimit = (deck.settings && deck.settings.newCardsPerDay) || settings.newCards;
    }
    if (reviewsLimit === undefined) {
        reviewsLimit = (deck.settings && deck.settings.maxReviewsPerDay) || settings.maxReviews;
    }
    
    // Apply limits (0 means unlimited)
    const limitedNew = (newCardsLimit && newCardsLimit > 0) 
        ? newCards.slice(0, newCardsLimit)
        : newCards;
    
    const limitedDue = (reviewsLimit && reviewsLimit > 0) 
        ? dueCards.slice(0, reviewsLimit)
        : dueCards;
    
    // Learning cards are always included (no limit — they're in-progress)
    // Order: learning first (most urgent), then due reviews, then new cards
    return [...learningCards, ...limitedDue, ...limitedNew];
}

/**
 * Update card's review data after rating
 * @param {Object} card - Card object
 * @param {number} quality - Quality rating (0-5)
 * @returns {Object} Updated card
 */
export function updateCardAfterReview(card, quality) {
    const newReviewData = calculateNextReview(card, quality);
    
    return {
        ...card,
        reviewData: newReviewData
    };
}

/**
 * Get interval display string for a given quality rating
 * Used to show "Again (1m)" on buttons
 * @param {Object} card - Card with reviewData
 * @param {number} quality - Quality rating (0-5)
 * @returns {string} Human-readable interval (e.g., "1m", "10m", "1d", "6d")
 */
export function getIntervalPreview(card, quality) {
    // Delegate to calculateNextReview to avoid duplicating SM-2 logic
    const result = calculateNextReview(card, quality);
    const now = new Date();
    
    if (!result.nextReview) return '1m';
    
    const diffMs = new Date(result.nextReview).getTime() - now.getTime();
    const diffMinutes = Math.max(1, Math.round(diffMs / (60 * 1000)));
    
    if (diffMinutes < 60) {
        return `${diffMinutes}m`;
    }
    
    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) {
        return `${diffHours}h`;
    }
    
    const diffDays = Math.round(diffMinutes / (60 * 24));
    if (diffDays < 30) {
        return `${diffDays}d`;
    } else if (diffDays < 365) {
        return `${Math.round(diffDays / 30)}mo`;
    } else {
        return `${Math.round(diffDays / 365)}y`;
    }
}

/**
 * Initialize review data for a new card
 * @returns {Object} Initial review data
 */
export function initializeReviewData() {
    return {
        interval: 0,
        easeFactor: 2.5,
        repetitions: 0,
        step: 0,
        isLearning: true,
        nextReview: null, // null means "new card, review anytime"
        lastReview: null,
        reviewHistory: []
    };
}

/**
 * Get statistics for a deck's review status
 * @param {Object} deck - Deck object
 * @returns {Object} { newCards, dueCards, learningCards }
 */
export function getDeckReviewStats(deck) {
    if (!deck || !deck.cards) {
        return { newCards: 0, dueCards: 0, learningCards: 0 };
    }

    const now = new Date();
    let newCards = 0;
    let dueCards = 0;
    let learningCards = 0;

    deck.cards.forEach(card => {
        if (!card.reviewData || !card.reviewData.nextReview) {
            newCards++;
        } else if (card.reviewData.isLearning) {
            // Learning/relearning cards
            learningCards++;
        } else {
            const nextReview = new Date(card.reviewData.nextReview);
            if (nextReview <= now) {
                dueCards++;
            }
            // Cards not yet due are "graduated" — not counted in any active category
        }
    });

    return { newCards, dueCards, learningCards };
}
