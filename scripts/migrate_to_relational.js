const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // MUST use service role for admin access

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
    console.log('Starting migration...');

    // 1. Fetch all users with legacy data
    const { data: users, error } = await supabase
        .from('user_data')
        .select('user_id, state');

    if (error) {
        console.error('Error fetching users:', error);
        return;
    }

    console.log(`Found ${users.length} users to migrate.`);

    for (const user of users) {
        const userId = user.user_id;
        const state = user.state;

        if (!state || !state.decks) {
            console.log(`User ${userId} has no decks. Skipping.`);
            continue;
        }

        console.log(`Migrating user ${userId}... (${state.decks.length} decks)`);

        for (const deck of state.decks) {
            // Insert deck
            const { data: newDeck, error: deckError } = await supabase
                .from('decks')
                .insert({
                    user_id: userId,
                    name: deck.name,
                    created_at: deck.createdAt || new Date(),
                    is_deleted: deck.isDeleted || false,
                    settings: { color: deck.color }
                })
                .select()
                .single();

            if (deckError) {
                console.error(`Error migrating deck ${deck.name}:`, deckError);
                continue;
            }

            // Insert cards
            if (deck.cards && deck.cards.length > 0) {
                const cardsToInsert = deck.cards.map(card => ({
                    deck_id: newDeck.id,
                    user_id: userId,
                    term: card.term,
                    definition: card.def,
                    tags: card.tags,
                    review_data: card.reviewData,
                    is_suspended: card.suspended || false,
                    is_deleted: false,
                    created_at: card.createdAt || new Date()
                }));

                const { error: cardsError } = await supabase
                    .from('cards')
                    .insert(cardsToInsert);

                if (cardsError) {
                    console.error(`Error migrating cards for deck ${deck.name}:`, cardsError);
                } else {
                    console.log(`  -> Migrated ${cardsToInsert.length} cards for deck "${deck.name}"`);
                }
            }
        }
        console.log(`User ${userId} migration complete.`);
    }

    console.log('Migration finished!');
}

migrate();
