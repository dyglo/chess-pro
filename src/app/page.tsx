import Link from "next/link";
import { MarketingHeader } from "@/components/marketing/header";
import { MessageSquare, Puzzle, Trophy, Users, ShieldCheck, Sparkles } from "lucide-react";

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
          <section
            id="features"
            className="mt-32 grid gap-6 md:grid-cols-3"
          >
            {[
              {
                title: "AI coaching that feels human",
                text: "Ask why a move works, get a smarter alternative, and build training plans based on your weaknesses.",
                icon: <MessageSquare className="w-6 h-6 text-[var(--accent)]" />,
              },
              {
                title: "Daily puzzles, weekly momentum",
                text: "Puzzles, streaks, and challenges deliver short bursts of progress every session.",
                icon: <Puzzle className="w-6 h-6 text-[var(--accent)]" />,
              },
              {
                title: "Leagues that keep you coming back",
                text: "Season ladders, friend rivalries, and shared goals make every game matter.",
                icon: <Trophy className="w-6 h-6 text-[var(--accent)]" />,
              },
            ].map((item) => (
              <div
                key={item.title}
                className="group relative overflow-hidden rounded-[32px] border border-[var(--glass-border)] bg-[var(--glass)] p-10 shadow-sm backdrop-blur-md transition-all hover:shadow-xl hover:-translate-y-1"
              >
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
                  {item.icon}
                </div>
                <h3 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">{item.title}</h3>
                <p className="mt-5 text-[15px] leading-relaxed text-[var(--muted)]">
                  {item.text}
                </p>
              </div>
            ))}
          </section>

          <section
            id="community"
            className="mt-32 overflow-hidden rounded-[48px] border border-[var(--line)] bg-[var(--surface)] p-2 shadow-sm"
          >
            <div className="grid gap-12 p-8 md:grid-cols-[1fr_0.8fr] md:p-16">
              <div className="flex flex-col justify-center space-y-8">
                <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/50 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[var(--muted)]">
                  <Users className="w-3.5 h-3.5" />
                  Community
                </div>
                <h2 className="text-5xl font-bold leading-[1.1] tracking-tight text-[var(--foreground)]">Built for social play</h2>
                <p className="max-w-md text-lg leading-relaxed text-[var(--muted)]">
                  Friend lists, live challenges, and league standings keep casual
                  players and competitors aligned. Share highlight clips and
                  celebrate streaks together.
                </p>
                <div className="flex flex-wrap gap-4 pt-4">
                  <Link
                    href="#"
                    className="rounded-full bg-[var(--accent)] px-10 py-4 text-sm font-bold text-white shadow-lg transition hover:brightness-110 hover:shadow-xl active:scale-95"
                  >
                    Join Leagues (Coming Soon)
                  </Link>
                  <Link
                    href="#"
                    className="rounded-full border border-[var(--line)] bg-white px-10 py-4 text-sm font-bold text-[var(--foreground)] shadow-sm transition hover:bg-[var(--surface-2)] active:scale-95"
                  >
                    Find Friends
                  </Link>
                </div>
              </div>

              <div className="relative rounded-[40px] border border-[var(--line)] bg-white p-10 shadow-inner">
                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted)]">Competition</span>
                      <h4 className="text-xl font-bold text-black">Weekly League</h4>
                    </div>
                    <span className="flex items-center gap-1.5 rounded-full bg-[var(--accent-2)] px-4 py-2 text-[10px] font-black text-black uppercase tracking-widest shadow-sm">
                      Coming Soon
                    </span>
                  </div>

                  <div className="space-y-3">
                    {["Rhea", "Tariq", "Kaito", "Selene"].map((name, index) => (
                      <div
                        key={name}
                        className="group flex items-center justify-between rounded-2xl border border-[var(--line)] bg-white px-5 py-4 transition-all hover:bg-[var(--surface-2)] hover:shadow-sm"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-2)] text-xs font-bold text-[var(--muted)] group-hover:bg-white transition-colors">
                            {index + 1}
                          </div>
                          <span className="font-bold text-[var(--foreground)]">{name}</span>
                        </div>
                        <span className="font-black text-[var(--accent)]">
                          +{18 - index * 3} LP
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section id="pricing" className="mt-32 text-center">
            <div className="mx-auto max-w-3xl space-y-10">
              <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[var(--muted)]">
                <Sparkles className="w-3.5 h-3.5 text-[var(--accent-2)]" />
                Premium Experience
              </div>
              <h2 className="text-5xl font-bold tracking-tight text-[var(--foreground)]">
                Free to start. Premium when you&apos;re ready.
              </h2>
              <p className="mx-auto max-w-2xl text-xl leading-relaxed text-[var(--muted)]">
                Enjoy core play and puzzles with light ads, or upgrade for deep
                analysis, advanced AI coaching, and ad‑free focus.
              </p>
              <Link
                href="#"
                className="inline-flex rounded-full bg-[var(--accent)] px-12 py-5 text-sm font-black text-white shadow-2xl transition hover:brightness-110 active:scale-95"
              >
                Start Your Journey Free
              </Link>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
