"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LudoBoard } from "./components/LudoBoard";
import { LudoPlayerCard } from "./components/PlayerCard";
import { LudoDice } from "./components/ludo-dice";
import { useLudoGame } from "@/hooks/use-ludo-game";
import { useLudoRealtime } from "@/hooks/use-ludo-realtime";
import { useAuth } from "@/hooks/use-auth";
import { UserDropdown } from "@/components/play/user-dropdown";
import { ProfileSettingsModal } from "@/components/play/profile-settings-modal";
import { cn } from "@/lib/utils";
import { Plus, Settings, HelpCircle, Menu, X, Users } from "lucide-react";
import { LudoSettingsModal } from "@/components/play/ludo-settings-modal";
import { defaultLudoStyle, getLudoStyleById } from "@/lib/ludo/board-styles";

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
    const searchParams = useSearchParams();
    const sessionId = searchParams.get("session");
    const matchId = searchParams.get("match"); // New: match ID for realtime mode
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

    useEffect(() => {
        const savedStyle = localStorage.getItem("ludo-board-style");
        if (savedStyle) {
            setBoardStyleId(savedStyle);
        }
    }, []);

    const handleStyleChange = (id: string) => {
        setBoardStyleId(id);
        localStorage.setItem("ludo-board-style", id);
    };

    const boardStyle = getLudoStyleById(boardStyleId);

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
        isMultiplayer: isMultiplayer && !matchId, // Use legacy only if no matchId
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
        handleRoll,
        handleTokenMove,
        newGame,
        isCurrentPlayerAi,
    } = useRealtimeMode ? { ...realtimeGame } : { ...legacyGame };

    // Get display name for player
    const getPlayerName = (playerIndex: number) => {
        // In local/single player, Player 0 is always the current user
        if (!isMultiplayer && playerIndex === 0) {
            return userProfile?.full_name || userProfile?.username || user?.email?.split("@")[0] || "Guest";
        }
        // In multiplayer, respect the state hydrated from DB
        return state.players[playerIndex].name;
    };

    const players = state.players.map((p, idx) => ({
        ...p,
        name: getPlayerName(idx),
        // Only override P0 avatar/country if single player. In multiplayer, use state.
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
        };
        if (roster) {
            return {
                id: roster.id,
                name: roster.name,
                isAi: roster.isAi,
                avatarUrl: roster.avatarUrl || undefined,
                country: roster.country || getAICountry(idx),
            };
        }
        return players[idx] ?? fallback;
    });

    return (
        <div className="h-screen bg-[#F8F9FA] flex flex-col font-sans text-[var(--foreground)] selection:bg-[var(--accent)]/20 overflow-hidden">
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
                            />

                            {/* Action Panel with Dice */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-4">
                                {/* Dice */}
                                <div className="py-2 border-b border-gray-100">
                                    <LudoDice
                                        value={state.diceValue}
                                        isRolling={isRolling}
                                        onRoll={handleRoll}
                                        disabled={isRolling || state.diceValue !== null || isCurrentPlayerAi || state.gameStatus === 'finished'}
                                    />
                                </div>

                                {/* Actions */}
                                <div className="space-y-1">
                                    <button
                                        onClick={newGame}
                                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
                                    >
                                        <Plus className="w-4 h-4 text-gray-400" />
                                        <span className="text-xs font-semibold">New Game</span>
                                    </button>
                                    <button
                                        onClick={() => setShowSettings(true)}
                                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
                                    >
                                        <Settings className="w-4 h-4 text-gray-400" />
                                        <span className="text-xs font-semibold">Settings</span>
                                    </button>
                                    <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-left">
                                        <HelpCircle className="w-4 h-4 text-gray-400" />
                                        <span className="text-xs font-semibold">How to Play</span>
                                    </button>
                                </div>
                            </div>

                            {/* Yellow AI Player */}
                            <LudoPlayerCard
                                name={normalizedPlayers[3].name}
                                isAi={normalizedPlayers[3].isAi}
                                color="yellow"
                                isActive={state.currentPlayerIndex === 3}
                                country={normalizedPlayers[3].country}
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
                                    country={normalizedPlayers[1].country}
                                    className="flex-1"
                                />
                                <LudoPlayerCard
                                    name={normalizedPlayers[2].name}
                                    isAi={normalizedPlayers[2].isAi}
                                    color="green"
                                    isActive={state.currentPlayerIndex === 2}
                                    country={normalizedPlayers[2].country}
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
                                    className="flex-1"
                                />
                                <LudoPlayerCard
                                    name={normalizedPlayers[3].name}
                                    isAi={normalizedPlayers[3].isAi}
                                    color="yellow"
                                    isActive={state.currentPlayerIndex === 3}
                                    country={normalizedPlayers[3].country}
                                    className="flex-1"
                                />
                            </div>
                        </div>

                        {/* Right Sidebar - Turn Indicator & Info */}
                        <div className="flex flex-col gap-3 h-full justify-center">

                            {/* Turn Indicator */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                                <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
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
                                    <span className="text-sm font-semibold">
                                        {normalizedPlayers[state.currentPlayerIndex]?.name || "Player"}
                                    </span>
                                </div>
                                {isCurrentPlayerAi && (
                                    <div className="text-xs text-gray-400 mt-1">AI thinking...</div>
                                )}
                            </div>

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
                                className="flex-1 scale-90 origin-left"
                            />
                            <LudoPlayerCard
                                name={normalizedPlayers[1].name}
                                isAi={normalizedPlayers[1].isAi}
                                color="red"
                                isActive={state.currentPlayerIndex === 1}
                                country={normalizedPlayers[1].country}
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
                        </div>

                        {/* Bottom Players */}
                        <div className="w-full flex justify-between gap-2 px-2">
                            <LudoPlayerCard
                                name={normalizedPlayers[3].name}
                                isAi={normalizedPlayers[3].isAi}
                                color="yellow"
                                isActive={state.currentPlayerIndex === 3}
                                country={normalizedPlayers[3].country}
                                className="flex-1 scale-90 origin-left"
                            />
                            <LudoPlayerCard
                                name={normalizedPlayers[2].name}
                                isAi={normalizedPlayers[2].isAi}
                                color="green"
                                isActive={state.currentPlayerIndex === 2}
                                country={normalizedPlayers[2].country}
                                className="flex-1 scale-90 origin-right"
                            />
                        </div>
                    </div>
                </div>
            </main>

            {/* Game Over Overlay */}
            {state.winner !== null && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
                        <h2 className="text-3xl font-black mb-2">Game Over!</h2>
                        <p className="text-lg text-gray-600 mb-6">
                            {normalizedPlayers[state.winner]?.name || "Player"} wins!
                        </p>
                        <button
                            onClick={newGame}
                            className="px-8 py-3 bg-[var(--accent)] text-white rounded-xl font-bold hover:scale-105 transition-transform"
                        >
                            Play Again
                        </button>
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
