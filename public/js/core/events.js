/**
 * Event Bus / Event Emitter
 * Decoupled communication system between modules
 */

class EventBus {
    constructor() {
        this.events = {};
    }

    /**
     * Subscribe to event
     * @param {string} eventName 
     * @param {Function} callback 
     * @returns {Function} Unsubscribe function
     */
    on(eventName, callback) {
        if (!this.events[eventName]) {
            this.events[eventName] = [];
        }

        this.events[eventName].push(callback);

        // Return unsubscribe function
        return () => {
            this.events[eventName] = this.events[eventName].filter(cb => cb !== callback);
        };
    }

    /**
     * Subscribe once
     */
    once(eventName, callback) {
        const unsubscribe = this.on(eventName, (...args) => {
            callback(...args);
            unsubscribe();
        });
        return unsubscribe;
    }

    /**
     * Emit event
     * @param {string} eventName 
     * @param  {...any} args 
     */
    emit(eventName, ...args) {
        if (!this.events[eventName]) return;

        this.events[eventName].forEach(callback => {
            try {
                callback(...args);
            } catch (error) {
                console.error(`Event ${eventName} callback error:`, error);
            }
        });
    }

    /**
     * Remove event listener
     */
    off(eventName, callback) {
        if (!this.events[eventName]) return;
        this.events[eventName] = this.events[eventName].filter(cb => cb !== callback);
    }

    /**
     * Remove all listeners for event
     */
    clear(eventName) {
        if (eventName) {
            delete this.events[eventName];
        } else {
            this.events = {};
        }
    }
}

// Export singleton instance
export const eventBus = new EventBus();

/**
 * Event types
 */
export const EVENTS = {
    // Deck events
    DECK_CREATED: 'deck:created',
    DECK_UPDATED: 'deck:updated',
    DECK_DELETED: 'deck:deleted',
    DECK_RESTORED: 'deck:restored',
    DECK_SELECTED: 'deck:selected',

    // Card events
    CARD_ADDED: 'card:added',
    CARD_UPDATED: 'card:updated',
    CARD_DELETED: 'card:deleted',
    CARD_BULK_DELETED: 'card:bulk-deleted',
    CARD_BULK_TAGGED: 'card:bulk-tagged',

    // Study events
    STUDY_SESSION_STARTED: 'study:session-started',
    STUDY_SESSION_ENDED: 'study:session-ended',
    STUDY_CARD_RATED: 'study:card-rated',

    // UI events
    VIEW_CHANGED: 'view:changed',
    SEARCH_UPDATED: 'search:updated',
    TOAST_SHOWN: 'toast:shown',
    ERROR_OCCURRED: 'error:occurred'
};
