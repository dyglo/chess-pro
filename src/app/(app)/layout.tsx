import Image from "next/image";
import Link from "next/link";

const appNav = [
  { label: "Play", href: "/play" },
  { label: "Puzzles", href: "/puzzles" },
  { label: "Analysis", href: "/analysis" },
  { label: "Coach", href: "/coach" },
  { label: "Leagues", href: "/leagues" },
  { label: "Friends", href: "/friends" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--line)] bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/icons8-chess.svg"
              alt="ChessPro"
              width={36}
              height={36}
            />
            <span className="text-lg font-semibold">
              Chess<span className="text-[var(--accent)]">Pro</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-5 text-sm font-semibold text-[var(--muted)] md:flex">
            {appNav.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-black">
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3 text-sm">
            <span className="rounded-full bg-[var(--surface-2)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">
              Free
            </span>
            <Link
              href="/coach"
              className="rounded-full bg-[var(--accent-3)] px-4 py-2 text-xs font-semibold text-white"
            >
              Upgrade
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl gap-6 px-6 py-8">
        <aside className="hidden w-64 flex-col gap-4 md:flex">
          <div className="rounded-3xl border border-[var(--line)] bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
              Session Goal
            </p>
            <div className="mt-3 space-y-2">
              <p className="text-sm font-semibold">Stay 60 minutes</p>
              <div className="h-2 w-full rounded-full bg-[var(--surface-2)]">
                <div className="h-2 w-2/5 rounded-full bg-[var(--accent)]" />
              </div>
              <p className="text-xs text-[var(--muted)]">
                24 min played • 3 puzzles solved
              </p>
            </div>
          </div>
          <div className="rounded-3xl border border-[var(--line)] bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
              Quick Actions
            </p>
            <div className="mt-3 flex flex-col gap-2 text-sm font-semibold">
              {appNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-[var(--accent-3)] transition hover:-translate-y-0.5"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </aside>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
