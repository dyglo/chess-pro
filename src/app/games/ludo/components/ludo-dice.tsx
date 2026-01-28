"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface LudoDiceProps {
    value: number | null;
    isRolling: boolean;
    onRoll: () => void;
    disabled: boolean;
    className?: string;
}

// Pip positions for each dice face (1-6)
const PIP_POSITIONS: Record<number, [number, number][]> = {
    1: [[50, 50]],
    2: [[25, 25], [75, 75]],
    3: [[25, 25], [50, 50], [75, 75]],
    4: [[25, 25], [75, 25], [25, 75], [75, 75]],
    5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
    6: [[25, 25], [75, 25], [25, 50], [75, 50], [25, 75], [75, 75]],
};

export function LudoDice({ value, isRolling, onRoll, disabled, className }: LudoDiceProps) {
    const [rollingValue, setRollingValue] = useState<number>(1);

    // Animate through random values while rolling
    useEffect(() => {
        if (isRolling) {
            const interval = setInterval(() => {
                setRollingValue(Math.floor(Math.random() * 6) + 1);
            }, 100);
            return () => clearInterval(interval);
        }
    }, [isRolling]);

    const currentDisplayValue = isRolling ? rollingValue : (value || 1);
    const pips = PIP_POSITIONS[currentDisplayValue] || PIP_POSITIONS[1];

    return (
        <div className={cn("flex flex-col items-center gap-3", className)}>
            {/* Dice */}
            <button
                onClick={onRoll}
                disabled={disabled}
                className={cn(
                    "relative w-16 h-16 bg-white rounded-xl border-2 border-gray-200 shadow-lg transition-all duration-200",
                    "hover:scale-105 hover:shadow-xl active:scale-95",
                    "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
                    isRolling && "animate-bounce",
                    !value && !isRolling && "opacity-60"
                )}
                style={{
                    transform: isRolling ? `rotate(${rollingValue * 30}deg)` : undefined,
                }}
            >
                {/* Dice face with pips */}
                <svg
                    viewBox="0 0 100 100"
                    className="w-full h-full"
                >
                    {pips.map(([x, y], i) => (
                        <circle
                            key={i}
                            cx={x}
                            cy={y}
                            r={10}
                            className="fill-gray-800"
                        />
                    ))}
                </svg>

                {/* Glow effect on active */}
                {value && !isRolling && (
                    <div className="absolute inset-0 rounded-xl ring-2 ring-[var(--accent)]/30 animate-pulse" />
                )}
            </button>

            {/* Roll Button */}
            <button
                onClick={onRoll}
                disabled={disabled}
                className={cn(
                    "px-6 py-2 bg-[var(--accent)] rounded-xl font-bold text-white text-sm shadow-lg transition-all",
                    "hover:scale-105 active:scale-95",
                    "disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed"
                )}
            >
                {isRolling ? "Rolling..." : "Roll Dice"}
            </button>

            {/* Result display */}
            {value && !isRolling && (
                <div className="text-xs font-bold text-[var(--ludo-text-muted)] uppercase tracking-wider">
                    Rolled: {value}
                </div>
            )}
        </div>
    );
}
