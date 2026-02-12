/**
 * Centralized State Store
 * Single source of truth for application state
 * Redux-inspired pattern with validation
 * Cloud sync via /api/sync when authenticated
 */

// Default state structure
const DEFAULT_STATE = {
    decks: [],
    activeDeckId: null,
    searchQuery: '',
    activeView: 'library',
    showTrash: false,
    theme: 'dark',
    trash: [],
    history: []
};

// Store instance
class Store {
    constructor() {
        this.state = { ...DEFAULT_STATE };
        this.listeners = [];
        this.history = [];
        this.historyIndex = -1;
        this.maxHistory = 50;

        // Cloud sync state
        this._syncTimer = null;
        this._syncDelay = 1000; // Faster debounce for granular sync
        this._isSyncing = false;
        this._isLoadingCloud = false;
        this._authUser = null;
        this._accessToken = null;
        
        // Sync Queue for incremental updates
        this._syncQueue = []; 

        // Listen for auth events from React AuthProvider
        this._setupAuthListeners();
    }

    /**
     * Setup listeners for auth events from React layer.
     * Architecture: Cloud is the SINGLE SOURCE OF TRUTH.
     * localStorage is only a cache for instant rendering while cloud loads.
     */
    _setupAuthListeners() {
        this._cloudLoaded = false;

        // When auth is ready on page load
        window.addEventListener('ankiflow:auth-ready', (e) => {
            const detail = e.detail || {};
            this._authUser = detail.user || null;
            this._accessToken = detail.accessToken || null;
            if (this._authUser) {
                if (this._cloudLoaded || this._isLoadingCloud) {
                    console.log('[STORE] Auth ready, already loading/loaded — skipping');
                    return;
                }
                console.log('[STORE] Auth ready, user:', this._authUser.email);
                this._loadLocalCache(); // instant render from cache
                this._loadFromCloud();  // then override with cloud truth
            }
        });

        // When auth changes (login/logout)
        window.addEventListener('ankiflow:auth-change', (e) => {
            const detail = e.detail || {};
            const prevUser = this._authUser;
            this._authUser = detail.user || null;
            this._accessToken = detail.accessToken || null;

            if (this._authUser) {
                const userChanged = !prevUser || prevUser.id !== this._authUser.id;
                if (userChanged) {
                    console.log('[STORE] User changed, loading from cloud for:', this._authUser.email);
                    this._cloudLoaded = false;
                    this._syncQueue = []; // Clear queue on user switch
                    this._loadLocalCache();
                    this._loadFromCloud();
                } else if (!this._cloudLoaded) {
                    console.log('[STORE] Auth changed, loading from cloud');
                    this._loadFromCloud();
                } else {
                    console.log('[STORE] Auth changed, cloud already loaded — skipping');
                }
            } else {
                console.log('[STORE] User logged out');
                this.state = { ...DEFAULT_STATE };
                this._cloudLoaded = false;
                this._syncQueue = [];
                this._clearLocalCache();
                this._notifyListeners();
                this._triggerUIRefresh();
            }
        });

        // Check if auth was already set before store loaded
        if (window.__ankiflow_auth && window.__ankiflow_auth.user) {
            this._authUser = window.__ankiflow_auth.user;
            this._accessToken = window.__ankiflow_auth.accessToken || null;
            console.log('[STORE] Auth already available (pre-loaded), user:', this._authUser.email);
            this._loadLocalCache();
            this._loadFromCloud();
        }
    }

    /**
     * Get current state (read-only)
     */
    getState() {
        return this.state;
    }

    /**
     * Get specific deck by ID
     */
    getDeckById(deckId) {
        return this.state.decks.find(d => d.id === deckId);
    }

    /**
     * Get active deck
     */
    getActiveDeck() {
        if (!this.state.activeDeckId) return null;
        return this.getDeckById(this.state.activeDeckId);
    }

    /**
     * Set active deck
     */
    setActiveDeck(deckId) {
        if (deckId && !this.getDeckById(deckId)) {
            console.warn('Deck not found:', deckId);
            return false;
        }
        this.setState({ activeDeckId: deckId });
        return true;
    }

    /**
     * Dispatch action to update state
     * @param {string} action - Action type
     * @param {object} payload - Action payload
     */
    dispatch(action, payload = {}) {
        // Shallow snapshot for rollback — only deep-clone on error
        const snapshotDecks = this.state.decks;
        const snapshotState = { ...this.state };

        try {
            switch (action) {
                case 'DECK_CREATE':
                    return this._handleCreateDeck(payload);
                case 'DECK_UPDATE':
                    return this._handleUpdateDeck(payload);
                case 'DECK_DELETE':
                    return this._handleDeleteDeck(payload);
                case 'DECK_RESTORE':
                    return this._handleRestoreDeck(payload);
                case 'DECK_SELECT':
                    return this._handleSelectDeck(payload);
                case 'DECK_PURGE':
                    return this._handlePurgeDeck(payload);
                case 'CARD_ADD':
                    return this._handleAddCard(payload);
                case 'CARD_UPDATE':
                    return this._handleUpdateCard(payload);
                case 'CARD_DELETE':
                    return this._handleDeleteCard(payload);
                case 'CARD_BULK_DELETE':
                    return this._handleBulkDeleteCards(payload);
                case 'CARD_TAG':
                    return this._handleTagCard(payload);
                case 'CARD_TAG_REMOVE':
                    return this._handleTagRemove(payload);
                case 'CARD_MOVE':
                    return this._handleMoveCard(payload);
                case 'CARD_COPY':
                    return this._handleCopyCard(payload);
                case 'CARD_SUSPEND':
                    return this._handleSuspendCard(payload);
                case 'CARD_BATCH_ADD':
                    return this._handleBatchAddCards(payload);
                case 'CARD_BULK_TAG':
                    return this._handleBulkTag(payload);
                case 'SEARCH_SET':
                    return this._handleSetSearch(payload);
                case 'VIEW_SET':
                    return this._handleSetView(payload);
                case 'THEME_SET':
                    return this._handleSetTheme(payload);
                case 'UNDO':
                    return this._handleUndo();
                case 'REDO':
                    return this._handleRedo();
                default:
                    console.warn('Unknown action:', action);
                    return false;
            }
        } catch (error) {
            console.error(`[STORE] dispatch('${action}') FAILED:`, error.message, error.stack);
            // Rollback to snapshot
            this.state = snapshotState;
            this.state.decks = snapshotDecks;
            return false;
        }
    }

    /**
     * Update state and notify listeners
     * @param {Object} newState - Partial state to merge
     * @param {boolean} skipHistory - If true, don't add to undo history
     */
    setState(newState, skipHistory = false) {
        // Only deep-clone for undo history (skip for search/view/theme)
        if (!skipHistory) {
            const oldState = typeof structuredClone === 'function'
                ? structuredClone(this.state)
                : JSON.parse(JSON.stringify(this.state));
            this._addToHistory(oldState);
        }
        
        this.state = { ...this.state, ...newState };
        
        // Persist to localStorage
        this.persist();
        
        // Notify all listeners
        this._notifyListeners();
    }

    /**
     * Add listener for state changes
     */
    subscribe(listener) {
        this.listeners.push(listener);
        // Return unsubscribe function
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    /**
     * Notify all listeners of state change
     */
    _notifyListeners() {
        this.listeners.forEach(listener => {
            try {
                listener(this.state);
            } catch (error) {
                console.error('Listener error:', error);
            }
        });
    }

    /**
     * Get user-scoped localStorage key for any prefix
     * @param {string} prefix - Key prefix (e.g. 'ankiflow_settings')
     */
    getScopedKey(prefix) {
        if (this._authUser && this._authUser.id) {
            return `${prefix}_${this._authUser.id}`;
        }
        return prefix;
    }

    /**
     * Get user-scoped state key
     * @deprecated Use getScopedKey('ankiState')
     */
    _getStateKey() {
        return this.getScopedKey('ankiState');
    }

    /**
     * Load from localStorage cache for instant render while cloud loads.
     * This is NOT the source of truth — cloud will override this.
     */
    _loadLocalCache() {
        try {
            const key = this._getStateKey();
            const saved = localStorage.getItem(key);
            if (saved) {
                const parsed = JSON.parse(saved);
                this.state = { ...DEFAULT_STATE, ...parsed };
                this._normalizeDecks();
                console.log(`[STORE] Cache hit: ${key} (will be overridden by cloud)`);
            } else {
                this.state = { ...DEFAULT_STATE };
                console.log(`[STORE] No cache for ${key}, waiting for cloud`);
            }
        } catch (e) {
            console.error('[STORE] Cache load failed:', e);
            this.state = { ...DEFAULT_STATE };
        }
    }

    /**
     * Clear all localStorage cache for current user
     */
    _clearLocalCache() {
        try {
            const key = this._getStateKey();
            localStorage.removeItem(key);
            if (this._authUser && this._authUser.id) {
                const suffix = `_${this._authUser.id}`;
                localStorage.removeItem(`ankiflow_settings${suffix}`);
                localStorage.removeItem(`ankiflow_daily${suffix}`);
            }
            console.log('[STORE] Local cache cleared');
        } catch (e) {
            console.error('[STORE] Failed to clear cache:', e);
        }
    }

    /**
     * Persist state: sync to cloud (primary) + update localStorage cache.
     * Cloud is the source of truth. localStorage is expendable cache.
     */
    persist() {
        // 1. Schedule cloud sync (debounced) — this is the REAL save
        this._scheduleSyncToCloud();

        // 2. Update localStorage cache (best-effort, not critical)
        try {
            const key = this._getStateKey();
            localStorage.setItem(key, JSON.stringify(this.state));
        } catch (error) {
            // localStorage full or unavailable — not a problem, cloud has the data
            console.warn('[STORE] Cache write failed (non-critical):', error.name);
        }
    }

    /**
     * Queue a change to be synced
     */
    _queueChange(type, data, id = null) {
        if (!this._authUser) return;
        this._syncQueue.push({
            type,
            data,
            id: id || data.id,
            timestamp: Date.now()
        });
        this.persist(); // Will trigger scheduleSync
    }

    /**
     * Debounced cloud sync — waits after last change before syncing
     */
    _scheduleSyncToCloud() {
        if (!this._authUser) return; // Not logged in, skip cloud sync

        // Don't sync if queue is empty (unless it's settings update which we check later)
        // Actually, we can check queue length here.
        if (this._syncQueue.length === 0) {
            // Might be settings update?
            // For now, let's debounce anyway.
        }

        if (this._syncTimer) clearTimeout(this._syncTimer);

        // Update sync indicator to "syncing"
        this._updateSyncUI('syncing');

        this._syncTimer = setTimeout(() => {
            this._syncToCloud();
        }, this._syncDelay);
    }

    /**
     * Sync state + settings + daily_progress to cloud
     */
    async _syncToCloud() {
        if (!this._authUser || this._isSyncing) return;
        this._isSyncing = true;
        this._updateSyncUI('syncing');

        try {
            // Gather items to sync from queue
            const changesToSync = [...this._syncQueue];
            
            // Gather settings (always sync entire object for now, it's small)
            const userSuffix = this._authUser.id ? `_${this._authUser.id}` : '';
            const settings = JSON.parse(localStorage.getItem(`ankiflow_settings${userSuffix}`) || '{}');
            const daily = JSON.parse(localStorage.getItem(`ankiflow_daily${userSuffix}`) || '{}');

            if (changesToSync.length === 0 && Object.keys(settings).length === 0 && Object.keys(daily).length === 0) {
                this._isSyncing = false;
                this._updateSyncUI('synced');
                return;
            }

            const res = await fetch('/api/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    changes: changesToSync,
                    settings: settings,
                    daily_progress: daily,
                }),
            });

            if (!res.ok) {
                if (res.status === 401) {
                    console.warn('[STORE] Session expired during sync');
                    // Retry logic...
                    // For now, simplify to avoid complex retry in this snippet
                    throw new Error('Unauthorized');
                }
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || `HTTP ${res.status}`);
            }

            console.log(`[STORE] Cloud sync OK (${changesToSync.length} changes)`);
            this._updateSyncUI('synced');
            
            // Clear synced items from queue
            // We only remove the items we sent. If new items were added during fetch, keep them.
            this._syncQueue = this._syncQueue.slice(changesToSync.length);
            
        } catch (error) {
            console.error('[STORE] Cloud sync failed:', error.message);
            this._updateSyncUI('error');
        } finally {
            this._isSyncing = false;
        }
    }

    /**
     * Load state from cloud (SINGLE SOURCE OF TRUTH).
     * Cloud always wins. localStorage cache is updated to match.
     * If cloud is empty, state is empty. No fallback to local.
     */
    async _loadFromCloud() {
        if (!this._authUser) return;
        if (this._isLoadingCloud) return;
        this._isLoadingCloud = true;

        this._updateSyncUI('syncing');

        try {
            let res = await fetch('/api/sync');

            // On 401, retry once (middleware may have just refreshed the session cookie)
            if (res.status === 401) {
                console.warn('[STORE] ☁️ Got 401, retrying once...');
                await new Promise(r => setTimeout(r, 1000));
                res = await fetch('/api/sync');
            }

            if (res.status === 401) {
                console.warn('[STORE] ☁️ Session expired (401 after retry). Redirecting to login...');
                this._cloudLoaded = true;
                this._updateSyncUI('error');
                window.location.href = '/login';
                return;
            }
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const data = await res.json();
            const userSuffix = this._authUser.id ? `_${this._authUser.id}` : '';

            if (data.state && data.state.decks) {
                console.log('[STORE] ☁️ Cloud loaded (%d decks)', data.state.decks.length);
                this.state = { ...DEFAULT_STATE, ...data.state };
                this._normalizeDecks();
            } else {
                console.log('[STORE] ☁️ Cloud is empty or error');
                this.state = { ...DEFAULT_STATE };
            }

            // Update local cache to match cloud
            if (data.settings && Object.keys(data.settings).length > 0) {
                localStorage.setItem(`ankiflow_settings${userSuffix}`, JSON.stringify(data.settings));
            }
            if (data.daily_progress && Object.keys(data.daily_progress).length > 0) {
                localStorage.setItem(`ankiflow_daily${userSuffix}`, JSON.stringify(data.daily_progress));
            }

            // Write state to local cache
            const key = this._getStateKey();
            localStorage.setItem(key, JSON.stringify(this.state));

            this._cloudLoaded = true;
            this._updateSyncUI('synced');
            
            this._notifyListeners();
            this._triggerUIRefresh();
        } catch (error) {
            console.error('[STORE] ☁️ Cloud load failed, using cache:', error.message);
            // On network error, local cache (already loaded) remains active
            this._cloudLoaded = true;
            this._updateSyncUI('error');
        } finally {
            this._isLoadingCloud = false;
        }
    }

    /**
     * Normalize decks array (ensure IDs, cards arrays, etc.)
     */
    _normalizeDecks() {
        if (this.state.decks) {
            this.state.decks = this.state.decks.map(deck => ({
                ...deck,
                id: deck.id || this._generateId(),
                cards: Array.isArray(deck.cards) ? deck.cards.map(card => ({
                    ...card,
                    id: card.id || this._generateId(),
                    tags: Array.isArray(card.tags) ? card.tags : [],
                    reviewData: card.reviewData || null,
                    suspended: card.suspended || false
                })) : [],
                isDeleted: deck.isDeleted || false
            }));
        }
    }

    /**
     * Trigger UI refresh after cloud load
     */
    _triggerUIRefresh() {
        // Dispatch a custom event so main.js can re-render
        window.dispatchEvent(new CustomEvent('ankiflow:state-loaded'));
    }

    /**
     * Update sync indicator UI
     * @param {'syncing'|'synced'|'error'} status
     */
    _updateSyncUI(status) {
        const dot = document.getElementById('syncDot');
        const text = document.getElementById('syncText');
        if (!dot || !text) return;

        dot.className = 'sync-dot'; // reset
        switch (status) {
            case 'syncing':
                dot.classList.add('syncing');
                text.textContent = 'Syncing...';
                break;
            case 'synced':
                dot.classList.add('synced');
                text.textContent = 'Synced';
                break;
            case 'error':
                dot.classList.add('sync-error');
                text.textContent = 'Sync error';
                break;
        }
    }

    /**
     * Load state from localStorage cache.
     * Only used as initial cache read — cloud will override.
     */
    load() {
        try {
            const key = this._getStateKey();
            const saved = localStorage.getItem(key);
            if (saved) {
                const parsed = JSON.parse(saved);
                this.state = { ...DEFAULT_STATE, ...parsed };
                this._normalizeDecks();
                return true;
            }
        } catch (error) {
            console.error('[STORE] Cache load error:', error);
        }
        return false;
    }

    /**
     * Add to history for undo/redo
     */
    _addToHistory(prevState) {
        // Remove any redo states if new action is taken
        this.history = this.history.slice(0, this.historyIndex + 1);
        
        // Add new state
        this.history.push(prevState);
        this.historyIndex++;

        // Limit history size
        if (this.history.length > this.maxHistory) {
            this.history.shift();
            this.historyIndex--;
        }
    }

    /**
     * Undo last action
     */
    _handleUndo() {
        if (this.historyIndex >= 0 && this.history.length > 0) {
            this.state = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
            this.historyIndex--;
            this.persist();
            this._notifyListeners();
            return true;
        }
        return false;
    }

    /**
     * Redo last undone action
     */
    _handleRedo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.state = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
            this.persist();
            this._notifyListeners();
            return true;
        }
        return false;
    }

    // ===== DECK ACTIONS =====

    _handleCreateDeck(payload) {
        const { name, color } = payload;
        if (!name || typeof name !== 'string') {
            throw new Error('Invalid deck name');
        }

        const newDeck = {
            id: this._generateId(),
            name: name.trim(),
            color: color || '#6366F1',
            cards: [],
            createdAt: new Date().toISOString(),
            isDeleted: false
        };

        this.setState({
            decks: [...this.state.decks, newDeck]
        });
        
        this._queueChange('DECK_CREATE', newDeck);

        return newDeck;
    }

    _handleUpdateDeck(payload) {
        const { deckId, updates } = payload;
        const deck = this.getDeckById(deckId);
        if (!deck) throw new Error('Deck not found');

        const updated = { ...deck, ...updates };
        const newDecks = this.state.decks.map(d => d.id === deckId ? updated : d);

        this.setState({ decks: newDecks });
        
        this._queueChange('DECK_UPDATE', updated);
        
        return updated;
    }

    _handleDeleteDeck(payload) {
        const { deckId } = payload;
        const deck = this.getDeckById(deckId);
        if (!deck) throw new Error('Deck not found');

        // Move to trash instead of permanent delete
        const newDecks = this.state.decks.map(d =>
            d.id === deckId ? { ...d, isDeleted: true } : d
        );

        this.setState({
            decks: newDecks,
            activeDeckId: this.state.activeDeckId === deckId ? null : this.state.activeDeckId
        });
        
        this._queueChange('DECK_DELETE', {}, deckId);

        return true;
    }

    _handleRestoreDeck(payload) {
        const { deckId } = payload;
        const deck = this.getDeckById(deckId);
        if (!deck) throw new Error('Deck not found');

        const newDecks = this.state.decks.map(d =>
            d.id === deckId ? { ...d, isDeleted: false } : d
        );

        this.setState({ decks: newDecks });
        
        // Treat as update
        const restoredDeck = newDecks.find(d => d.id === deckId);
        this._queueChange('DECK_UPDATE', restoredDeck);

        return true;
    }

    _handleSelectDeck(payload) {
        const deckId = typeof payload === 'string' ? payload : payload?.deckId;
        if (deckId && !this.getDeckById(deckId)) {
            throw new Error('Deck not found');
        }
        this.setState({ activeDeckId: deckId || null });
        return true;
    }

    _handlePurgeDeck(payload) {
        const deckId = typeof payload === 'string' ? payload : payload?.deckId;
        const newDecks = this.state.decks.filter(d => d.id !== deckId);
        this.setState({ decks: newDecks });
        // Purge is rarely used, maybe we should just delete?
        // For queue, let's assume it's a delete.
        this._queueChange('DECK_DELETE', {}, deckId);
        return true;
    }

    // ===== CARD ACTIONS =====

    _handleAddCard(payload) {
        const { term, def = '', tags = [] } = payload;
        
        // Use deckId from payload if provided, otherwise fall back to active deck
        const deckId = payload.deckId;
        const deck = deckId ? this.getDeckById(deckId) : this.getActiveDeck();
        if (!deck) throw new Error('No active deck');

        if (!term && !def) throw new Error('At least term or definition is required');

        const newCard = {
            id: this._generateId(),
            term: (term || '').trim(),
            def: (def || '').trim(),
            tags: Array.isArray(tags) ? tags : [],
            reviewData: null,
            createdAt: new Date().toISOString()
        };

        const newDecks = this.state.decks.map(d => {
            if (d.id === deck.id) {
                return {
                    ...d,
                    cards: [newCard, ...d.cards]
                };
            }
            return d;
        });

        this.setState({ decks: newDecks });
        
        this._queueChange('CARD_CREATE', { ...newCard, deckId: deck.id });
        
        return newCard;
    }

    _handleUpdateCard(payload) {
        const { deckId, updates } = payload;
        let cardIndex = payload.cardIndex;
        const deck = this.getDeckById(deckId);
        if (!deck) throw new Error('Deck not found');

        // Support cardId lookup
        if (cardIndex === undefined && payload.cardId) {
            cardIndex = deck.cards.findIndex(c => c.id === payload.cardId);
        }
        if (cardIndex === undefined || cardIndex < 0 || cardIndex >= deck.cards.length) {
            throw new Error('Card not found');
        }

        let updatedCard;
        const newDecks = this.state.decks.map(d => {
            if (d.id === deckId) {
                const newCards = [...d.cards];
                updatedCard = { ...newCards[cardIndex], ...updates };
                newCards[cardIndex] = updatedCard;
                return { ...d, cards: newCards };
            }
            return d;
        });

        this.setState({ decks: newDecks });
        
        if (updatedCard) {
            this._queueChange('CARD_UPDATE', { ...updatedCard, deckId });
        }
        
        return true;
    }

    _handleDeleteCard(payload) {
        const { deckId } = payload;
        let cardIndex = payload.cardIndex;
        const deck = this.getDeckById(deckId);
        if (!deck) throw new Error('Deck not found');

        let cardIdToDelete;

        // Support cardId lookup
        if (cardIndex === undefined && payload.cardId) {
            cardIndex = deck.cards.findIndex(c => c.id === payload.cardId);
        }
        if (cardIndex === undefined || cardIndex < 0 || cardIndex >= deck.cards.length) {
            throw new Error('Card not found');
        }
        
        cardIdToDelete = deck.cards[cardIndex].id;

        const newDecks = this.state.decks.map(d => {
            if (d.id === deckId) {
                const newCards = [...d.cards];
                newCards.splice(cardIndex, 1);
                return { ...d, cards: newCards };
            }
            return d;
        });

        this.setState({ decks: newDecks });
        
        if (cardIdToDelete) {
             this._queueChange('CARD_DELETE', {}, cardIdToDelete);
        }
        
        return true;
    }

    _handleBulkDeleteCards(payload) {
        const { deckId, indices } = payload;
        const deck = this.getDeckById(deckId);
        if (!deck) throw new Error('Deck not found');

        // Sort indices in reverse to delete from end first
        const sorted = [...indices].sort((a, b) => b - a);
        
        const deletedCardIds = [];

        const newDecks = this.state.decks.map(d => {
            if (d.id === deckId) {
                const newCards = [...d.cards];
                sorted.forEach(idx => {
                    if (idx >= 0 && idx < newCards.length) {
                        deletedCardIds.push(newCards[idx].id);
                        newCards.splice(idx, 1);
                    }
                });
                return { ...d, cards: newCards };
            }
            return d;
        });

        this.setState({ decks: newDecks });
        
        deletedCardIds.forEach(id => {
             this._queueChange('CARD_DELETE', {}, id);
        });
        
        return true;
    }

    _handleTagCard(payload) {
        const { deckId, cardIndex, tag } = payload;
        
        const deck = this.getDeckById(deckId);
        if (!deck) throw new Error('Deck not found');
        const card = deck.cards[cardIndex];
        
        if (!card.tags.includes(tag)) {
            return this._handleUpdateCard({
                deckId,
                cardIndex,
                updates: { tags: [...card.tags, tag] }
            });
        }
        return true;
    }

    _handleTagRemove(payload) {
        const { deckId, cardIndex, tag } = payload;
        const deck = this.getDeckById(deckId);
        const card = deck.cards[cardIndex];
        
        return this._handleUpdateCard({
            deckId, 
            cardIndex,
            updates: { tags: card.tags.filter(t => t !== tag) }
        });
    }

    _handleMoveCard(payload) {
        const { sourceDeckId, targetDeckId, cardId } = payload;
        const sourceDeck = this.getDeckById(sourceDeckId);
        const targetDeck = this.getDeckById(targetDeckId);
        
        if (!sourceDeck || !targetDeck) throw new Error('Deck not found');
        
        const card = sourceDeck.cards.find(c => c.id === cardId);
        if (!card) throw new Error('Card not found');
        
        // Remove from source
        const newSourceCards = sourceDeck.cards.filter(c => c.id !== cardId);
        
        // Add to target
        const newTargetCards = [...targetDeck.cards, card];
        
        const newDecks = this.state.decks.map(d => {
            if (d.id === sourceDeckId) return { ...d, cards: newSourceCards };
            if (d.id === targetDeckId) return { ...d, cards: newTargetCards };
            return d;
        });
        
        this.setState({ decks: newDecks });
        
        // Move = Update (deckId change)
        this._queueChange('CARD_UPDATE', { ...card, deckId: targetDeckId });
        
        return true;
    }

    _handleCopyCard(payload) {
        const { sourceDeckId, targetDeckId, cardId } = payload;
        const sourceDeck = this.getDeckById(sourceDeckId);
        
        const card = sourceDeck.cards.find(c => c.id === cardId);
        if (!card) throw new Error('Card not found');
        
        return this._handleAddCard({
            deckId: targetDeckId,
            term: card.term,
            def: card.def,
            tags: card.tags
        });
    }

    _handleSuspendCard(payload) {
        const { deckId, cardId } = payload;
        const deck = this.getDeckById(deckId);
        const card = deck.cards.find(c => c.id === cardId);
        
        return this._handleUpdateCard({
            deckId,
            cardId,
            updates: { suspended: !card.suspended }
        });
    }

    _handleBatchAddCards(payload) {
        const { deckId, cards } = payload;
        const deck = this.getDeckById(deckId);
        if (!deck) throw new Error('Deck not found');
        
        const newCards = cards.map(c => ({
            id: this._generateId(),
            term: c.term,
            def: c.def,
            tags: c.tags || [],
            reviewData: null,
            createdAt: new Date().toISOString()
        }));
        
        const newDecks = this.state.decks.map(d => {
            if (d.id === deckId) {
                return { ...d, cards: [...newCards, ...d.cards] };
            }
            return d;
        });
        
        this.setState({ decks: newDecks });
        
        newCards.forEach(c => {
             this._queueChange('CARD_CREATE', { ...c, deckId });
        });
        
        return newCards.length;
    }

    _handleBulkTag(payload) {
        const { deckId, cardIds, tag, remove } = payload;
        const deck = this.getDeckById(deckId);
        
        cardIds.forEach(id => {
            const card = deck.cards.find(c => c.id === id);
            if (card) {
                const newTags = remove 
                    ? card.tags.filter(t => t !== tag)
                    : [...new Set([...card.tags, tag])];
                
                this._handleUpdateCard({
                    deckId,
                    cardId: id,
                    updates: { tags: newTags }
                });
            }
        });
        return true;
    }

    // ===== UI SETTINGS ACTIONS (Local only, syncs as 'settings' blob) =====
    // These generally don't use the queue, they use the legacy settings blob sync.
    // BUT since we modified _syncToCloud to send settings, it works fine.

    _handleSetSearch(payload) {
        this.setState({ searchQuery: payload }, true); // skip history
        return true;
    }

    _handleSetView(payload) {
        this.setState({ activeView: payload }, true);
        return true;
    }

    _handleSetTheme(payload) {
        this.setState({ theme: payload }, true);
        return true;
    }

    /**
     * Helper: Generate simple ID
     */
    _generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }
}

// Export singleton
const store = new Store();
export { store };
export default store;
