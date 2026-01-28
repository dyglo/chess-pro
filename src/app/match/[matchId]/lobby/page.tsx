"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { AuthHeaderActions } from "@/components/auth/auth-header-actions";
import { MatchLobby } from "@/components/lobby/match-lobby";
import Image from "next/image";

export default function MatchLobbyPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const matchId = params.matchId as string;
  const gameParam = searchParams.get("game");
  const gameType = gameParam === "ludo" ? "ludo" : "chess";

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
            <Link href="/games" className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
              Games
            </Link>
            <Link href="/friends" className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
              Friends
            </Link>
            <AuthHeaderActions variant="light" />
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl items-start justify-center px-6 py-10">
        <MatchLobby matchId={matchId} gameType={gameType} embedded />
      </main>
    </div>
  );
}
