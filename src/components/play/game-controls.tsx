"use client";

interface GameControlsProps {
    onNewGame: () => void;
    onResign: () => void;
    onHint: () => void;
    onUndo: () => void;
    isGameOver: boolean;
    isThinking: boolean;
    canUndo: boolean;
}

export function GameControls({
    onNewGame,
    onResign,
    onHint,
    onUndo,
    isGameOver,
    isThinking,
    canUndo,
}: GameControlsProps) {
    return (
        <div className="flex flex-wrap gap-2">
            <button
                onClick={onNewGame}
                className="flex items-center gap-2 rounded-xl bg-[var(--accent-3)] px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:scale-105 active:scale-95"
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                New Game
            </button>

            {!isGameOver && (
                <>
                    <button
                        onClick={onHint}
                        disabled={isThinking}
                        className="flex items-center gap-2 rounded-xl border border-[var(--accent-2)] bg-[var(--accent-2)]/10 px-4 py-2.5 text-sm font-semibold text-[var(--accent-3)] transition hover:bg-[var(--accent-2)]/20 disabled:opacity-50"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        Hint
                    </button>

                    <button
                        onClick={onUndo}
                        disabled={isThinking || !canUndo}
                        className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--muted)] transition hover:bg-[var(--surface-2)] disabled:opacity-50"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                        Undo
                    </button>

                    <button
                        onClick={onResign}
                        disabled={isThinking}
                        className="flex items-center gap-2 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-4 py-2.5 text-sm font-semibold text-[var(--accent)] transition hover:bg-[var(--accent)]/20 disabled:opacity-50"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                        </svg>
                        Resign
                    </button>
                </>
            )}
        </div>
    );
}
