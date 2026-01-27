"use client";

import { type BoardTheme, type DifficultyLevel, boardThemes, difficultyLevels } from "@/lib/board-themes";

interface GameSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    boardTheme: BoardTheme;
    onThemeChange: (themeId: string) => void;
    difficulty: DifficultyLevel;
    onDifficultyChange: (levelId: string) => void;
}

export function GameSettingsModal({
    isOpen,
    onClose,
    boardTheme,
    onThemeChange,
    difficulty,
    onDifficultyChange
}: GameSettingsModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold">Game Settings</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <svg className="w-5 h-5 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="space-y-8">
                    <div>
                        <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4">Board Style</h3>
                        <div className="flex flex-wrap gap-4">
                            {boardThemes.map((t) => (
                                <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => onThemeChange(t.id)}
                                    className={`w-12 h-12 rounded-xl border-2 transition-all ${boardTheme.id === t.id ? "border-[var(--accent)] scale-110 shadow-lg" : "border-transparent opacity-60 hover:opacity-100"}`}
                                    style={{ background: `linear-gradient(135deg, ${t.lightSquare} 50%, ${t.darkSquare} 50%)` }}
                                />
                            ))}
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4">AI Difficulty</h3>
                        <div className="grid grid-cols-2 gap-3">
                            {difficultyLevels.map((level) => (
                                <button
                                    key={level.id}
                                    type="button"
                                    onClick={() => onDifficultyChange(level.id)}
                                    className={`px-4 py-3 rounded-2xl text-sm font-bold transition-all ${difficulty.id === level.id ? "bg-[var(--foreground)] text-white shadow-lg" : "bg-gray-50 text-gray-500 hover:bg-gray-100"}`}
                                >
                                    <div className="flex flex-col items-start translate-y-px">
                                        <span>{level.name}</span>
                                        <span className="text-[10px] opacity-60">Level {level.id}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <button
                    onClick={onClose}
                    className="w-full mt-8 bg-[var(--foreground)] text-white py-4 rounded-2xl font-semibold hover:bg-[var(--foreground)]/90 transition-colors"
                >
                    Close
                </button>
            </div>
        </div>
    );
}
