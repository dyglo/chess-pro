"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useMatchRequests } from "@/hooks/use-match-requests";
import { AuthHeaderActions } from "@/components/auth/auth-header-actions";

type ProfileLite = {
  id: string;
  full_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  country?: string | null;
};

type PresenceRow = {
  user_id: string;
  is_online: boolean;
  last_seen_at: string;
};

export default function FriendsPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const { pendingIncoming, pendingOutgoing, activeMatches, sendRequest, acceptRequest, declineRequest } =
    useMatchRequests();
  const [profiles, setProfiles] = useState<ProfileLite[]>([]);
  const [presence, setPresence] = useState<Record<string, PresenceRow>>({});
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const supabase = createClient();
        const { data: userRows, error: userError } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, country")
          .order("full_name", { ascending: true });

        if (userError) throw userError;
        const cleaned = (userRows ?? []).filter((p) => {
          const hasName = typeof p.full_name === "string" && p.full_name.trim().length > 0;
          return p.id && hasName && p.id !== user.id;
        });
        setProfiles(cleaned);

        const { data: presenceRows, error: presenceError } = await supabase
          .from("online_presence")
          .select("user_id, is_online, last_seen_at");

        if (presenceError) throw presenceError;
        const map: Record<string, PresenceRow> = {};
        (presenceRows ?? []).forEach((p) => {
          map[p.user_id] = p;
        });
        setPresence(map);
      } catch (err) {
        console.error("Friends fetch error:", err);
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, router, isAuthLoading]);

  const filteredProfiles = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return profiles;
    return profiles.filter((p) => {
      const name = (p.full_name || p.username || "").toLowerCase();
      return name.includes(query);
    });
  }, [profiles, search]);

  if (isAuthLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="w-8 h-8 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/icons8-chess.svg" alt="ChessPro" width={32} height={32} />
            <span className="text-sm font-bold tracking-tight uppercase">
              Chess<span className="text-[var(--accent)]">Pro</span>
            </span>
          </Link>
          <div className="flex items-center gap-4 text-sm font-semibold">
            <Link href="/play" className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
              Back to Game
            </Link>
            <Link href="/analytics" className="rounded-full bg-[var(--accent-3)] px-4 py-2 text-xs font-semibold text-white">
              View Analytics
            </Link>
            <AuthHeaderActions variant="light" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        <section className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
          <div className="rounded-[32px] border border-[var(--line)] bg-white p-8 shadow-[var(--shadow)]">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
              Friends & Matches
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight">Find your next rival</h1>
            <p className="mt-3 max-w-xl text-sm text-[var(--muted)]">
              Discover every player on ChessPro and challenge them to a real-time match. All requests are stored and delivered when they come online.
            </p>

            <div className="mt-6 rounded-3xl border border-[var(--line)] bg-[var(--surface-2)] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                    Player directory
                  </p>
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    {filteredProfiles.length} players available
                  </p>
                </div>
                <div className="w-full sm:w-[320px]">
                  <label htmlFor="friend-search" className="sr-only">Search players</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="h-4 w-4 text-[var(--muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m1.85-5.65a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input
                      id="friend-search"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search by name (optional)"
                      className="w-full rounded-full border border-[var(--line)] bg-white pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-3xl border border-[var(--line)] bg-white p-4 shadow-[var(--shadow)]">
              <div className="max-h-[520px] overflow-y-auto pr-2">
                <div className="space-y-3">
              {filteredProfiles.map((profile) => {
                const isPending = pendingOutgoing.some((req) => req.recipient_id === profile.id);
                const isOnline = presence[profile.id]?.is_online ?? false;

                return (
                  <div key={profile.id} className="flex items-center justify-between rounded-3xl border border-[var(--line)] bg-[var(--surface-2)] p-4">
                    <div className="flex items-center gap-4">
                      <div className="relative h-12 w-12 overflow-hidden rounded-full border border-[var(--line)] bg-white">
                        <Image
                          src={profile.avatar_url || "/avatars/user-placeholder.jpg"}
                          alt={profile.full_name || "Player"}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">
                          {profile.full_name || "Player"}
                        </p>
                        <p className="text-xs text-[var(--muted)]">
                          {isOnline ? "Online" : "Offline"}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => sendRequest(profile.id)}
                      disabled={isPending}
                      className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                        isPending
                          ? "cursor-not-allowed bg-white text-[var(--muted)]"
                          : "bg-[var(--accent)] text-white hover:opacity-90"
                      }`}
                    >
                      {isPending ? "Requested" : "Send Match Request"}
                    </button>
                  </div>
                );
              })}

              {filteredProfiles.length === 0 && (
                <div className="rounded-3xl border border-dashed border-[var(--line)] p-10 text-center text-sm text-[var(--muted)]">
                  {profiles.length === 0 ? "No users found." : "No players match that search."}
                </div>
              )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="rounded-[32px] border border-[var(--line)] bg-white p-6 shadow-[var(--shadow)]">
              <h2 className="text-lg font-bold">Incoming Requests</h2>
              <div className="mt-4 space-y-3">
                {pendingIncoming.map((req) => (
                  <div key={req.id} className="rounded-3xl border border-[var(--line)] bg-[var(--surface-2)] p-4">
                    <p className="text-sm font-semibold">
                      {req.requester?.full_name || req.requester?.username || "Player"}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => acceptRequest(req.id)}
                        className="flex-1 rounded-full bg-[var(--accent-3)] px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => declineRequest(req.id)}
                        className="flex-1 rounded-full border border-[var(--line)] px-3 py-2 text-xs font-semibold text-[var(--muted)] transition hover:text-[var(--foreground)]"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
                {pendingIncoming.length === 0 && (
                  <p className="text-sm text-[var(--muted)]">No pending requests.</p>
                )}
              </div>
            </div>

            <div className="rounded-[32px] border border-[var(--line)] bg-white p-6 shadow-[var(--shadow)]">
              <h2 className="text-lg font-bold">Active Matches</h2>
              <div className="mt-4 space-y-3">
                {activeMatches.map((match) => (
                  <Link
                    key={match.id}
                    href={`/match/${match.id}`}
                    className="flex items-center justify-between rounded-3xl border border-[var(--line)] bg-[var(--surface-2)] px-4 py-3 text-sm font-semibold transition hover:-translate-y-0.5"
                  >
                    <span>Match #{match.id.slice(0, 6)}</span>
                    <span className="text-xs text-[var(--muted)]">Join</span>
                  </Link>
                ))}
                {activeMatches.length === 0 && (
                  <p className="text-sm text-[var(--muted)]">No active matches.</p>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      {error && (
        <div className="fixed bottom-6 right-6 rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white">
          {error}
        </div>
      )}
    </div>
  );
}
