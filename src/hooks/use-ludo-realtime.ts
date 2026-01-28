"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeMatchState, MatchEvent } from "./use-realtime-match-state";
import {
    LudoState,
    Token,
    PlayerColor,
    PLAYER_COLORS,
    getValidMoves,
} from "@/lib/ludo/ludo-state";

interface UseLudoRealtimeOptions {
    matchId: string;
    userId?: string;
    userProfile?: {
        full_name?: string;
        username?: string;
        avatar_url?: string;
        country?: string;
    } | null;
    onGameEnd?: (winner: number) => void;
}

interface LudoPlayer {
    id: string;
    name: string;
    color: PlayerColor;
    isAi: boolean;
    seatIndex: number;
    status: string;
    userId?: string;
    avatarUrl?: string;
    country?: string;
}

/**
 * Ludo hook for multiplayer games using server-authoritative state via RPCs.
 * No AI players in multiplayer - only human players.
 */
export function useLudoRealtime(options: UseLudoRealtimeOptions) {
    const { matchId, userId, userProfile, onGameEnd } = options;
    const supabase = createClient();

    const [isRolling, setIsRolling] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [logs, setLogs] = useState<string[]>(["Joined multiplayer game."]);
    const [localError, setLocalError] = useState<string | null>(null);

    const prevWinnerRef = useRef<number | null>(null);

    // Use the unified realtime state hook
    const {
        match,
        players,
        myPlayer,
        isMyTurn,
        isLoading,
        isConnected,
        error: realtimeError,
        version,
        refresh,
    } = useRealtimeMatchState({
        matchId,
        userId,
        onEvent: (event) => handleEvent(event),
        onReconnect: () => addLog("Reconnected. State synced."),
    });

    const addLog = useCallback((msg: string) => {
        setLogs((prev) => [msg, ...prev].slice(0, 50));
    }, []);

    // Convert match state to LudoState for compatibility with existing components
    const gameState = useMemo((): LudoState => {
        if (!match?.state) {
            return {
                players: [],
                tokens: [],
                currentPlayerIndex: 0,
                diceValue: null,
                gameStatus: "waiting",
                winner: null,
            };
        }

        const state = match.state as {
            tokens?: Array<{ id: number; playerIndex: number; position: number; color: string }>;
            currentPlayerIndex?: number;
            diceValue?: number | null;
            winner?: number | null;
        };

        // Build tokens from state
        const tokens: Token[] = (state.tokens ?? []).map((t) => ({
            id: t.id,
            playerIndex: t.playerIndex,
            position: t.position,
            color: t.color as PlayerColor,
        }));

        // Build players from match_players
        const ludoPlayers = players.map((p) => ({
            id: p.user_id || `ai-${p.seat_index}`,
            name: p.is_ai
                ? `AI ${p.seat_index + 1}`
                : (p.display_name || p.username || userProfile?.full_name || userProfile?.username || `Player ${p.seat_index + 1}`),
            color: (p.color || PLAYER_COLORS[p.seat_index]) as PlayerColor,
            isAi: p.is_ai,
        }));

        return {
            players: ludoPlayers,
            tokens,
            currentPlayerIndex: state.currentPlayerIndex ?? 0,
            diceValue: state.diceValue ?? null,
            gameStatus: match.status === "active" ? "playing" : match.status === "completed" ? "finished" : "waiting",
            winner: state.winner ?? null,
        };
    }, [match, players, userProfile]);

    // Get valid move token IDs
    const validMoveTokenIds = useMemo(() => {
        if (!isMyTurn || gameState.diceValue === null || isSubmitting) {
            return [];
        }
        return getValidMoves(gameState, gameState.diceValue);
    }, [gameState, isMyTurn, isSubmitting]);

    // Handle incoming events for logging
    const handleEvent = useCallback((event: MatchEvent) => {
        switch (event.event_type) {
            case "ludo_roll":
                const rollSeat = event.payload.seatIndex as number;
                const diceVal = event.payload.diceValue as number;
                const playerName = players[rollSeat]?.is_ai
                    ? `AI ${rollSeat + 1}`
                    : (rollSeat === myPlayer?.seat_index ? "You" : `Player ${rollSeat + 1}`);
                addLog(`${playerName} rolled a ${diceVal}`);
                break;

            case "ludo_move":
                if (event.payload.winner !== null) {
                    const winnerSeat = event.payload.winner as number;
                    const winnerName = players[winnerSeat]?.is_ai
                        ? `AI ${winnerSeat + 1}`
                        : `Player ${winnerSeat + 1}`;
                    addLog(`🎉 ${winnerName} WON!`);
                }
                break;

            case "turn_skip":
            case "TURN_SKIPPED": {
                const rawSeat = (event.payload.seatIndex ?? event.payload.seat) as number;
                const skipSeat = typeof rawSeat === "number" ? rawSeat : 0;
                addLog(`Player ${skipSeat + 1} skipped (${event.payload.reason})`);
                break;
            }
        }
    }, [players, myPlayer, addLog]);

    // Roll dice - now calls server RPC
    const handleRoll = useCallback(async () => {
        if (!match || !isMyTurn || isRolling || isSubmitting) return;
        if (gameState.diceValue !== null) return;
        if (gameState.gameStatus !== "playing") return;

        setIsRolling(true);
        setLocalError(null);

        try {
            const { data, error } = await supabase.rpc("apply_ludo_roll", {
                p_match_id: matchId,
                p_client_version: version,
            });

            if (error) {
                console.error("[LudoRealtime] Roll error:", error);
                setLocalError(error.message);

                // On version mismatch, refresh state
                if (error.message.includes("Version mismatch")) {
                    addLog("Out of sync. Refreshing...");
                    await refresh();
                }
            } else {
                console.log("[LudoRealtime] Roll success:", data);
            }
        } catch (err) {
            console.error("[LudoRealtime] Roll exception:", err);
            setLocalError((err as Error).message);
        } finally {
            setIsRolling(false);
        }
    }, [match, isMyTurn, isRolling, isSubmitting, gameState, matchId, version, supabase, refresh, addLog]);

    // Move token - now calls server RPC
    const handleTokenMove = useCallback(async (tokenId: number) => {
        if (!match || !isMyTurn || isSubmitting) return;
        if (gameState.diceValue === null) return;
        if (!validMoveTokenIds.includes(tokenId)) return;

        setIsSubmitting(true);
        setLocalError(null);

        try {
            const { data, error } = await supabase.rpc("apply_ludo_move", {
                p_match_id: matchId,
                p_client_version: version,
                p_token_id: tokenId,
            });

            if (error) {
                console.error("[LudoRealtime] Move error:", error);
                setLocalError(error.message);

                if (error.message.includes("Version mismatch")) {
                    addLog("Out of sync. Refreshing...");
                    await refresh();
                }
            } else {
                console.log("[LudoRealtime] Move success:", data);
                addLog("Moved token.");
            }
        } catch (err) {
            console.error("[LudoRealtime] Move exception:", err);
            setLocalError((err as Error).message);
        } finally {
            setIsSubmitting(false);
        }
    }, [match, isMyTurn, isSubmitting, gameState, validMoveTokenIds, matchId, version, supabase, refresh, addLog]);

    // Skip turn when no valid moves
    const handleSkipTurn = useCallback(async () => {
        if (!match || !isMyTurn || isSubmitting) return;

        setIsSubmitting(true);

        try {
            const { error } = await supabase.rpc("skip_ludo_turn", {
                p_match_id: matchId,
                p_client_version: version,
                p_reason: "no_moves",
            });

            if (error) {
                const message = (error as { message?: string }).message ?? "Unknown error";
                const code = (error as { code?: string }).code;
                console.error("[LudoRealtime] Skip error:", message, code);
                if (message.includes("Version mismatch")) {
                    await refresh();
                }
            }
        } catch (err) {
            console.error("[LudoRealtime] Skip exception:", err);
        } finally {
            setIsSubmitting(false);
        }
    }, [match, isMyTurn, isSubmitting, matchId, version, supabase, refresh]);

    // Auto-skip pending seats deterministically
    useEffect(() => {
        if (!match || match.status !== "active") return;
        if (!match.state) return;
        const currentSeat = (match.state as { currentPlayerIndex?: number }).currentPlayerIndex ?? 0;
        const currentPlayer = players.find((p) => p.seat_index === currentSeat);
        if (!currentPlayer || currentPlayer.status === "joined") return;

        supabase.rpc("advance_ludo_turn_if_needed", { p_match_id: matchId }).then(({ error }) => {
            if (error) {
                console.error("[LudoRealtime] Auto-skip error:", error.message, error.code);
            }
        });
    }, [match, players, matchId, supabase]);

    // Auto-skip when dice rolled but no valid moves
    useEffect(() => {
        if (!isMyTurn || gameState.diceValue === null) return;
        if (validMoveTokenIds.length > 0) return;
        if (isSubmitting) return;

        const timeout = setTimeout(() => {
            addLog("No valid moves. Skipping turn.");
            handleSkipTurn();
        }, 1000);

        return () => clearTimeout(timeout);
    }, [isMyTurn, gameState.diceValue, validMoveTokenIds.length, isSubmitting, handleSkipTurn, addLog]);

    // NOTE: AI turn logic removed - multiplayer is human players only

    // Watch for game end
    useEffect(() => {
        if (gameState.winner !== null && gameState.winner !== prevWinnerRef.current) {
            prevWinnerRef.current = gameState.winner;
            onGameEnd?.(gameState.winner);
        }
    }, [gameState.winner, onGameEnd]);

    // Get enhanced player info
    const getPlayers = useCallback((): LudoPlayer[] => {
        return players.map((p) => ({
            id: p.id,
            name: p.is_ai ? `AI ${p.seat_index + 1}` : (p.display_name || p.username || `Player ${p.seat_index + 1}`),
            color: (p.color || PLAYER_COLORS[p.seat_index]) as PlayerColor,
            isAi: p.is_ai,
            seatIndex: p.seat_index,
            status: p.status,
            userId: p.user_id || undefined,
            avatarUrl: p.avatar_url || undefined,
            country: p.country || undefined,
        }));
    }, [players]);

    return {
        state: gameState,
        isRolling,
        validMoveTokenIds,
        logs,
        isLoading,
        isConnected,
        sessionId: matchId,
        handleRoll,
        handleTokenMove,
        getPlayers,
        addLog,
        isCurrentPlayerAi: gameState.players[gameState.currentPlayerIndex]?.isAi ?? false,
        isMyTurn,
        error: localError || realtimeError,
        refresh,
        // Legacy compatibility
        newGame: () => { }, // Not applicable for multiplayer
    };
}
