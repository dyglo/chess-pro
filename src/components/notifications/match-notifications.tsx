"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";
import { useMatchRequests } from "@/hooks/use-match-requests";
import { useAuth } from "@/hooks/use-auth";

export function MatchNotifications() {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { pendingIncoming, activeMatches, acceptRequest, declineRequest } = useMatchRequests();

  const visibleRequests = useMemo(() => pendingIncoming.slice(0, 2), [pendingIncoming]);
  const visibleMatches = useMemo(() => activeMatches.slice(0, 2), [activeMatches]);

  if (!user) return null;
  if (pathname === "/play") return null;
  if (pathname?.startsWith("/match")) return null;
  if (pathname?.startsWith("/games/ludo")) return null;
  if (visibleRequests.length === 0 && visibleMatches.length === 0) return null;

  const handleAccept = async (requestId: string) => {
    const result = await acceptRequest(requestId);
    if (!result.error) {
      if (result.gameType === "ludo" && result.sessionId) {
        router.push(`/games/ludo?session=${result.sessionId}&multiplayer=true`);
      } else if (result.matchId) {
        router.push(`/match/${result.matchId}`);
      }
    }
  };

  return (
    <div className="fixed right-4 top-20 z-[60] flex w-[min(92vw,360px)] flex-col gap-3">
      {visibleRequests.map((req) => {
        const gameType = req.game_type || "chess";
        return (
          <div key={req.id} className="rounded-3xl border border-[var(--line)] bg-white p-4 shadow-[var(--shadow)]">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                Match Request
              </p>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${gameType === 'ludo' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                {gameType === 'ludo' ? '🎲 Ludo' : '♟ Chess'}
              </span>
            </div>
            <div className="mt-2 text-sm font-semibold">
              {req.requester?.full_name || req.requester?.username || "A player"} wants to play {gameType === 'ludo' ? 'Ludo' : 'Chess'}.
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => handleAccept(req.id)}
                className="flex-1 rounded-full bg-[var(--accent)] px-3 py-2 text-xs font-bold text-white transition hover:brightness-110 shadow-sm"
              >
                Accept
              </button>
              <button
                onClick={() => declineRequest(req.id)}
                className="flex-1 rounded-full border border-[var(--accent)] bg-white px-3 py-2 text-xs font-bold text-[var(--accent)] transition hover:bg-[var(--surface-2)] shadow-sm"
              >
                Decline
              </button>
            </div>
          </div>
        );
      })}

      {visibleMatches.map((match) => (
        <div key={match.id} className="rounded-3xl border border-[var(--line)] bg-white p-4 shadow-[var(--shadow)]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
            Match Ready
          </p>
          <div className="mt-2 text-sm font-semibold">
            Your match is live. Join now to play.
          </div>
          <Link
            href={`/match/${match.id}`}
            className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-[var(--accent)] px-3 py-2 text-xs font-bold text-white transition hover:brightness-110 shadow-sm"
          >
            Open Match
          </Link>
        </div>
      ))}
    </div>
  );
}
