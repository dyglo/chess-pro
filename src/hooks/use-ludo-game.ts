"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
    LudoState,
    PlayerColor,
    createInitialState,
    getValidMoves,
    moveToken,
} from "@/lib/ludo/ludo-state";
import { getBestMove } from "@/lib/ludo/ludo-ai";

interface UseLudoGameOptions {
    userId?: string;
    userProfile?: {
        full_name?: string;
        username?: string;
        avatar_url?: string;
        country?: string;
    } | null;
    onGameEnd?: (winner: number) => void;
    existingSessionId?: string | null; // For joining multiplayer matches from friend requests
    isMultiplayer?: boolean;
}

interface LudoPlayer {
    id: string;
    name: string;
    color: PlayerColor;
    isAi: boolean;
    userId?: string;
    avatarUrl?: string;
    country?: string;
}

export function useLudoGame(options: UseLudoGameOptions) {
    const { userId, userProfile, onGameEnd, existingSessionId, isMultiplayer } = options;
    const supabase = createClient();

    // Create initial state
    const createGameState = useCallback((): LudoState => {
        const playerName = userProfile?.full_name || userProfile?.username || "Player 1";
        return createInitialState([playerName, "AI 1", "AI 2", "AI 3"]);
    }, [userProfile]);

    const [state, setState] = useState<LudoState>(() => createGameState());
    const [sessionId, setSessionId] = useState<string | null>(existingSessionId || null);
    const [isRolling, setIsRolling] = useState(false);
    const [validMoveTokenIds, setValidMoveTokenIds] = useState<number[]>([]);
    const [logs, setLogs] = useState<string[]>(["Welcome to LudoPro."]);
    const [isLoading, setIsLoading] = useState(!!existingSessionId);

    const aiTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const addLog = useCallback((msg: string) => {
        setLogs((prev) => [msg, ...prev].slice(0, 50));
    }, []);

    // Fetch existing session data
    const fetchSession = useCallback(async () => {
        if (!sessionId) return;
        setIsLoading(true);
        try {
            // Fetch session
            const { data: sessionData, error: sessionError } = await supabase
                .from("ludo_sessions")
                .select("*")
                .eq("id", sessionId)
                .single();

            if (sessionError) throw sessionError;

            // Fetch players
            const { data: playersData, error: playersError } = await supabase
                .from("ludo_players")
                .select("*")
                .eq("session_id", sessionId)
                .order("player_index", { ascending: true });

            if (playersError) throw playersError;

            // Fetch profiles for players with user_ids
            const userIds = playersData
                .map((p: { user_id: string }) => p.user_id)
                .filter((id: string) => id);

            let profilesMap: Record<string, { id: string; full_name?: string; username?: string; avatar_url?: string; country?: string }> = {};
            if (userIds.length > 0) {
                const { data: profiles, error: profilesError } = await supabase
                    .from("profiles")
                    .select("id, full_name, username, avatar_url, country")
                    .in("id", userIds);

                if (!profilesError && profiles) {
                    profilesMap = profiles.reduce((acc, profile) => {
                        acc[profile.id] = profile;
                        return acc;
                    }, {} as Record<string, typeof profiles[0]>);
                }
            }

            // Fetch tokens
            const { data: tokensData, error: tokensError } = await supabase
                .from("ludo_tokens")
                .select("*")
                .eq("session_id", sessionId);

            if (tokensError) throw tokensError;

            // Reconstruct state
            const newState = createGameState();

            // Update players
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            playersData.forEach((p: any) => {
                const profile = p.user_id ? profilesMap[p.user_id] : null;
                const displayName = profile
                    ? (profile.full_name || profile.username || "Player")
                    : (p.name || (p.user_id ? "Player" : `AI ${p.player_index}`));

                newState.players[p.player_index] = {
                    id: p.user_id || `p${p.player_index}`,
                    name: displayName,
                    color: ["blue", "red", "green", "yellow"][p.player_index] as PlayerColor,
                    isAi: p.is_ai,
                    avatarUrl: profile?.avatar_url,
                    country: profile?.country,
                };
            });

            // Update tokens
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            tokensData.forEach((t: any) => {
                // Find local token that matches player/index
                const localTokenIndex = newState.tokens.findIndex(
                    lt => lt.playerIndex === t.player_index && (lt.id % 4) === t.token_index
                );
                if (localTokenIndex !== -1) {
                    newState.tokens[localTokenIndex].position = t.position;
                }
            });

            newState.currentPlayerIndex = sessionData.current_player_index;
            newState.gameStatus = sessionData.status;
            newState.winner = sessionData.winner_index;
            newState.diceValue = sessionData.dice_value;

            // Calculate valid moves if dice was already rolled
            if (newState.diceValue !== null) {
                const moves = getValidMoves(newState, newState.diceValue);
                setValidMoveTokenIds(moves);
            }

            setState(newState);
            addLog("Joined multiplayer session.");

        } catch (err) {
            console.error("Error fetching session:", err);
            addLog("Error joining session.");
        } finally {
            setIsLoading(false);
        }
    }, [sessionId, supabase, createGameState, addLog]);

    // Initial fetch if joining
    useEffect(() => {
        if (existingSessionId && !state.players[0].id.startsWith("p")) {
            // Only fetch if we haven't already set up the user (optimization/safeguard)
            // simplified: just run once on mount if ID exists
        }
        if (existingSessionId) {
            fetchSession();
        }
    }, [existingSessionId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Create session in Supabase (Fixed: removed color column)
    const createSession = useCallback(async () => {
        if (!userId || sessionId) return null; // Don't create if already exists

        try {
            const { data: session, error } = await supabase
                .from("ludo_sessions")
                .insert({
                    status: "playing",
                    current_player_index: 0,
                })
                .select()
                .single();

            if (error) throw error;

            // Create players
            const players = state.players.map((p, idx) => ({
                session_id: session.id,
                user_id: idx === 0 ? userId : null,
                player_index: idx,
                is_ai: p.isAi,
                name: p.name
            }));

            await supabase.from("ludo_players").insert(players);

            // Create tokens
            const tokens = state.tokens.map((t) => ({
                session_id: session.id,
                player_index: t.playerIndex,
                token_index: t.id % 4,
                position: t.position,
            }));

            await supabase.from("ludo_tokens").insert(tokens);

            setSessionId(session.id);
            return session.id;
        } catch (error) {
            console.error("Error creating session:", error);
            return null;
        }
    }, [userId, sessionId, state.players, state.tokens, supabase]);

    // Real-time synchronization
    useEffect(() => {
        if (!sessionId) return;

        const channel = supabase.channel(`ludo_session_${sessionId}`)
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "ludo_moves", filter: `session_id=eq.${sessionId}` },
                async (payload) => {
                    // When a move happens, we can verify hydration, but simpler is to just apply the move locally
                    // Or re-fetch. Ideally we treat ludo_moves as the event log.
                    // For simplicity: refresh state on any move to ensure sync
                    if (payload.eventType === "INSERT") {
                        // We could optimize by applying the move locally if we trusted it,
                        // but ensuring strict sync with DB is safer for now.
                        // Actually, let's just re-fetch to be safe and simple.
                        await fetchSession();
                    }
                }
            )
            .on(
                "postgres_changes",
                { event: "UPDATE", schema: "public", table: "ludo_sessions", filter: `id=eq.${sessionId}` },
                (payload) => {
                    setState(prev => ({
                        ...prev,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        currentPlayerIndex: (payload.new as any).current_player_index,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        diceValue: (payload.new as any).dice_value,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        winner: (payload.new as any).winner_index
                    }));
                }
            )
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "ludo_players", filter: `session_id=eq.${sessionId}` },
                () => fetchSession() // Reload players if someone joins
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [sessionId, supabase, fetchSession]);


    // Persist move/roll to Supabase
    const persistMove = useCallback(
        async (
            playerIndex: number,
            tokenIndex: number,
            diceValue: number,
            fromPos: number,
            toPos: number
        ) => {
            if (!sessionId) return;

            try {
                await supabase.from("ludo_moves").insert({
                    session_id: sessionId,
                    player_index: playerIndex,
                    token_index: tokenIndex,
                    dice_value: diceValue,
                    from_position: fromPos,
                    to_position: toPos,
                });

                // Update token positions
                await supabase
                    .from("ludo_tokens")
                    .update({ position: toPos })
                    .eq("session_id", sessionId)
                    .eq("player_index", playerIndex)
                    .eq("token_index", tokenIndex);

                // Update session (next player is handled by who invoked this, usually implicit in local state update)
                // But we should update turn in DB
                // Wait, local state update happens first. We need to push the NEW current player index
                // We need to calculate it or grab it from the updated state.
                // Actually, let's rely on the calling function to update session state if needed.
                // But handleTokenMove updates local state.

            } catch (error) {
                console.error("Error persisting move:", error);
            }
        },
        [sessionId, supabase]
    );

    const updateSessionState = useCallback(async (updates: { currentPlayerIndex?: number, diceValue?: number | null, winner?: number | null }) => {
        if (!sessionId) return;
        try {
            const dbUpdates: Record<string, unknown> = {};
            if (updates.currentPlayerIndex !== undefined) dbUpdates.current_player_index = updates.currentPlayerIndex;
            if (updates.diceValue !== undefined) dbUpdates.dice_value = updates.diceValue;
            if (updates.winner !== undefined) dbUpdates.winner_index = updates.winner;

            const { error } = await supabase
                .from("ludo_sessions")
                .update(dbUpdates)
                .eq("id", sessionId);

            if (error) {
                console.error("[LudoDebug] FAILED to update session state:", error);
            } else {
                console.log("[LudoDebug] Successfully updated session state. Updates:", updates);
            }
        } catch (err) {
            console.error("Failed to update session state:", err);
        }
    }, [sessionId, supabase]);


    // Handle dice roll
    const handleRoll = useCallback(() => {
        // Multiplayer check: Is it my turn?
        if (isMultiplayer && sessionId) {
            const currentPlayer = state.players[state.currentPlayerIndex];
            console.log(`[LudoDebug] Turn Check: Me(${userId}) vs Current(${currentPlayer.id}) [${currentPlayer.name}]`);

            // If I am strictly one user, I should only be able to move my own color
            if (currentPlayer.id !== userId && !currentPlayer.isAi) {
                console.log(`[LudoDebug] Blocked: Not my turn.`);
                // addLog("Not your turn!"); // Removing toast to reduce noise, console is enough
                return;
            }
        }

        if (isRolling || state.diceValue !== null || state.gameStatus === "finished") return;

        setIsRolling(true);
        setTimeout(() => {
            const val = Math.floor(Math.random() * 6) + 1;
            setIsRolling(false);

            const validMoves = getValidMoves(state, val);

            setState((prev) => {
                const next = { ...prev, diceValue: val };
                // Sync dice value to DB
                updateSessionState({ diceValue: val });
                return next;
            });

            addLog(`${state.players[state.currentPlayerIndex].name} rolled a ${val}`);

            if (validMoves.length === 0) {
                addLog("No valid moves. Skipping turn.");
                setTimeout(() => {
                    setState((prev) => {
                        const nextIndex = (prev.currentPlayerIndex + 1) % 4;
                        updateSessionState({ currentPlayerIndex: nextIndex, diceValue: null });
                        return {
                            ...prev,
                            currentPlayerIndex: nextIndex,
                            diceValue: null,
                        };
                    });
                }, 1000);
            } else {
                setValidMoveTokenIds(validMoves);
            }
        }, 600);
    }, [isRolling, state, addLog, isMultiplayer, sessionId, userId, updateSessionState]);

    // Handle token move
    const handleTokenMove = useCallback(
        (tokenId: number) => {
            // Multiplayer check
            if (isMultiplayer && sessionId) {
                const currentPlayer = state.players[state.currentPlayerIndex];
                if (currentPlayer.id !== userId && !currentPlayer.isAi) {
                    return;
                }
            }

            if (state.diceValue === null) return;

            const token = state.tokens.find((t) => t.id === tokenId);
            if (!token) return;

            const fromPos = token.position;
            const nextState = moveToken(state, tokenId, state.diceValue);
            const movedToken = nextState.tokens.find((t) => t.id === tokenId);
            const toPos = movedToken?.position ?? fromPos;
            const prevTokenMap = new Map(state.tokens.map((t) => [t.id, t]));
            const knockedCount = nextState.tokens.filter((t) => {
                const prev = prevTokenMap.get(t.id);
                return prev
                    && prev.playerIndex !== token.playerIndex
                    && prev.position >= 0
                    && t.position === -1;
            }).length;

            setState(nextState);
            setValidMoveTokenIds([]);
            addLog(`Moved token.`);
            if (knockedCount > 0) {
                addLog(`Captured ${knockedCount} token${knockedCount === 1 ? "" : "s"}.`);
            }

            // Persist to Supabase
            persistMove(
                token.playerIndex,
                tokenId % 4,
                state.diceValue,
                fromPos,
                toPos
            );

            // Sync session turn/winner
            updateSessionState({
                currentPlayerIndex: nextState.currentPlayerIndex,
                diceValue: null,
                winner: nextState.winner
            });

            if (nextState.winner !== null) {
                addLog(`GAME OVER! ${state.players[nextState.winner].name} WON!`);
                onGameEnd?.(nextState.winner);
            }
        },
        [state, addLog, persistMove, onGameEnd, isMultiplayer, sessionId, userId, updateSessionState]
    );

    // AI Turn Logic - Only run AI if I am the host (Player 0) OR if it's single player
    useEffect(() => {
        if (state.gameStatus !== "playing" || state.winner !== null) return;

        const currentPlayer = state.players[state.currentPlayerIndex];

        // Multiplayer AI rule: Only the "host" (User 1 / PlayerIndex 0) runs AI logic to avoid conflicting moves
        // If it's single player (no session), we run it.
        // If it's multiplayer, we only run if we are player 0.
        // Wait, if we join a pvp game, player 0 is the host.
        // What if player 0 is offline? Then game stuck.
        // Ideally AI is server side, but here client-side.
        // Ideally AI is server side, but here client-side.
        // Let's say Player 0 (Blue) is responsible for AI turns.
        // Let's say Player 0 (Blue) is responsible for AI turns.
        // Check if I am Player 0 (either by explicit ID match or by 'p0' fallback if unhydrated)
        const isHost = !isMultiplayer || (userId && (state.players[0].id === userId || state.players[0].id === 'p0'));

        // Console debug for AI logic
        if (currentPlayer.isAi) {
            console.log(`[LudoDebug] AI Turn: Index ${state.currentPlayerIndex}. IsHost? ${isHost} (Me: ${userId}, P0: ${state.players[0].id})`);
        }

        if (currentPlayer.isAi && isHost) {
            if (state.diceValue === null && !isRolling) {
                aiTimeoutRef.current = setTimeout(handleRoll, 1500);
                return () => {
                    if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
                };
            } else if (state.diceValue !== null && validMoveTokenIds.length > 0) {
                aiTimeoutRef.current = setTimeout(() => {
                    const tokenId = getBestMove(state, state.diceValue!);
                    if (tokenId !== null) handleTokenMove(tokenId);
                }, 1500);
                return () => {
                    if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
                };
            }
        }
    }, [state, isRolling, validMoveTokenIds, handleRoll, handleTokenMove, isMultiplayer, userId]);

    // Create session when game starts (Single player only)
    useEffect(() => {
        if (userId && !sessionId && !existingSessionId && state.gameStatus === "playing" && !isMultiplayer) {
            createSession();
        }
    }, [userId, sessionId, state.gameStatus, createSession, existingSessionId, isMultiplayer]);

    // New game
    const newGame = useCallback(() => {
        if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
        setSessionId(null);
        setState(createGameState());
        setValidMoveTokenIds([]);
        setLogs(["Welcome to LudoPro.", "New game started!"]);
    }, [createGameState]);

    // Get players with extended info
    const getPlayers = useCallback((): LudoPlayer[] => {
        return state.players.map((p) => ({
            ...p,
            userId: p.id.startsWith("p") ? undefined : p.id,
            // If it's us, use our profile. If opponent, we hopefully fetched their name.
            // Simplified:
            avatarUrl: undefined, // TODO: Fetch opponent avatars
            country: undefined,
        }));
    }, [state.players]);

    return {
        state,
        isRolling,
        validMoveTokenIds,
        logs,
        isLoading,
        sessionId,
        handleRoll,
        handleTokenMove,
        newGame,
        getPlayers,
        addLog,
        isCurrentPlayerAi: state.players[state.currentPlayerIndex]?.isAi ?? false,
    };
}
