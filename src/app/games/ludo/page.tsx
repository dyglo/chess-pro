"use client";

import React, { useState, useEffect, Suspense, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { LudoBoard } from "./components/LudoBoard";
import { LudoPlayerCard } from "./components/PlayerCard";
import { LudoDice } from "./components/ludo-dice";
import { useLudoGame } from "@/hooks/use-ludo-game";
import { useLudoRealtime } from "@/hooks/use-ludo-realtime";
import { useAuth } from "@/hooks/use-auth";
import { UserDropdown } from "@/components/play/user-dropdown";
import { ProfileSettingsModal } from "@/components/play/profile-settings-modal";
import { cn } from "@/lib/utils";
import { Plus, Settings, HelpCircle, Menu, X, Users, History } from "lucide-react";
import { LudoSettingsModal } from "@/components/play/ludo-settings-modal";
import { defaultLudoStyle, getLudoStyleById } from "@/lib/ludo/board-styles";
import { LudoThemeToggle } from "./components/theme-toggle";
import { FINISH_POS } from "@/lib/ludo/ludo-state";
import { useMatchChat } from "@/hooks/use-match-chat";
import { LudoMatchChat } from "./components/ludo-match-chat";

export default function LudoPage() {
    return (
        <Suspense fallback={
            <div className="h-screen flex items-center justify-center bg-[#F8F9FA]">
                <div className="w-8 h-8 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <LudoGameContent />
        </Suspense>
    );
}

function LudoGameContent() {
    const { user, signOut } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const sessionId = searchParams.get("session");
    const matchId = searchParams.get("match");
    const isMultiplayer = searchParams.get("multiplayer") === "true";

    const [userProfile, setUserProfile] = useState<{
        full_name?: string;
        username?: string;
        country?: string;
        avatar_url?: string;
    } | null>(null);
    const [showProfileSettings, setShowProfileSettings] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [boardStyleId, setBoardStyleId] = useState(defaultLudoStyle.id);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [showTimeline, setShowTimeline] = useState(false);
    const [showChat, setShowChat] = useState(false);

    useEffect(() => {
        const savedStyle = localStorage.getItem("ludo-board-style");
        if (savedStyle) {
            setBoardStyleId(savedStyle);
        }

        const savedTheme = localStorage.getItem("ludo-theme");
        if (savedTheme === "dark") {
            setIsDarkMode(true);
        }
    }, []);

    const toggleTheme = () => {
        const newMode = !isDarkMode;
        setIsDarkMode(newMode);
        localStorage.setItem("ludo-theme", newMode ? "dark" : "light");
    };

    const handleStyleChange = (id: string) => {
        setBoardStyleId(id);
        localStorage.setItem("ludo-board-style", id);
    };

    const baseBoardStyle = getLudoStyleById(boardStyleId);

    // Apply Dark Mode overrides for Classic style
    const boardStyle = React.useMemo(() => {
        if (isDarkMode && baseBoardStyle.id === 'classic') {
            return {
                ...baseBoardStyle,
                background: "#18181b", // zinc-900
                boardFill: "#27272a", // zinc-800
                gridStroke: "#3f3f46", // zinc-700
                safeSquareColor: "#3f3f46",
            };
        }
        return baseBoardStyle;
    }, [isDarkMode, baseBoardStyle]);

    // Fetch user profile
    useEffect(() => {
        async function fetchProfile() {
            if (user) {
                const { createClient } = await import("@/lib/supabase/client");
                const supabase = createClient();
                const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
                if (data) setUserProfile(data);
            } else {
                setUserProfile(null);
            }
        }
        fetchProfile();
    }, [user, showProfileSettings]);

    // Use the new realtime hook for multiplayer with matchId, otherwise use legacy hook
    const useRealtimeMode = isMultiplayer && matchId;

    // Legacy hook for solo/session-based games
    const legacyGame = useLudoGame({
        userId: user?.id,
        userProfile,
        onGameEnd: (winner) => {
            console.log("Game ended, winner:", winner);
        },
        existingSessionId: sessionId,
        isMultiplayer: isMultiplayer && !matchId,
    });

    // New realtime hook for multiplayer with matchId
    const realtimeGame = useLudoRealtime({
        matchId: matchId || "",
        userId: user?.id,
        userProfile,
        onGameEnd: (winner) => {
            console.log("Game ended, winner:", winner);
        },
    });

    // Select which hook to use
    const {
        state,
        isRolling,
        validMoveTokenIds,
        logs,
        handleRoll,
        handleTokenMove,
        newGame,
        isCurrentPlayerAi,
        captureEffect,
        knockedTokenIds,
    } = useRealtimeMode ? { ...realtimeGame } : { ...legacyGame, captureEffect: null, knockedTokenIds: [] };

    const chat = useMatchChat(matchId ?? undefined, user?.id);

    // Get display name for player
    const getPlayerName = (playerIndex: number) => {
        if (!isMultiplayer && playerIndex === 0) {
            return userProfile?.full_name || userProfile?.username || user?.email?.split("@")[0] || "Guest";
        }
        return state.players[playerIndex].name;
    };

    const players = state.players.map((p, idx) => ({
        ...p,
        name: getPlayerName(idx),
        avatarUrl: (!isMultiplayer && idx === 0) ? (userProfile?.avatar_url || undefined) : (p.avatarUrl || undefined),
        country: (!isMultiplayer && idx === 0) ? (userProfile?.country || getAICountry(idx)) : (p.country || getAICountry(idx)),
    }));

    const rosterPlayers = useRealtimeMode ? realtimeGame.getPlayers() : [];
    const normalizedPlayers = Array.from({ length: 4 }, (_, idx) => {
        const roster = rosterPlayers.find((p) => p.seatIndex === idx);
        const fallback = {
            id: `seat-${idx}`,
            name: `Player ${idx + 1}`,
            isAi: false,
            avatarUrl: undefined as string | undefined,
            country: getAICountry(idx),
            userId: undefined as string | undefined,
            status: "joined" as string,
        };
        if (roster) {
            return {
                id: roster.id,
                name: roster.name,
                isAi: roster.isAi,
                avatarUrl: roster.avatarUrl || undefined,
                country: roster.country || getAICountry(idx),
                userId: roster.userId,
                status: roster.status,
            };
        }
        return {
            ...(players[idx] ?? fallback),
            userId: !isMultiplayer && idx === 0 ? user?.id : undefined,
            status: players[idx]?.isAi ? "ai" : "joined",
        };
    });

    const finishedByColor = useMemo(() => {
        const counts: Record<"blue" | "red" | "green" | "yellow", number> = {
            blue: 0,
            red: 0,
            green: 0,
            yellow: 0,
        };
        state.tokens.forEach((t) => {
            if (t.position >= FINISH_POS) {
                counts[t.color] += 1;
            }
        });
        return counts;
    }, [state.tokens]);

    const isWinnerMe = useMemo(() => {
        if (state.winner === null) return false;
        if (!isMultiplayer) return state.winner === 0;
        const winnerUserId = normalizedPlayers[state.winner]?.userId;
        return !!winnerUserId && winnerUserId === user?.id;
    }, [state.winner, isMultiplayer, normalizedPlayers, user?.id]);

    const [dismissedWinner, setDismissedWinner] = useState(false);
    useEffect(() => {
        if (state.winner !== null) {
            setDismissedWinner(false);
        }
    }, [state.winner]);

    const lastLog = logs?.[0] ?? "No moves yet.";
    const timelineLogs = (logs ?? []).slice(0, 4);

    return (
        <div className={cn(
            "h-screen flex flex-col font-sans text-[var(--ludo-text-primary)] selection:bg-[var(--accent)]/20 overflow-hidden ludo-root",
            isDarkMode ? "ludo-dark bg-zinc-950" : "bg-[#F8F9FA]"
        )}>
            {/* Header */}
            <header className="h-14 flex items-center justify-between px-4 lg:px-8 border-b border-gray-100 bg-white/80 backdrop-blur-md flex-shrink-0">
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="w-8 h-8 bg-[var(--foreground)] rounded-xl flex items-center justify-center transition-transform group-hover:scale-105">
                        <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19,22H5V20H19V22M17,10C17,8.89 16.1,8 15,8V7C15,5.89 14.1,5 13,5V4C13,2.89 12.1,2 11,2H9C7.89,2 7,2.89 7,4V5C5.89,5 5,5.89 5,7V8C3.89,8 3,8.89 3,10V18H21V10C21,8.89 20.1,8 19,8V7C19,5.89 18.1,5 17,10M17,18H7V10H17V18Z" />
                        </svg>
                    </div>
                    <span className="text-xl font-bold tracking-tight uppercase">Chess<span className="text-[var(--accent)]">Pro</span></span>
                </Link>

                <div className="flex items-center gap-4 lg:gap-6">
                    <div className="hidden lg:flex items-center gap-6">
                        <Link href="/games" className="text-sm font-semibold opacity-60 hover:opacity-100 transition-opacity">Games</Link>
                        <Link href="/leaderboard" className="text-sm font-semibold opacity-60 hover:opacity-100 transition-opacity">Leaderboard</Link>
                        <Link href="/friends" className="text-sm font-semibold opacity-60 hover:opacity-100 transition-opacity">Friends</Link>
                    </div>

                    {user && (
                        <UserDropdown
                            user={user}
                            avatarUrl={userProfile?.avatar_url || "/avatars/user-placeholder.jpg"}
                            onSettings={() => setShowProfileSettings(true)}
                            onLogout={signOut}
                        />
                    )}

                    <button
                        className="lg:hidden p-2"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    >
                        {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>
            </header>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-30 bg-white pt-16 lg:hidden">
                    <nav className="flex flex-col items-center gap-6 p-8">
                        <Link href="/games" className="text-lg font-semibold" onClick={() => setIsMobileMenuOpen(false)}>Games</Link>
                        <Link href="/leaderboard" className="text-lg font-semibold" onClick={() => setIsMobileMenuOpen(false)}>Leaderboard</Link>
                        <Link href="/friends" className="text-lg font-semibold" onClick={() => setIsMobileMenuOpen(false)}>Friends</Link>
                    </nav>
                </div>
            )}

            {/* Multiplayer Mode Banner */}
            {isMultiplayer && sessionId && (
                <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white py-2 px-4 flex items-center justify-center gap-2 text-sm font-semibold flex-shrink-0">
                    <Users className="w-4 h-4" />
                    <span>Friend Match Mode</span>
                    <span className="text-purple-200 text-xs ml-2">Session: {sessionId.slice(0, 8)}...</span>
                </div>
            )}

            {/* Main Content */}
            <main className="flex-1 flex items-center justify-center p-2 lg:p-4 overflow-hidden">
                <div className="w-full max-w-[1400px] h-full flex items-center">
                    {/* Desktop Layout */}
                    <div className="hidden lg:grid lg:grid-cols-[220px_1fr_220px] gap-4 w-full h-full items-center">
                        {/* Left Sidebar - Actions & Dice */}
                        <div className="flex flex-col gap-3 h-full justify-center">
                            {/* Human Player Card */}
                            <LudoPlayerCard
                                name={normalizedPlayers[0].name}
                                isAi={normalizedPlayers[0].isAi}
                                color="blue"
                                isActive={state.currentPlayerIndex === 0}
                                avatarUrl={normalizedPlayers[0].avatarUrl || undefined}
                                country={normalizedPlayers[0].country}
                                finishedCount={finishedByColor.blue}
                                status={normalizedPlayers[0].status}
                            />

                            {/* Action Panel with Dice */}
                            <div className="bg-[var(--ludo-bg-card)] rounded-xl shadow-sm border border-[var(--ludo-border-card)] p-4 space-y-4 transition-colors duration-300">
                                {/* Dice */}
                                <div className="py-2 border-b border-[var(--ludo-border-card)]">
                                    <LudoDice
                                        value={state.diceValue}
                                        isRolling={isRolling}
                                        onRoll={handleRoll}
                                        disabled={isRolling || state.diceValue !== null || isCurrentPlayerAi || state.gameStatus === 'finished'}
                                    />
                                </div>
                                <div className="pt-2">
                                    <div className="flex items-center justify-between gap-2 text-[11px] text-[var(--ludo-text-muted)]">
                                        <span className="truncate">Last: {lastLog}</span>
                                        <button
                                            type="button"
                                            aria-label="Toggle timeline"
                                            onClick={() => setShowTimeline((prev) => !prev)}
                                            className="p-1 rounded-md hover:bg-[var(--ludo-border-card)] transition-colors"
                                        >
                                            <History className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                    {showTimeline && (
                                        <div className="mt-2 space-y-1">
                                            {timelineLogs.map((log, i) => (
                                                <div key={`${log}-${i}`} className="text-[11px] text-[var(--ludo-text-secondary)] truncate">
                                                    {log}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="space-y-1">
                                    <button
                                        onClick={newGame}
                                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[var(--ludo-border-card)] transition-colors text-left group"
                                    >
                                        <Plus className="w-4 h-4 text-[var(--ludo-text-muted)] group-hover:text-[var(--ludo-text-secondary)]" />
                                        <span className="text-xs font-semibold text-[var(--ludo-text-secondary)] group-hover:text-[var(--ludo-text-primary)]">New Game</span>
                                    </button>
                                    <button
                                        onClick={() => setShowSettings(true)}
                                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[var(--ludo-border-card)] transition-colors text-left group"
                                    >
                                        <Settings className="w-4 h-4 text-[var(--ludo-text-muted)] group-hover:text-[var(--ludo-text-secondary)]" />
                                        <span className="text-xs font-semibold text-[var(--ludo-text-secondary)] group-hover:text-[var(--ludo-text-primary)]">Settings</span>
                                    </button>
                                    <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[var(--ludo-border-card)] transition-colors text-left group">
                                        <HelpCircle className="w-4 h-4 text-[var(--ludo-text-muted)] group-hover:text-[var(--ludo-text-secondary)]" />
                                        <span className="text-xs font-semibold text-[var(--ludo-text-secondary)] group-hover:text-[var(--ludo-text-primary)]">How to Play</span>
                                    </button>
                                </div>

                                {/* Theme Toggle */}
                                <div className="border-t border-[var(--ludo-border-card)] pt-2">
                                    <LudoThemeToggle isDark={isDarkMode} onToggle={toggleTheme} />
                                </div>
                            </div>

                            {/* Yellow AI Player */}
                            <LudoPlayerCard
                                name={normalizedPlayers[3].name}
                                isAi={normalizedPlayers[3].isAi}
                                color="yellow"
                                isActive={state.currentPlayerIndex === 3}
                                avatarUrl={normalizedPlayers[3].avatarUrl || undefined}
                                country={normalizedPlayers[3].country}
                                finishedCount={finishedByColor.yellow}
                                status={normalizedPlayers[3].status}
                            />
                        </div>

                        {/* Center - Game Board */}
                        <div className="flex flex-col items-center justify-center h-full">
                            {/* Top Players Strip */}
                            <div className="flex justify-between w-full max-w-[400px] mb-3 gap-4">
                                <LudoPlayerCard
                                    name={normalizedPlayers[1].name}
                                    isAi={normalizedPlayers[1].isAi}
                                    color="red"
                                    isActive={state.currentPlayerIndex === 1}
                                    avatarUrl={normalizedPlayers[1].avatarUrl || undefined}
                                    country={normalizedPlayers[1].country}
                                    finishedCount={finishedByColor.red}
                                    status={normalizedPlayers[1].status}
                                    className="flex-1"
                                />
                                <LudoPlayerCard
                                    name={normalizedPlayers[2].name}
                                    isAi={normalizedPlayers[2].isAi}
                                    color="green"
                                    isActive={state.currentPlayerIndex === 2}
                                    avatarUrl={normalizedPlayers[2].avatarUrl || undefined}
                                    country={normalizedPlayers[2].country}
                                    finishedCount={finishedByColor.green}
                                    status={normalizedPlayers[2].status}
                                    className="flex-1"
                                />
                            </div>

                            {/* Board */}
                            <div className="relative w-full max-w-[min(400px,calc(100vh-250px))] aspect-square">
                                <LudoBoard
                                    tokens={state.tokens}
                                    validMoveTokenIds={validMoveTokenIds}
                                    onTokenClick={handleTokenMove}
                                    style={boardStyle}
                                    captureEffect={captureEffect}
                                    knockedTokenIds={knockedTokenIds}
                                    finishedByColor={finishedByColor}
                                />
                            </div>

                            {/* Bottom Players Strip */}
                            <div className="flex justify-between w-full max-w-[400px] mt-3 gap-4">
                                <LudoPlayerCard
                                    name={normalizedPlayers[0].name}
                                    isAi={normalizedPlayers[0].isAi}
                                    color="blue"
                                    isActive={state.currentPlayerIndex === 0}
                                    avatarUrl={normalizedPlayers[0].avatarUrl || undefined}
                                    country={normalizedPlayers[0].country}
                                    finishedCount={finishedByColor.blue}
                                    status={normalizedPlayers[0].status}
                                    className="flex-1"
                                />
                                <LudoPlayerCard
                                    name={normalizedPlayers[3].name}
                                    isAi={normalizedPlayers[3].isAi}
                                    color="yellow"
                                    isActive={state.currentPlayerIndex === 3}
                                    avatarUrl={normalizedPlayers[3].avatarUrl || undefined}
                                    country={normalizedPlayers[3].country}
                                    finishedCount={finishedByColor.yellow}
                                    status={normalizedPlayers[3].status}
                                    className="flex-1"
                                />
                            </div>
                        </div>

                        {/* Right Sidebar - Turn Indicator & Info */}
                        <div className="flex flex-col gap-3 h-full justify-center">

                            {/* Turn Indicator */}
                            <div className="bg-[var(--ludo-bg-card)] rounded-xl shadow-sm border border-[var(--ludo-border-card)] p-4 transition-colors duration-300">
                                <div className="text-xs font-bold uppercase tracking-widest text-[var(--ludo-text-muted)] mb-2">
                                    Current Turn
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className={cn(
                                        "w-4 h-4 rounded-full",
                                        state.currentPlayerIndex === 0 && "bg-blue-500",
                                        state.currentPlayerIndex === 1 && "bg-red-500",
                                        state.currentPlayerIndex === 2 && "bg-green-500",
                                        state.currentPlayerIndex === 3 && "bg-yellow-500"
                                    )} />
                                    <span className="text-sm font-semibold text-[var(--ludo-text-primary)]">
                                        {normalizedPlayers[state.currentPlayerIndex]?.name || "Player"}
                                    </span>
                                </div>
                                {isCurrentPlayerAi && (
                                    <div className="text-xs text-[var(--ludo-text-muted)] mt-1">AI thinking...</div>
                                )}
                            </div>

                            {useRealtimeMode && matchId && (
                                <LudoMatchChat
                                    messages={chat.messages}
                                    isLoading={chat.isLoading}
                                    error={chat.error}
                                    onSend={chat.sendMessage}
                                    currentUserId={user?.id}
                                />
                            )}
                        </div>
                    </div>

                    {/* Mobile Layout */}
                    <div className="lg:hidden flex flex-col items-center justify-center w-full h-full gap-2">
                        {/* Top Players */}
                        <div className="w-full flex justify-between gap-2 px-2">
                            <LudoPlayerCard
                                name={normalizedPlayers[0].name}
                                isAi={normalizedPlayers[0].isAi}
                                color="blue"
                                isActive={state.currentPlayerIndex === 0}
                                avatarUrl={normalizedPlayers[0].avatarUrl || undefined}
                                country={normalizedPlayers[0].country}
                                finishedCount={finishedByColor.blue}
                                status={normalizedPlayers[0].status}
                                className="flex-1 scale-90 origin-left"
                            />
                            <LudoPlayerCard
                                name={normalizedPlayers[1].name}
                                isAi={normalizedPlayers[1].isAi}
                                color="red"
                                isActive={state.currentPlayerIndex === 1}
                                avatarUrl={normalizedPlayers[1].avatarUrl || undefined}
                                country={normalizedPlayers[1].country}
                                finishedCount={finishedByColor.red}
                                status={normalizedPlayers[1].status}
                                className="flex-1 scale-90 origin-right"
                            />
                        </div>

                        {/* Board */}
                        <div className="relative w-full max-w-[min(340px,calc(100vh-300px))] aspect-square">
                            <LudoBoard
                                tokens={state.tokens}
                                validMoveTokenIds={validMoveTokenIds}
                                onTokenClick={handleTokenMove}
                                style={boardStyle}
                                captureEffect={captureEffect}
                                knockedTokenIds={knockedTokenIds}
                                finishedByColor={finishedByColor}
                            />
                        </div>

                        {/* Dice Row */}
                        <div className="flex items-center justify-center gap-4 py-2">
                            <LudoDice
                                value={state.diceValue}
                                isRolling={isRolling}
                                onRoll={handleRoll}
                                disabled={isRolling || state.diceValue !== null || isCurrentPlayerAi || state.gameStatus === 'finished'}
                            />
                            <button
                                type="button"
                                aria-label="Toggle timeline"
                                onClick={() => setShowTimeline((prev) => !prev)}
                                className="p-2 rounded-md hover:bg-[var(--ludo-border-card)] transition-colors"
                            >
                                <History className="w-4 h-4 text-[var(--ludo-text-muted)]" />
                            </button>
                            {useRealtimeMode && matchId && (
                                <button
                                    type="button"
                                    aria-label="Toggle chat"
                                    onClick={() => setShowChat((prev) => !prev)}
                                    className="p-2 rounded-md hover:bg-[var(--ludo-border-card)] transition-colors text-[10px] font-semibold text-[var(--ludo-text-muted)]"
                                >
                                    Chat
                                </button>
                            )}
                        </div>
                        {showTimeline && (
                            <div className="w-full px-4">
                                <div className="text-[11px] text-[var(--ludo-text-muted)] mb-1">Last: {lastLog}</div>
                                <div className="space-y-1">
                                    {timelineLogs.map((log, i) => (
                                        <div key={`${log}-${i}`} className="text-[11px] text-[var(--ludo-text-secondary)] truncate">
                                            {log}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {showChat && useRealtimeMode && matchId && (
                            <div className="w-full px-4">
                                <LudoMatchChat
                                    messages={chat.messages}
                                    isLoading={chat.isLoading}
                                    error={chat.error}
                                    onSend={chat.sendMessage}
                                    currentUserId={user?.id}
                                />
                            </div>
                        )}

                        {/* Bottom Players */}
                        <div className="w-full flex justify-between gap-2 px-2">
                            <LudoPlayerCard
                                name={normalizedPlayers[3].name}
                                isAi={normalizedPlayers[3].isAi}
                                color="yellow"
                                isActive={state.currentPlayerIndex === 3}
                                avatarUrl={normalizedPlayers[3].avatarUrl || undefined}
                                country={normalizedPlayers[3].country}
                                finishedCount={finishedByColor.yellow}
                                status={normalizedPlayers[3].status}
                                className="flex-1 scale-90 origin-left"
                            />
                            <LudoPlayerCard
                                name={normalizedPlayers[2].name}
                                isAi={normalizedPlayers[2].isAi}
                                color="green"
                                isActive={state.currentPlayerIndex === 2}
                                avatarUrl={normalizedPlayers[2].avatarUrl || undefined}
                                country={normalizedPlayers[2].country}
                                finishedCount={finishedByColor.green}
                                status={normalizedPlayers[2].status}
                                className="flex-1 scale-90 origin-right"
                            />
                        </div>
                    </div>
                </div>
            </main>

            {/* Game Over Overlay */}
            {state.winner !== null && !dismissedWinner && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="relative overflow-hidden bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
                        {isWinnerMe && (
                            <div className="ludo-confetti" aria-hidden="true">
                                {Array.from({ length: 16 }).map((_, i) => (
                                    <span key={i} className="ludo-confetti-piece" />
                                ))}
                            </div>
                        )}
                        <h2 className="text-3xl font-black mb-2">{isWinnerMe ? "YOU WON!" : "Game Over!"}</h2>
                        <p className="text-lg text-gray-600 mb-6">
                            {normalizedPlayers[state.winner]?.name || "Player"} wins!
                        </p>
                        <div className="flex flex-col gap-2">
                            <button
                                onClick={() => {
                                    setDismissedWinner(true);
                                    router.push("/games");
                                }}
                                className="px-8 py-3 bg-[var(--accent)] text-white rounded-xl font-bold hover:scale-105 transition-transform"
                            >
                                Go Home
                            </button>
                            {isMultiplayer && matchId && (
                                <button
                                    onClick={() => {
                                        setDismissedWinner(true);
                                        router.push("/friends");
                                    }}
                                    className="px-8 py-2 rounded-xl border border-[var(--ludo-border-card)] text-sm font-semibold text-[var(--ludo-text-secondary)] hover:text-[var(--ludo-text-primary)] hover:border-[var(--accent)]/40 transition-colors"
                                >
                                    View Friends
                                </button>
                            )}
                            {!isMultiplayer && (
                                <button
                                    onClick={() => setDismissedWinner(true)}
                                    className="px-8 py-2 rounded-xl border border-[var(--ludo-border-card)] text-sm font-semibold text-[var(--ludo-text-secondary)] hover:text-[var(--ludo-text-primary)] hover:border-[var(--accent)]/40 transition-colors"
                                >
                                    Close
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Profile Settings Modal */}
            <ProfileSettingsModal
                isOpen={showProfileSettings}
                onClose={() => setShowProfileSettings(false)}
                user={user}
                onProfileUpdate={() => setShowProfileSettings(false)}
            />

            {/* Game Settings Modal */}
            <LudoSettingsModal
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
                boardStyle={boardStyle}
                onStyleChange={handleStyleChange}
            />
        </div>
    );
}

function getAICountry(playerIndex: number): string {
    const countries = ["", "India", "Nigeria", "Brazil"];
    return countries[playerIndex] || "Global";
}
