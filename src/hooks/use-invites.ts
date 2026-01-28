"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

export interface Notification {
    id: string;
    user_id: string;
    type: string;
    title: string | null;
    message: string | null;
    payload: Record<string, unknown>;
    read_at: string | null;
    created_at: string;
}

export interface MatchInvite {
    id: string;
    match_id: string;
    from_user_id: string;
    to_user_id: string;
    game_type: "chess" | "ludo";
    status: "pending" | "accepted" | "declined" | "expired" | "cancelled";
    seat_index: number | null;
    created_at: string;
    from_user?: {
        id: string;
        full_name?: string;
        username?: string;
        avatar_url?: string;
    };
}

interface UseNotificationsOptions {
    userId?: string;
    onNewNotification?: (notification: Notification) => void;
}

/**
 * Hook to subscribe to user notifications in realtime.
 * Provides unread count and notification list for the nav bar badge.
 */
export function useNotifications(options: UseNotificationsOptions) {
    const { userId, onNewNotification } = options;
    const supabase = createClient();

    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    const channelRef = useRef<RealtimeChannel | null>(null);

    // Fetch notifications
    const fetchNotifications = useCallback(async () => {
        if (!userId) return;

        try {
            const { data, error } = await supabase
                .from("notifications")
                .select("*")
                .eq("user_id", userId)
                .order("created_at", { ascending: false })
                .limit(50);

            if (error) throw error;

            const notifs = (data ?? []) as Notification[];
            setNotifications(notifs);
            setUnreadCount(notifs.filter((n) => !n.read_at).length);
        } catch (err) {
            console.error("[Notifications] Fetch error:", err);
        }
    }, [userId, supabase]);

    // Initial load
    useEffect(() => {
        setIsLoading(true);
        fetchNotifications().finally(() => setIsLoading(false));
    }, [fetchNotifications]);

    // Realtime subscription
    useEffect(() => {
        if (!userId) return;

        const channel = supabase
            .channel(`notifications:${userId}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "notifications",
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => {
                    const notif = payload.new as Notification;
                    setNotifications((prev) => [notif, ...prev]);
                    setUnreadCount((prev) => prev + 1);
                    onNewNotification?.(notif);
                }
            )
            .subscribe();

        channelRef.current = channel;

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId, supabase, onNewNotification]);

    // Mark notification as read
    const markAsRead = useCallback(async (notificationId: string) => {
        const { error } = await supabase
            .from("notifications")
            .update({ read_at: new Date().toISOString() })
            .eq("id", notificationId);

        if (!error) {
            setNotifications((prev) =>
                prev.map((n) =>
                    n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n
                )
            );
            setUnreadCount((prev) => Math.max(0, prev - 1));
        }
    }, [supabase]);

    // Mark all as read
    const markAllAsRead = useCallback(async () => {
        const unreadIds = notifications.filter((n) => !n.read_at).map((n) => n.id);
        if (unreadIds.length === 0) return;

        const { error } = await supabase
            .from("notifications")
            .update({ read_at: new Date().toISOString() })
            .in("id", unreadIds);

        if (!error) {
            setNotifications((prev) =>
                prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
            );
            setUnreadCount(0);
        }
    }, [notifications, supabase]);

    return {
        notifications,
        unreadCount,
        isLoading,
        markAsRead,
        markAllAsRead,
        refresh: fetchNotifications,
    };
}

interface UseMatchInvitesOptions {
    userId?: string;
    onInviteReceived?: (invite: MatchInvite) => void;
}

/**
 * Hook to manage match invites for the current user.
 */
export function useMatchInvites(options: UseMatchInvitesOptions) {
    const { userId, onInviteReceived } = options;
    const supabase = createClient();

    const [pendingInvites, setPendingInvites] = useState<MatchInvite[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch pending invites
    const fetchInvites = useCallback(async () => {
        if (!userId) {
            setPendingInvites([]);
            setIsLoading(false);
            return;
        }

        try {
            // Fetch invites without relation join (from_user_id doesn't have FK to profiles)
            const { data: invitesData, error: invitesError } = await supabase
                .from("match_invites")
                .select("*")
                .eq("to_user_id", userId)
                .eq("status", "pending")
                .order("created_at", { ascending: false });

            if (invitesError) {
                console.error("[MatchInvites] Fetch error:", invitesError.message, invitesError.code);
                return;
            }

            if (!invitesData || invitesData.length === 0) {
                setPendingInvites([]);
                return;
            }

            // Fetch profile info for the inviters
            const fromUserIds = [...new Set(invitesData.map(i => i.from_user_id))];
            const { data: profilesData } = await supabase
                .from("profiles")
                .select("id, full_name, username, avatar_url")
                .in("id", fromUserIds);

            const profilesMap = new Map((profilesData ?? []).map(p => [p.id, p]));

            // Merge profiles into invites
            const invitesWithProfiles = invitesData.map(invite => ({
                ...invite,
                from_user: profilesMap.get(invite.from_user_id) || undefined,
            }));

            setPendingInvites(invitesWithProfiles as MatchInvite[]);
        } catch (err) {
            console.error("[MatchInvites] Fetch error:", err);
        }
    }, [userId, supabase]);

    // Initial load
    useEffect(() => {
        setIsLoading(true);
        fetchInvites().finally(() => setIsLoading(false));
    }, [fetchInvites]);

    // Realtime subscription for new invites
    useEffect(() => {
        if (!userId) return;

        const channel = supabase
            .channel(`invites:${userId}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "match_invites",
                    filter: `to_user_id=eq.${userId}`,
                },
                async (payload) => {
                    const newInvite = payload.new as MatchInvite;

                    // Manually fetch from profile
                    const { data: profile } = await supabase
                        .from("profiles")
                        .select("id, full_name, username, avatar_url")
                        .eq("id", newInvite.from_user_id)
                        .single();

                    if (profile) {
                        const inviteWithProfile = {
                            ...newInvite,
                            from_user: profile
                        };
                        setPendingInvites((prev) => [inviteWithProfile, ...prev]);
                        onInviteReceived?.(inviteWithProfile);
                    } else {
                        // Fallback just in case profile not found immediately
                        setPendingInvites((prev) => [newInvite, ...prev]);
                        onInviteReceived?.(newInvite);
                    }
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "match_invites",
                    filter: `to_user_id=eq.${userId}`,
                },
                (payload) => {
                    const updated = payload.new as MatchInvite;
                    if (updated.status !== "pending") {
                        // Remove from pending list
                        setPendingInvites((prev) => prev.filter((i) => i.id !== updated.id));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId, supabase, onInviteReceived]);

    // Accept invite using RPC
    const acceptInvite = useCallback(async (inviteId: string) => {
        try {
            const { data, error } = await supabase.rpc("accept_invite", {
                p_invite_id: inviteId,
            });

            if (error) throw error;

            // Remove from pending
            setPendingInvites((prev) => prev.filter((i) => i.id !== inviteId));

            return {
                success: true,
                matchId: (data as { matchId?: string })?.matchId,
                gameType: (data as { gameType?: string })?.gameType,
            };
        } catch (err) {
            console.error("[MatchInvites] Accept error:", err);
            return { success: false, error: (err as Error).message };
        }
    }, [supabase]);

    // Decline invite
    const declineInvite = useCallback(async (inviteId: string) => {
        try {
            const { error } = await supabase
                .from("match_invites")
                .update({ status: "declined", responded_at: new Date().toISOString() })
                .eq("id", inviteId);

            if (error) throw error;

            setPendingInvites((prev) => prev.filter((i) => i.id !== inviteId));
            return { success: true };
        } catch (err) {
            console.error("[MatchInvites] Decline error:", err);
            return { success: false, error: (err as Error).message };
        }
    }, [supabase]);

    // Create match and invite players
    const createMatchAndInvite = useCallback(async (gameType: "chess" | "ludo", inviteeIds: string[]) => {
        try {
            // Create match
            const { data: matchId, error: createError } = await supabase.rpc("create_match", {
                p_game_type: gameType,
                p_mode: "multiplayer",
            });

            if (createError) throw createError;

            // Invite players
            const { error: inviteError } = await supabase.rpc("invite_players", {
                p_match_id: matchId,
                p_user_ids: inviteeIds,
            });

            if (inviteError) throw inviteError;

            return { success: true, matchId };
        } catch (err) {
            console.error("[MatchInvites] Create error:", err);
            return { success: false, error: (err as Error).message };
        }
    }, [supabase]);

    // Start match (for host)
    const startMatch = useCallback(async (matchId: string) => {
        try {
            const { error } = await supabase.rpc("start_match", {
                p_match_id: matchId,
            });

            if (error) throw error;
            return { success: true };
        } catch (err) {
            console.error("[MatchInvites] Start error:", err);
            return { success: false, error: (err as Error).message };
        }
    }, [supabase]);

    return {
        pendingInvites,
        isLoading,
        acceptInvite,
        declineInvite,
        createMatchAndInvite,
        startMatch,
        refresh: fetchInvites,
    };
}
