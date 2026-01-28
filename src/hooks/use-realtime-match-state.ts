"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

export interface MatchEvent {
    id: string;
    match_id: string;
    seq: number;
    event_type: string;
    payload: Record<string, unknown>;
    actor_user_id: string | null;
    created_at: string;
}

export interface MatchPlayer {
    id: string;
    match_id: string;
    user_id: string | null;
    seat_index: number;
    status: "joined" | "pending" | "left" | "kicked";
    is_ai: boolean;
    color: string | null;
    display_name?: string | null;
    username?: string | null;
    avatar_url?: string | null;
    country?: string | null;
}

export interface MatchState {
    id: string;
    status: "pending" | "active" | "completed" | "cancelled";
    game_type: "chess" | "ludo";
    version: number;
    state: Record<string, unknown>;
    created_by: string | null;
    started_at: string | null;
    ended_at: string | null;
}

interface UseRealtimeMatchStateOptions {
    matchId: string;
    userId?: string;
    onEvent?: (event: MatchEvent) => void;
    onReconnect?: () => void;
}

/**
 * Unified hook for realtime match state with proper reconnect handling.
 * This is the core fix for the "needs refresh" bug.
 * 
 * Key features:
 * 1. Subscribes to match_events INSERT for real-time updates
 * 2. Detects reconnection and refetches authoritative state
 * 3. Handles out-of-order events via seq comparison
 * 4. Provides single source of truth for match state
 */
export function useRealtimeMatchState(options: UseRealtimeMatchStateOptions) {
    const { matchId, userId, onEvent, onReconnect } = options;
    const supabase = useMemo(() => createClient(), []);

    const [match, setMatch] = useState<MatchState | null>(null);
    const [players, setPlayers] = useState<MatchPlayer[]>([]);
    const [events, setEvents] = useState<MatchEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    const lastSeqRef = useRef<number>(0);
    const channelRef = useRef<RealtimeChannel | null>(null);
    const reconnectingRef = useRef(false);

    // Fetch authoritative state from DB
    const fetchState = useCallback(async () => {
        if (!matchId) {
            console.warn("[RealtimeMatch] No matchId provided");
            return null;
        }

        try {
            // Fetch match
            const { data: matchData, error: matchError } = await supabase
                .from("matches")
                .select("id, status, game_type, version, state, created_by, started_at, ended_at")
                .eq("id", matchId)
                .single();

            if (matchError) {
                console.error("[RealtimeMatch] Match fetch error:", matchError.code, matchError.message);
                throw new Error(`Match not found: ${matchError.message}`);
            }

            // Fetch players via RPC to avoid RLS recursion
            const { data: playersData, error: playersError } = await supabase.rpc("get_match_roster", {
                p_match_id: matchId,
            });

            if (playersError) {
                console.error("[RealtimeMatch] Players fetch error:", playersError.message, playersError.code);
                throw playersError;
            }

            // Fetch recent events (for replay/history)
            const { data: eventsData, error: eventsError } = await supabase
                .from("match_events")
                .select("*")
                .eq("match_id", matchId)
                .order("seq", { ascending: false })
                .limit(50);

            if (eventsError) {
                console.error("[RealtimeMatch] Events fetch error:", eventsError);
            }

            setMatch(matchData as MatchState);
            setPlayers((playersData ?? []) as MatchPlayer[]);
            setEvents((eventsData ?? []).reverse() as MatchEvent[]);
            lastSeqRef.current = matchData?.version ?? 0;

            return matchData;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Unknown error fetching match state";
            console.error("[RealtimeMatch] Fetch error:", errorMessage, err);
            setError(errorMessage);
            return null;
        }
    }, [matchId, supabase]);

    // Initial load
    useEffect(() => {
        setIsLoading(true);
        fetchState().finally(() => setIsLoading(false));
    }, [fetchState]);

    // Apply an event to the local state
    const applyEvent = useCallback((event: MatchEvent) => {
        setMatch((prev) => {
            if (!prev) return prev;

            const newState = { ...prev.state };

            switch (event.event_type) {
                case "ludo_roll":
                    newState.diceValue = event.payload.diceValue;
                    break;

                case "ludo_move":
                    newState.diceValue = null;
                    newState.currentPlayerIndex = event.payload.nextSeat;
                    if (event.payload.winner !== null) {
                        newState.winner = event.payload.winner;
                    }
                    // Token positions are updated via the full state refresh
                    // For now, trigger a state refetch to get updated tokens
                    fetchState();
                    break;

            case "turn_skip":
            case "TURN_SKIPPED":
                newState.diceValue = null;
                if (event.payload?.nextSeat !== undefined && event.payload?.nextSeat !== null) {
                    newState.currentPlayerIndex = event.payload.nextSeat;
                }
                break;

                case "chess_move":
                    newState.fen = event.payload.fen;
                    newState.currentTurn = typeof event.payload.fen === "string" ? event.payload.fen.split(" ")[1] : "w";
                    newState.moveCount = event.payload.moveNumber;
                    break;
            }

            return {
                ...prev,
                state: newState,
                version: event.seq,
            };
        });
    }, [fetchState]);

    // Setup realtime subscription with reconnect handling
    useEffect(() => {
        if (!matchId) return;

        const channel = supabase
            .channel(`match:${matchId}`, {
                config: { broadcast: { self: true } },
            })
            // Listen for new events (the core realtime stream)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "match_events",
                    filter: `match_id=eq.${matchId}`,
                },
                (payload) => {
                    const event = payload.new as MatchEvent;

                    // Idempotent: ignore events we've already seen
                    if (event.seq <= lastSeqRef.current) {
                        console.log(`[RealtimeMatch] Ignoring duplicate event seq=${event.seq}`);
                        return;
                    }

                    // Check for gap in sequence (missed events)
                    if (event.seq > lastSeqRef.current + 1) {
                        console.warn(`[RealtimeMatch] Gap detected: expected ${lastSeqRef.current + 1}, got ${event.seq}. Resyncing...`);
                        fetchState();
                        return;
                    }

                    lastSeqRef.current = event.seq;
                    setEvents((prev) => [...prev, event]);

                    // Apply event to state
                    applyEvent(event);
                    onEvent?.(event);
                }
            )
            // Listen for match status changes
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "matches",
                    filter: `id=eq.${matchId}`,
                },
                (payload) => {
                    const updated = payload.new as MatchState;
                    setMatch(updated);
                    lastSeqRef.current = updated.version;
                }
            )
            // Listen for player changes
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "match_players",
                    filter: `match_id=eq.${matchId}`,
                },
                () => {
                    // Refetch players on any change
                    supabase
                        .rpc("get_match_roster", { p_match_id: matchId })
                        .then(({ data, error }) => {
                            if (error) {
                                console.error("[RealtimeMatch] Roster refresh error:", error.message, error.code);
                                return;
                            }
                            if (data) setPlayers(data as MatchPlayer[]);
                        });
                }
            )
            .subscribe((status) => {
                console.log(`[RealtimeMatch] Channel status: ${status}`);

                if (status === "SUBSCRIBED") {
                    setIsConnected(true);

                    // On reconnect, refetch to catch any missed events
                    if (reconnectingRef.current) {
                        console.log("[RealtimeMatch] Reconnected, resyncing state...");
                        fetchState().then(() => {
                            onReconnect?.();
                        });
                        reconnectingRef.current = false;
                    }
                } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
                    setIsConnected(false);
                    reconnectingRef.current = true;
                }
            });

        channelRef.current = channel;

        return () => {
            console.log("[RealtimeMatch] Cleaning up channel");
            supabase.removeChannel(channel);
        };
    }, [matchId, supabase, fetchState, onEvent, onReconnect, applyEvent]);

    // Get my seat/player info
    const myPlayer = useMemo(() => {
        if (!userId) return null;
        return players.find((p) => p.user_id === userId) ?? null;
    }, [players, userId]);

    // Am I the current player?
    const isMyTurn = useMemo(() => {
        if (!myPlayer || !match?.state) return false;
        if (myPlayer.status !== "joined") return false;

        if (match.game_type === "ludo") {
            const currentSeat = (match.state as { currentPlayerIndex?: number }).currentPlayerIndex ?? 0;
            return myPlayer.seat_index === currentSeat;
        } else {
            const currentTurn = (match.state as { currentTurn?: string }).currentTurn ?? "w";
            return (currentTurn === "w" && myPlayer.color === "white") ||
                (currentTurn === "b" && myPlayer.color === "black");
        }
    }, [myPlayer, match]);

    // Refresh state manually
    const refresh = useCallback(() => {
        return fetchState();
    }, [fetchState]);

    return {
        match,
        players,
        events,
        myPlayer,
        isMyTurn,
        isLoading,
        isConnected,
        error,
        version: lastSeqRef.current,
        refresh,
    };
}
