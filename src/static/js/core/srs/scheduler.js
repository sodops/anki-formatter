/**
 * SRS Scheduler Module
 * Implements SM-2 algorithm for spaced repetition
 */

/**
 * SM-2 Algorithm Implementation
 * @param {Object} card - Card with reviewData
 * @param {number} quality - Quality rating (0-5)
 *   0: Complete blackout
 *   1: Incorrect, but recognized
 *   2: Incorrect, seemed easy
 *   3: Correct, but difficult
 *   4: Correct, with hesitation
 *   5: Perfect recall
 * @returns {Object} Updated review data { interval, easeFactor, repetitions, nextReview, lastReview }
 */
export function calculateNextReview(card, quality) {
    // Get current review data or initialize defaults
    const reviewData = card.reviewData || {
        interval: 0,
        easeFactor: 2.5,
        repetitions: 0,
        nextReview: null,
        lastReview: null,
        reviewHistory: []
    };

    let { easeFactor, interval, repetitions } = reviewData;
    const now = new Date();

    // SM-2 Algorithm
    if (quality >= 3) {
        // Correct response
        if (repetitions === 0) {
            interval = 1; // 1 day
        } else if (repetitions === 1) {
            interval = 6; // 6 days
        } else {
            interval = Math.round(interval * easeFactor);
        }
        repetitions++;
    } else {
        // Incorrect response: reset
        repetitions = 0;
        interval = 1;
    }

    // Update ease factor
    // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    
    // Clamp ease factor to minimum of 1.3
    easeFactor = Math.max(1.3, easeFactor);

    // Calculate next review date
    const nextReview = new Date(now);
    nextReview.setDate(nextReview.getDate() + interval);

    // Add to review history
    const reviewHistory = reviewData.reviewHistory || [];
    reviewHistory.push({
        timestamp: now.toISOString(),
        quality,
        interval,
        easeFactor
    });

    return {
        interval,
        easeFactor,
        repetitions,
        nextReview: nextReview.toISOString(),
        lastReview: now.toISOString(),
        reviewHistory
    };
}

/**
 * Get cards that are due for review
 * @param {Object} deck - Deck object with cards array
 * @returns {Array} Cards that are due for review (or new cards)
 */
export function getDueCards(deck) {
    if (!deck || !deck.cards) return [];

    const now = new Date();
    
    return deck.cards.filter(card => {
        // If card has no reviewData or nextReview is null, it's a new card
        if (!card.reviewData || !card.reviewData.nextReview) {
            return true; // New cards are always due
        }

        // Check if next review date has passed
        const nextReview = new Date(card.reviewData.nextReview);
        return nextReview <= now;
    });
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
 * Used to show "Again (1d)" on buttons
 * @param {Object} card - Card with reviewData
 * @param {number} quality - Quality rating (0-5)
 * @returns {string} Human-readable interval (e.g., "1d", "6d", "15d")
 */
export function getIntervalPreview(card, quality) {
    const reviewData = card.reviewData || {
        interval: 0,
        easeFactor: 2.5,
        repetitions: 0
    };

    let { easeFactor, interval, repetitions } = reviewData;

    // Calculate what the interval would be
    let previewInterval;
    
    if (quality >= 3) {
        if (repetitions === 0) {
            previewInterval = 1;
        } else if (repetitions === 1) {
            previewInterval = 6;
        } else {
            previewInterval = Math.round(interval * easeFactor);
        }
    } else {
        previewInterval = 1;
    }

    // Format as human-readable
    if (previewInterval < 1) {
        return '10m'; // Less than a day
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

/**
 * Initialize review data for a new card
 * @returns {Object} Initial review data
 */
export function initializeReviewData() {
    return {
        interval: 0,
        easeFactor: 2.5,
        repetitions: 0,
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
        } else {
            const nextReview = new Date(card.reviewData.nextReview);
            if (nextReview <= now) {
                dueCards++;
            } else {
                learningCards++;
            }
        }
    });

    return { newCards, dueCards, learningCards };
}
