import Link from "next/link";
import { MarketingHeader } from "@/components/marketing/header";
import { Gamepad2, Puzzle, Trophy, Users, Sparkles } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen">
      <MarketingHeader />
      <main>
        <section className="relative h-screen flex items-center overflow-hidden bg-black">
          {/* Background Video */}
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 h-full w-full object-cover"
          >
            <source src="/Mind_games_720P.mp4" type="video/mp4" />
          </video>

          {/* Content Wrapper for Alignment */}
          <div className="mx-auto w-full max-w-6xl px-6 relative z-10">
            <div className="space-y-10">
              <div className="space-y-4">
                <h1 className="text-5xl font-light tracking-tight text-white md:text-8xl uppercase leading-none">
                  Chess <span className="font-bold">Pro</span>
                </h1>
                <div className="h-[1px] w-64 bg-white/30" />
              </div>

              <p className="max-w-xl text-xl leading-relaxed text-white/80">
                Experience the pinnacle of competitive chess. Play against global grandmasters,
                analyze your moves with cutting-edge AI, and master the board.
              </p>

              <Link
                href="/login"
                className="inline-flex rounded-md bg-white px-10 py-4 text-sm font-bold text-black shadow-2xl transition hover:bg-white/90 hover:scale-105"
              >
                Get started!
              </Link>
            </div>
          </div>
        </section>

        <div className="mx-auto w-full max-w-6xl px-6 pb-24">
          <section id="launchpad" className="mt-24">
            <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/70 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted)]">
                  <Sparkles className="h-3.5 w-3.5 text-[var(--accent-2)]" />
                  Next Move
                </div>
                <h2 className="text-5xl font-bold tracking-tight text-[var(--foreground)] md:text-6xl">
                  The lobby ends here.
                </h2>
                <p className="max-w-2xl text-lg leading-relaxed text-[var(--muted)]">
                  Pick a destination and jump in. Every tile below is a doorway into
                  live games, new rivals, and deeper training.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/play"
                  className="inline-flex cursor-pointer items-center justify-center rounded-full bg-[var(--accent)] px-6 py-3 text-xs font-black uppercase tracking-[0.2em] text-white shadow-lg transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                >
                  Play Now
                </Link>
                <Link
                  href="/games"
                  className="inline-flex cursor-pointer items-center justify-center rounded-full border border-[var(--line)] bg-white px-6 py-3 text-xs font-black uppercase tracking-[0.2em] text-[var(--foreground)] shadow-sm transition hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                >
                  Games Hub
                </Link>
                <Link
                  href="/friends"
                  className="inline-flex cursor-pointer items-center justify-center rounded-full border border-[var(--line)] bg-white px-6 py-3 text-xs font-black uppercase tracking-[0.2em] text-[var(--foreground)] shadow-sm transition hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                >
                  Friends
                </Link>
              </div>
            </div>

            <div className="mt-12 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
              <Link
                href="/play"
                className="group relative cursor-pointer overflow-hidden rounded-[40px] border border-[var(--line)] bg-[var(--surface)] p-10 shadow-[var(--shadow)] transition hover:-translate-y-1 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              >
                <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[var(--accent)]/10 blur-3xl transition-opacity group-hover:opacity-80" />
                <div className="relative z-10 space-y-6">
                  <div className="flex items-start justify-between">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
                      <Gamepad2 className="h-6 w-6 text-[var(--accent)]" />
                    </div>
                    <span className="rounded-full border border-[var(--line)] bg-white/80 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--foreground)]">
                      Instant Queue
                    </span>
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">
                      Jump into live play.
                    </h3>
                    <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--muted)]">
                      Match with players at your level, switch between time controls,
                      and challenge friends without leaving the flow.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs font-bold uppercase tracking-widest text-[var(--muted)]">
                    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white px-4 py-2">
                      <Trophy className="h-3.5 w-3.5 text-[var(--accent)]" />
                      Ranked
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white px-4 py-2">
                      <Puzzle className="h-3.5 w-3.5 text-[var(--accent-2)]" />
                      Daily Puzzles
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white px-4 py-2">
                      <Users className="h-3.5 w-3.5 text-[var(--foreground)]" />
                      Friends
                    </span>
                  </div>
                  <div className="rounded-3xl border border-[var(--line)] bg-white/70 p-4 shadow-inner">
                    <div className="grid grid-cols-8 gap-1">
                      {Array.from({ length: 64 }).map((_, index) => {
                        const row = Math.floor(index / 8);
                        const isDark = (row + index) % 2 === 1;
                        return (
                          <div
                            key={index}
                            className={`aspect-square rounded-[4px] transition ${
                              isDark ? "bg-[var(--accent-3)]/90" : "bg-[var(--surface-2)]"
                            }`}
                          />
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="rounded-full bg-[var(--accent)] px-6 py-3 text-xs font-black uppercase tracking-[0.2em] text-white shadow-lg transition group-hover:brightness-110">
                      Enter Play
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                      Match found in &lt; 30s
                    </span>
                  </div>
                </div>
              </Link>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-1">
                <Link
                  href="/games"
                  className="group cursor-pointer rounded-[32px] border border-[var(--line)] bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-2)]">
                      <Puzzle className="h-5 w-5 text-[var(--accent)]" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--muted)]">
                      Games Hub
                    </span>
                  </div>
                  <h4 className="mt-6 text-2xl font-bold tracking-tight text-[var(--foreground)]">
                    Pick your arena.
                  </h4>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
                    Chess, Ludo, and puzzle sprints all in one switchboard.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-2 text-xs font-semibold text-[var(--foreground)]">
                    {[
                      "Chess",
                      "Ludo",
                      "Puzzles",
                    ].map((label) => (
                      <span
                        key={label}
                        className="rounded-full border border-[var(--line)] bg-[var(--surface-2)] px-3 py-1"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                </Link>

                <Link
                  href="/friends"
                  className="group cursor-pointer rounded-[32px] border border-[var(--line)] bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-2)]">
                      <Users className="h-5 w-5 text-[var(--foreground)]" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--muted)]">
                      Friends
                    </span>
                  </div>
                  <h4 className="mt-6 text-2xl font-bold tracking-tight text-[var(--foreground)]">
                    Challenge your circle.
                  </h4>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
                    Track active rivals, send invites, and build your boardroom.
                  </p>
                  <div className="mt-6 flex items-center gap-2">
                    {[
                      "RM",
                      "TK",
                      "SL",
                      "JP",
                    ].map((initials, index) => (
                      <div
                        key={initials}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface-2)] text-[10px] font-bold text-[var(--foreground)]"
                        style={{ marginLeft: index === 0 ? 0 : -8 }}
                      >
                        {initials}
                      </div>
                    ))}
                    <span className="ml-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                      14 online
                    </span>
                  </div>
                </Link>

                <Link
                  href="/analytics"
                  className="group cursor-pointer rounded-[32px] border border-[var(--line)] bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-2)]">
                      <Sparkles className="h-5 w-5 text-[var(--accent-2)]" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--muted)]">
                      Insights
                    </span>
                  </div>
                  <h4 className="mt-6 text-2xl font-bold tracking-tight text-[var(--foreground)]">
                    Track your climb.
                  </h4>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
                    Review streaks, accuracy, and training momentum.
                  </p>
                  <div className="mt-6 grid grid-cols-6 items-end gap-2">
                    {[32, 48, 28, 62, 78, 55].map((value, index) => (
                      <div
                        key={`bar-${index}`}
                        className="rounded-full bg-[var(--accent)]/70 transition group-hover:bg-[var(--accent)]"
                        style={{ height: `${value}%` }}
                      />
                    ))}
                  </div>
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

