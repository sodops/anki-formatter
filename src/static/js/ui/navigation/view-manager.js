/**
 * View Manager Module
 * Handles multi-view navigation with tab-based interface
 */

import { STATE } from '../../core/storage/storage.js';

// View definitions
export const VIEWS = {
    LIBRARY: 'library',
    STUDY: 'study',
    STATISTICS: 'statistics',
    SETTINGS: 'settings'
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
    currentView = STATE.activeView || VIEWS.LIBRARY;
    
    // Setup keyboard shortcuts
    setupKeyboardShortcuts();
    
    // Render initial view
    switchView(currentView, false);
}

/**
 * Switch to a different view
 * @param {string} viewName - View to switch to
 * @param {boolean} saveState - Whether to save state (default true)
 */
export function switchView(viewName, saveState = true) {
    if (!Object.values(VIEWS).includes(viewName)) {
        console.error('Invalid view:', viewName);
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
    
    // Save to state
    if (saveState) {
        STATE.activeView = viewName;
        // Save state is handled by storage module
        const saveState = window.saveState || (() => {
            localStorage.setItem('ankiState', JSON.stringify(STATE));
        });
        saveState();
    }
    
    // Notify listeners
    notifyViewChange(viewName);
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
