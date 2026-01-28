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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { userId, userProfile, onGameEnd, existingSessionId: _existingSessionId, isMultiplayer: _isMultiplayer } = options;
    const supabase = createClient();

    // TODO: Implement full multiplayer support using _existingSessionId and _isMultiplayer
    // These params are passed from friend request acceptance but full realtime sync
    // between players requires additional work similar to useRealtimeMatch for Chess


    // Create initial state with user as player 1
    const createGameState = useCallback((): LudoState => {
        const playerName = userProfile?.full_name || userProfile?.username || "Player 1";
        const state = createInitialState([playerName, "AI 1", "AI 2", "AI 3"]);

        // Update player 0 with user info
        if (userId) {
            state.players[0] = {
                ...state.players[0],
                id: userId,
                name: playerName,
                isAi: false,
            };
        }

        return state;
    }, [userId, userProfile]);

    const [state, setState] = useState<LudoState>(() => createGameState());
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [isRolling, setIsRolling] = useState(false);
    const [validMoveTokenIds, setValidMoveTokenIds] = useState<number[]>([]);
    const [logs, setLogs] = useState<string[]>(["Welcome to LudoPro.", "Game started!"]);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_isLoading, _setIsLoading] = useState(false);

    const aiTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const addLog = useCallback((msg: string) => {
        setLogs((prev) => [msg, ...prev].slice(0, 50));
    }, []);

    // Create session in Supabase
    const createSession = useCallback(async () => {
        if (!userId) return null;

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
                color: p.color,
                is_ai: p.isAi,
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
    }, [userId, state.players, state.tokens, supabase]);

    // Persist move to Supabase
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
            } catch (error) {
                console.error("Error persisting move:", error);
            }
        },
        [sessionId, supabase]
    );

    // Handle dice roll
    const handleRoll = useCallback(() => {
        if (isRolling || state.diceValue !== null || state.gameStatus === "finished") return;

        setIsRolling(true);
        setTimeout(() => {
            const val = Math.floor(Math.random() * 6) + 1;
            setIsRolling(false);

            const validMoves = getValidMoves(state, val);

            setState((prev) => ({ ...prev, diceValue: val }));
            addLog(`${state.players[state.currentPlayerIndex].name} rolled a ${val}`);

            if (validMoves.length === 0) {
                addLog("No valid moves. Skipping turn.");
                setTimeout(() => {
                    setState((prev) => ({
                        ...prev,
                        currentPlayerIndex: (prev.currentPlayerIndex + 1) % 4,
                        diceValue: null,
                    }));
                }, 1000);
            } else {
                setValidMoveTokenIds(validMoves);
            }
        }, 600);
    }, [isRolling, state, addLog]);

    // Handle token move
    const handleTokenMove = useCallback(
        (tokenId: number) => {
            if (state.diceValue === null) return;

            const token = state.tokens.find((t) => t.id === tokenId);
            if (!token) return;

            const fromPos = token.position;
            const nextState = moveToken(state, tokenId, state.diceValue);
            const movedToken = nextState.tokens.find((t) => t.id === tokenId);
            const toPos = movedToken?.position ?? fromPos;

            setState(nextState);
            setValidMoveTokenIds([]);
            addLog(`Moved token.`);

            // Persist to Supabase
            persistMove(
                token.playerIndex,
                tokenId % 4,
                state.diceValue,
                fromPos,
                toPos
            );

            if (nextState.winner !== null) {
                addLog(`GAME OVER! ${state.players[nextState.winner].name} WON!`);
                onGameEnd?.(nextState.winner);
            }
        },
        [state, addLog, persistMove, onGameEnd]
    );

    // AI Turn Logic
    useEffect(() => {
        if (state.gameStatus !== "playing" || state.winner !== null) return;

        const currentPlayer = state.players[state.currentPlayerIndex];
        if (currentPlayer.isAi) {
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
    }, [state, isRolling, validMoveTokenIds, handleRoll, handleTokenMove]);

    // Create session when game starts
    useEffect(() => {
        if (userId && !sessionId && state.gameStatus === "playing") {
            createSession();
        }
    }, [userId, sessionId, state.gameStatus, createSession]);

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
        return state.players.map((p, idx) => ({
            ...p,
            userId: idx === 0 ? userId : undefined,
            avatarUrl: idx === 0 ? userProfile?.avatar_url : undefined,
            country: idx === 0 ? userProfile?.country : undefined,
        }));
    }, [state.players, userId, userProfile]);

    return {
        state,
        isRolling,
        validMoveTokenIds,
        logs,
        isLoading: _isLoading,
        sessionId,
        handleRoll,
        handleTokenMove,
        newGame,
        getPlayers,
        addLog,
        isCurrentPlayerAi: state.players[state.currentPlayerIndex]?.isAi ?? false,
    };
}
