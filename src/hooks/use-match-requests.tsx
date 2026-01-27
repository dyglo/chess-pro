"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export interface ProfileLite {
  id: string;
  full_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
}

export interface FriendRequest {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: "pending" | "accepted" | "declined" | "cancelled";
  created_at: string;
  responded_at?: string | null;
  match_id?: string | null;
  requester?: ProfileLite | null;
  recipient?: ProfileLite | null;
}

export interface MatchRow {
  id: string;
  status: "pending" | "active" | "completed" | "cancelled";
  white_user_id?: string | null;
  black_user_id?: string | null;
  game_id?: string | null;
  created_at: string;
  started_at?: string | null;
  ended_at?: string | null;
}

async function fetchProfilesByIds(ids: string[]) {
  if (ids.length === 0) return [];
  const supabase = createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url")
    .in("id", ids);
  return data ?? [];
}

export function useMatchRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: requestRows, error: requestError } = await supabase
        .from("friend_requests")
        .select("*")
        .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (requestError) throw requestError;

      const profileIds = Array.from(
        new Set(
          (requestRows ?? []).flatMap((r) => [r.requester_id, r.recipient_id])
        )
      );
      const profiles = await fetchProfilesByIds(profileIds);
      const profileMap = new Map(profiles.map((p) => [p.id, p]));

      const hydrated = (requestRows ?? []).map((r) => ({
        ...r,
        requester: profileMap.get(r.requester_id) ?? null,
        recipient: profileMap.get(r.recipient_id) ?? null,
      }));

      setRequests(hydrated);

      const { data: matchRows, error: matchError } = await supabase
        .from("matches")
        .select("*")
        .or(`white_user_id.eq.${user.id},black_user_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (matchError) throw matchError;
      setMatches(matchRows ?? []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    refresh();
  }, [user, refresh]);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    const requestsChannel = supabase
      .channel("friend-requests")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "friend_requests", filter: `recipient_id=eq.${user.id}` },
        () => refresh()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "friend_requests", filter: `requester_id=eq.${user.id}` },
        () => refresh()
      )
      .subscribe();

    const matchesChannel = supabase
      .channel("matches-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches", filter: `white_user_id=eq.${user.id}` },
        () => refresh()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches", filter: `black_user_id=eq.${user.id}` },
        () => refresh()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(requestsChannel);
      supabase.removeChannel(matchesChannel);
    };
  }, [user, refresh]);

  const sendRequest = useCallback(
    async (recipientId: string) => {
      if (!user) return { error: "Not authenticated" };
      const supabase = createClient();
      const { error: insertError } = await supabase.from("friend_requests").insert({
        requester_id: user.id,
        recipient_id: recipientId,
        status: "pending",
      });
      if (insertError) return { error: insertError.message };
      await refresh();
      return { error: null };
    },
    [user, refresh]
  );

  const acceptRequest = useCallback(
    async (requestId: string) => {
      if (!user) return { error: "Not authenticated" };
      const supabase = createClient();
      const { data, error: rpcError } = await supabase.rpc("accept_match_request", {
        request_id: requestId,
      });
      if (rpcError) return { error: rpcError.message, matchId: null as string | null };
      await refresh();
      return { error: null, matchId: data as string };
    },
    [user, refresh]
  );

  const declineRequest = useCallback(
    async (requestId: string) => {
      if (!user) return { error: "Not authenticated" };
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("friend_requests")
        .update({ status: "declined", responded_at: new Date().toISOString() })
        .eq("id", requestId);
      if (updateError) return { error: updateError.message };
      await refresh();
      return { error: null };
    },
    [user, refresh]
  );

  const pendingIncoming = useMemo(
    () => requests.filter((r) => r.status === "pending" && r.recipient_id === user?.id),
    [requests, user]
  );

  const pendingOutgoing = useMemo(
    () => requests.filter((r) => r.status === "pending" && r.requester_id === user?.id),
    [requests, user]
  );

  const activeMatches = useMemo(
    () => matches.filter((m) => m.status === "active"),
    [matches]
  );

  return {
    requests,
    matches,
    activeMatches,
    pendingIncoming,
    pendingOutgoing,
    isLoading,
    error,
    sendRequest,
    acceptRequest,
    declineRequest,
    refresh,
  };
}
