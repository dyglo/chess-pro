"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useMatchRequests } from "@/hooks/use-match-requests";
import { useAuth } from "@/hooks/use-auth";

export function MatchNotifications() {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { pendingIncoming, activeMatches, activeLudoSessions, acceptRequest, declineRequest } = useMatchRequests();
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const visibleRequests = useMemo(() => pendingIncoming.slice(0, 2), [pendingIncoming]);
  const visibleChessMatches = useMemo(() => activeMatches.slice(0, 2), [activeMatches]);
  const visibleLudoSessions = useMemo(() => activeLudoSessions.slice(0, 2), [activeLudoSessions]);

  if (!user) return null;
  if (pathname === "/play") return null;
  if (pathname?.startsWith("/match")) return null;
  if (pathname?.startsWith("/games/ludo")) return null;
  if (visibleRequests.length === 0 && visibleChessMatches.length === 0 && visibleLudoSessions.length === 0) return null;

  const handleAccept = async (requestId: string) => {
    if (pendingAction) return;
    setPendingAction(requestId);
    try {
      const result = await acceptRequest(requestId);
      if (!result.error) {
        if (result.gameType === "ludo" && result.sessionId) {
          router.push(`/games/ludo?session=${result.sessionId}&multiplayer=true`);
        } else if (result.matchId) {
          router.push(`/match/${result.matchId}`);
        }
      } else {
        console.error("Failed to accept match:", result.error);
        alert(`Failed to accept match: ${result.error}`);
      }
    } catch (err) {
      console.error("Action failed:", err);
    } finally {
      setPendingAction(null);
    }
  };

  const handleDecline = async (requestId: string) => {
    if (pendingAction) return;
    setPendingAction(requestId);
    try {
      const result = await declineRequest(requestId);
      if (result.error) {
        console.error("Failed to decline request:", result.error);
      }
    } catch (err) {
      console.error("Action failed:", err);
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <div className="fixed right-4 top-20 z-[60] flex w-[min(92vw,360px)] flex-col gap-3">
      {/* Pending Invitations */}
      {visibleRequests.map((req) => {
        const gameType = req.game_type || "chess";
        const isPending = pendingAction === req.id;
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
                disabled={isPending}
                className="flex-1 rounded-full bg-[var(--accent)] px-3 py-2 text-xs font-bold text-white transition hover:brightness-110 shadow-sm disabled:opacity-50"
              >
                {isPending ? "Joining..." : "Accept"}
              </button>
              <button
                onClick={() => handleDecline(req.id)}
                disabled={isPending}
                className="flex-1 rounded-full border border-[var(--accent)] bg-white px-3 py-2 text-xs font-bold text-[var(--accent)] transition hover:bg-[var(--surface-2)] shadow-sm disabled:opacity-50"
              >
                Decline
              </button>
            </div>
          </div>
        );
      })}

      {/* Ready Chess Matches */}
      {visibleChessMatches.map((match) => (
        <div key={match.id} className="rounded-3xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
            Chess Match Ready
          </p>
          <div className="mt-2 text-sm font-semibold text-blue-900">
            Your match is live. Join now to play!
          </div>
          <Link
            href={`/match/${match.id}`}
            className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-blue-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-700 shadow-sm"
          >
            Open Chessboard
          </Link>
        </div>
      ))}

      {/* Ready Ludo Sessions */}
      {visibleLudoSessions.map((session) => (
        <div key={session.id} className="rounded-3xl border border-purple-200 bg-purple-50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-600">
            Ludo Match Ready
          </p>
          <div className="mt-2 text-sm font-semibold text-purple-900">
            A friend has joined! Your Ludo game is ready.
          </div>
          <Link
            href={`/games/ludo?session=${session.id}&multiplayer=true`}
            className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-purple-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-purple-700 shadow-sm"
          >
            Start Ludo
          </Link>
        </div>
      ))}
    </div>
  );
}

