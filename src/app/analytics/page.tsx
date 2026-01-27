"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";

interface AnalyticsData {
    totalGames: number;
    wins: number;
    losses: number;
    draws: number;
    winRate: number;
    avgDuration: string;
    recentGames: {
        id: string;
        result: string;
        created_at: string;
        difficulty: string;
        player_color: string;
        moves_count: number;
    }[];
}

export default function AnalyticsPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [stats, setStats] = useState<AnalyticsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            router.push("/login");
            return;
        }

        async function fetchAnalytics() {
            try {
                const { createClient } = await import("@/lib/supabase/client");
                const supabase = createClient();

                const { data: games, error } = await supabase
                    .from("game_analytics")
                    .select("*")
                    .eq("user_id", user!.id)
                    .order("created_at", { ascending: false });

                if (error) throw error;

                if (games) {
                    const total = games.length;
                    const wins = games.filter(g => g.result === "win").length;
                    const losses = games.filter(g => g.result === "loss").length;
                    const draws = games.filter(g => g.result === "draw").length;
                    const totalDuration = games.reduce((acc, g) => acc + (g.duration_seconds || 0), 0);

                    setStats({
                        totalGames: total,
                        wins,
                        losses,
                        draws,
                        winRate: total > 0 ? Math.round((wins / total) * 100) : 0,
                        avgDuration: total > 0 ? formatDuration(Math.floor(totalDuration / total)) : "0m",
                        recentGames: games.slice(0, 10), // Last 10 games
                    });
                }
            } catch (error) {
                console.error("Error fetching analytics:", error);
            } finally {
                setIsLoading(false);
            }
        }

        fetchAnalytics();
    }, [user, router]);

    const formatDuration = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}m ${s}s`;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
        });
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(circle_at_top,_#ffffff_0%,_#fbfafa_55%,_#f5f2f0_100%)]">
                <div className="w-8 h-8 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#ffffff_0%,_#fbfafa_55%,_#f5f2f0_100%)] text-[var(--foreground)] font-sans">
            {/* Header */}
            <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-[var(--foreground)]/5">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
                    <Link href="/" className="flex items-center gap-3">
                        <Image src="/icons8-chess.svg" alt="Logo" width={32} height={32} />
                        <span className="text-sm font-bold tracking-tight uppercase">
                            Chess<span className="text-[var(--accent)]">Pro</span>
                        </span>
                    </Link>
                    <Link href="/play" className="text-sm font-bold uppercase tracking-wider hover:text-[var(--accent)] transition-colors">
                        Back to Game
                    </Link>
                </div>
            </header>

            <main className="pt-24 pb-12 px-6 max-w-7xl mx-auto">
                <div className="mb-12">
                    <h1 className="text-4xl font-black tracking-tighter mb-2">Performance Analytics</h1>
                    <p className="text-[var(--foreground)]/60">Analyze your chess journey and improve your game.</p>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    <KpiCard label="Total Games" value={stats?.totalGames || 0} icon="games" />
                    <KpiCard label="Win Rate" value={`${stats?.winRate}%`} sub={`Wins: ${stats?.wins}`} icon="trophy" highlight />
                    <KpiCard label="Losses" value={stats?.losses || 0} icon="loss" />
                    <KpiCard label="Avg Duration" value={stats?.avgDuration || "0m"} icon="time" />
                </div>

                {/* Recent Games Table */}
                <div className="bg-white rounded-3xl p-8 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.05)] border border-[var(--foreground)]/5">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <svg className="w-5 h-5 text-[var(--foreground)]/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Recent Matches
                    </h2>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-xs font-black uppercase tracking-widest text-[var(--foreground)]/30 border-b border-[var(--foreground)]/5">
                                    <th className="py-4 pl-4">Result</th>
                                    <th className="py-4">Opponent / Difficulty</th>
                                    <th className="py-4">Color</th>
                                    <th className="py-4">Moves</th>
                                    <th className="py-4 pr-4 text-right">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats?.recentGames.map((game) => (
                                    <tr key={game.id} className="group hover:bg-[var(--foreground)]/[0.02] transition-colors border-b border-[var(--foreground)]/5 last:border-0">
                                        <td className="py-4 pl-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${game.result === "win" ? "bg-green-100 text-green-700" :
                                                    game.result === "loss" ? "bg-red-100 text-red-700" :
                                                        "bg-gray-100 text-gray-700"
                                                }`}>
                                                {game.result}
                                            </span>
                                        </td>
                                        <td className="py-4 font-medium text-sm">
                                            Stockfish <span className="text-[var(--foreground)]/40 ml-1 capitalize">({game.difficulty})</span>
                                        </td>
                                        <td className="py-4">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-3 h-3 rounded-full border ${game.player_color === "w" ? "bg-white border-gray-300" : "bg-black border-black"}`} />
                                                <span className="text-sm capitalize">{game.player_color === "w" ? "White" : "Black"}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 text-sm font-mono text-[var(--foreground)]/60">{game.moves_count}</td>
                                        <td className="py-4 pr-4 text-right text-sm text-[var(--foreground)]/40 group-hover:text-[var(--foreground)]/60">{formatDate(game.created_at)}</td>
                                    </tr>
                                ))}
                                {stats?.recentGames.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="py-12 text-center text-[var(--foreground)]/40 italic">
                                            No games played yet. Go play some chess!
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}

function KpiCard({ label, value, sub, icon, highlight }: { label: string; value: string | number; sub?: string; icon: string; highlight?: boolean }) {
    return (
        <div className={`p-6 rounded-3xl border transition-all duration-300 ${highlight
                ? "bg-[var(--foreground)] text-white shadow-xl border-transparent scale-105"
                : "bg-white text-[var(--foreground)] border-[var(--foreground)]/5 shadow-sm hover:shadow-md"
            }`}>
            <div className="flex flex-col h-full justify-between">
                <div className="flex items-start justify-between mb-4">
                    <span className={`text-xs font-black uppercase tracking-widest ${highlight ? "opacity-60" : "opacity-30"}`}>{label}</span>
                    {icon === "trophy" && <svg className="w-5 h-5 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>}
                </div>
                <div>
                    <div className="text-4xl font-black tracking-tighter mb-1">{value}</div>
                    {sub && <div className={`text-xs font-bold ${highlight ? "opacity-60" : "opacity-40"}`}>{sub}</div>}
                </div>
            </div>
        </div>
    );
}
