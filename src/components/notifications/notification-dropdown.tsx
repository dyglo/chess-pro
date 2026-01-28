"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Bell, Users, ChevronRight } from "lucide-react";
import { useNotifications, useMatchInvites, Notification, MatchInvite } from "@/hooks/use-invites";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface NotificationDropdownProps {
    className?: string;
}

export function NotificationDropdown({ className }: NotificationDropdownProps) {
    const { user } = useAuth();
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const {
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
    } = useNotifications({
        userId: user?.id,
        onNewNotification: (notif) => {
            // Show toast or play sound for new notification
            console.log("New notification:", notif);
        },
    });

    const {
        pendingInvites,
        acceptInvite,
        declineInvite,
    } = useMatchInvites({
        userId: user?.id,
    });

    // Close on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleAcceptInvite = async (invite: MatchInvite) => {
        const result = await acceptInvite(invite.id);
        if (result.success && result.matchId) {
            setIsOpen(false);
            if (result.gameType === "ludo") {
                router.push(`/games/ludo?match=${result.matchId}&multiplayer=true`);
            } else {
                router.push(`/match/${result.matchId}`);
            }
        }
    };

    const handleNotificationClick = (notif: Notification) => {
        markAsRead(notif.id);

        // Navigate based on notification type
        const payload = notif.payload as { matchId?: string; gameType?: string; inviteId?: string };

        if (notif.type === "match_invite" && payload.inviteId) {
            // The invite will be shown in pendingInvites
            return;
        }

        if (notif.type === "match_started" && payload.matchId) {
            setIsOpen(false);
            if (payload.gameType === "ludo") {
                router.push(`/games/ludo?match=${payload.matchId}&multiplayer=true`);
            } else {
                router.push(`/match/${payload.matchId}`);
            }
        }
    };

    const totalUnread = unreadCount + pendingInvites.length;

    return (
        <div ref={dropdownRef} className={cn("relative", className)}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Notifications"
            >
                <Bell className="w-5 h-5" />
                {totalUnread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
                        {totalUnread > 99 ? "99+" : totalUnread}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 max-h-[480px] overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl z-50">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                        <h3 className="font-bold text-sm">Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="text-xs text-[var(--accent)] font-semibold hover:underline"
                            >
                                Mark all read
                            </button>
                        )}
                    </div>

                    {/* Content */}
                    <div className="max-h-[400px] overflow-y-auto">
                        {/* Pending Invites Section */}
                        {pendingInvites.length > 0 && (
                            <div className="border-b border-gray-100">
                                <div className="px-4 py-2 bg-purple-50">
                                    <p className="text-xs font-bold text-purple-700 uppercase tracking-wider">
                                        <Users className="w-3 h-3 inline mr-1" />
                                        Game Invites
                                    </p>
                                </div>
                                {pendingInvites.map((invite) => (
                                    <div
                                        key={invite.id}
                                        className="px-4 py-3 border-b border-gray-50 bg-purple-50/50"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <p className="text-sm font-semibold">
                                                    {invite.from_user?.full_name || invite.from_user?.username || "Player"}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    Invited you to play {invite.game_type === "ludo" ? "🎲 Ludo" : "♟ Chess"}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 mt-2">
                                            <button
                                                onClick={() => handleAcceptInvite(invite)}
                                                className="flex-1 px-3 py-1.5 bg-[var(--accent)] text-white text-xs font-bold rounded-full hover:brightness-110 transition"
                                            >
                                                Accept
                                            </button>
                                            <button
                                                onClick={() => declineInvite(invite.id)}
                                                className="flex-1 px-3 py-1.5 border border-gray-200 text-gray-600 text-xs font-bold rounded-full hover:bg-gray-50 transition"
                                            >
                                                Decline
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Regular Notifications */}
                        {notifications.length > 0 ? (
                            notifications.slice(0, 10).map((notif) => (
                                <button
                                    key={notif.id}
                                    onClick={() => handleNotificationClick(notif)}
                                    className={cn(
                                        "w-full px-4 py-3 text-left border-b border-gray-50 hover:bg-gray-50 transition flex items-start gap-3",
                                        !notif.read_at && "bg-blue-50/50"
                                    )}
                                >
                                    <div className="flex-shrink-0 mt-0.5">
                                        {!notif.read_at && (
                                            <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold truncate">
                                            {notif.title || "Notification"}
                                        </p>
                                        <p className="text-xs text-gray-500 line-clamp-2">
                                            {notif.message}
                                        </p>
                                        <p className="text-[10px] text-gray-400 mt-1">
                                            {new Date(notif.created_at).toLocaleString(undefined, {
                                                month: "short",
                                                day: "numeric",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </p>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0 mt-1" />
                                </button>
                            ))
                        ) : pendingInvites.length === 0 ? (
                            <div className="px-4 py-8 text-center text-sm text-gray-400">
                                No notifications yet
                            </div>
                        ) : null}
                    </div>

                    {/* Footer */}
                    <Link
                        href="/friends"
                        onClick={() => setIsOpen(false)}
                        className="block px-4 py-3 text-center text-xs font-semibold text-[var(--accent)] hover:bg-gray-50 border-t border-gray-100"
                    >
                        View all activity
                    </Link>
                </div>
            )}
        </div>
    );
}
