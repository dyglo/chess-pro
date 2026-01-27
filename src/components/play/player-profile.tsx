"use client";

import Image from "next/image";

interface PlayerProfileProps {
    name: string;
    rating: string;
    avatar: string;
    country: string;
    time: number;
    isActive: boolean;
    isTop?: boolean;
}

export function PlayerProfile({ name, rating, avatar, country, time, isActive, isTop, isThinking }: PlayerProfileProps & { isThinking?: boolean }) {
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    return (
        <div className={`flex items-center gap-6 ${isTop ? "flex-row" : "flex-row"}`}>
            {/* Avatar & Timer */}
            <div className="flex items-center gap-4">
                <div className={`relative w-12 h-12 rounded-full overflow-hidden border-2 transition-all ${isActive ? "border-[var(--accent)] scale-110 shadow-lg" : "border-transparent opacity-70"}`}>
                    <Image src={avatar} alt={name} fill className="object-cover" />
                    {isThinking && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-sm">
                            <div className="w-4 h-4 border-2 border-white/80 border-t-transparent rounded-full animate-spin" />
                        </div>
                    )}
                </div>
                <div className={`text-4xl font-light tracking-tight ${isActive ? "text-[var(--foreground)]" : "text-[var(--foreground)]/40"}`}>
                    {formatTime(time)}
                </div>
            </div>

            {/* Info */}
            <div className="flex flex-col">
                <div className="text-sm font-bold text-[var(--foreground)] flex items-center gap-2">
                    {name}
                    {isThinking && <span className="text-[10px] uppercase tracking-widest text-[var(--accent)] font-black animate-pulse">Thinking</span>}
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-[var(--foreground)]/40 uppercase tracking-widest">
                    <span>{rating}</span>
                    <span>•</span>
                    <span>{country}</span>
                </div>
            </div>
        </div>
    );
}
