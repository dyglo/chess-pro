"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export interface ProfileLite {
  id: string;
  full_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
}

export type GameType = "chess" | "ludo";

export interface FriendRequest {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: "pending" | "accepted" | "declined" | "cancelled";
  created_at: string;
  responded_at?: string | null;
  match_id?: string | null;
  game_type?: GameType; // Optional, defaults to 'chess' for backward compatibility
  requester?: ProfileLite | null;
  recipient?: ProfileLite | null;
}

export interface MatchRow {
  id: string;
  status: "pending" | "active" | "completed" | "cancelled";
  game_type?: GameType | null;
  white_user_id?: string | null;
  black_user_id?: string | null;
  game_id?: string | null;
  created_at: string;
  started_at?: string | null;
  ended_at?: string | null;
}

export interface LudoSessionRow {
  id: string;
  status: string;
  created_at?: string;
}

export interface MatchRosterRow {
  id: string;
  match_id: string;
  user_id: string | null;
  seat_index: number;
  status: "joined" | "pending" | "left" | "kicked";
  is_ai: boolean;
  color: string | null;
  display_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  country?: string | null;
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
  const [ludoSessions, setLudoSessions] = useState<LudoSessionRow[]>([]);
  const [matchRosters, setMatchRosters] = useState<Record<string, MatchRosterRow[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const rosterCacheRef = useRef<Record<string, MatchRosterRow[]>>({});

  const fetchMatchRosters = useCallback(
    async (matchIds: string[]) => {
      if (!user || matchIds.length === 0) return;
      const supabase = createClient();
      const uniqueIds = Array.from(new Set(matchIds)).filter(
        (id) => !rosterCacheRef.current[id]
      );
      if (uniqueIds.length === 0) return;

      const results = await Promise.all(
        uniqueIds.map(async (matchId) => {
          const { data, error: rosterError } = await supabase.rpc("get_match_roster", {
            p_match_id: matchId,
          });
          if (rosterError) {
            console.error(
              "Error fetching match roster:",
              rosterError.message,
              rosterError.code
            );
            return { matchId, roster: null as MatchRosterRow[] | null };
          }
          return { matchId, roster: (data ?? []) as MatchRosterRow[] };
        })
      );

      const updated = { ...rosterCacheRef.current };
      results.forEach((result) => {
        if (result.roster) {
          updated[result.matchId] = result.roster;
        }
      });
      rosterCacheRef.current = updated;
      setMatchRosters(updated);
    },
    [user]
  );

  const refresh = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      // Fetch friend requests
      const { data: requestRows, error: requestError } = await supabase
        .from("friend_requests")
        .select("*")
        .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (requestError) {
        console.error("Error fetching friend requests:", requestError);
        throw new Error(`Friend requests error: ${requestError.message}`);
      }

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

      // Fetch active Chess matches
      const { data: matchRows, error: matchError } = await supabase
        .from("matches")
        .select("id, status, game_type, white_user_id, black_user_id, game_id, created_at, started_at, ended_at")
        .or(`white_user_id.eq.${user.id},black_user_id.eq.${user.id}`)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (matchError) {
        console.error("Error fetching matches:", matchError.message, matchError.code);
        throw new Error(`Matches error: ${matchError.message}`);
      }
      setMatches(matchRows ?? []);
      const ludoMatchIds = (matchRows ?? [])
        .filter((match) => match.game_type === "ludo")
        .map((match) => match.id);
      await fetchMatchRosters(ludoMatchIds);

      // Fetch active Ludo sessions
      const { data: playerRows, error: playerError } = await supabase
        .from("ludo_players")
        .select("session_id")
        .eq("user_id", user.id);

      if (playerError) {
        console.error("Error fetching ludo players:", playerError);
        throw new Error(`Ludo players error: ${playerError.message}`);
      }

      if (playerRows && playerRows.length > 0) {
        const sessionIds = playerRows.map(p => p.session_id);
        const { data: sessionRows, error: sessionError } = await supabase
          .from("ludo_sessions")
          .select("*")
          .in("id", sessionIds)
          .eq("status", "playing");

        if (sessionError) {
          console.error("Error fetching ludo sessions:", sessionError);
          throw new Error(`Ludo sessions error: ${sessionError.message}`);
        }
        setLudoSessions(sessionRows ?? []);
      } else {
        setLudoSessions([]);
      }

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to refresh match data";
      console.error("Error refreshing match data:", errorMessage);
      if (err instanceof Error && err.stack) {
        console.error("Error stack:", err.stack);
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [user, fetchMatchRosters]);

  useEffect(() => {
    if (!user) return;
    refresh();
  }, [user, refresh]);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();

    const requestsChannel = supabase
      .channel("friend-requests-realtime")
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
      .channel("matches-realtime")
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

    const ludoChannel = supabase
      .channel("ludo-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ludo_players", filter: `user_id=eq.${user.id}` },
        () => refresh()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(requestsChannel);
      supabase.removeChannel(matchesChannel);
      supabase.removeChannel(ludoChannel);
    };
  }, [user, refresh]);

  const sendRequest = useCallback(
    async (recipientId: string, gameType: GameType = "chess") => {
      if (!user) return { error: "Not authenticated" };
      const supabase = createClient();
      const { error: insertError } = await supabase.from("friend_requests").insert({
        requester_id: user.id,
        recipient_id: recipientId,
        status: "pending",
        game_type: gameType,
      });
      if (insertError) return { error: insertError.message };
      await refresh();
      return { error: null };
    },
    [user, refresh]
  );

  const acceptRequest = useCallback(
    async (requestId: string) => {
      if (!user) return { error: "Not authenticated", matchId: null as string | null, sessionId: null as string | null, gameType: "chess" as GameType };

      // First, get the request to check game_type
      const supabase = createClient();
      const { data: reqData, error: reqError } = await supabase
        .from("friend_requests")
        .select("game_type")
        .eq("id", requestId)
        .single();

      if (reqError) return { error: reqError.message, matchId: null, sessionId: null, gameType: "chess" as GameType };

      const gameType = (reqData?.game_type as GameType) || "chess";

      if (gameType === "ludo") {
        // Call Ludo-specific RPC
        const { data, error: rpcError } = await supabase.rpc("accept_ludo_match_request", {
          request_id: requestId,
        });

        if (rpcError) {
          console.error("Ludo RPC Error:", rpcError);
          return { error: rpcError.message, matchId: null, sessionId: null, gameType };
        }

        console.log("Ludo RPC Success, Session ID:", data);

        // Refresh in background so we don't block the UI redirect
        refresh().catch(console.error);

        return { error: null, matchId: null, sessionId: data as string, gameType };
      } else {
        // Call Chess RPC (existing logic)
        const { data, error: rpcError } = await supabase.rpc("accept_match_request", {
          request_id: requestId,
        });
        if (rpcError) return { error: rpcError.message, matchId: null, sessionId: null, gameType };
        refresh().catch(console.error);
        return { error: null, matchId: data as string, sessionId: null, gameType };
      }
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

  const activeLudoSessions = useMemo(
    () => ludoSessions.filter((s) => s.status === "playing"),
    [ludoSessions]
  );

  return {
    requests,
    matches,
    activeMatches,
    ludoSessions,
    activeLudoSessions,
    pendingIncoming,
    pendingOutgoing,
    matchRosters,
    fetchMatchRosters,
    isLoading,
    error,
    sendRequest,
    acceptRequest,
    declineRequest,
    refresh,
  };
}
