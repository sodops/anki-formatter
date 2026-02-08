/**
 * Test Store & Event Bus
 * Run in browser console to verify new architecture
 */

// Test script for browser console
const testNewArchitecture = () => {
    console.log('=== Testing New State Management ===');
    
    try {
        // Import after module loads
        import('./core/store.js').then(({ store }) => {
            console.log('✅ Store loaded');
            console.log('Initial state:', store.getState());
            
            // Test deck creation
            const deck = store.dispatch('DECK_CREATE', {
                name: 'Test Deck',
                color: '#FF6B6B'
            });
            console.log('✅ Deck created:', deck);
            
            // Test state change listener
            const unsubscribe = store.subscribe((state) => {
                console.log('📡 State changed:', state.decks.length, 'decks');
            });
            
            // Test card add
            store.setActiveDeck(deck.id);
            const cardResult = store.dispatch('CARD_ADD', {
                term: 'Hello',
                def: 'World'
            });
            console.log('✅ Card result:', cardResult);
            
            // Test undo
            const undoResult = store.dispatch('UNDO');
            console.log('✅ Undo result:', undoResult);
            
            // Test redo
            const redoResult = store.dispatch('REDO');
            console.log('✅ Redo result:', redoResult);
            
            unsubscribe();
            console.log('✅ All tests passed!');
        }).catch(err => {
            console.error('❌ Error loading store:', err);
        });
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
};

// Run test
testNewArchitecture();
