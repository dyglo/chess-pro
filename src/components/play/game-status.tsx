"use client";

import { Color } from "chess.js";

interface GameStatusProps {
    turn: Color;
    isCheck: boolean;
    isCheckmate: boolean;
    isStalemate: boolean;
    isDraw: boolean;
    isThinking: boolean;
    winner: "white" | "black" | "draw" | null;
}

export function GameStatus({
    turn,
    isCheck,
    isCheckmate,
    isStalemate,
    isDraw,
    isThinking,
    winner,
}: GameStatusProps) {
    let statusText = "";
    let statusColor = "text-[var(--foreground)]";
    let bgColor = "bg-white";
    let icon = null;

    if (isCheckmate) {
        statusText = `Checkmate! ${winner === "white" ? "White" : "Black"} wins`;
        statusColor = "text-[var(--accent)]";
        bgColor = "bg-[var(--accent)]/10";
        icon = (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
        );
    } else if (isStalemate) {
        statusText = "Stalemate - Draw";
        statusColor = "text-[var(--muted)]";
        bgColor = "bg-[var(--surface-2)]";
    } else if (isDraw) {
        statusText = "Game Drawn";
        statusColor = "text-[var(--muted)]";
        bgColor = "bg-[var(--surface-2)]";
    } else if (isCheck) {
        statusText = `${turn === "w" ? "White" : "Black"} is in Check!`;
        statusColor = "text-[var(--accent)]";
        bgColor = "bg-[var(--accent)]/10";
        icon = (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
        );
    } else if (isThinking) {
        statusText = "Computer is thinking...";
        statusColor = "text-[var(--muted)]";
        icon = (
            <div className="w-4 h-4 border-2 border-[var(--muted)] border-t-transparent rounded-full animate-spin" />
        );
    } else {
        statusText = `${turn === "w" ? "White" : "Black"} to move`;
        icon = (
            <div className={`w-4 h-4 rounded-full border-2 border-[var(--line)] ${turn === "w" ? "bg-white" : "bg-[var(--accent-3)]"}`} />
        );
    }

    return (
        <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl ${bgColor} border border-[var(--line)] shadow-sm transition-all`}>
            {icon}
            <span className={`text-sm font-semibold ${statusColor}`}>{statusText}</span>
        </div>
    );
}
