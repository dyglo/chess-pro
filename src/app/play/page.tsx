"use client";

import { useState, useEffect, useCallback } from "react";
import { Chess, Square } from "chess.js";
import Link from "next/link";
import { useChessGame } from "@/hooks/use-chess-game";
import type { GameState } from "@/lib/chess-state";
import { BoardTheme, getThemeById, defaultTheme, DifficultyLevel, getDifficultyById, defaultDifficulty } from "@/lib/board-themes";
import { ChessBoardWrapper } from "@/components/play/chess-board-wrapper";
import { SignInPromptModal } from "@/components/play/sign-in-prompt-modal";
import { GameEndModal } from "@/components/play/game-end-modal";
import { PlayerProfile } from "@/components/play/player-profile";
import { ActionSidebar } from "@/components/play/action-sidebar";
import { MoveHistory } from "@/components/play/move-history";
import { CapturedDisplay } from "@/components/play/captured-display";
import { useAuth } from "@/hooks/use-auth";
import { ProfileSettingsModal } from "@/components/play/profile-settings-modal";
import { UserDropdown } from "@/components/play/user-dropdown";
import { ChatModal } from "@/components/play/chat-modal";
import { HintModal } from "@/components/play/hint-modal";
import { GameSettingsModal } from "@/components/play/game-settings-modal";
import { analyzeMoveQuality } from "@/lib/chess-engine";

const THEME_STORAGE_KEY = "chesspro-board-theme";
const DIFFICULTY_STORAGE_KEY = "chesspro-difficulty";
const INITIAL_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export default function PlayPage() {
    const { user, signOut } = useAuth();
    const [boardTheme, setBoardTheme] = useState<BoardTheme>(defaultTheme);
    const [difficulty, setDifficulty] = useState<DifficultyLevel>(defaultDifficulty);
    const playerColor = "w";
    const [showProfileSettings, setShowProfileSettings] = useState(false);
    const [showGameSettings, setShowGameSettings] = useState(false);
    const [signInModalFeature, setSignInModalFeature] = useState<"hint" | "analysis" | "leaderboard" | null>(null);
    const [showGameEndModal, setShowGameEndModal] = useState(false);
    const [gameEndWinner, setGameEndWinner] = useState<"white" | "black" | "draw" | null>(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [userProfile, setUserProfile] = useState<{ full_name?: string; country?: string; avatar_url?: string; username?: string } | null>(null);

    // Hint & Chat State
    const [showChat, setShowChat] = useState(false);
    const [showHint, setShowHint] = useState(false);
    const [isHintLoading, setIsHintLoading] = useState(false);
    const [hintsUsed, setHintsUsed] = useState(0);

    const [hintMove, setHintMove] = useState<{ from: Square; to: Square } | null>(null);

    const handleGameEnd = useCallback(async (winner: "white" | "black" | "draw" | null, finalState?: GameState, timeState?: { whiteTime: number; blackTime: number }) => {
        setGameEndWinner(winner);
        setShowGameEndModal(true);

        if (user && finalState && timeState) {
            try {
                const { createClient } = await import("@/lib/supabase/client");
                const supabase = createClient();

                const result = winner === "white" ? "win" : winner === "black" ? "loss" : "draw";
                const durationSeconds = 600 - Math.min(timeState.whiteTime, timeState.blackTime);
                const accuracyScore = calculateAccuracy(finalState.moveHistory, playerColor);

                await supabase.from("game_analytics").insert({
                    user_id: user.id,
                    result,
                    difficulty: difficulty.id,
                    player_color: playerColor,
                    duration_seconds: durationSeconds,
                    moves_count: finalState.moveHistory.length,
                    hints_used: hintsUsed
                });

                await supabase.from("games").insert({
                    game_type: "ai",
                    white_user_id: user.id,
                    black_user_id: null,
                    winner_color: winner,
                    ai_difficulty: difficulty.id,
                    duration_seconds: durationSeconds,
                    moves_count: finalState.moveHistory.length,
                    hints_used: hintsUsed,
                    accuracy_score: accuracyScore,
                    initial_fen: INITIAL_FEN,
                    final_fen: finalState.fen,
                    started_at: new Date(Date.now() - durationSeconds * 1000).toISOString(),
                    ended_at: new Date().toISOString(),
                });
            } catch (error) {
                console.error("Error saving game analytics:", error);
            }
        }
        setHintsUsed(0);
    }, [user, difficulty.id, playerColor, hintsUsed]);

    const {
        gameState,
        isThinking,
        whiteTime,
        blackTime,
        makeMove,
        newGame,
        undoMove: _undoMove,
        getLegalMoves,
        changeDifficulty,
        getBestMove
    } = useChessGame({
        playerColor,
        difficulty: difficulty.id,
        onGameEnd: handleGameEnd
    });

    useEffect(() => {
        const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme) setBoardTheme(getThemeById(savedTheme));
        const savedDifficulty = localStorage.getItem(DIFFICULTY_STORAGE_KEY);
        if (savedDifficulty) {
            const diff = getDifficultyById(savedDifficulty);
            setDifficulty(diff);
            changeDifficulty(savedDifficulty);
        }
    }, [changeDifficulty]);

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

    const handlePieceDrop = (source: Square, target: Square) => {
        const move = makeMove(source, target);
        return move;
    };

    const handleThemeChange = (themeId: string) => {
        const theme = getThemeById(themeId);
        setBoardTheme(theme);
        localStorage.setItem(THEME_STORAGE_KEY, themeId);
    };

    const handleDifficultyChange = (levelId: string) => {
        const level = getDifficultyById(levelId);
        setDifficulty(level);
        changeDifficulty(levelId);
        localStorage.setItem(DIFFICULTY_STORAGE_KEY, levelId);
    };

    const handleHint = async () => {
        if (!user) {
            setSignInModalFeature("hint");
            return;
        }

        setIsHintLoading(true);
        try {
            const move = await getBestMove();
            setHintMove(move);
            setHintsUsed((count) => count + 1);
        } catch (error) {
            console.error("Hint error:", error);
        } finally {
            setIsHintLoading(false);
        }
    };

    const handleChat = () => {
        if (!user) {
            setSignInModalFeature("analysis");
            return;
        }
        setShowChat(true);
    };

    const handleNewGame = () => {
        setHintsUsed(0);
        newGame();
    };

    return (
        <div className="min-h-screen bg-[#F8F9FA] flex flex-col font-sans text-[var(--foreground)] selection:bg-[var(--accent)]/20 overflow-x-hidden w-full">
            {/* Header / Nav */}
            <header className="h-16 lg:h-20 flex items-center justify-between px-4 lg:px-8 border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-40">
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="w-8 h-8 lg:w-10 lg:h-10 bg-[var(--foreground)] rounded-xl flex items-center justify-center transition-transform group-hover:scale-105">
                        <svg className="w-5 h-5 lg:w-6 lg:h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19,22H5V20H19V22M17,10C17,8.89 16.1,8 15,8V7C15,5.89 14.1,5 13,5V4C13,2.89 12.1,2 11,2H9C7.89,2 7,2.89 7,4V5C5.89,5 5,5.89 5,7V8C3.89,8 3,8.89 3,10V18H21V10C21,8.89 20.1,8 19,8V7C19,5.89 18.1,5 17,10M17,18H7V10H17V18Z" />
                        </svg>
                    </div>
                    <span className="text-xl lg:text-2xl font-bold tracking-tight uppercase">Chess<span className="text-[var(--accent)]">Pro</span></span>
                </Link>

                <div className="flex items-center gap-4 lg:gap-6">
                    <div className="hidden lg:flex items-center gap-6">
                        <Link href="/leaderboard" className="text-sm font-semibold opacity-60 hover:opacity-100 transition-opacity">Leaderboard</Link>
                        <Link href="/puzzles" className="text-sm font-semibold opacity-60 hover:opacity-100 transition-opacity">Puzzles</Link>
                        <Link href="/analytics" className="text-sm font-semibold opacity-60 hover:opacity-100 transition-opacity">Analytics</Link>
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
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isMobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
                        </svg>
                    </button>
                </div>
            </header>

            <main className="flex-1 lg:grid lg:grid-cols-[1fr_560px_1fr] lg:gap-8 p-4 lg:p-8 max-w-[1800px] mx-auto w-full items-start">
                {/* Left Sidebar - Player Info & Controls (Desktop) */}
                <div className="hidden lg:flex flex-col gap-6 sticky top-28">
                    <PlayerProfile
                        name="Stockfish AI"
                        rating={difficulty.rating.toString()}
                        avatar="/icons8-chess.svg"
                        country="CPU"
                        time={blackTime}
                        isActive={gameState.turn === "b"}
                        isTop={true}
                        isThinking={isThinking}
                    />

                    <ActionSidebar
                        onNewGame={handleNewGame}
                        onSettings={() => setShowGameSettings(true)}
                        onFlip={() => { }}
                        onShare={() => { }}
                        onHint={handleHint}
                        onUndo={() => _undoMove()}
                        onChat={handleChat}
                        onRematch={handleNewGame}
                        isGameOver={gameState.isGameOver}
                    />

                    <PlayerProfile
                        name={userProfile?.full_name || user?.email?.split("@")[0] || "Player"}
                        rating="1200"
                        avatar={userProfile?.avatar_url || "/avatars/user-placeholder.jpg"}
                        country={userProfile?.country || "EARTH"}
                        time={whiteTime}
                        isActive={gameState.turn === "w"}
                    />
                </div>

                {/* Mobile View: Opponent Profile */}
                <div className="lg:hidden mb-4">
                    <PlayerProfile
                        name="Stockfish AI"
                        rating={difficulty.rating.toString()}
                        avatar="/icons8-chess.svg"
                        country="CPU"
                        time={blackTime}
                        isActive={gameState.turn === "b"}
                        isTop={true}
                        isThinking={isThinking}
                    />
                </div>

                {/* Center - Chess Board */}
                <div className="relative flex flex-col items-center">
                    <div className="w-full max-w-[min(90vw,calc(100vh-160px))] lg:max-w-[min(90vw,calc(100vh-160px))] relative aspect-square group px-4 lg:px-0">
                        <div className="absolute -inset-10 bg-[var(--accent)]/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                        <div className="w-full h-full bg-white rounded-2xl p-4 lg:p-6 shadow-[0_30px_100px_-20px_rgba(0,0,0,0.15)] border border-[var(--foreground)]/5 relative z-10 transition-transform duration-500 lg:hover:scale-[1.01]">
                            <ChessBoardWrapper
                                fen={gameState.fen}
                                theme={boardTheme}
                                playerColor={playerColor}
                                lastMove={gameState.lastMove}
                                hintMove={hintMove}
                                isThinking={isThinking}
                                onPieceDrop={(source, target) => {
                                    setHintMove(null);
                                    return handlePieceDrop(source, target);
                                }}
                                getLegalMoves={getLegalMoves}
                            />
                        </div>

                        {/* Status Message Overlaid */}
                        {(gameState.isGameOver || gameState.isCheck) && (
                            <div className="absolute lg:bottom-[-60px] bottom-[-40px] left-1/2 -translate-x-1/2 z-20">
                                <span className="text-2xl lg:text-4xl font-serif italic text-[var(--foreground)] transition-all animate-pulse whitespace-nowrap">
                                    {gameState.isCheckmate ? "Checkmate!" :
                                        gameState.isCheck ? "Check" :
                                            gameState.isDraw ? "Draw!" : ""}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Mobile Controls */}
                    <div className="lg:hidden w-full mt-8 flex flex-col gap-4">
                        <PlayerProfile
                            name={userProfile?.full_name || user?.email?.split("@")[0] || "Player"}
                            rating="1200"
                            avatar={userProfile?.avatar_url || "/avatars/user-placeholder.jpg"}
                            country={userProfile?.country || "EARTH"}
                            time={whiteTime}
                            isActive={gameState.turn === "w"}
                        />
                        <ActionSidebar
                        onNewGame={handleNewGame}
                            onSettings={() => setShowGameSettings(true)}
                            onFlip={() => { }}
                            onShare={() => { }}
                            onHint={handleHint}
                            onUndo={() => _undoMove()}
                            onChat={handleChat}
                        onRematch={handleNewGame}
                            isGameOver={gameState.isGameOver}
                        />
                    </div>
                </div>

                {/* Right Sidebar - Game Details (Desktop) */}
                <div className="hidden lg:flex flex-col gap-6 sticky top-28">
                    <MoveHistory moves={gameState.moveHistory} />
                    <CapturedDisplay
                        whiteCaptured={gameState.capturedPieces.white}
                        blackCaptured={gameState.capturedPieces.black}
                    />
                </div>
            </main>

            {/* Modals */}
            <SignInPromptModal
                isOpen={signInModalFeature !== null}
                onClose={() => setSignInModalFeature(null)}
                feature={signInModalFeature || "hint"}
            />

            <GameEndModal
                isOpen={showGameEndModal}
                onClose={() => setShowGameEndModal(false)}
                winner={gameEndWinner}
                playerColor={playerColor}
                moveCount={gameState.moveHistory.length}
                onNewGame={() => {
                    setShowGameEndModal(false);
                    handleNewGame();
                }}
            />

            <ProfileSettingsModal
                isOpen={showProfileSettings}
                onClose={() => setShowProfileSettings(false)}
                user={user}
                onProfileUpdate={() => setShowProfileSettings(false)}
            />

            <GameSettingsModal
                isOpen={showGameSettings}
                onClose={() => setShowGameSettings(false)}
                boardTheme={boardTheme}
                onThemeChange={handleThemeChange}
                difficulty={difficulty}
                onDifficultyChange={handleDifficultyChange}
            />

            <ChatModal
                isOpen={showChat}
                onClose={() => setShowChat(false)}
                fen={gameState.fen}
            />

            <HintModal
                isOpen={showHint}
                onClose={() => setShowHint(false)}
                hint=""
                isLoading={isHintLoading}
            />
        </div>
    );
}

function calculateAccuracy(moveHistory: GameState["moveHistory"], playerColor: "w" | "b") {
    if (moveHistory.length === 0) return null;
    const game = new Chess();
    const scores: Record<string, number> = {
        brilliant: 1,
        good: 0.8,
        inaccuracy: 0.5,
        mistake: 0.3,
        blunder: 0.1,
    };

    let total = 0;
    let count = 0;

    for (const move of moveHistory) {
        if (move.color !== playerColor) {
            game.move(move);
            continue;
        }
        const before = new Chess(game.fen());
        const quality = analyzeMoveQuality(before, move);
        total += scores[quality];
        count += 1;
        game.move(move);
    }

    if (count === 0) return null;
    return Math.round((total / count) * 100);
}
