"use client";

import { useState, useEffect, useCallback } from "react";
import { Square } from "chess.js";
import Image from "next/image";
import Link from "next/link";
import { useChessGame } from "@/hooks/use-chess-game";
import { BoardTheme, getThemeById, defaultTheme, boardThemes, DifficultyLevel, getDifficultyById, defaultDifficulty, difficultyLevels } from "@/lib/board-themes";
import { ChessBoardWrapper } from "@/components/play/chess-board-wrapper";
import { SignInPromptModal } from "@/components/play/sign-in-prompt-modal";
import { GameEndModal } from "@/components/play/game-end-modal";
import { PlayerProfile } from "@/components/play/player-profile";
import { ActionSidebar } from "@/components/play/action-sidebar";
import { MoveHistory } from "@/components/play/move-history";
import { CapturedDisplay } from "@/components/play/captured-display";

const THEME_STORAGE_KEY = "chesspro-board-theme";
const DIFFICULTY_STORAGE_KEY = "chesspro-difficulty";

export default function PlayPage() {
    const [boardTheme, setBoardTheme] = useState<BoardTheme>(defaultTheme);
    const [difficulty, setDifficulty] = useState<DifficultyLevel>(defaultDifficulty);
    const playerColor = "w";
    const [showSettings, setShowSettings] = useState(false);
    const [signInModalFeature, setSignInModalFeature] = useState<"hint" | "analysis" | "leaderboard" | null>(null);
    const [showGameEndModal, setShowGameEndModal] = useState(false);
    const [gameEndWinner, setGameEndWinner] = useState<"white" | "black" | "draw" | null>(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme) setBoardTheme(getThemeById(savedTheme));
        const savedDifficulty = localStorage.getItem(DIFFICULTY_STORAGE_KEY);
        if (savedDifficulty) setDifficulty(getDifficultyById(savedDifficulty));
    }, []);

    const handleGameEnd = useCallback((winner: "white" | "black" | "draw" | null) => {
        setGameEndWinner(winner);
        setShowGameEndModal(true);
    }, []);

    const { gameState, isThinking, whiteTime, blackTime, makeMove, newGame, getLegalMoves, changeDifficulty } = useChessGame({
        playerColor,
        difficulty: difficulty.id,
        onGameEnd: handleGameEnd,
    });

    const handleThemeChange = (theme: BoardTheme) => {
        setBoardTheme(theme);
        localStorage.setItem(THEME_STORAGE_KEY, theme.id);
    };

    const handleDifficultyChange = (newDiff: DifficultyLevel) => {
        setDifficulty(newDiff);
        changeDifficulty(newDiff.id);
        localStorage.setItem(DIFFICULTY_STORAGE_KEY, newDiff.id);
    };

    const handlePieceDrop = (sourceSquare: Square, targetSquare: Square): boolean => {
        if (gameState.turn !== playerColor || isThinking) return false;
        return makeMove(sourceSquare, targetSquare);
    };

    const handleNewGame = () => {
        setShowGameEndModal(false);
        setGameEndWinner(null);
        newGame(playerColor);
    };


    const handleHint = () => {
        setSignInModalFeature("hint");
    };

    const handleFlip = () => {
        // Implementation for flip board if available in hook
    };

    return (
        <div className="lg:h-screen min-h-screen flex flex-col bg-[radial-gradient(circle_at_top,_#ffffff_0%,_#fbfafa_55%,_#f5f2f0_100%)] text-[var(--foreground)] overflow-hidden font-sans">
            {/* Header - Minimalist */}
            <header className="w-full z-50 bg-transparent">
                <div className="mx-auto flex w-full items-center justify-between px-4 lg:px-8 py-6">
                    <div className="flex items-center gap-4 lg:gap-3">
                        {/* Hamburger Menu Icon (Mobile Only) */}
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="lg:hidden p-2 -ml-2 rounded-full hover:bg-[var(--foreground)]/5 transition-colors"
                        >
                            <svg className="w-6 h-6 text-[var(--foreground)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>

                        <Link href="/" className="flex items-center gap-3">
                            <Image
                                src="/icons8-chess.svg"
                                alt="ChessPro logo"
                                width={32}
                                height={32}
                                className="shrink-0"
                                priority
                            />
                            <span className="text-sm font-bold tracking-tight uppercase text-[var(--foreground)]">
                                Chess<span className="text-[var(--accent)]">Pro</span>
                            </span>
                        </Link>
                    </div>

                    <div className="flex items-center gap-4 lg:gap-8">
                        <div className="hidden lg:block">
                            <CapturedDisplay
                                whiteCaptured={gameState.capturedPieces.white}
                                blackCaptured={gameState.capturedPieces.black}
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <Link
                                href="#"
                                className="w-8 h-8 rounded-full overflow-hidden border border-[var(--foreground)]/10"
                            >
                                <Image src="/avatars/user-placeholder.jpg" alt="Profile" width={32} height={32} />
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-[100] bg-white lg:hidden">
                    <div className="flex flex-col h-full p-8">
                        <div className="flex items-center justify-between mb-12">
                            <div className="flex items-center gap-3">
                                <Image
                                    src="/icons8-chess.svg"
                                    alt="ChessPro logo"
                                    width={32}
                                    height={32}
                                />
                                <span className="text-sm font-bold tracking-tight uppercase">
                                    Chess<span className="text-[var(--accent)]">Pro</span>
                                </span>
                            </div>
                            <button
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="p-2 rounded-full hover:bg-[var(--foreground)]/5 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <nav className="flex flex-col gap-8">
                            {["Play", "Friends", "Leaderboard", "Learn"].map((item) => (
                                <Link
                                    key={item}
                                    href={`/${item.toLowerCase()}`}
                                    className="text-4xl font-serif italic text-[var(--foreground)] hover:text-[var(--accent)] transition-colors"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    {item}
                                </Link>
                            ))}
                        </nav>
                    </div>
                </div>
            )}

            <main className="flex-1 flex flex-col lg:flex-row lg:overflow-hidden overflow-y-auto lg:px-8 pb-8 gap-6 lg:gap-12">
                {/* Desktop Left / Mobile Bottom: Sidebar with Profiles and Tools */}
                <div className="lg:w-64 w-full flex flex-col lg:justify-between px-4 lg:px-0 lg:py-8 order-2 lg:order-1">
                    {/* Desktop Opponent Profile */}
                    <div className="hidden lg:block">
                        <PlayerProfile
                            name="Stockfish AI"
                            rating={difficulty.rating}
                            avatar="https://images.unsplash.com/photo-1527443224154-04a172c81235?auto=format&fit=crop&q=80&w=100"
                            country="CPU"
                            time={blackTime}
                            isActive={gameState.turn === "b"}
                            isTop
                        />
                    </div>

                    {/* Tools */}
                    <div className="flex-1 flex flex-col justify-center lg:py-0 py-6 border-y border-[var(--foreground)]/5 lg:border-none">
                        <ActionSidebar
                            onNewGame={handleNewGame}
                            onSettings={() => setShowSettings(true)}
                            onFlip={handleFlip}
                            onShare={() => { }}
                            onHint={handleHint}
                            onChat={() => { }}
                            onRematch={handleNewGame}
                            isGameOver={gameState.isGameOver}
                        />
                    </div>

                    {/* Desktop User Profile */}
                    <div className="hidden lg:block">
                        <PlayerProfile
                            name="Daria Chiltsova"
                            rating="1812"
                            avatar="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100"
                            country="RUS"
                            time={whiteTime}
                            isActive={gameState.turn === "w"}
                        />
                    </div>
                </div>

                {/* Center: Board */}
                <div className="flex-1 flex flex-col items-center justify-center order-1 lg:order-2">
                    {/* Mobile Opponent Profile */}
                    <div className="lg:hidden w-full px-4 mb-4">
                        <PlayerProfile
                            name="Stockfish AI"
                            rating={difficulty.rating}
                            avatar="https://images.unsplash.com/photo-1527443224154-04a172c81235?auto=format&fit=crop&q=80&w=100"
                            country="CPU"
                            time={blackTime}
                            isActive={gameState.turn === "b"}
                            isTop
                        />
                    </div>

                    <div className="w-full max-w-[min(90vw,calc(100vh-160px))] lg:max-w-[min(90vw,calc(100vh-160px))] relative aspect-square group px-4 lg:px-0">
                        <div className="absolute -inset-10 bg-[var(--accent)]/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                        <div className="w-full h-full bg-white rounded-2xl p-4 lg:p-6 shadow-[0_30px_100px_-20px_rgba(0,0,0,0.15)] border border-[var(--foreground)]/5 relative z-10 transition-transform duration-500 hover:scale-[1.01]">
                            <ChessBoardWrapper
                                fen={gameState.fen}
                                theme={boardTheme}
                                playerColor={playerColor}
                                lastMove={gameState.lastMove}
                                onPieceDrop={handlePieceDrop}
                                getLegalMoves={getLegalMoves}
                                isThinking={isThinking}
                            />
                        </div>

                        {/* Status Message Overlaid */}
                        {(gameState.isGameOver || gameState.isCheck) && (
                            <div className="absolute lg:bottom-[-60px] bottom-[-40px] left-1/2 -translate-x-1/2 z-20">
                                <span className="text-2xl lg:text-4xl font-serif italic text-[var(--foreground)] transition-all animate-pulse whitespace-nowrap">
                                    {gameState.isCheckmate ? "Checkmate!" :
                                        gameState.isCheck ? "Check" :
                                            gameState.isGameOver ? "Game Over" : ""}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Mobile User Profile */}
                    <div className="lg:hidden w-full px-4 mt-4">
                        <PlayerProfile
                            name="Daria Chiltsova"
                            rating="1812"
                            avatar="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100"
                            country="RUS"
                            time={whiteTime}
                            isActive={gameState.turn === "w"}
                        />
                    </div>
                </div>

                {/* Right: Move History */}
                <div className="lg:w-64 w-full h-[200px] lg:h-auto flex flex-col justify-center py-6 lg:py-12 order-3 px-4 lg:px-0">
                    <MoveHistory moves={gameState.moveHistory} />
                </div>
            </main>

            {/* Settings Panel (toggleable) */}
            {showSettings && (
                <div className="fixed inset-0 z-40 bg-black/5 hover:bg-black/10 transition-colors" onClick={() => setShowSettings(false)}>
                    <div
                        className="absolute right-6 top-24 w-80 bg-white rounded-3xl border border-[var(--foreground)]/5 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.1)] p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-sm font-black uppercase tracking-tighter text-[var(--foreground)]">Settings</h3>
                            <button onClick={() => setShowSettings(false)} className="text-[var(--foreground)]/40 hover:text-[var(--foreground)]">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Board Theme */}
                        <div className="mb-6">
                            <label className="text-[10px] font-black text-[var(--foreground)]/30 uppercase tracking-widest mb-3 block">Board Style</label>
                            <div className="grid grid-cols-5 gap-3">
                                {boardThemes.map((theme) => (
                                    <button
                                        key={theme.id}
                                        onClick={() => handleThemeChange(theme)}
                                        className={`aspect-square rounded-xl overflow-hidden ring-4 transition-all ${boardTheme.id === theme.id ? "ring-[var(--accent)]" : "ring-transparent hover:ring-[var(--foreground)]/10"
                                            }`}
                                        title={theme.name}
                                    >
                                        <div className="grid grid-cols-2 w-full h-full scale-110">
                                            <div style={{ backgroundColor: theme.lightSquare }} />
                                            <div style={{ backgroundColor: theme.darkSquare }} />
                                            <div style={{ backgroundColor: theme.darkSquare }} />
                                            <div style={{ backgroundColor: theme.lightSquare }} />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Difficulty */}
                        <div>
                            <label className="text-[10px] font-black text-[var(--foreground)]/30 uppercase tracking-widest mb-3 block">AI Difficulty</label>
                            <div className="grid grid-cols-1 gap-2">
                                {difficultyLevels.map((diff) => (
                                    <button
                                        key={diff.id}
                                        onClick={() => handleDifficultyChange(diff)}
                                        className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm transition-all border ${difficulty.id === diff.id ? "bg-[var(--foreground)] text-white border-transparent shadow-lg" : "text-[var(--foreground)]/80 border-[var(--foreground)]/5 hover:bg-[var(--foreground)]/5"
                                            }`}
                                    >
                                        <span className="font-bold">{diff.name}</span>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${difficulty.id === diff.id ? "bg-white/20" : "bg-[var(--foreground)]/5"}`}>{diff.rating}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modals */}
            <SignInPromptModal
                isOpen={signInModalFeature !== null}
                onClose={() => setSignInModalFeature(null)}
                feature={signInModalFeature || "hint"}
            />
            <GameEndModal
                isOpen={showGameEndModal}
                onClose={() => setShowGameEndModal(false)}
                onNewGame={handleNewGame}
                winner={gameEndWinner}
                playerColor={playerColor}
                moveCount={gameState.moveHistory.length}
            />
        </div>
    );
}
