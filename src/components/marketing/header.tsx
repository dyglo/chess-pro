"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { AuthHeaderActions } from "@/components/auth/auth-header-actions";
import { NotificationCenter } from "@/components/notifications/notification-center";

const navItems = [
  { label: "Games", href: "/games" },
  { label: "Chess", href: "/play" },
  { label: "Leaderboard", href: "/leaderboard" },
  { label: "Friends", href: "/friends" },
];

export function MarketingHeader({ variant = "dark" }: { variant?: "light" | "dark" }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isLight = variant === "light";

  return (
    <header className="absolute top-0 left-0 w-full z-50 bg-transparent">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-8">
        <Link href="/" className="flex items-center gap-3 z-50 relative">
          <Image
            src="/icons8-chess.svg"
            alt="ChessPro logo"
            width={42}
            height={42}
            priority
          />
          <span className={`text-xl font-bold tracking-tight uppercase ${isLight ? "text-zinc-900" : "text-white"}`}>
            Chess<span className="text-[var(--accent)]">Pro</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className={`hidden items-center gap-8 text-sm font-semibold md:flex ${isLight ? "text-zinc-600" : "text-white/70"}`}>
          {navItems.map((item) => (
            <a key={item.label} href={item.href} className={`transition-colors ${isLight ? "hover:text-zinc-900" : "hover:text-white"}`}>
              {item.label}
            </a>
          ))}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-4">
          <NotificationCenter variant={variant} />
          <AuthHeaderActions variant={variant} />
          <Link
            href="/login"
            className="rounded-full bg-[var(--accent)] px-6 py-2 text-sm font-bold text-white shadow-lg transition hover:bg-[var(--accent)] hover:scale-105 active:scale-95"
          >
            Play Instantly
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          className={`z-50 p-2 md:hidden ${isLight ? "text-zinc-900" : "text-white"}`}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
        >
          {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>

        {/* Mobile Menu Overlay */}
        {isMenuOpen && (
          <div className={`fixed inset-0 z-40 flex flex-col items-center justify-center backdrop-blur-xl animate-in fade-in duration-200 ${isLight ? "bg-white/95" : "bg-black/95"}`}>
            <nav className={`flex flex-col items-center gap-8 text-2xl font-bold ${isLight ? "text-zinc-900" : "text-white"}`}>
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="transition-colors hover:text-[var(--accent)]"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <div className="flex flex-col gap-4 mt-8 w-full px-8">
                <div className="flex justify-center">
                  <AuthHeaderActions variant={variant} />
                </div>
                <Link
                  href="/login"
                  className="w-full text-center rounded-full bg-[var(--accent)] px-6 py-4 text-base font-bold text-white shadow-lg transition active:scale-95"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Play Instantly
                </Link>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
