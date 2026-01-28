// Supabase Edge Function: AI Worker
// This function handles AI moves for multiplayer Ludo and Chess games
// It runs server-side so games continue even when clients are backgrounded

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Ludo AI logic (simple random valid move selection)
function selectLudoAIMove(state: Record<string, unknown>, currentSeat: number, diceValue: number): number | null {
    const tokens = state.tokens as Array<{ id: number; color: string; position: number }> | undefined;
    if (!tokens) return null;

    const colors = ["blue", "red", "green", "yellow"];
    const playerColor = colors[currentSeat];
    const playerTokens = tokens.filter((t) => t.color === playerColor);

    // Find valid moves
    const validTokenIds: number[] = [];

    for (const token of playerTokens) {
        // Token in home base (position -1) - can only move out on a 6
        if (token.position === -1) {
            if (diceValue === 6) {
                validTokenIds.push(token.id);
            }
            continue;
        }

        // Token already finished
        if (token.position >= 57) continue;

        // Check if move would exceed finish line
        const newPos = token.position + diceValue;
        if (newPos <= 57) {
            validTokenIds.push(token.id);
        }
    }

    if (validTokenIds.length === 0) return null;

    // Simple AI: Pick a random valid token
    // Could be enhanced with strategy: prefer capturing, getting out of home, etc.
    return validTokenIds[Math.floor(Math.random() * validTokenIds.length)];
}

// Chess AI logic (using simple evaluation - placeholder for more advanced engine)
function selectChessAIMove(fen: string): { from: string; to: string; promotion?: string } | null {
    // This is a placeholder - in production you'd use a proper chess engine
    // For now, we'll return null to indicate AI moves should be handled differently
    // The actual implementation would use a chess.js-like library or external API
    console.log("Chess AI requested for FEN:", fen);
    return null; // Indicate no move available - client should handle
}

Deno.serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { matchId, gameType } = await req.json();

        if (!matchId) {
            throw new Error("matchId is required");
        }

        // Fetch current match state
        const { data: match, error: matchError } = await supabase
            .from("matches")
            .select("*")
            .eq("id", matchId)
            .single();

        if (matchError) throw matchError;
        if (!match) throw new Error("Match not found");
        if (match.status !== "active") {
            return new Response(
                JSON.stringify({ message: "Match is not active", processed: false }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Check if current player is AI
        const { data: players, error: playersError } = await supabase
            .from("match_players")
            .select("*")
            .eq("match_id", matchId)
            .order("seat_index");

        if (playersError) throw playersError;

        const state = match.state as Record<string, unknown>;
        const currentSeat = (state.currentPlayerIndex as number) ?? 0;
        const currentPlayer = players?.find((p: { seat_index: number }) => p.seat_index === currentSeat);

        if (!currentPlayer?.is_ai) {
            return new Response(
                JSON.stringify({ message: "Current player is not AI", processed: false }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        console.log(`[AI Worker] Processing AI turn for match ${matchId}, seat ${currentSeat}`);

        if (gameType === "ludo" || match.game_type === "ludo") {
            const diceValue = state.diceValue as number | null;

            // If no dice value, AI needs to roll first
            if (!diceValue) {
                const { data: rollResult, error: rollError } = await supabase.rpc("apply_ludo_roll", {
                    p_match_id: matchId,
                    p_client_version: match.version,
                });

                if (rollError) throw rollError;

                console.log(`[AI Worker] AI rolled: ${rollResult.diceValue}`);

                // Now process the move with the new dice value
                const newDiceValue = rollResult.diceValue as number;
                const tokenId = selectLudoAIMove(state, currentSeat, newDiceValue);

                if (tokenId !== null) {
                    // Wait a bit to make it feel natural
                    await new Promise((r) => setTimeout(r, 500));

                    const { error: moveError } = await supabase.rpc("apply_ludo_move", {
                        p_match_id: matchId,
                        p_client_version: rollResult.newVersion,
                        p_token_id: tokenId,
                    });

                    if (moveError) throw moveError;
                    console.log(`[AI Worker] AI moved token ${tokenId}`);
                } else {
                    // No valid moves, skip turn
                    const { error: skipError } = await supabase.rpc("skip_ludo_turn", {
                        p_match_id: matchId,
                        p_client_version: rollResult.newVersion,
                        p_reason: "no_valid_moves",
                    });

                    if (skipError) throw skipError;
                    console.log(`[AI Worker] AI skipped turn (no valid moves)`);
                }

                return new Response(
                    JSON.stringify({ message: "AI turn processed", processed: true }),
                    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            } else {
                // Dice already rolled, just move
                const tokenId = selectLudoAIMove(state, currentSeat, diceValue);

                if (tokenId !== null) {
                    const { error: moveError } = await supabase.rpc("apply_ludo_move", {
                        p_match_id: matchId,
                        p_client_version: match.version,
                        p_token_id: tokenId,
                    });

                    if (moveError) throw moveError;
                    console.log(`[AI Worker] AI moved token ${tokenId}`);
                } else {
                    const { error: skipError } = await supabase.rpc("skip_ludo_turn", {
                        p_match_id: matchId,
                        p_client_version: match.version,
                        p_reason: "no_valid_moves",
                    });

                    if (skipError) throw skipError;
                    console.log(`[AI Worker] AI skipped turn`);
                }

                return new Response(
                    JSON.stringify({ message: "AI move processed", processed: true }),
                    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }
        } else {
            // Chess AI (placeholder)
            const fen = state.fen as string | undefined;
            if (!fen) {
                throw new Error("No FEN found in chess match state");
            }

            const move = selectChessAIMove(fen);
            if (!move) {
                return new Response(
                    JSON.stringify({ message: "Chess AI not fully implemented yet", processed: false }),
                    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }
        }

        return new Response(
            JSON.stringify({ message: "Processed", processed: true }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (error) {
        console.error("[AI Worker] Error:", error);
        return new Response(
            JSON.stringify({ error: (error as Error).message }),
            {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    }
});
