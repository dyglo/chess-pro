"use client";

import React, { useState } from "react";
import { Bell, X } from "lucide-react";
import { useMatchRequests } from "@/hooks/use-match-requests";
import { useAuth } from "@/hooks/use-auth";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function NotificationCenter({ variant = "dark" }: { variant?: "light" | "dark" }) {
    const { user } = useAuth();
    const pathname = usePathname();
    const { pendingIncoming, activeMatches, acceptRequest, declineRequest } = useMatchRequests();
    const [isOpen, setIsOpen] = useState(false);

    if (!user) return null;

    const isLight = variant === "light";
    const currentMatchId = pathname?.startsWith("/match/") ? pathname.split("/")[2] : null;
    const filteredMatches = activeMatches.filter(m => m.id !== currentMatchId);

    const totalCount = pendingIncoming.length + filteredMatches.length;

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "relative p-2 rounded-full transition-colors",
                    isLight ? "hover:bg-zinc-100 text-zinc-900" : "hover:bg-white/10 text-white"
                )}
                aria-label="Notifications"
            >
                <Bell size={20} />
                {totalCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] font-bold text-white shadow-lg">
                        {totalCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40 bg-transparent"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className={cn(
                        "absolute right-0 mt-3 w-80 max-h-[480px] overflow-hidden rounded-3xl border shadow-[0_20px_50px_rgba(0,0,0,0.15)] backdrop-blur-2xl z-50 animate-in slide-in-from-top-2 duration-200",
                        isLight ? "border-zinc-200 bg-white" : "border-white/10 bg-[#111]"
                    )}>
                        <div className={cn(
                            "flex items-center justify-between border-b p-4",
                            isLight ? "border-zinc-100" : "border-white/5"
                        )}>
                            <h3 className={cn(
                                "text-sm font-bold uppercase tracking-wider",
                                isLight ? "text-zinc-900" : "text-white"
                            )}>Notifications</h3>
                            <button
                                onClick={() => setIsOpen(false)}
                                className={cn(
                                    "transition-opacity",
                                    isLight ? "text-zinc-400 hover:text-zinc-900" : "opacity-50 hover:opacity-100"
                                )}
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="overflow-y-auto p-2 space-y-2 max-h-[400px]">
                            {totalCount === 0 && (
                                <div className={cn(
                                    "py-8 text-center text-xs",
                                    isLight ? "text-zinc-400" : "opacity-40"
                                )}>
                                    No new notifications
                                </div>
                            )}

                            {pendingIncoming.map((req) => (
                                <div key={req.id} className={cn(
                                    "rounded-2xl border p-3",
                                    isLight ? "bg-zinc-50 border-zinc-100" : "bg-white/5 border-white/5"
                                )}>
                                    <p className={cn(
                                        "text-[10px] font-semibold uppercase tracking-widest",
                                        isLight ? "text-zinc-400" : "text-white/40"
                                    )}>
                                        Match Request
                                    </p>
                                    <p className={cn(
                                        "mt-1 text-sm font-medium",
                                        isLight ? "text-zinc-900" : "text-white"
                                    )}>
                                        {req.requester?.full_name || req.requester?.username || "A player"}
                                    </p>
                                    <div className="mt-3 flex gap-2">
                                        <button
                                            onClick={() => {
                                                acceptRequest(req.id);
                                                setIsOpen(false);
                                            }}
                                            className="flex-1 rounded-full bg-[var(--accent)] px-3 py-1.5 text-xs font-bold text-white transition hover:brightness-110"
                                        >
                                            Accept
                                        </button>
                                        <button
                                            onClick={() => declineRequest(req.id)}
                                            className={cn(
                                                "flex-1 rounded-full border px-3 py-1.5 text-xs font-bold transition",
                                                isLight ? "border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50" : "border-white/10 bg-white/5 text-white hover:bg-white/10"
                                            )}
                                        >
                                            Decline
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {filteredMatches.map((match) => (
                                <div key={match.id} className={cn(
                                    "rounded-2xl border p-3",
                                    isLight ? "bg-red-50/50 border-red-100" : "bg-white/5 border-white/5"
                                )}>
                                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[#ef4444]">
                                        Match Ready
                                    </p>
                                    <p className={cn(
                                        "mt-1 text-sm font-medium",
                                        isLight ? "text-zinc-900" : "text-white"
                                    )}>
                                        Your match is live. Join now to play.
                                    </p>
                                    <Link
                                        href={`/match/${match.id}`}
                                        onClick={() => setIsOpen(false)}
                                        className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-[#ef4444] px-3 py-1.5 text-xs font-bold text-white transition hover:brightness-110"
                                    >
                                        Open Match
                                    </Link>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
