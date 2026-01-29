"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type MatchChatMessage = {
  id: string;
  match_id: string;
  user_id: string;
  content: string;
  created_at: string;
  display_name?: string | null;
  avatar_url?: string | null;
};

type ProfileLite = {
  id: string;
  full_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
};

export function useMatchChat(matchId?: string, userId?: string) {
  const supabase = createClient();
  const [messages, setMessages] = useState<MatchChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const profileCacheRef = useRef<Record<string, ProfileLite>>({});
  const latestCreatedAtRef = useRef<string | null>(null);

  const hydrateProfiles = useCallback(async (userIds: string[]) => {
    const missing = userIds.filter((id) => !profileCacheRef.current[id]);
    if (missing.length === 0) return;
    const { data, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url")
      .in("id", missing);
    if (profileError) {
      console.error("[MatchChat] Profile fetch error:", profileError.message);
      return;
    }
    (data ?? []).forEach((p) => {
      profileCacheRef.current[p.id] = p;
    });
  }, [supabase]);

  const mergeProfiles = useCallback((rows: MatchChatMessage[]) => {
    return rows.map((row) => {
      const profile = profileCacheRef.current[row.user_id];
      const display_name = profile?.full_name || profile?.username || "Player";
      return {
        ...row,
        display_name,
        avatar_url: profile?.avatar_url ?? null,
      };
    });
  }, []);

  const fetchMessages = useCallback(async (since?: string) => {
    if (!matchId) return;
    setIsLoading(true);
    setError(null);
    try {
      const query = supabase
        .from("match_messages")
        .select("id, match_id, user_id, content, created_at")
        .eq("match_id", matchId)
        .order("created_at", { ascending: true });

      const { data, error: msgError } = since
        ? await query.gt("created_at", since)
        : await query.limit(200);

      if (msgError) throw msgError;
      const rows = (data ?? []) as MatchChatMessage[];
      if (rows.length > 0) {
        await hydrateProfiles(Array.from(new Set(rows.map((r) => r.user_id))));
        const enriched = mergeProfiles(rows);
        setMessages((prev) => {
          if (!since) return enriched;
          const existingIds = new Set(prev.map((m) => m.id));
          const merged = [...prev, ...enriched.filter((r) => !existingIds.has(r.id))];
          return merged.slice(-200);
        });
        latestCreatedAtRef.current = enriched[enriched.length - 1]?.created_at ?? latestCreatedAtRef.current;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load chat";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [matchId, supabase, hydrateProfiles, mergeProfiles]);

  useEffect(() => {
    if (!matchId) return;
    fetchMessages();
  }, [matchId, fetchMessages]);

  useEffect(() => {
    if (!matchId) return;
    const channel = supabase
      .channel(`match_messages:${matchId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "match_messages", filter: `match_id=eq.${matchId}` },
        async (payload) => {
          const row = payload.new as MatchChatMessage;
          await hydrateProfiles([row.user_id]);
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            const enriched = mergeProfiles([row])[0];
            return [...prev, enriched].slice(-200);
          });
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          const since = latestCreatedAtRef.current ?? undefined;
          fetchMessages(since);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, supabase, hydrateProfiles, mergeProfiles, fetchMessages]);

  const sendMessage = useCallback(async (content: string) => {
    if (!matchId || !userId) return { success: false, error: "Not ready" };
    const trimmed = content.trim();
    if (!trimmed) return { success: false, error: "Empty message" };
    const { data, error: insertError } = await supabase
      .from("match_messages")
      .insert({ match_id: matchId, user_id: userId, content: trimmed })
      .select("id, match_id, user_id, content, created_at")
      .single();
    if (insertError) {
      setError(insertError.message);
      return { success: false, error: insertError.message };
    }
    if (data) {
      await hydrateProfiles([data.user_id]);
      setMessages((prev) => {
        if (prev.some((m) => m.id === data.id)) return prev;
        const enriched = mergeProfiles([data as MatchChatMessage])[0];
        latestCreatedAtRef.current = enriched.created_at;
        return [...prev, enriched].slice(-200);
      });
    }
    return { success: true };
  }, [matchId, userId, supabase, hydrateProfiles, mergeProfiles]);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    refresh: fetchMessages,
  };
}
