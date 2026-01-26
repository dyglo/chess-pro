import Image from "next/image";
import Link from "next/link";

const navItems = [
  { label: "Play", href: "/play" },
  { label: "Leaderboard", href: "/leaderboard" },
  { label: "Friends", href: "/friends" },
];

export function MarketingHeader() {
  return (
    <header className="absolute top-0 left-0 w-full z-50 bg-transparent">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-8">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/icons8-chess.svg"
            alt="ChessPro logo"
            width={42}
            height={42}
            priority
          />
          <span className="text-xl font-bold tracking-tight text-white uppercase">
            Chess<span className="text-[var(--accent)]">Pro</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-semibold text-white/70 md:flex">
          {navItems.map((item) => (
            <a key={item.label} href={item.href} className="transition-colors hover:text-white">
              {item.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          <Link
            href="/play"
            className="rounded-full border border-white/20 bg-white/10 px-6 py-2 text-sm font-bold text-white backdrop-blur-md transition hover:bg-white/20 hover:border-white/40"
          >
            Sign In
          </Link>
          <Link
            href="/play"
            className="hidden rounded-full bg-[var(--accent)] px-6 py-2 text-sm font-bold text-white shadow-lg transition hover:bg-[var(--accent)] hover:scale-105 active:scale-95 md:inline-flex"
          >
            Play Instantly
          </Link>
        </div>
      </div>
    </header>
  );
}
