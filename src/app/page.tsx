import Link from "next/link";
import { MarketingHeader } from "@/components/marketing/header";

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

        <div className="mx-auto w-full max-w-6xl px-6">
          <section
            id="features"
            className="mt-24 grid gap-8 md:grid-cols-3"
          >
            {[
              {
                title: "AI coaching that feels human",
                text: "Ask why a move works, get a smarter alternative, and build training plans based on your weaknesses.",
              },
              {
                title: "Daily puzzles, weekly momentum",
                text: "Puzzles, streaks, and challenges deliver short bursts of progress every session.",
              },
              {
                title: "Leagues that keep you coming back",
                text: "Season ladders, friend rivalries, and shared goals make every game matter.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-3xl border border-[var(--line)] bg-white p-8 shadow-sm hover:shadow-md transition-shadow"
              >
                <h3 className="text-xl font-bold">{item.title}</h3>
                <p className="mt-4 text-sm leading-relaxed text-[var(--muted)]">
                  {item.text}
                </p>
              </div>
            ))}
          </section>

          <section
            id="community"
            className="mt-24 grid gap-8 rounded-[40px] border border-[var(--line)] bg-[var(--surface)] p-10 shadow-sm md:grid-cols-[1.2fr_0.8fr]"
          >
            <div className="space-y-6">
              <h2 className="text-4xl font-bold">Built for social play</h2>
              <p className="text-lg text-[var(--muted)]">
                Friend lists, live challenges, and league standings keep casual
                players and competitors aligned. Share highlight clips and
                celebrate streaks together.
              </p>
              <div className="flex flex-wrap gap-4 pt-2">
                <Link
                  href="#"
                  className="rounded-full bg-[var(--accent-3)] px-8 py-3 text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5"
                >
                  Join Leagues
                </Link>
                <Link
                  href="#"
                  className="rounded-full border border-[var(--line)] bg-white px-8 py-3 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5"
                >
                  Find Friends
                </Link>
              </div>
            </div>
            <div className="rounded-3xl border border-[var(--line)] bg-white p-8 shadow-inner">
              <div className="space-y-6 text-sm text-[var(--muted)]">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-black text-lg">Weekly League</span>
                  <span className="rounded-full bg-[var(--accent-2)] px-4 py-1.5 text-xs font-bold text-black uppercase tracking-wider">
                    Live
                  </span>
                </div>
                <div className="space-y-3">
                  {["Rhea", "Tariq", "Kaito", "Selene"].map((name, index) => (
                    <div
                      key={name}
                      className="flex items-center justify-between rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] px-4 py-3"
                    >
                      <span className="font-medium text-black">{name}</span>
                      <span className="text-xs font-bold text-[var(--accent-3)]">
                        +{18 - index * 3} LP
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section id="pricing" className="mt-24 text-center">
            <div className="mx-auto max-w-2xl space-y-6">
              <h2 className="text-4xl font-bold">
                Free to start. Premium when you&apos;re ready.
              </h2>
              <p className="text-lg text-[var(--muted)] leading-relaxed">
                Enjoy core play and puzzles with light ads, or upgrade for deep
                analysis, advanced AI coaching, and ad‑free focus.
              </p>
              <Link
                href="#"
                className="inline-flex rounded-full bg-[var(--accent)] px-10 py-4 text-sm font-bold text-white shadow-[var(--shadow)] transition hover:scale-105 active:scale-95"
              >
                Start Free
              </Link>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
