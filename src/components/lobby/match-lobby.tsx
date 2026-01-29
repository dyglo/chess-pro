"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRealtimeMatchState } from "@/hooks/use-realtime-match-state";
import { cn } from "@/lib/utils";
import { Users, Play, Clock, Crown } from "lucide-react";

interface LobbyPageProps {
    matchId: string;
    gameType: "chess" | "ludo";
    embedded?: boolean;
}

const SEAT_COLORS = ["blue", "red", "green", "yellow"] as const;

export function MatchLobby({ matchId, gameType, embedded = false }: LobbyPageProps) {
    const { user } = useAuth();
    const router = useRouter();
    const supabase = createClient();

    const [isStarting, setIsStarting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const {
        match,
        players,
        isLoading,
        isConnected,
        refresh,
    } = useRealtimeMatchState({
        matchId,
        userId: user?.id,
    });

    const isHost = match?.created_by === user?.id;
    const joinedCount = players.filter((p) => p.status === "joined").length;
    const minPlayers = gameType === "chess" ? 2 : 2;
    const maxPlayers = gameType === "chess" ? 2 : 4;
    const canStart = isHost && joinedCount >= minPlayers;
    const startTimeoutRef = useRef<number | null>(null);

    useEffect(() => {
        if (typeof window === "undefined") return;
        if (!matchId) return;
        localStorage.setItem("lastLobbyMatchId", matchId);
        localStorage.setItem("lastLobbyGameType", gameType);
    }, [matchId, gameType]);

    // Redirect to game if match has started
    useEffect(() => {
        if (match?.status === "active") {
            setIsStarting(false);
            if (gameType === "ludo") {
                router.push(`/games/ludo?match=${matchId}&multiplayer=true`);
            } else {
                router.push(`/match/${matchId}`);
            }
        }
    }, [match?.status, matchId, gameType, router]);

    useEffect(() => {
        if (match?.status === "active" && startTimeoutRef.current) {
            window.clearTimeout(startTimeoutRef.current);
            startTimeoutRef.current = null;
        }
    }, [match?.status]);

    useEffect(() => {
        return () => {
            if (startTimeoutRef.current) {
                window.clearTimeout(startTimeoutRef.current);
                startTimeoutRef.current = null;
            }
        };
    }, []);

    const handleStartGame = async () => {
        if (!canStart) return;

        setIsStarting(true);
        setError(null);

        try {
            const { error: startError } = await supabase.rpc("start_match", {
                p_match_id: matchId,
            });

            if (startError) throw startError;
            // Redirect will happen automatically via the useEffect above
            if (startTimeoutRef.current) {
                window.clearTimeout(startTimeoutRef.current);
            }
            startTimeoutRef.current = window.setTimeout(() => {
                refresh();
            }, 4000);
        } catch (err) {
            console.error("Start error:", err);
            setError((err as Error).message);
            setIsStarting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
                <div className="w-8 h-8 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!match) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-2">Match Not Found</h1>
                    <p className="text-gray-500 mb-4">This match doesn&apos;t exist or has been cancelled.</p>
                    <Link href="/friends" className="text-[var(--accent)] font-semibold hover:underline">
                        Return to Friends
                    </Link>
                </div>
            </div>
        );
    }

    const containerClassName = embedded
        ? "w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden"
        : "w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden";

    return (
        <div className={cn(
            "bg-gradient-to-br from-[#F8F9FA] to-gray-100 flex items-center justify-center p-4",
            embedded ? "rounded-3xl" : "min-h-screen"
        )}>
            <div className={containerClassName}>
                {/* Header */}
                <div className={cn(
                    "px-6 py-5 text-white",
                    gameType === "ludo"
                        ? "bg-gradient-to-r from-purple-600 to-purple-700"
                        : "bg-gradient-to-r from-blue-600 to-blue-700"
                )}>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl">
                            {gameType === "ludo" ? "🎲" : "♟"}
                        </div>
                        <div>
                            <h1 className="text-xl font-bold">
                                {gameType === "ludo" ? "Ludo" : "Chess"} Lobby
                            </h1>
                            <p className="text-sm opacity-80">
                                Waiting for players to join...
                            </p>
                        </div>
                    </div>
                </div>

                {/* Connection Status */}
                <div className={cn(
                    "px-4 py-2 text-xs font-semibold flex items-center gap-2",
                    isConnected ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"
                )}>
                    <div className={cn(
                        "w-2 h-2 rounded-full",
                        isConnected ? "bg-green-500 animate-pulse" : "bg-yellow-500"
                    )} />
                    {isConnected ? "Connected • Live updates enabled" : "Reconnecting..."}
                </div>

                {/* Players List */}
                <div className="px-6 py-4">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                            Players ({joinedCount}/{maxPlayers})
                        </p>
                        <Users className="w-4 h-4 text-gray-400" />
                    </div>

                    <div className="space-y-2">
                        {Array.from({ length: maxPlayers }).map((_, seatIndex) => {
                            const player = players.find((p) => p.seat_index === seatIndex);
                            const isCurrentUser = player?.user_id === user?.id;
                            const seatColor = SEAT_COLORS[seatIndex];
                            const displayName = player?.display_name || player?.username || (player?.is_ai ? `AI ${seatIndex + 1}` : `Player ${seatIndex + 1}`);
                            const avatarUrl = player?.avatar_url || "/avatars/user-placeholder.jpg";
                            const country = player?.country || "Global";

                            return (
                                <div
                                    key={seatIndex}
                                    className={cn(
                                        "flex items-center gap-3 p-3 rounded-xl border transition-all",
                                        player?.status === "joined"
                                            ? "bg-white border-gray-200"
                                            : player?.status === "pending"
                                                ? "bg-yellow-50 border-yellow-200"
                                                : "bg-gray-50 border-dashed border-gray-200"
                                    )}
                                >
                                    {/* Color indicator */}
                                    <div
                                        className={cn(
                                            "w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm",
                                            seatColor === "blue" && "bg-blue-500",
                                            seatColor === "red" && "bg-red-500",
                                            seatColor === "green" && "bg-green-500",
                                            seatColor === "yellow" && "bg-yellow-500"
                                        )}
                                    >
                                        {seatIndex + 1}
                                    </div>

                                    {player && (
                                        <div className="relative h-9 w-9 overflow-hidden rounded-full border border-gray-200 bg-white">
                                            <Image src={avatarUrl} alt={displayName} fill className="object-cover" />
                                        </div>
                                    )}

                                    <div className="flex-1">
                                        {player ? (
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-semibold">
                                                    {player.is_ai ? `AI ${seatIndex + 1}` : (isCurrentUser ? "You" : displayName)}
                                                </span>
                                                {isCurrentUser && match?.created_by === user?.id && (
                                                    <Crown className="w-3 h-3 text-yellow-500" />
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-sm text-gray-400">Empty seat</span>
                                        )}
                                        <p className="text-xs text-gray-400">
                                            {player?.status === "joined" && `Ready • ${country}`}
                                            {player?.status === "pending" && `Invited • Waiting... • ${country}`}
                                            {!player && "Open"}
                                        </p>
                                    </div>

                                    {/* Status indicator */}
                                    {player?.status === "joined" && (
                                        <div className="w-2 h-2 rounded-full bg-green-500" />
                                    )}
                                    {player?.status === "pending" && (
                                        <Clock className="w-4 h-4 text-yellow-500" />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Actions */}
                <div className="px-6 py-4 border-t border-gray-100">
                    {error && (
                        <div className="mb-3 px-3 py-2 bg-red-50 text-red-700 text-xs font-semibold rounded-lg">
                            {error}
                        </div>
                    )}

                    {isHost ? (
                        <button
                            onClick={handleStartGame}
                            disabled={!canStart || isStarting}
                            className={cn(
                                "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-white transition",
                                canStart
                                    ? "bg-[var(--accent)] hover:brightness-110 cursor-pointer"
                                    : "bg-gray-300 cursor-not-allowed"
                            )}
                        >
                            {isStarting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Starting...
                                </>
                            ) : (
                                <>
                                    <Play className="w-4 h-4" />
                                    {canStart ? "Start Game" : `Need ${minPlayers - joinedCount} more players`}
                                </>
                            )}
                        </button>
                    ) : (
                        <div className="text-center text-sm text-gray-500">
                            Waiting for host to start the game...
                        </div>
                    )}

                    <p className="mt-3 text-center text-xs text-gray-400">
                        {gameType === "ludo" && "Empty seats will be skipped during gameplay"}
                    </p>
                </div>
            </div>
        </div>
    );
}
