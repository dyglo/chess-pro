"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { KpiCard } from "@/components/analytics/kpi-card";
import { LineChart } from "@/components/analytics/line-chart";
import { AuthHeaderActions } from "@/components/auth/auth-header-actions";

type GameRow = {
  id: string;
  game_type?: "ai" | "multiplayer";
  white_user_id?: string | null;
  black_user_id?: string | null;
  winner_color?: "white" | "black" | "draw" | null;
  ai_difficulty?: string | null;
  moves_count?: number | null;
  hints_used?: number | null;
  duration_seconds?: number | null;
  accuracy_score?: number | null;
  created_at?: string | null;
};

type LegacyGameRow = {
  id: string;
  result: string;
  created_at: string;
  difficulty: string;
  player_color: string;
  moves_count: number;
  duration_seconds?: number | null;
  hints_used?: number | null;
};

type ProfileLite = {
  id: string;
  full_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
};

const INITIAL_STATS = {
  totalGames: 0,
  wins: 0,
  losses: 0,
  draws: 0,
  winRate: 0,
  avgDuration: "0m 0s",
  avgMoves: 0,
  avgAccuracy: "--",
  totalHints: 0,
};

export default function AnalyticsPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const [games, setGames] = useState<GameRow[]>([]);
  const [legacyGames, setLegacyGames] = useState<LegacyGameRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }

    const fetchAnalytics = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const supabase = createClient();

        const { data: gameRows, error: gameError } = await supabase
          .from("games")
          .select("*")
          .or(`white_user_id.eq.${user.id},black_user_id.eq.${user.id}`)
          .order("created_at", { ascending: false });

        if (gameError) {
          const { data: legacyRows, error: legacyError } = await supabase
            .from("game_analytics")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

          if (legacyError) throw legacyError;
          setLegacyGames(legacyRows ?? []);
          setGames([]);
          return;
        }

        const normalized = (gameRows ?? []) as GameRow[];
        setGames(normalized);

        const profileIds = Array.from(
          new Set(
            normalized.flatMap((g) =>
              [g.white_user_id, g.black_user_id].filter(Boolean) as string[]
            )
          )
        );
        if (profileIds.length > 0) {
          const { data: profileRows } = await supabase
            .from("profiles")
            .select("id, full_name, username, avatar_url")
            .in("id", profileIds);
          const map: Record<string, ProfileLite> = {};
          (profileRows ?? []).forEach((p) => {
            map[p.id] = p;
          });
          setProfiles(map);
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, [user, router, isAuthLoading]);

  const stats = useMemo(() => {
    const source = games.length > 0 ? games : legacyGames;
    if (source.length === 0) return INITIAL_STATS;

    let wins = 0;
    let losses = 0;
    let draws = 0;
    let totalDuration = 0;
    let totalMoves = 0;
    let totalHints = 0;
    let accuracySum = 0;
    let accuracyCount = 0;

    source.forEach((g) => {
      if ("result" in g) {
        if (g.result === "win") wins += 1;
        else if (g.result === "loss") losses += 1;
        else draws += 1;
        totalDuration += g.duration_seconds ?? 0;
        totalMoves += g.moves_count ?? 0;
        totalHints += g.hints_used ?? 0;
      } else {
        const isWhite = g.white_user_id === user?.id;
        const winner = g.winner_color;
        if (winner === "draw") draws += 1;
        else if ((winner === "white" && isWhite) || (winner === "black" && !isWhite)) wins += 1;
        else if (winner) losses += 1;
        totalDuration += g.duration_seconds ?? 0;
        totalMoves += g.moves_count ?? 0;
        totalHints += g.hints_used ?? 0;
        if (typeof g.accuracy_score === "number") {
          accuracySum += g.accuracy_score;
          accuracyCount += 1;
        }
      }
    });

    const totalGames = source.length;
    const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
    const avgDuration = totalGames > 0 ? formatDuration(Math.floor(totalDuration / totalGames)) : "0m 0s";
    const avgMoves = totalGames > 0 ? Math.round(totalMoves / totalGames) : 0;
    const avgAccuracy = accuracyCount > 0 ? `${Math.round(accuracySum / accuracyCount)}%` : "--";

    return {
      totalGames,
      wins,
      losses,
      draws,
      winRate,
      avgDuration,
      avgMoves,
      avgAccuracy,
      totalHints,
    };
  }, [games, legacyGames, user?.id]);

  const chartData = useMemo(() => {
    const source = games.length > 0 ? games : legacyGames;
    const days = Array.from({ length: 7 }).map((_, idx) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - idx));
      return {
        label: date.toLocaleDateString("en-US", { weekday: "short" }),
        dateKey: date.toISOString().split("T")[0],
        games: 0,
        wins: 0,
      };
    });

    source.forEach((g) => {
      const createdAt = "created_at" in g ? g.created_at : g.created_at;
      if (!createdAt) return;
      const dateKey = new Date(createdAt).toISOString().split("T")[0];
      const day = days.find((d) => d.dateKey === dateKey);
      if (!day) return;
      day.games += 1;
      if ("result" in g) {
        if (g.result === "win") day.wins += 1;
      } else {
        const isWhite = g.white_user_id === user?.id;
        if (
          (g.winner_color === "white" && isWhite) ||
          (g.winner_color === "black" && !isWhite)
        ) {
          day.wins += 1;
        }
      }
    });

    return days.map((d) => ({
      label: d.label,
      value: d.games === 0 ? 0 : Math.round((d.wins / d.games) * 100),
    }));
  }, [games, legacyGames, user?.id]);

  const recentGames = useMemo(() => {
    const source = games.length > 0 ? games : legacyGames;
    return source.slice(0, 10);
  }, [games, legacyGames]);

  if (isAuthLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="w-8 h-8 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] font-sans">
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
            <Link href="/friends" className="rounded-full bg-[var(--accent-3)] px-4 py-2 text-xs font-semibold text-white">
              Find Friends
            </Link>
            <AuthHeaderActions variant="light" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[32px] border border-[var(--line)] bg-white p-8 shadow-[var(--shadow)]">
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
                Performance
              </p>
              <h1 className="text-4xl font-bold tracking-tight">
                Performance Analytics
              </h1>
              <p className="max-w-xl text-sm text-[var(--muted)]">
                Monitor your win rate, tempo, and streaks. This dashboard updates after every game and syncs across devices.
              </p>
            </div>

            <div className="mt-8 rounded-3xl border border-[var(--line)] bg-[var(--surface-2)] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                    Win Rate (7 days)
                  </p>
                  <p className="text-2xl font-bold">{stats.winRate}%</p>
                </div>
                <div className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-[var(--muted)]">
                  Live
                </div>
              </div>
              <div className="mt-4">
                <LineChart data={chartData} stroke="#111111" fill="rgba(198,40,40,0.15)" />
              </div>
            </div>
          </div>

          <div className="grid gap-6">
            <KpiCard label="Total Games" value={stats.totalGames} icon={<StatIcon />} />
            <KpiCard
              label="Win Rate"
              value={`${stats.winRate}%`}
              sublabel={`${stats.wins} wins / ${stats.draws} draws`}
              highlight
              icon={<TrophyIcon />}
            />
            <KpiCard label="Avg Duration" value={stats.avgDuration} icon={<ClockIcon />} />
            <KpiCard label="Avg Moves" value={stats.avgMoves} icon={<MoveIcon />} />
            <KpiCard label="Avg Accuracy" value={stats.avgAccuracy} icon={<TargetIcon />} />
          </div>
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="rounded-[32px] border border-[var(--line)] bg-white p-8 shadow-[var(--shadow)]">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Recent Games</h2>
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                Last 10
              </span>
            </div>
            <div className="mt-6 overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                    <th className="py-3 pl-2">Result</th>
                    <th className="py-3">Opponent</th>
                    <th className="py-3">Moves</th>
                    <th className="py-3">Hints</th>
                    <th className="py-3 text-right pr-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentGames.map((game) => {
                    if ("result" in game) {
                      return (
                        <tr key={game.id} className="border-t border-[var(--line)] text-sm">
                          <td className="py-3 pl-2">
                            <ResultBadge result={game.result} />
                          </td>
                          <td className="py-3 text-sm text-[var(--muted)]">
                            Stockfish ({game.difficulty})
                          </td>
                          <td className="py-3">{game.moves_count}</td>
                          <td className="py-3">{game.hints_used ?? 0}</td>
                          <td className="py-3 pr-2 text-right text-[var(--muted)]">
                            {formatDate(game.created_at)}
                          </td>
                        </tr>
                      );
                    }

                    const isWhite = game.white_user_id === user?.id;
                    const opponentId = isWhite ? game.black_user_id : game.white_user_id;
                    const opponent = opponentId ? profiles[opponentId] : null;
                    const opponentName =
                      opponent?.full_name || opponent?.username || "Opponent";
                    const result =
                      game.winner_color === "draw"
                        ? "draw"
                        : (game.winner_color === "white" && isWhite) ||
                          (game.winner_color === "black" && !isWhite)
                          ? "win"
                          : "loss";

                    return (
                      <tr key={game.id} className="border-t border-[var(--line)] text-sm">
                        <td className="py-3 pl-2">
                          <ResultBadge result={result} />
                        </td>
                        <td className="py-3 text-sm text-[var(--muted)]">
                          {game.game_type === "ai"
                            ? `Stockfish (${game.ai_difficulty ?? "ai"})`
                            : opponentName}
                        </td>
                        <td className="py-3">{game.moves_count ?? 0}</td>
                        <td className="py-3">{game.hints_used ?? 0}</td>
                        <td className="py-3 pr-2 text-right text-[var(--muted)]">
                          {formatDate(game.created_at ?? "")}
                        </td>
                      </tr>
                    );
                  })}
                  {recentGames.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-sm text-[var(--muted)]">
                        No games yet. Start a game to see your stats.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-[32px] border border-[var(--line)] bg-white p-8 shadow-[var(--shadow)]">
            <h2 className="text-xl font-bold">Summary</h2>
            <div className="mt-6 space-y-4 text-sm text-[var(--muted)]">
              <div className="flex items-center justify-between">
                <span>Total Wins</span>
                <span className="font-semibold text-[var(--foreground)]">{stats.wins}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Total Losses</span>
                <span className="font-semibold text-[var(--foreground)]">{stats.losses}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Total Draws</span>
                <span className="font-semibold text-[var(--foreground)]">{stats.draws}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Total Hints</span>
                <span className="font-semibold text-[var(--foreground)]">{stats.totalHints}</span>
              </div>
            </div>

            <div className="mt-6 rounded-3xl border border-[var(--line)] bg-[var(--surface-2)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                Coaching Tip
              </p>
              <p className="mt-2 text-sm text-[var(--foreground)]">
                Focus on long-term piece activity over short tactics. Strong development increases win rate consistently.
              </p>
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

function ResultBadge({ result }: { result: string }) {
  const styles =
    result === "win"
      ? "bg-green-100 text-green-700"
      : result === "loss"
      ? "bg-red-100 text-red-700"
      : "bg-gray-100 text-gray-700";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase ${styles}`}>
      {result}
    </span>
  );
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function formatDate(value: string) {
  if (!value) return "--";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function TrophyIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 4h14v2a4 4 0 01-4 4h-1a4 4 0 01-8 0H5a4 4 0 01-4-4V4h4z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 14h8M9 18h6" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function MoveIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h10M4 17h16M14 7l3 3m0 0l-3 3m3-3H8" />
    </svg>
  );
}

function TargetIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function StatIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 19h16M7 16V8m5 8V4m5 12v-6" />
    </svg>
  );
}
