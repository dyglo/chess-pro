"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { MarketingHeader } from "@/components/marketing/header";
import { Gamepad2, Sparkles, Trophy, Users } from "lucide-react";

type SummaryRow = {
  winner_user_id: string;
  game_mode: "chess" | "ludo";
  match_type: "solo" | "multiplayer";
  win_count: number;
  last_win_at: string | null;
};

type EntryRow = {
  id: string;
  winner_user_id: string;
  game_mode: "chess" | "ludo";
  match_type: "solo" | "multiplayer";
  completed_at: string | null;
};

type ProfileLite = {
  id: string;
  full_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  country?: string | null;
};

type RankedPlayer = {
  profile: ProfileLite;
  winCount: number;
  lastWinAt: string | null;
};

type FilterMode = "all" | "chess" | "ludo";

type FilterMatch = "all" | "solo" | "multiplayer";

export default function LeaderboardPage() {
  const [summaryRows, setSummaryRows] = useState<SummaryRow[]>([]);
  const [recentRows, setRecentRows] = useState<EntryRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [allProfiles, setAllProfiles] = useState<ProfileLite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modeFilter, setModeFilter] = useState<FilterMode>("all");
  const [matchFilter, setMatchFilter] = useState<FilterMatch>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const supabase = createClient();

        const { data: summaryData, error: summaryError } = await supabase
          .from("leaderboard_summary")
          .select("winner_user_id, game_mode, match_type, win_count, last_win_at");

        if (summaryError) throw summaryError;
        const summary = (summaryData ?? []) as SummaryRow[];
        setSummaryRows(summary);

        const { data: recentData, error: recentError } = await supabase
          .from("leaderboard_entries")
          .select("id, winner_user_id, game_mode, match_type, completed_at")
          .order("completed_at", { ascending: false })
          .limit(12);

        if (recentError) throw recentError;
        const recent = (recentData ?? []) as EntryRow[];
        setRecentRows(recent);

        const { data: profileRows, error: profileError } = await supabase
          .from("profiles")
          .select("id, full_name, username, avatar_url, country")
          .order("full_name", { ascending: true });

        if (profileError) throw profileError;
        const cleaned = (profileRows ?? []).filter((profile) => {
          const hasName = typeof profile.full_name === "string" && profile.full_name.trim().length > 0;
          return Boolean(profile.id) && hasName;
        });
        setAllProfiles(cleaned);
        const map: Record<string, ProfileLite> = {};
        cleaned.forEach((profile) => {
          map[profile.id] = profile;
        });
        setProfiles(map);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  const filteredSummary = useMemo(() => {
    return summaryRows.filter((row) => {
      if (modeFilter !== "all" && row.game_mode !== modeFilter) return false;
      if (matchFilter !== "all" && row.match_type !== matchFilter) return false;
      return true;
    });
  }, [summaryRows, modeFilter, matchFilter]);

  const winsByUser = useMemo(() => {
    const map: Record<string, { winCount: number; lastWinAt: string | null }> = {};
    filteredSummary.forEach((row) => {
      const current = map[row.winner_user_id];
      const winCount = (current?.winCount ?? 0) + row.win_count;
      const lastWinAt = resolveLatestDate(current?.lastWinAt ?? null, row.last_win_at ?? null);
      map[row.winner_user_id] = { winCount, lastWinAt };
    });
    return map;
  }, [filteredSummary]);

  const filteredProfiles = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return allProfiles;
    return allProfiles.filter((profile) => {
      const name = (profile.full_name || profile.username || "").toLowerCase();
      return name.includes(query);
    });
  }, [allProfiles, search]);

  const rankedPlayers = useMemo<RankedPlayer[]>(() => {
    return filteredProfiles
      .map((profile) => {
        const stats = winsByUser[profile.id];
        return {
          profile,
          winCount: stats?.winCount ?? 0,
          lastWinAt: stats?.lastWinAt ?? null,
        };
      })
      .sort((a, b) => {
        if (b.winCount !== a.winCount) return b.winCount - a.winCount;
        const dateDiff = compareDates(b.lastWinAt, a.lastWinAt);
        if (dateDiff !== 0) return dateDiff;
        return getDisplayName(a.profile).localeCompare(getDisplayName(b.profile));
      });
  }, [filteredProfiles, winsByUser]);

  const filteredRecent = useMemo(() => {
    return recentRows.filter((row) => {
      if (modeFilter !== "all" && row.game_mode !== modeFilter) return false;
      if (matchFilter !== "all" && row.match_type !== matchFilter) return false;
      return true;
    });
  }, [recentRows, modeFilter, matchFilter]);

  const totalWins = filteredSummary.reduce((sum, row) => sum + row.win_count, 0);
  const uniqueWinners = new Set(filteredSummary.map((row) => row.winner_user_id)).size;
  const leader = rankedPlayers.find((player) => player.winCount > 0);

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1a1a1a]">
      <MarketingHeader variant="light" />

      <main className="mx-auto w-full max-w-6xl px-6 pt-32 pb-24">
        <section className="rounded-[40px] border border-[var(--line)] bg-[var(--surface)] p-8 shadow-sm md:p-12">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/70 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted)]">
                <Sparkles className="h-3.5 w-3.5 text-[var(--accent-2)]" />
                Leaderboard
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-[var(--foreground)] md:text-5xl">
                Winners shaping the meta.
              </h1>
              <p className="max-w-2xl text-lg leading-relaxed text-[var(--muted)]">
                Every victory matters. Track the players dominating solo training and multiplayer battles across Chess and Ludo.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <FilterButton active={modeFilter === "all"} onClick={() => setModeFilter("all")}
              >
                All Modes
              </FilterButton>
              <FilterButton active={modeFilter === "chess"} onClick={() => setModeFilter("chess")}
              >
                Chess
              </FilterButton>
              <FilterButton active={modeFilter === "ludo"} onClick={() => setModeFilter("ludo")}
              >
                Ludo
              </FilterButton>
              <span className="h-9 w-px bg-[var(--line)]" />
              <FilterButton active={matchFilter === "all"} onClick={() => setMatchFilter("all")}
              >
                All Types
              </FilterButton>
              <FilterButton active={matchFilter === "solo"} onClick={() => setMatchFilter("solo")}
              >
                Solo
              </FilterButton>
              <FilterButton active={matchFilter === "multiplayer"} onClick={() => setMatchFilter("multiplayer")}
              >
                Multiplayer
              </FilterButton>
            </div>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <StatCard
              icon={<Trophy className="h-5 w-5 text-[var(--accent)]" />}
              label="Total Wins"
              value={isLoading ? "--" : totalWins.toLocaleString()}
            />
            <StatCard
              icon={<Users className="h-5 w-5 text-[var(--accent)]" />}
              label="Active Winners"
              value={isLoading ? "--" : uniqueWinners.toLocaleString()}
            />
            <StatCard
              icon={<Gamepad2 className="h-5 w-5 text-[var(--accent-2)]" />}
              label="Current Leader"
              value={leader ? getDisplayName(leader.profile) : "--"}
              subValue={leader ? `${leader.winCount} wins` : ""}
            />
          </div>
        </section>

        <section className="mt-12 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-[32px] border border-[var(--line)] bg-white p-8 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-[var(--foreground)]">All Players</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">Ranked by wins for the current filter.</p>
              </div>
              <span className="rounded-full border border-[var(--line)] bg-[var(--surface-2)] px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--muted)]">
                Updated Live
              </span>
            </div>

            <div className="mt-4 rounded-3xl border border-[var(--line)] bg-[var(--surface-2)] p-4">
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
                  <label htmlFor="leaderboard-search" className="sr-only">Search players</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="h-4 w-4 text-[var(--muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m1.85-5.65a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input
                      id="leaderboard-search"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search by name (optional)"
                      className="w-full rounded-full border border-[var(--line)] bg-white pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 max-h-[520px] overflow-y-auto pr-2">
              <div className="space-y-3">
                {isLoading && Array.from({ length: 5 }).map((_, index) => (
                  <div
                    key={`skeleton-${index}`}
                    className="flex items-center justify-between rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-4 animate-pulse"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-white/70" />
                      <div className="space-y-2">
                        <div className="h-3 w-32 rounded-full bg-white/70" />
                        <div className="h-3 w-20 rounded-full bg-white/70" />
                      </div>
                    </div>
                    <div className="h-3 w-14 rounded-full bg-white/70" />
                  </div>
                ))}

                {!isLoading && rankedPlayers.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-[var(--line)] p-6 text-center text-sm text-[var(--muted)]">
                    {allProfiles.length === 0 ? "No players found." : "No players match that search."}
                  </div>
                )}

                {!isLoading && rankedPlayers.map((row, index) => {
                  const profile = row.profile;
                  return (
                    <div
                      key={profile.id}
                      className="flex items-center justify-between rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line)] bg-white text-sm font-black text-[var(--foreground)]">
                          {String(index + 1).padStart(2, "0")}
                        </div>
                        <div className="flex items-center gap-3">
                          <Avatar profile={profile} />
                          <div>
                            <p className="font-semibold text-[var(--foreground)]">
                              {getDisplayName(profile)}
                            </p>
                            <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                              {row.winCount > 0 ? "Active Winner" : "No wins yet"}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-[var(--foreground)]">{row.winCount} wins</p>
                        <p className="text-xs text-[var(--muted)]">{row.lastWinAt ? formatDate(row.lastWinAt) : "--"}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="rounded-[32px] border border-[var(--line)] bg-white p-8 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-[var(--foreground)]">Recent Wins</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">Latest verified victories.</p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {isLoading && Array.from({ length: 4 }).map((_, index) => (
                <div key={`recent-${index}`} className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 animate-pulse">
                  <div className="h-3 w-24 rounded-full bg-white/70" />
                  <div className="mt-3 h-3 w-32 rounded-full bg-white/70" />
                </div>
              ))}

              {!isLoading && filteredRecent.length === 0 && (
                <div className="rounded-2xl border border-dashed border-[var(--line)] p-6 text-center text-sm text-[var(--muted)]">
                  No recent wins found for this filter.
                </div>
              )}

              {!isLoading && filteredRecent.slice(0, 8).map((row) => {
                const profile = profiles[row.winner_user_id];
                return (
                  <div
                    key={row.id}
                    className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar profile={profile} size="sm" />
                        <div>
                          <p className="text-sm font-semibold text-[var(--foreground)]">
                            {getDisplayName(profile)}
                          </p>
                          <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                            {formatLabel(row.game_mode)} · {formatLabel(row.match_type)}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-[var(--muted)]">
                        {formatDate(row.completed_at)}
                      </span>
                    </div>
                  </div>
                );
              })}
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

function FilterButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex cursor-pointer items-center justify-center rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.2em] transition ${
        active
          ? "border-[var(--accent)] bg-[var(--accent)] text-white shadow-lg"
          : "border-[var(--line)] bg-white text-[var(--foreground)] hover:bg-[var(--surface-2)]"
      }`}
    >
      {children}
    </button>
  );
}

function StatCard({
  icon,
  label,
  value,
  subValue,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  subValue?: string;
}) {
  return (
    <div className="rounded-[28px] border border-[var(--line)] bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-2)]">
          {icon}
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted)]">{label}</p>
          <p className="text-2xl font-bold text-[var(--foreground)]">{value}</p>
          {subValue ? (
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
              {subValue}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Avatar({
  profile,
  size = "md",
}: {
  profile?: ProfileLite;
  size?: "sm" | "md";
}) {
  const dimension = size === "sm" ? 36 : 44;
  const imageSrc = profile?.avatar_url || "/avatars/user-placeholder.jpg";

  return (
    <div
      className="relative overflow-hidden rounded-full border border-[var(--line)] bg-white"
      style={{ width: dimension, height: dimension }}
    >
      <Image
        src={imageSrc}
        alt={profile?.full_name || profile?.username || "Player"}
        fill
        className="object-cover"
      />
    </div>
  );
}

function getDisplayName(profile?: ProfileLite) {
  if (!profile) return "Player";
  const fullName = typeof profile.full_name === "string" ? profile.full_name.trim() : "";
  const username = typeof profile.username === "string" ? profile.username.trim() : "";
  return fullName || username || "Player";
}

function formatLabel(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDate(value?: string | null) {
  if (!value) return "--";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function resolveLatestDate(a: string | null, b: string | null) {
  if (!a) return b;
  if (!b) return a;
  return Date.parse(b) > Date.parse(a) ? b : a;
}

function compareDates(a: string | null, b: string | null) {
  const aValue = a ? Date.parse(a) : 0;
  const bValue = b ? Date.parse(b) : 0;
  if (aValue === bValue) return 0;
  return aValue > bValue ? 1 : -1;
}
