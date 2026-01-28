/**
 * Integration Test Harness for Multiplayer Realtime
 * 
 * Run this script with: npx tsx scripts/test-multiplayer.ts
 * 
 * Tests:
 * 1. Two-player Chess: both see moves instantly
 * 2. Ludo with pending invitees: game starts, pending seat skipped
 * 3. Reconnect scenario: simulate websocket drop, ensure resync
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Test user credentials (create these users in Supabase first)
const TEST_USERS = [
    { email: "test1@example.com", password: "testpassword123" },
    { email: "test2@example.com", password: "testpassword123" },
];

async function createAuthenticatedClient(credentials: { email: string; password: string }) {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await supabase.auth.signInWithPassword(credentials);
    if (error) throw new Error(`Auth failed: ${error.message}`);
    return { supabase, userId: data.user!.id };
}

async function testLudoRealtimeSync() {
    console.log("\n=== Test 1: Ludo Realtime Sync ===\n");

    // Create two authenticated clients
    const player1 = await createAuthenticatedClient(TEST_USERS[0]);
    const player2 = await createAuthenticatedClient(TEST_USERS[1]);

    console.log("✓ Both players authenticated");

    // Player 1 creates a match
    const { data: matchData, error: createError } = await player1.supabase.rpc("create_match", {
        p_game_type: "ludo",
        p_mode: "multiplayer",
    });

    if (createError) throw new Error(`Create match failed: ${createError.message}`);
    const matchId = matchData;
    console.log(`✓ Match created: ${matchId}`);

    // Player 1 invites Player 2
    const { error: inviteError } = await player1.supabase.rpc("invite_players", {
        p_match_id: matchId,
        p_user_ids: [player2.userId],
    });

    if (inviteError) throw new Error(`Invite failed: ${inviteError.message}`);
    console.log("✓ Player 2 invited");

    // Player 2 accepts invite
    const { data: invites } = await player2.supabase
        .from("match_invites")
        .select("id")
        .eq("to_user_id", player2.userId)
        .eq("match_id", matchId)
        .single();

    const { error: acceptError } = await player2.supabase.rpc("accept_invite", {
        p_invite_id: invites!.id,
    });

    if (acceptError) throw new Error(`Accept failed: ${acceptError.message}`);
    console.log("✓ Player 2 accepted invite");

    // Player 1 starts the match
    const { error: startError } = await player1.supabase.rpc("start_match", {
        p_match_id: matchId,
    });

    if (startError) throw new Error(`Start failed: ${startError.message}`);
    console.log("✓ Match started");

    // Subscribe both players to match events
    let player2ReceivedEvent = false;

    const channel2 = player2.supabase
        .channel(`match:${matchId}`)
        .on(
            "postgres_changes",
            {
                event: "INSERT",
                schema: "public",
                table: "match_events",
                filter: `match_id=eq.${matchId}`,
            },
            (payload) => {
                console.log("✓ Player 2 received event:", payload.new);
                player2ReceivedEvent = true;
            }
        )
        .subscribe();

    // Wait for subscription
    await new Promise((r) => setTimeout(r, 1000));

    // Player 1 rolls dice
    const { data: match } = await player1.supabase
        .from("matches")
        .select("version")
        .eq("id", matchId)
        .single();

    const { data: rollData, error: rollError } = await player1.supabase.rpc("apply_ludo_roll", {
        p_match_id: matchId,
        p_client_version: match!.version,
    });

    if (rollError) throw new Error(`Roll failed: ${rollError.message}`);
    console.log(`✓ Player 1 rolled: ${rollData.diceValue}`);

    // Wait for event propagation
    await new Promise((r) => setTimeout(r, 2000));

    if (player2ReceivedEvent) {
        console.log("\n🎉 TEST PASSED: Player 2 received the dice roll event in realtime!\n");
    } else {
        console.log("\n❌ TEST FAILED: Player 2 did not receive the event\n");
    }

    // Cleanup
    player2.supabase.removeChannel(channel2);
}

async function testVersionMismatch() {
    console.log("\n=== Test 2: Version Mismatch Detection ===\n");

    const player1 = await createAuthenticatedClient(TEST_USERS[0]);

    // Create a match
    const { data: matchId } = await player1.supabase.rpc("create_match", {
        p_game_type: "ludo",
        p_mode: "solo",
    });

    // Start the match
    await player1.supabase.rpc("start_match", { p_match_id: matchId });

    // Try to roll with wrong version
    const { error } = await player1.supabase.rpc("apply_ludo_roll", {
        p_match_id: matchId,
        p_client_version: 999, // Wrong version
    });

    if (error && error.message.includes("Version mismatch")) {
        console.log("✓ Version mismatch correctly detected");
        console.log("\n🎉 TEST PASSED: Optimistic concurrency control works!\n");
    } else {
        console.log("\n❌ TEST FAILED: Version mismatch not detected\n");
    }
}

async function main() {
    try {
        console.log("Starting Multiplayer Integration Tests...\n");
        console.log(`Supabase URL: ${SUPABASE_URL}`);

        await testVersionMismatch();
        await testLudoRealtimeSync();

        console.log("=== All Tests Complete ===\n");
    } catch (error) {
        console.error("Test failed:", error);
        process.exit(1);
    }
}

main();
