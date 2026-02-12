const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Missing Env Variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Mock User ID (must exist in auth.users, or we insert a fake one if allowed, 
// but for verification we should likely use an existing user or mock the auth context if possible.
// Since we are running as service role, we can bypass RLS, but the API endpoint checks auth.
// Wait, the API endpoint checks auth using `supabase.auth.getUser()`. 
// We cannot easily mock that from a Node script calling the API via fetch unless we have a valid JWT.
// 
// ALTERNATIVE: This script will verify the DATABASE STATE directly after we perform manual actions,
// OR we can try to simulate the logic of the API route locally.
//
// Let's verify the API logic by importing it? No, it's Next.js.
//
// BEST APPROACH: We will use this script to cleans/reset state for a test user, 
// then we print instructions for the user to perform manual tests, 
// then run this script again to VERIFY the DB state.

async function verifyState() {
    console.log('--- System Verification ---');
    
    // 1. Check Decks
    const { data: decks, error: decksError } = await supabase
        .from('decks')
        .select('*');
        
    if (decksError) {
        console.error('FAIL: Fetch decks', decksError);
    } else {
        console.log(`PASS: Fetched ${decks.length} decks`);
        // Verify UUIDs
        const invalidIds = decks.filter(d => !isUuid(d.id));
        if (invalidIds.length > 0) {
            console.error('FAIL: Invalid UUIDs found in decks!', invalidIds.map(d => d.id));
        } else {
            console.log('PASS: All deck IDs are valid UUIDs');
        }
        
        // Verify Mapping (snake_case columns exist)
        if (decks.length > 0) {
            const sample = decks[0];
            if (sample.user_id && sample.created_at && sample.is_deleted !== undefined) {
                console.log('PASS: Deck schema columns verify (user_id, created_at, is_deleted)');
            } else {
                console.error('FAIL: Deck schema missing expected columns', sample);
            }
        }
    }

    // 2. Check Cards
    const { data: cards, error: cardsError } = await supabase
        .from('cards')
        .select('*');

    if (cardsError) {
        console.error('FAIL: Fetch cards', cardsError);
    } else {
        console.log(`PASS: Fetched ${cards.length} cards`);
        const invalidIds = cards.filter(c => !isUuid(c.id));
        if (invalidIds.length > 0) {
            console.error('FAIL: Invalid UUIDs found in cards!', invalidIds.map(c => c.id));
        } else {
            console.log('PASS: All card IDs are valid UUIDs');
        }
    }
    
    // 3. Check Logs
    const { data: logs, error: logsError } = await supabase
        .from('system_logs')
        .select('*')
        .limit(5);
        
    if (logsError) {
        console.error('FAIL: Fetch logs', logsError);
    } else {
        console.log(`PASS: Fetched ${logs.length} system logs`);
        if (logs.length > 0) {
            console.log('Last Log:', logs[0].message, logs[0].level);
        }
    }
}

function isUuid(str) {
    const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return regex.test(str);
}

verifyState();
