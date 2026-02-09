/**
 * SRS Scheduler Module
 * Implements SM-2 algorithm for spaced repetition
 * Enhanced with learning steps for vocabulary memorization
 */

/**
 * Get user settings from localStorage
 * @returns {Object} Settings with defaults
 */
function getSettings() {
    try {
        const saved = JSON.parse(localStorage.getItem('ankiflow_settings') || '{}');
        return {
            intervalMod: (saved.intervalMod || 100) / 100, // Convert % to multiplier
            learningSteps: parseLearningSteps(saved.learningSteps || '1, 10'),
            newCards: saved.newCards || 20,
            maxReviews: saved.maxReviews || 100
        };
    } catch {
        return { intervalMod: 1, learningSteps: [1, 10], newCards: 20, maxReviews: 100 };
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
 * SM-2 Algorithm Implementation with Learning Steps
 * 
 * Card states:
 * - NEW: Never reviewed (reviewData is null or step === undefined)
 * - LEARNING: In learning phase (step < learningSteps.length)
 * - REVIEW: Graduated to review queue (step >= learningSteps.length)
 * - RELEARNING: Failed a review, back in learning (relearning = true)
 * 
 * @param {Object} card - Card with reviewData
 * @param {number} quality - Quality rating (0-5)
 *   0: Complete blackout (Again)
 *   2: Incorrect/hard
 *   3: Correct, but difficult (Good)
 *   5: Perfect recall (Easy)
 * @returns {Object} Updated review data
 */
export function calculateNextReview(card, quality) {
    const settings = getSettings();
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
    const settings = getSettings();
    const learningSteps = settings.learningSteps;
    const intervalMod = settings.intervalMod;
    
    const reviewData = card.reviewData || {
        interval: 0,
        easeFactor: 2.5,
        repetitions: 0,
        step: 0,
        isLearning: true
    };

    let { easeFactor, interval, repetitions } = reviewData;
    let step = reviewData.step !== undefined ? reviewData.step : 0;
    let isLearning = reviewData.isLearning !== undefined ? reviewData.isLearning : true;

    let previewInterval; // In days
    let previewMinutes = 0; // In minutes (for learning phase)

    if (isLearning) {
        if (quality === 0) {
            // Again: back to first step
            previewMinutes = learningSteps[0] || 1;
        } else if (quality >= 3) {
            const nextStep = step + 1;
            if (nextStep >= learningSteps.length) {
                // Would graduate
                previewInterval = quality === 5 ? 4 : 1;
            } else {
                previewMinutes = learningSteps[nextStep] || 10;
            }
        } else {
            // Hard: half current step
            previewMinutes = Math.max(1, Math.round((learningSteps[step] || 1) * 0.5));
        }
    } else {
        // Review phase
        if (quality >= 3) {
            if (repetitions === 0) {
                previewInterval = 1;
            } else if (repetitions === 1) {
                previewInterval = 6;
            } else {
                previewInterval = Math.round(interval * easeFactor * intervalMod);
            }
            if (quality === 5) previewInterval = Math.round(previewInterval * 1.3);
        } else if (quality === 0) {
            // Again: relearning, first step
            previewMinutes = learningSteps[0] || 1;
        } else {
            // Hard
            previewMinutes = Math.max(1, Math.round((learningSteps[0] || 1) * 0.5));
        }
    }

    // Format output
    if (previewMinutes > 0) {
        if (previewMinutes < 60) {
            return `${previewMinutes}m`;
        } else {
            const hours = Math.round(previewMinutes / 60);
            return `${hours}h`;
        }
    }
    
    if (previewInterval !== undefined) {
        if (previewInterval < 1) {
            return '10m';
        } else if (previewInterval === 1) {
            return '1d';
        } else if (previewInterval < 30) {
            return `${previewInterval}d`;
        } else if (previewInterval < 365) {
            const months = Math.round(previewInterval / 30);
            return `${months}mo`;
        } else {
            const years = Math.round(previewInterval / 365);
            return `${years}y`;
        }
    }

    return '1m';
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
