"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface LudoActivityLogProps {
    logs: string[];
    className?: string;
}

export function LudoActivityLog({ logs, className }: LudoActivityLogProps) {
    return (
        <div className={cn(
            "bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-gray-100 overflow-hidden",
            className
        )}>
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">
                    Live Activity
                </h3>
            </div>
            <div className="h-[180px] overflow-y-auto">
                <div className="p-3 space-y-2">
                    {logs.map((log, i) => (
                        <div
                            key={i}
                            className={cn(
                                "text-xs font-medium px-2 py-1.5 rounded-lg transition-all duration-300",
                                i === 0
                                    ? "bg-[var(--accent)]/10 text-[var(--accent)] border-l-2 border-[var(--accent)]"
                                    : "text-gray-400 border-l-2 border-gray-100"
                            )}
                        >
                            {log}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

