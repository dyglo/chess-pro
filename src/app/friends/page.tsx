"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useMatchRequests, GameType } from "@/hooks/use-match-requests";
import { useMatchInvites, useNotifications } from "@/hooks/use-invites";
import { AuthHeaderActions } from "@/components/auth/auth-header-actions";
import { Users, X, Check, Loader2 } from "lucide-react";

type ProfileLite = {
  id: string;
  full_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  country?: string | null;
};

type PresenceRow = {
  user_id: string;
  is_online: boolean;
  last_seen_at: string;
};

export default function FriendsPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const { pendingIncoming, pendingOutgoing, activeMatches, activeLudoSessions, matchParticipation, sendRequest, acceptRequest, declineRequest } =
    useMatchRequests();
  const { pendingInvites, createMatchAndInvite, acceptInvite, declineInvite } = useMatchInvites({ userId: user?.id });
  const { notifications, markAsRead } = useNotifications({ userId: user?.id });

  const [profiles, setProfiles] = useState<ProfileLite[]>([]);
  const [presence, setPresence] = useState<Record<string, PresenceRow>>({});
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGame, setSelectedGame] = useState<Record<string, GameType>>({});

  // Create Ludo Game modal state
  const [showCreateLudoModal, setShowCreateLudoModal] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [isCreatingGame, setIsCreatingGame] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const supabase = createClient();
        const { data: userRows, error: userError } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, country")
          .order("full_name", { ascending: true });

        if (userError) throw userError;
        const cleaned = (userRows ?? []).filter((p) => {
          const hasName = typeof p.full_name === "string" && p.full_name.trim().length > 0;
          return p.id && hasName && p.id !== user.id;
        });
        setProfiles(cleaned);

        const { data: presenceRows, error: presenceError } = await supabase
          .from("online_presence")
          .select("user_id, is_online, last_seen_at");

        if (presenceError) throw presenceError;
        const map: Record<string, PresenceRow> = {};
        (presenceRows ?? []).forEach((p) => {
          map[p.user_id] = p;
        });
        setPresence(map);
      } catch (err) {
        console.error("Friends fetch error:", err);
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, router, isAuthLoading]);

  const filteredProfiles = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return profiles;
    return profiles.filter((p) => {
      const name = (p.full_name || p.username || "").toLowerCase();
      return name.includes(query);
    });
  }, [profiles, search]);

  const matchStartedNotifs = useMemo(() => {
    return (notifications ?? []).filter((n) => n.type === "match_started" && !n.read_at);
  }, [notifications]);

  const leftActiveMatches = useMemo(() => {
    return activeMatches.filter((match) => matchParticipation[match.id] === "left");
  }, [activeMatches, matchParticipation]);

  const handleJoinStartedMatch = async (notifId: string, payload: Record<string, unknown>) => {
    const matchId = payload.matchId as string | undefined;
    const gameType = (payload.gameType as GameType | undefined) ?? "ludo";
    if (!matchId) return;
    await markAsRead(notifId);
    if (gameType === "ludo") {
      router.push(`/games/ludo?match=${matchId}&multiplayer=true`);
    } else {
      router.push(`/match/${matchId}`);
    }
  };

  // Toggle friend selection for Ludo game
  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriends(prev => {
      if (prev.includes(friendId)) {
        return prev.filter(id => id !== friendId);
      }
      // Max 3 friends (4 players total including host)
      if (prev.length >= 3) {
        return prev;
      }
      return [...prev, friendId];
    });
  };

  // Create Ludo game and send invites
  const handleCreateLudoGame = async () => {
    if (selectedFriends.length === 0) {
      setCreateError("Select at least 1 friend to invite");
      return;
    }

    setIsCreatingGame(true);
    setCreateError(null);

    try {
      const result = await createMatchAndInvite("ludo", selectedFriends);

      if (result.success && result.matchId) {
        // Redirect to lobby page
        router.push(`/match/${result.matchId}/lobby?game=ludo`);
      } else {
        setCreateError(result.error || "Failed to create game");
      }
    } catch (err) {
      console.error("Create game error:", err);
      setCreateError((err as Error).message);
    } finally {
      setIsCreatingGame(false);
    }
  };

  // Handle accepting new invite system invites
  const handleAcceptNewInvite = async (inviteId: string) => {
    const result = await acceptInvite(inviteId);
    if (result.success && result.matchId) {
      const gameType = result.gameType || "ludo";
      router.push(`/match/${result.matchId}/lobby?game=${gameType}`);
    }
  };

  if (isAuthLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="w-8 h-8 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

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
            <AuthHeaderActions variant="light" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        {matchStartedNotifs.length > 0 && (
          <div className="mb-6 space-y-3">
            {matchStartedNotifs.map((notif) => (
              <div
                key={notif.id}
                className="flex flex-col gap-3 rounded-3xl border border-purple-200 bg-purple-50 px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-purple-500">
                    Match Started
                  </p>
                  <p className="mt-1 text-sm font-semibold text-purple-900">
                    {notif.message || "A match is live. Join to start playing."}
                  </p>
                </div>
                <button
                  onClick={() => handleJoinStartedMatch(notif.id, notif.payload)}
                  className="rounded-full bg-purple-600 px-5 py-2 text-xs font-bold uppercase tracking-wide text-white transition hover:brightness-110"
                >
                  Join Game
                </button>
              </div>
            ))}
          </div>
        )}
        {leftActiveMatches.length > 0 && (
          <div className="mb-6 space-y-3">
            {leftActiveMatches.map((match) => (
              <div
                key={`resume-${match.id}`}
                className="flex flex-col gap-3 rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-amber-500">
                    Match In Progress
                  </p>
                  <p className="mt-1 text-sm font-semibold text-amber-900">
                    {match.game_type === "ludo" ? "Your Ludo match is live." : "Your chess match is live."}
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (match.game_type === "ludo") {
                      router.push(`/games/ludo?match=${match.id}&multiplayer=true`);
                    } else {
                      router.push(`/match/${match.id}`);
                    }
                  }}
                  className="rounded-full bg-amber-600 px-5 py-2 text-xs font-bold uppercase tracking-wide text-white transition hover:brightness-110"
                >
                  Resume
                </button>
              </div>
            ))}
          </div>
        )}
        <section className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
          <div className="rounded-[32px] border border-[var(--line)] bg-white p-8 shadow-[var(--shadow)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
                  Friends & Matches
                </p>
                <h1 className="mt-3 text-4xl font-bold tracking-tight">Find your next rival</h1>
              </div>

              {/* Create Ludo Game Button */}
              <button
                onClick={() => {
                  setShowCreateLudoModal(true);
                  setSelectedFriends([]);
                  setCreateError(null);
                }}
                className="flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:scale-105 hover:shadow-xl"
              >
                <Users className="h-4 w-4" />
                Create Ludo Game
              </button>
            </div>

            <p className="mt-3 max-w-xl text-sm text-[var(--muted)]">
              Create a Ludo game and invite up to 3 friends, or challenge players 1-on-1.
            </p>

            <div className="mt-6 rounded-3xl border border-[var(--line)] bg-[var(--surface-2)] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                    Player directory
                  </p>
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    {filteredProfiles.length} players available
                  </p>
                </div>
                <div className="w-full sm:w-[320px]">
                  <label htmlFor="friend-search" className="sr-only">Search players</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="h-4 w-4 text-[var(--muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m1.85-5.65a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input
                      id="friend-search"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search by name (optional)"
                      className="w-full rounded-full border border-[var(--line)] bg-white pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-3xl border border-[var(--line)] bg-white p-4 shadow-[var(--shadow)]">
              <div className="max-h-[520px] overflow-y-auto pr-2">
                <div className="space-y-3">
                  {filteredProfiles.map((profile) => {
                    const isPending = pendingOutgoing.some((req) => req.recipient_id === profile.id);
                    const isOnline = presence[profile.id]?.is_online ?? false;
                    const gameChoice = selectedGame[profile.id] || "chess";

                    return (
                      <div key={profile.id} className="flex items-center justify-between rounded-3xl border border-[var(--line)] bg-[var(--surface-2)] p-4">
                        <div className="flex items-center gap-4">
                          <div className="relative h-12 w-12 overflow-hidden rounded-full border border-[var(--line)] bg-white">
                            <Image
                              src={profile.avatar_url || "/avatars/user-placeholder.jpg"}
                              alt={profile.full_name || "Player"}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div>
                            <p className="text-sm font-semibold">
                              {profile.full_name || "Player"}
                            </p>
                            <p className="text-xs text-[var(--muted)]">
                              {isOnline ? "Online" : "Offline"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Game Selector - only for 1v1 Chess */}
                          <select
                            value={gameChoice}
                            onChange={(e) => setSelectedGame(prev => ({ ...prev, [profile.id]: e.target.value as GameType }))}
                            disabled={isPending}
                            className="rounded-full border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-50"
                          >
                            <option value="chess">♟ Chess (1v1)</option>
                          </select>
                          <button
                            onClick={() => sendRequest(profile.id, gameChoice)}
                            disabled={isPending}
                            className={`rounded-full px-4 py-2 text-xs font-semibold transition ${isPending
                              ? "cursor-not-allowed bg-white text-[var(--muted)]"
                              : "bg-[var(--accent)] text-white hover:opacity-90"
                              }`}
                          >
                            {isPending ? "Requested" : "Challenge"}
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {filteredProfiles.length === 0 && (
                    <div className="rounded-3xl border border-dashed border-[var(--line)] p-10 text-center text-sm text-[var(--muted)]">
                      {profiles.length === 0 ? "No users found." : "No players match that search."}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            {/* New Invite System - Game Invites */}
            {pendingInvites.length > 0 && (
              <div className="rounded-[32px] border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-pink-50 p-6 shadow-lg">
                <h2 className="flex items-center gap-2 text-lg font-bold text-purple-900">
                  <Users className="h-5 w-5" />
                  Game Invites
                </h2>
                <div className="mt-4 space-y-3">
                  {pendingInvites.map((invite) => (
                    <div key={invite.id} className="rounded-2xl border border-purple-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="relative h-10 w-10 overflow-hidden rounded-full border border-purple-200">
                          <Image
                            src={invite.from_user?.avatar_url || "/avatars/user-placeholder.jpg"}
                            alt={invite.from_user?.full_name || "Player"}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-purple-900">
                            {invite.from_user?.full_name || invite.from_user?.username || "Player"}
                          </p>
                          <p className="text-xs text-purple-600">Invited you to Ludo</p>
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => handleAcceptNewInvite(invite.id)}
                          className="flex-1 flex items-center justify-center gap-1 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-3 py-2 text-xs font-bold text-white transition hover:opacity-90"
                        >
                          <Check className="h-3 w-3" />
                          Join Game
                        </button>
                        <button
                          onClick={() => declineInvite(invite.id)}
                          className="flex-1 rounded-full border border-purple-300 bg-white px-3 py-2 text-xs font-bold text-purple-700 transition hover:bg-purple-50"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Legacy Incoming Requests (Chess 1v1) */}
            <div className="rounded-[32px] border border-[var(--line)] bg-white p-6 shadow-[var(--shadow)]">
              <h2 className="text-lg font-bold">Incoming Requests</h2>
              <div className="mt-4 space-y-3">
                {pendingIncoming.map((req) => {
                  const gameType = req.game_type || "chess";
                  const handleAccept = async () => {
                    const result = await acceptRequest(req.id);
                    if (!result.error) {
                      if (result.gameType === "ludo" && result.sessionId) {
                        router.push(`/games/ludo?session=${result.sessionId}&multiplayer=true`);
                      } else if (result.matchId) {
                        router.push(`/match/${result.matchId}`);
                      } else {
                        console.error("No match/session ID returned for accepted request");
                      }
                    }
                  };
                  return (
                    <div key={req.id} className="rounded-3xl border border-[var(--line)] bg-[var(--surface-2)] p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold">
                          {req.requester?.full_name || req.requester?.username || "Player"}
                        </p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${gameType === 'ludo' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                          {gameType === 'ludo' ? '🎲 Ludo' : '♟ Chess'}
                        </span>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={handleAccept}
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
                {pendingIncoming.length === 0 && (
                  <p className="text-sm text-[var(--muted)]">No pending requests.</p>
                )}
              </div>
            </div>

            <div className="rounded-[32px] border border-[var(--line)] bg-white p-6 shadow-[var(--shadow)]">
              <h2 className="text-lg font-bold">Active Matches</h2>
              <div className="mt-4 space-y-3">
                {/* Ludo Sessions */}
                {activeLudoSessions.map((session) => (
                  <div key={session.id} className="relative group">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        const el = document.getElementById(`session-${session.id}`);
                        if (el) el.style.display = 'none';
                      }}
                      className="absolute top-[-8px] right-[-8px] z-10 bg-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity border border-gray-100 hover:bg-red-50"
                      title="Hide from list"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                    <Link
                      id={`session-${session.id}`}
                      href={`/games/ludo?session=${session.id}&multiplayer=true`}
                      className="flex items-center justify-between rounded-3xl border border-purple-200 bg-purple-50 px-4 py-3 text-sm font-semibold transition hover:-translate-y-0.5"
                    >
                      <div className="flex flex-col">
                        <span className="text-purple-900">🎲 Ludo Match</span>
                        <span className="text-xs font-normal text-purple-700 opacity-75">
                          {session.created_at ? new Date(session.created_at).toLocaleString(undefined, {
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                          }) : 'Just now'}
                        </span>
                      </div>
                      <span className="rounded-full bg-white/50 px-2 py-1 text-xs font-bold text-purple-700">Join</span>
                    </Link>
                  </div>
                ))}

                {/* Active Matches */}
                {activeMatches.map((match) => (
                  <div key={match.id} className="relative group">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        const el = document.getElementById(`match-${match.id}`);
                        if (el) el.style.display = 'none';
                      }}
                      className="absolute top-[-8px] right-[-8px] z-10 bg-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity border border-gray-100 hover:bg-red-50"
                      title="Hide from list"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                    <Link
                      id={`match-${match.id}`}
                      href={match.game_type === "ludo" ? `/games/ludo?match=${match.id}&multiplayer=true` : `/match/${match.id}`}
                      className={`flex items-center justify-between rounded-3xl border px-4 py-3 text-sm font-semibold transition hover:-translate-y-0.5 ${match.game_type === "ludo"
                          ? "border-purple-200 bg-purple-50"
                          : "border-[var(--line)] bg-[var(--surface-2)]"
                        }`}
                    >
                      <div className="flex flex-col">
                        <span>{match.game_type === "ludo" ? "🎲 Ludo Match" : `♟ Match #${match.id.slice(0, 4)}`}</span>
                        <span className={`text-xs font-normal ${match.game_type === "ludo" ? "text-purple-700/75" : "text-[var(--muted)]"}`}>
                          {match.created_at ? new Date(match.created_at).toLocaleString(undefined, {
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                          }) : 'Just now'}
                        </span>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-xs font-bold ${match.game_type === "ludo"
                          ? "bg-white/50 text-purple-700"
                          : "bg-white/50 text-[var(--foreground)]"
                        }`}>Join</span>
                    </Link>
                  </div>
                ))}

                {activeMatches.length === 0 && activeLudoSessions.length === 0 && (
                  <p className="text-sm text-[var(--muted)]">No active matches.</p>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Create Ludo Game Modal */}
      {showCreateLudoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-lg mx-4 rounded-[32px] bg-white p-8 shadow-2xl">
            <button
              onClick={() => setShowCreateLudoModal(false)}
              className="absolute top-4 right-4 rounded-full p-2 hover:bg-gray-100 transition"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>

            <div className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-3xl">
                🎲
              </div>
              <h2 className="mt-4 text-2xl font-bold">Create Ludo Game</h2>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Select 1-3 friends to invite. The game will start when everyone joins.
              </p>
            </div>

            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)] mb-3">
                Select Friends ({selectedFriends.length}/3)
              </p>

              <div className="max-h-[300px] overflow-y-auto rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-2">
                {profiles.map((profile) => {
                  const isSelected = selectedFriends.includes(profile.id);
                  const isOnline = presence[profile.id]?.is_online ?? false;

                  return (
                    <button
                      key={profile.id}
                      onClick={() => toggleFriendSelection(profile.id)}
                      disabled={!isSelected && selectedFriends.length >= 3}
                      className={`w-full flex items-center justify-between rounded-xl p-3 mb-1 transition ${isSelected
                          ? "bg-purple-100 border-2 border-purple-400"
                          : "bg-white border border-transparent hover:border-purple-200"
                        } ${!isSelected && selectedFriends.length >= 3 ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative h-10 w-10 overflow-hidden rounded-full border border-[var(--line)]">
                          <Image
                            src={profile.avatar_url || "/avatars/user-placeholder.jpg"}
                            alt={profile.full_name || "Player"}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-semibold">{profile.full_name || "Player"}</p>
                          <p className={`text-xs ${isOnline ? "text-green-600" : "text-[var(--muted)]"}`}>
                            {isOnline ? "● Online" : "○ Offline"}
                          </p>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="flex items-center justify-center h-6 w-6 rounded-full bg-purple-500 text-white">
                          <Check className="h-4 w-4" />
                        </div>
                      )}
                    </button>
                  );
                })}

                {profiles.length === 0 && (
                  <p className="text-center text-sm text-[var(--muted)] py-8">No friends found.</p>
                )}
              </div>
            </div>

            {createError && (
              <div className="mt-4 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {createError}
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowCreateLudoModal(false)}
                className="flex-1 rounded-full border border-[var(--line)] bg-white px-4 py-3 text-sm font-semibold transition hover:bg-[var(--surface-2)]"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateLudoGame}
                disabled={selectedFriends.length === 0 || isCreatingGame}
                className="flex-1 flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreatingGame ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Users className="h-4 w-4" />
                    Create & Invite ({selectedFriends.length})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="fixed bottom-6 right-6 rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white">
          {error}
        </div>
      )}
    </div>
  );
}
