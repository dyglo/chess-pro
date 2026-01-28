"use client";

import React from "react";
import { Moon, Sun } from "lucide-react";

interface LudoThemeToggleProps {
    isDark: boolean;
    onToggle: () => void;
}

export function LudoThemeToggle({ isDark, onToggle }: LudoThemeToggleProps) {
    return (
        <button
            onClick={onToggle}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[var(--ludo-border-card)] transition-colors text-left group"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
            {isDark ? (
                <Sun className="w-4 h-4 text-[var(--ludo-text-muted)] group-hover:text-[var(--ludo-text-secondary)]" />
            ) : (
                <Moon className="w-4 h-4 text-[var(--ludo-text-muted)] group-hover:text-[var(--ludo-text-secondary)]" />
            )}
            <span className="text-xs font-semibold text-[var(--ludo-text-secondary)] group-hover:text-[var(--ludo-text-primary)]">
                {isDark ? "Light Mode" : "Dark Mode"}
            </span>
        </button>
    );
}
