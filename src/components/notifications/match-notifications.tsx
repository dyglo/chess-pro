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
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const visibleRequests = useMemo(() =>
    pendingIncoming.filter(id => !dismissedIds.has(id.id)).slice(0, 2),
    [pendingIncoming, dismissedIds]);

  const visibleChessMatches = useMemo(() =>
    activeMatches.filter(id => !dismissedIds.has(id.id)).slice(0, 2),
    [activeMatches, dismissedIds]);

  const visibleLudoSessions = useMemo(() =>
    activeLudoSessions.filter(id => !dismissedIds.has(id.id)).slice(0, 2),
    [activeLudoSessions, dismissedIds]);

  if (!user) return null;
  if (pathname === "/play") return null;
  if (pathname?.startsWith("/match")) return null;
  if (pathname?.startsWith("/games/ludo")) return null;
  if (visibleRequests.length === 0 && visibleChessMatches.length === 0 && visibleLudoSessions.length === 0) return null;

  const handleDismiss = (id: string) => {
    setDismissedIds(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const handleAccept = async (requestId: string) => {
    if (pendingAction) return;
    setPendingAction(requestId);
    console.log("Accepting request:", requestId);
    try {
      const result = await acceptRequest(requestId);
      console.log("Accept result:", result);

      if (!result.error) {
        if (result.gameType === "ludo") {
          console.log("Redirecting to Ludo session:", result.sessionId);
          if (result.sessionId) {
            router.push(`/games/ludo?session=${result.sessionId}&multiplayer=true`);
          } else {
            console.error("Ludo game accepted but no sessionId returned");
            alert("Error: Game created but session ID missing. Please check your active matches.");
          }
        } else if (result.matchId) {
          router.push(`/match/${result.matchId}`);
        }
      } else {
        console.error("Failed to accept match:", result.error);
        alert(`Failed to accept match: ${result.error}`);
      }
    } catch (err) {
      console.error("Action failed:", err);
      alert("An unexpected error occurred while accepting the request.");
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
          <div key={req.id} className="relative rounded-3xl border border-[var(--line)] bg-white p-4 shadow-[var(--shadow)]">
            <button
              onClick={() => handleDismiss(req.id)}
              className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-100 text-gray-400"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
            <div className="flex items-center justify-between pr-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                Match Request
              </p>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${gameType === 'ludo' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                {gameType === 'ludo' ? '🎲 Ludo' : '♟ Chess'}
              </span>
            </div>
            {/* ... rest of card ... */}
            <div className="mt-2 text-sm font-semibold">
              {req.requester?.full_name || req.requester?.username || "A player"} wants to play {gameType === 'ludo' ? 'Ludo' : 'Chess'}.
            </div>
            <div className="mt-3 flex gap-2">
              {/* ... buttons ... */}
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
        <div key={match.id} className="relative rounded-3xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
          <button
            onClick={() => handleDismiss(match.id)}
            className="absolute top-2 right-2 p-1 rounded-full hover:bg-blue-100 text-blue-400"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600 pr-6">
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
        <div key={session.id} className="relative rounded-3xl border border-purple-200 bg-purple-50 p-4 shadow-sm">
          <button
            onClick={() => handleDismiss(session.id)}
            className="absolute top-2 right-2 p-1 rounded-full hover:bg-purple-100 text-purple-400"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-600 pr-6">
            Ludo Match Ready
          </p>
          <div className="mt-2 text-sm font-semibold text-purple-900">
            A friend has joined! Your Ludo game is ready.
          </div>
          <Link
            href={`/games/ludo?session=${session.id}&multiplayer=true`}
            className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-purple-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-purple-700 shadow-sm"
            onClick={() => console.log("Joining Ludo session:", session.id)}
          >
            Start Ludo Match
          </Link>
        </div>
      ))}
    </div>
  );
}

