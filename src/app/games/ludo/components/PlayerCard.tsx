"use client";

import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Cpu, User } from "lucide-react";

interface LudoPlayerCardProps {
    name: string;
    isAi: boolean;
    color: 'blue' | 'red' | 'green' | 'yellow';
    isActive: boolean;
    level?: number;
    country?: string;
    avatarUrl?: string;
    userId?: string;
    finishedCount?: number;
    status?: string;
    className?: string;
}

export function LudoPlayerCard({
    name,
    isAi,
    color,
    isActive,
    country = "Global",
    avatarUrl,
    finishedCount = 0,
    status,
    className,
}: LudoPlayerCardProps) {
    const colorClasses = {
        blue: {
            bg: "bg-blue-50",
            border: "border-blue-200",
            text: "text-blue-600",
            ring: "ring-blue-400",
            badge: "bg-blue-500",
        },
        red: {
            bg: "bg-red-50",
            border: "border-red-200",
            text: "text-red-600",
            ring: "ring-red-400",
            badge: "bg-red-500",
        },
        green: {
            bg: "bg-green-50",
            border: "border-green-200",
            text: "text-green-600",
            ring: "ring-green-400",
            badge: "bg-green-500",
        },
        yellow: {
            bg: "bg-yellow-50",
            border: "border-yellow-200",
            text: "text-yellow-700",
            ring: "ring-yellow-400",
            badge: "bg-yellow-500",
        },
    };

    const colors = colorClasses[color];
    const statusLabel = isAi
        ? "AI"
        : status === "pending"
            ? "Pending"
            : status === "left"
                ? "Left"
                : "Online";
    const statusStyles = isAi
        ? "bg-indigo-100 text-indigo-700"
        : status === "pending"
            ? "bg-amber-100 text-amber-700"
            : status === "left"
                ? "bg-gray-200 text-gray-600"
                : "bg-emerald-100 text-emerald-700";

    return (
        <div
            className={cn(
                "relative flex items-center gap-3 p-3 rounded-xl border transition-all duration-300",
                isActive
                    ? cn("bg-[var(--ludo-bg-card-active)] shadow-lg border-transparent ring-2", colors.ring)
                    : cn("bg-[var(--ludo-bg-card)] border-[var(--ludo-border-card)] opacity-60"),
                className
            )}
        >
            {/* Avatar */}
            <div className="relative flex-shrink-0">
                <div className={cn(
                    "w-10 h-10 rounded-full overflow-hidden border-2 flex items-center justify-center",
                    isActive ? "border-[var(--ludo-border-card)]" : "border-[var(--ludo-border-card)]",
                    !avatarUrl && "bg-[var(--ludo-border-card)]"
                )}>
                    {avatarUrl ? (
                        <Image
                            src={avatarUrl}
                            alt={name}
                            width={40}
                            height={40}
                            className="object-cover w-full h-full"
                        />
                    ) : isAi ? (
                        <Cpu className="w-5 h-5 text-gray-400" />
                    ) : (
                        <User className="w-5 h-5 text-gray-400" />
                    )}
                </div>

                {/* AI / Human Badge */}
                <div className={cn(
                    "absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center shadow-sm",
                    isAi ? "bg-indigo-500" : "bg-emerald-500"
                )}>
                    {isAi ? (
                        <Cpu className="w-2.5 h-2.5 text-white" />
                    ) : (
                        <User className="w-2.5 h-2.5 text-white" />
                    )}
                </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className={cn(
                        "text-sm font-bold truncate",
                        isActive ? "text-[var(--ludo-text-primary)]" : "text-[var(--ludo-text-secondary)]"
                    )}>
                        {name}
                    </span>
                    {isActive && (
                        <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    )}
                    <span className={cn(
                        "px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide",
                        statusStyles
                    )}>
                        {statusLabel}
                    </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className={cn(
                        "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase",
                        colors.bg, colors.text
                    )}>
                        {color}
                    </span>
                    {country && (
                        <span className="text-[10px] text-[var(--ludo-text-muted)] font-medium">
                            {country}
                        </span>
                    )}
                </div>
                {finishedCount > 0 && (
                    <div className="text-[10px] text-[var(--ludo-text-muted)] font-semibold mt-1">
                        Out: {finishedCount}/4 waiting
                    </div>
                )}
            </div>

            {/* Thinking Indicator for AI */}
            {isActive && isAi && (
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-indigo-500 rounded-full text-[8px] font-bold text-white uppercase tracking-wider shadow-sm">
                    Thinking...
                </div>
            )}
        </div>
    );
}

