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
        this._syncDelay = 2000; // 2 second debounce
        this._isSyncing = false;
        this._isLoadingCloud = false;
        this._authUser = null;
        this._accessToken = null;

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
        // 1. Schedule cloud sync (debounced 2s) — this is the REAL save
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
     * Debounced cloud sync — waits 2s after last change before syncing
     */
    _scheduleSyncToCloud() {
        if (!this._authUser) return; // Not logged in, skip cloud sync

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
            // Gather all data to sync
            const userSuffix = this._authUser.id ? `_${this._authUser.id}` : '';
            const settings = JSON.parse(localStorage.getItem(`ankiflow_settings${userSuffix}`) || '{}');
            const daily = JSON.parse(localStorage.getItem(`ankiflow_daily${userSuffix}`) || '{}');

            // Strip undo history from state to reduce payload size
            const stateToSync = { ...this.state };
            delete stateToSync.history;

            const res = await fetch('/api/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    state: stateToSync,
                    settings: settings,
                    daily_progress: daily,
                }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || `HTTP ${res.status}`);
            }

            console.log('[STORE] Cloud sync OK');
            this._updateSyncUI('synced');
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
            const res = await fetch('/api/sync');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const data = await res.json();
            const userSuffix = this._authUser.id ? `_${this._authUser.id}` : '';

            if (data.state && data.state.decks && data.state.decks.length > 0) {
                console.log('[STORE] ☁️ Cloud loaded (%d decks)', data.state.decks.length);
                this.state = { ...DEFAULT_STATE, ...data.state };
                this._normalizeDecks();
            } else {
                console.log('[STORE] ☁️ Cloud is empty — starting fresh');
                this.state = { ...DEFAULT_STATE };
            }

            // Update local cache to match cloud
            if (data.settings && Object.keys(data.settings).length > 0) {
                localStorage.setItem(`ankiflow_settings${userSuffix}`, JSON.stringify(data.settings));
            } else {
                localStorage.removeItem(`ankiflow_settings${userSuffix}`);
            }
            if (data.daily_progress && Object.keys(data.daily_progress).length > 0) {
                localStorage.setItem(`ankiflow_daily${userSuffix}`, JSON.stringify(data.daily_progress));
            } else {
                localStorage.removeItem(`ankiflow_daily${userSuffix}`);
            }

            // Write state to local cache
            const key = this._getStateKey();
            localStorage.setItem(key, JSON.stringify(this.state));

            this._cloudLoaded = true;
            this._updateSyncUI('synced');
            this._notifyListeners();
            this._triggerUIRefresh();

            // Check if this device was revoked by another device
            this._checkDeviceRevocation(data.settings);
        } catch (error) {
            console.error('[STORE] ☁️ Cloud load failed, using cache:', error.message);
            // On network error, local cache (already loaded) remains active
            // User can still work — changes will sync when connection restores
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

        return newDeck;
    }

    _handleUpdateDeck(payload) {
        const { deckId, updates } = payload;
        const deck = this.getDeckById(deckId);
        if (!deck) throw new Error('Deck not found');

        const updated = { ...deck, ...updates };
        const newDecks = this.state.decks.map(d => d.id === deckId ? updated : d);

        this.setState({ decks: newDecks });
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

        const newDecks = this.state.decks.map(d => {
            if (d.id === deckId) {
                const newCards = [...d.cards];
                newCards[cardIndex] = { ...newCards[cardIndex], ...updates };
                return { ...d, cards: newCards };
            }
            return d;
        });

        this.setState({ decks: newDecks });
        return true;
    }

    _handleDeleteCard(payload) {
        const { deckId } = payload;
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

        const newDecks = this.state.decks.map(d => {
            if (d.id === deckId) {
                const newCards = [...d.cards];
                newCards.splice(cardIndex, 1);
                return { ...d, cards: newCards };
            }
            return d;
        });

        this.setState({ decks: newDecks });
        return true;
    }

    _handleBulkDeleteCards(payload) {
        const { deckId, indices } = payload;
        const deck = this.getDeckById(deckId);
        if (!deck) throw new Error('Deck not found');

        // Sort indices in reverse to delete from end first
        const sorted = [...indices].sort((a, b) => b - a);

        const newDecks = this.state.decks.map(d => {
            if (d.id === deckId) {
                const newCards = [...d.cards];
                sorted.forEach(idx => {
                    if (idx >= 0 && idx < newCards.length) {
                        newCards.splice(idx, 1);
                    }
                });
                return { ...d, cards: newCards };
            }
            return d;
        });

        this.setState({ decks: newDecks });
        return true;
    }

    _handleTagCard(payload) {
        const { deckId, cardId, cardIndex, tag, tags } = payload;
        
        // Support both single tag addition and full tags array replacement
        const deck = this.getDeckById(deckId);
        if (!deck) throw new Error('Deck not found');
        
        // Resolve card index from cardId if needed
        let resolvedIndex = cardIndex;
        if (resolvedIndex === undefined && cardId) {
            resolvedIndex = deck.cards.findIndex(c => c.id === cardId);
        }
        if (resolvedIndex === undefined || resolvedIndex < 0) throw new Error('Card not found');
        
        const card = deck.cards[resolvedIndex];
        let newTags;
        
        if (Array.isArray(tags)) {
            newTags = tags;
        } else if (tag && typeof tag === 'string') {
            // Single tag addition — append if not duplicate
            const currentTags = Array.isArray(card.tags) ? card.tags : [];
            if (currentTags.includes(tag)) return true; // Already exists
            newTags = [...currentTags, tag];
        } else {
            throw new Error('Provide tags array or tag string');
        }

        return this._handleUpdateCard({
            deckId,
            cardIndex: resolvedIndex,
            updates: { tags: newTags }
        });
    }

    _handleTagRemove(payload) {
        const { deckId, cardId, tag } = payload;
        if (!tag || typeof tag !== 'string') throw new Error('Tag must be string');

        const deck = this.getDeckById(deckId);
        if (!deck) throw new Error('Deck not found');
        
        const cardIndex = deck.cards.findIndex(c => c.id === cardId);
        if (cardIndex === -1) throw new Error('Card not found');
        
        const card = deck.cards[cardIndex];
        const newTags = (card.tags || []).filter(t => t !== tag);
        
        return this._handleUpdateCard({
            deckId,
            cardIndex,
            updates: { tags: newTags }
        });
    }

    _handleMoveCard(payload) {
        const { fromDeckId, toDeckId, cardIndex, cardId } = payload;
        const fromDeck = this.getDeckById(fromDeckId);
        const toDeck = this.getDeckById(toDeckId);
        if (!fromDeck || !toDeck) throw new Error('Deck not found');

        let idx = cardIndex;
        if (idx === undefined && cardId) {
            idx = fromDeck.cards.findIndex(c => c.id === cardId);
        }
        if (idx === undefined || idx < 0) throw new Error('Card not found');

        const card = { ...fromDeck.cards[idx], id: this._generateId() };
        const newFromCards = [...fromDeck.cards];
        newFromCards.splice(idx, 1);

        const newDecks = this.state.decks.map(d => {
            if (d.id === fromDeckId) return { ...d, cards: newFromCards };
            if (d.id === toDeckId) return { ...d, cards: [card, ...d.cards] };
            return d;
        });
        this.setState({ decks: newDecks });
        return card;
    }

    _handleCopyCard(payload) {
        const { fromDeckId, toDeckId, cardIndex, cardId } = payload;
        const fromDeck = this.getDeckById(fromDeckId);
        const toDeck = this.getDeckById(toDeckId);
        if (!fromDeck || !toDeck) throw new Error('Deck not found');

        let idx = cardIndex;
        if (idx === undefined && cardId) {
            idx = fromDeck.cards.findIndex(c => c.id === cardId);
        }
        if (idx === undefined || idx < 0) throw new Error('Card not found');

        const card = { ...fromDeck.cards[idx], id: this._generateId(), reviewData: null };
        const newDecks = this.state.decks.map(d => {
            if (d.id === toDeckId) return { ...d, cards: [card, ...d.cards] };
            return d;
        });
        this.setState({ decks: newDecks });
        return card;
    }

    /**
     * Suspend/unsuspend a card (toggle)
     * Suspended cards are skipped during study
     */
    _handleSuspendCard(payload) {
        const { deckId, cardId, cardIndex, suspended } = payload;
        const deck = this.getDeckById(deckId);
        if (!deck) throw new Error('Deck not found');

        let idx = cardIndex;
        if (idx === undefined && cardId) {
            idx = deck.cards.findIndex(c => c.id === cardId);
        }
        if (idx === undefined || idx < 0) throw new Error('Card not found');

        const card = deck.cards[idx];
        const isSuspended = suspended !== undefined ? suspended : !card.suspended;

        return this._handleUpdateCard({
            deckId,
            cardIndex: idx,
            updates: { suspended: isSuspended }
        });
    }

    /**
     * Batch add cards (optimized: single state update)
     */
    _handleBatchAddCards(payload) {
        const { deckId, cards } = payload;
        const deck = this.getDeckById(deckId);
        if (!deck) throw new Error('Deck not found');

        const newCards = cards.map(c => ({
            id: this._generateId(),
            term: (c.term || '').trim(),
            def: (c.def || '').trim(),
            tags: Array.isArray(c.tags) ? c.tags : [],
            reviewData: null,
            suspended: false,
            createdAt: new Date().toISOString()
        }));

        const newDecks = this.state.decks.map(d => {
            if (d.id === deckId) {
                return { ...d, cards: [...newCards, ...d.cards] };
            }
            return d;
        });

        this.setState({ decks: newDecks });
        return newCards;
    }

    /**
     * Bulk tag cards (optimized: single state update)
     */
    _handleBulkTag(payload) {
        const { deckId, indices, tag } = payload;
        const deck = this.getDeckById(deckId);
        if (!deck) throw new Error('Deck not found');

        const tagTrimmed = (tag || '').trim();
        if (!tagTrimmed) throw new Error('Tag is required');

        const indexSet = new Set(indices);
        const newDecks = this.state.decks.map(d => {
            if (d.id === deckId) {
                const newCards = d.cards.map((card, idx) => {
                    if (!indexSet.has(idx)) return card;
                    const currentTags = Array.isArray(card.tags) ? card.tags : [];
                    if (currentTags.includes(tagTrimmed)) return card;
                    return { ...card, tags: [...currentTags, tagTrimmed] };
                });
                return { ...d, cards: newCards };
            }
            return d;
        });

        this.setState({ decks: newDecks });
        return true;
    }

    // ===== OTHER ACTIONS =====

    _handleSetSearch(payload) {
        const query = typeof payload === 'string' ? payload : (payload?.query ?? '');
        this.setState({ searchQuery: query }, true); // skip history
        return true;
    }

    _handleSetView(payload) {
        const { view } = payload;
        const validViews = ['library', 'study', 'statistics', 'settings'];
        if (!validViews.includes(view)) {
            throw new Error('Invalid view: ' + view);
        }
        this.setState({ activeView: view }, true); // skip history
        return true;
    }

    _handleSetTheme(payload) {
        const theme = typeof payload === 'string' ? payload : payload?.theme;
        const validThemes = ['light', 'dark', 'auto'];
        if (!validThemes.includes(theme)) {
            throw new Error('Invalid theme: ' + theme);
        }
        this.setState({ theme }, true); // skip history
        return true;
    }

    // ===== UTILITY =====

    _generateId() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 12);
    }

    /**
     * Clear all data (for debugging)
     */
    clear() {
        this.state = { ...DEFAULT_STATE };
        this.history = [];
        this.historyIndex = -1;
        this.persist();
        this._notifyListeners();
    }

    // ===== DEVICE MANAGEMENT =====

    /**
     * Get or create a unique device ID for this browser
     */
    getDeviceId() {
        let deviceId = localStorage.getItem('ankiflow_device_id');
        if (!deviceId) {
            deviceId = 'dev_' + crypto.randomUUID();
            localStorage.setItem('ankiflow_device_id', deviceId);
        }
        return deviceId;
    }

    /**
     * Detect current device info from User-Agent
     */
    getDeviceInfo() {
        const ua = navigator.userAgent;
        let browser = 'Unknown';
        let os = 'Unknown';
        let deviceType = 'desktop';

        // Detect browser
        if (ua.includes('Firefox/')) browser = 'Firefox';
        else if (ua.includes('Edg/')) browser = 'Edge';
        else if (ua.includes('OPR/') || ua.includes('Opera/')) browser = 'Opera';
        else if (ua.includes('Chrome/') && !ua.includes('Edg/')) browser = 'Chrome';
        else if (ua.includes('Safari/') && !ua.includes('Chrome/')) browser = 'Safari';

        // Detect OS
        if (ua.includes('Windows')) os = 'Windows';
        else if (ua.includes('Mac OS X') || ua.includes('Macintosh')) os = 'macOS';
        else if (ua.includes('Linux') && !ua.includes('Android')) os = 'Linux';
        else if (ua.includes('Android')) os = 'Android';
        else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
        else if (ua.includes('CrOS')) os = 'ChromeOS';

        // Detect device type
        if (/Mobi|Android|iPhone|iPod/.test(ua)) deviceType = 'phone';
        else if (/iPad|Tablet/.test(ua)) deviceType = 'tablet';

        return { browser, os, deviceType };
    }

    /**
     * Register this device in cloud settings
     * Called after successful cloud sync
     */
    async registerDevice() {
        if (!this._authUser) return;

        const deviceId = this.getDeviceId();
        const { browser, os, deviceType } = this.getDeviceInfo();
        const key = this.getScopedKey('ankiflow_settings');
        const settings = JSON.parse(localStorage.getItem(key) || '{}');

        const devices = settings.devices || {};
        devices[deviceId] = {
            browser,
            os,
            deviceType,
            lastActive: new Date().toISOString(),
            userAgent: navigator.userAgent.substring(0, 120)
        };

        // Remove self from revoked list if present
        if (settings.revokedDevices) {
            settings.revokedDevices = settings.revokedDevices.filter(id => id !== deviceId);
        }

        settings.devices = devices;
        localStorage.setItem(key, JSON.stringify(settings));

        // This will be synced to cloud on next persist cycle
        this._scheduleSyncToCloud();
    }

    /**
     * Remove a device from the devices list and mark it as revoked
     */
    removeDevice(deviceIdToRemove) {
        if (!this._authUser) return;

        const key = this.getScopedKey('ankiflow_settings');
        const settings = JSON.parse(localStorage.getItem(key) || '{}');
        const devices = settings.devices || {};

        delete devices[deviceIdToRemove];

        // Add to revoked list so the device knows to logout on next cloud load
        const revoked = settings.revokedDevices || [];
        if (!revoked.includes(deviceIdToRemove)) {
            revoked.push(deviceIdToRemove);
        }

        settings.devices = devices;
        settings.revokedDevices = revoked;
        localStorage.setItem(key, JSON.stringify(settings));
        this._scheduleSyncToCloud();
    }

    /**
     * Check if this device has been revoked by another device.
     * If so, auto-logout.
     */
    _checkDeviceRevocation(cloudSettings) {
        if (!cloudSettings) return;

        const myDeviceId = this.getDeviceId();
        const revoked = cloudSettings.revokedDevices || [];

        if (revoked.includes(myDeviceId)) {
            console.log('[STORE] 🚫 This device was revoked! Logging out...');

            // Clean up local data
            this._clearLocalCache();
            localStorage.removeItem('ankiflow_device_id');

            // Sign out via React AuthProvider
            if (window.__ankiflow_signOut) {
                window.__ankiflow_signOut();
            } else {
                window.location.href = '/login';
            }
            return;
        }

        // Also check: if devices list exists and this device is NOT in it
        // (someone removed it but revoked list was cleared)
        const devices = cloudSettings.devices || {};
        const deviceIds = Object.keys(devices);
        if (deviceIds.length > 0 && !devices[myDeviceId]) {
            console.log('[STORE] 🚫 This device not in devices list! Logging out...');
            this._clearLocalCache();
            localStorage.removeItem('ankiflow_device_id');
            if (window.__ankiflow_signOut) {
                window.__ankiflow_signOut();
            } else {
                window.location.href = '/login';
            }
        }
    }

    /**
     * Get all registered devices
     */
    getDevices() {
        const key = this.getScopedKey('ankiflow_settings');
        const settings = JSON.parse(localStorage.getItem(key) || '{}');
        return settings.devices || {};
    }
}

// Export singleton instance
export const store = new Store();
