"use client";

import { DifficultyLevel, difficultyLevels } from "@/lib/board-themes";

interface DifficultySelectorProps {
    currentDifficulty: DifficultyLevel;
    onDifficultyChange: (difficulty: DifficultyLevel) => void;
    isCompact?: boolean;
}

export function DifficultySelector({ currentDifficulty, onDifficultyChange, isCompact = false }: DifficultySelectorProps) {
    if (isCompact) {
        return (
            <div className="relative">
                <select
                    value={currentDifficulty.id}
                    onChange={(e) => {
                        const difficulty = difficultyLevels.find((d) => d.id === e.target.value);
                        if (difficulty) onDifficultyChange(difficulty);
                    }}
                    className="appearance-none w-full px-4 py-2.5 pr-10 rounded-xl border border-[var(--line)] bg-white text-sm font-semibold text-[var(--foreground)] cursor-pointer hover:border-[var(--accent-3)] transition-colors"
                >
                    {difficultyLevels.map((difficulty) => (
                        <option key={difficulty.id} value={difficulty.id}>
                            {difficulty.name} ({difficulty.rating})
                        </option>
                    ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-4 h-4 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-xl bg-white border border-[var(--line)] shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-[var(--surface-2)] border-b border-[var(--line)]">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                    AI Difficulty
                </span>
            </div>
            <div className="p-3 space-y-1">
                {difficultyLevels.map((difficulty) => (
                    <button
                        key={difficulty.id}
                        onClick={() => onDifficultyChange(difficulty)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${currentDifficulty.id === difficulty.id
                                ? "border-[var(--accent-3)] bg-[var(--surface-2)]"
                                : "border-transparent hover:border-[var(--line)] hover:bg-[var(--surface-2)]"
                            }`}
                    >
                        {/* Strength indicator */}
                        <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((level) => (
                                <div
                                    key={level}
                                    className={`w-1.5 h-4 rounded-full ${level <= difficultyLevels.indexOf(difficulty) + 1
                                            ? "bg-[var(--accent-3)]"
                                            : "bg-[var(--line)]"
                                        }`}
                                />
                            ))}
                        </div>
                        <div className="flex-1 text-left">
                            <div className={`text-sm font-semibold ${currentDifficulty.id === difficulty.id ? "text-[var(--accent-3)]" : "text-[var(--foreground)]"
                                }`}>
                                {difficulty.name}
                            </div>
                            <div className="text-xs text-[var(--muted)]">
                                {difficulty.description}
                            </div>
                        </div>
                        <span className="text-xs font-bold text-[var(--muted)] bg-[var(--surface-2)] px-2 py-1 rounded-full">
                            {difficulty.rating}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}
