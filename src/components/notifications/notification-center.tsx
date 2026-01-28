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
    const { pendingIncoming, activeMatches, activeLudoSessions, acceptRequest, declineRequest } = useMatchRequests();
    const [isOpen, setIsOpen] = useState(false);
    const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

    if (!user) return null;

    const isLight = variant === "light";
    const currentMatchId = pathname?.startsWith("/match/") ? pathname.split("/")[2] : null; // Matches
    const currentSessionId = pathname?.startsWith("/games/ludo") && pathname.includes("session=") ? pathname.split("session=")[1]?.split("&")[0] : null;

    const filteredMatches = activeMatches.filter(m => m.id !== currentMatchId && !dismissedIds.has(m.id));
    const filteredLudo = activeLudoSessions.filter(s => s.id !== currentSessionId && !dismissedIds.has(s.id));
    const filteredRequests = pendingIncoming.filter(r => !dismissedIds.has(r.id));

    const totalCount = filteredRequests.length + filteredMatches.length + filteredLudo.length;

    const handleDismiss = (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        setDismissedIds(prev => {
            const next = new Set(prev);
            next.add(id);
            return next;
        });
    };

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

                            {filteredRequests.map((req) => (
                                <div key={req.id} className={cn(
                                    "relative rounded-2xl border p-3",
                                    isLight ? "bg-zinc-50 border-zinc-100" : "bg-white/5 border-white/5"
                                )}>
                                    <button
                                        onClick={(e) => handleDismiss(e, req.id)}
                                        className={cn(
                                            "absolute top-2 right-2 p-1 rounded-full hover:bg-black/5 transition-colors",
                                            isLight ? "text-zinc-400" : "text-white/40"
                                        )}
                                    >
                                        <X size={12} />
                                    </button>
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
                                    "relative rounded-2xl border p-3",
                                    isLight ? "bg-red-50/50 border-red-100" : "bg-white/5 border-white/5"
                                )}>
                                    <button
                                        onClick={(e) => handleDismiss(e, match.id)}
                                        className={cn(
                                            "absolute top-2 right-2 p-1 rounded-full hover:bg-black/5 transition-colors",
                                            isLight ? "text-red-300 hover:text-red-500" : "text-white/40"
                                        )}
                                    >
                                        <X size={12} />
                                    </button>
                                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[#ef4444]">
                                        Match Ready
                                    </p>
                                    <p className={cn(
                                        "mt-1 text-sm font-medium",
                                        isLight ? "text-zinc-900" : "text-white"
                                    )}>
                                        Your chess match is live.
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

                            {filteredLudo.map((session) => (
                                <div key={session.id} className={cn(
                                    "relative rounded-2xl border p-3",
                                    isLight ? "bg-purple-50/50 border-purple-100" : "bg-white/5 border-white/5"
                                )}>
                                    <button
                                        onClick={(e) => handleDismiss(e, session.id)}
                                        className={cn(
                                            "absolute top-2 right-2 p-1 rounded-full hover:bg-black/5 transition-colors",
                                            isLight ? "text-purple-300 hover:text-purple-500" : "text-white/40"
                                        )}
                                    >
                                        <X size={12} />
                                    </button>
                                    <p className="text-[10px] font-semibold uppercase tracking-widest text-purple-600">
                                        Ludo Ready
                                    </p>
                                    <p className={cn(
                                        "mt-1 text-sm font-medium",
                                        isLight ? "text-zinc-900" : "text-white"
                                    )}>
                                        Ludo match is live!
                                    </p>
                                    <Link
                                        href={`/games/ludo?session=${session.id}&multiplayer=true`}
                                        onClick={() => setIsOpen(false)}
                                        className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-purple-600 px-3 py-1.5 text-xs font-bold text-white transition hover:brightness-110"
                                    >
                                        Play Ludo
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
