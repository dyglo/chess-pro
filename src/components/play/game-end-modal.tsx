"use client";

interface GameEndModalProps {
    isOpen: boolean;
    onClose: () => void;
    onNewGame: () => void;
    winner: "white" | "black" | "draw" | null;
    playerColor: "w" | "b";
    moveCount: number;
}

export function GameEndModal({
    isOpen,
    onClose,
    onNewGame,
    winner,
    playerColor,
    moveCount
}: GameEndModalProps) {
    if (!isOpen || !winner) return null;

    const playerWon = (winner === "white" && playerColor === "w") || (winner === "black" && playerColor === "b");
    const isDraw = winner === "draw";

    let title = "";
    let subtitle = "";
    let emoji = "";
    let bgGradient = "";

    if (isDraw) {
        title = "Game Drawn";
        subtitle = "A hard-fought battle ends in a tie.";
        emoji = "🤝";
        bgGradient = "from-gray-500/20 to-gray-600/20";
    } else if (playerWon) {
        title = "Victory!";
        subtitle = "Congratulations! You outplayed the computer.";
        emoji = "🏆";
        bgGradient = "from-[var(--accent-2)]/30 to-[var(--accent)]/20";
    } else {
        title = "Defeat";
        subtitle = "The computer won this time. Try again!";
        emoji = "💪";
        bgGradient = "from-[var(--accent)]/20 to-[var(--accent)]/10";
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Gradient header */}
                <div className={`h-32 bg-gradient-to-br ${bgGradient} flex items-center justify-center`}>
                    <span className="text-6xl">{emoji}</span>
                </div>

                {/* Content */}
                <div className="p-8 text-center -mt-4">
                    <h2 className="text-3xl font-bold text-[var(--foreground)] mb-2">
                        {title}
                    </h2>

                    <p className="text-[var(--muted)] mb-6">
                        {subtitle}
                    </p>

                    {/* Stats */}
                    <div className="flex justify-center gap-8 mb-8">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-[var(--foreground)]">{Math.ceil(moveCount / 2)}</div>
                            <div className="text-xs text-[var(--muted)] uppercase tracking-wider">Moves</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-[var(--foreground)]">
                                {playerWon ? "+15" : isDraw ? "+5" : "-10"}
                            </div>
                            <div className="text-xs text-[var(--muted)] uppercase tracking-wider">Rating</div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="space-y-3">
                        <button
                            onClick={onNewGame}
                            className="w-full py-3.5 px-6 rounded-xl bg-[var(--accent-3)] text-white font-semibold shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-transform"
                        >
                            Play Again
                        </button>
                        <button className="w-full py-3.5 px-6 rounded-xl border-2 border-[var(--accent-2)] bg-[var(--accent-2)]/10 text-[var(--accent-3)] font-semibold hover:bg-[var(--accent-2)]/20 transition-colors">
                            🏅 Sign Up for Leaderboard
                        </button>
                    </div>

                    <button
                        onClick={onClose}
                        className="mt-4 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                    >
                        Review Game
                    </button>
                </div>
            </div>
        </div>
    );
}
