"use client";

import { BoardTheme, boardThemes } from "@/lib/board-themes";

interface BoardStyleSelectorProps {
    currentTheme: BoardTheme;
    onThemeChange: (theme: BoardTheme) => void;
    isCompact?: boolean;
}

export function BoardStyleSelector({ currentTheme, onThemeChange, isCompact = false }: BoardStyleSelectorProps) {
    if (isCompact) {
        return (
            <div className="relative">
                <select
                    value={currentTheme.id}
                    onChange={(e) => {
                        const theme = boardThemes.find((t) => t.id === e.target.value);
                        if (theme) onThemeChange(theme);
                    }}
                    className="appearance-none w-full px-4 py-2.5 pr-10 rounded-xl border border-[var(--line)] bg-white text-sm font-semibold text-[var(--foreground)] cursor-pointer hover:border-[var(--accent-3)] transition-colors"
                >
                    {boardThemes.map((theme) => (
                        <option key={theme.id} value={theme.id}>
                            {theme.name}
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
                    Board Style
                </span>
            </div>
            <div className="p-3 grid grid-cols-2 gap-2">
                {boardThemes.map((theme) => (
                    <button
                        key={theme.id}
                        onClick={() => onThemeChange(theme)}
                        className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${currentTheme.id === theme.id
                                ? "border-[var(--accent-3)] bg-[var(--surface-2)]"
                                : "border-transparent hover:border-[var(--line)] hover:bg-[var(--surface-2)]"
                            }`}
                    >
                        {/* Mini board preview */}
                        <div className="w-10 h-10 rounded overflow-hidden shadow-sm ring-1 ring-black/10">
                            <div className="grid grid-cols-2 w-full h-full">
                                <div style={{ backgroundColor: theme.lightSquare }} />
                                <div style={{ backgroundColor: theme.darkSquare }} />
                                <div style={{ backgroundColor: theme.darkSquare }} />
                                <div style={{ backgroundColor: theme.lightSquare }} />
                            </div>
                        </div>
                        <span className={`text-xs font-semibold ${currentTheme.id === theme.id ? "text-[var(--accent-3)]" : "text-[var(--muted)]"
                            }`}>
                            {theme.name}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}
