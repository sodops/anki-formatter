/**
 * View Manager Module
 * Handles multi-view navigation with tab-based interface
 */

import { store } from '../../core/store.js';
import { eventBus, EVENTS } from '../../core/events.js';
import { appLogger } from '../../core/logger.js';

// View definitions
export const VIEWS = {
    LIBRARY: 'library',
    STUDY: 'study',
    STATISTICS: 'statistics',
    SETTINGS: 'settings',
    DICTIONARY: 'dictionary'
};

// Current active view
let currentView = VIEWS.LIBRARY;

// View change listeners
const viewChangeListeners = [];

/**
 * Initialize view manager
 */
export function initViewManager() {
    // Set initial view from state or default
    currentView = store.getState().activeView || VIEWS.LIBRARY;
    
    // Setup keyboard shortcuts
    setupKeyboardShortcuts();
    
    // Render initial view
    switchView(currentView, false);
}

/**
 * Switch to a different view
 * @param {string} viewName - View to switch to
 * @param {boolean} persistView - Whether to save view to store (default true)
 */
export function switchView(viewName, persistView = true) {
    try {
        if (!Object.values(VIEWS).includes(viewName)) {
            appLogger.error('Invalid view:', viewName);
            return;
        }
        
        // Hide all views
        Object.values(VIEWS).forEach(view => {
            const viewEl = document.getElementById(`view-${view}`);
            if (viewEl) {
                viewEl.classList.add('hidden');
            }
        });
        
        // Show target view
        const targetView = document.getElementById(`view-${viewName}`);
        if (targetView) {
            targetView.classList.remove('hidden');
        }
        
        // Update tab states
        updateTabStates(viewName);
        
        // Update current view
        currentView = viewName;
        
        // Save to store if needed
        if (persistView) {
            store.dispatch('VIEW_SET', { view: viewName });
            eventBus.emit(EVENTS.VIEW_CHANGED, { view: viewName });
        }
        
        // Notify view-specific listeners (stats refresh, study init, etc.)
        notifyViewChange(viewName);
        
        appLogger.info(`Switched to view: ${viewName}`);
    } catch (error) {
        appLogger.error("Failed to switch view", error);
    }
}

/**
 * Update tab button states
 */
function updateTabStates(activeView) {
    document.querySelectorAll('.nav-tab').forEach(tab => {
        const tabView = tab.dataset.view;
        if (tabView === activeView) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
}

/**
 * Setup keyboard shortcuts for view switching
 */
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl+1,2,3,4 for view switching
        if (e.ctrlKey && !e.shiftKey && !e.altKey) {
            switch(e.key) {
                case '1':
                    e.preventDefault();
                    switchView(VIEWS.LIBRARY);
                    break;
                case '2':
                    e.preventDefault();
                    switchView(VIEWS.STUDY);
                    break;
                case '3':
                    e.preventDefault();
                    switchView(VIEWS.STATISTICS);
                    break;
                case '4':
                    e.preventDefault();
                    switchView(VIEWS.SETTINGS);
                    break;
                case '5':
                    e.preventDefault();
                    switchView(VIEWS.DICTIONARY);
                    break;
            }
        }
    });
}

/**
 * Get current view
 */
export function getCurrentView() {
    return currentView;
}

/**
 * Add view change listener
 * @param {Function} callback - Callback function (viewName) => {}
 */
export function onViewChange(callback) {
    viewChangeListeners.push(callback);
}

/**
 * Notify all listeners of view change
 */
function notifyViewChange(viewName) {
    viewChangeListeners.forEach(callback => {
        try {
            callback(viewName);
        } catch (error) {
            console.error('Error in view change listener:', error);
        }
    });
    
    // Special handling for settings view
    if (viewName === VIEWS.SETTINGS) {
        // Render theme options after a brief delay to ensure DOM is ready
        setTimeout(() => {
            if (window.renderThemeOptions) {
                window.renderThemeOptions();
            }
        }, 50);
    }
    
    // Special handling for statistics view
    if (viewName === VIEWS.STATISTICS) {
        setTimeout(() => {
            // Import dynamically or use global if available
            // Since we're in modules, we can't easily access other modules unless exported
            // But we made calculateAndRenderStats exportable, we need to import it or expose it
            // Let's assume main.js exposes it or we import it here.
            // Better approach: main.js should listen to view changes.
            if (window.refreshStats) {
                window.refreshStats();
            }
        }, 50);
    }
    
    // Special handling for study view
    // Only auto-init if navigated via tab, not via Study button
    // Study button calls startStudySession() directly which already switches view
    if (viewName === VIEWS.STUDY) {
        setTimeout(() => {
            if (window._studySessionStartedManually) {
                window._studySessionStartedManually = false;
                return; // Skip — session already started by Study button
            }
            if (window.initStudyView) {
                window.initStudyView();
            }
        }, 50);
    }
}

/**
 * Setup tab click handlers
 */
export function initTabNavigation() {
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const viewName = tab.dataset.view;
            switchView(viewName);
        });
    });
}
