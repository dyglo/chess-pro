"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ChessBoardWrapper } from "@/components/play/chess-board-wrapper";
import { PlayerProfile } from "@/components/play/player-profile";
import { MoveHistory } from "@/components/play/move-history";
import { CapturedDisplay } from "@/components/play/captured-display";
import { ActionSidebar } from "@/components/play/action-sidebar";
import { GameSettingsModal } from "@/components/play/game-settings-modal";
import { ChatModal } from "@/components/play/chat-modal";
import { useRealtimeMatch } from "@/hooks/use-realtime-match";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { BoardTheme, defaultTheme, getThemeById } from "@/lib/board-themes";

type ProfileLite = {
  id: string;
  full_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  country?: string | null;
};

type MatchData = {
  id: string;
  status: string;
  game_type: string;
  created_by: string;
  white_user_id?: string;
  black_user_id?: string;
  started_at?: string;
};

export default function MatchPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const matchId = params.matchId as string;
  const gameTypeParam = searchParams.get("game");
  const { user } = useAuth();

  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const [isLoadingMatch, setIsLoadingMatch] = useState(true);
  const [matchError, setMatchError] = useState<string | null>(null);

  // Fetch match data to determine game type and status
  useEffect(() => {
    if (!matchId) return;

    const fetchMatch = async () => {
      setIsLoadingMatch(true);
      setMatchError(null);

      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("matches")
          .select("id, status, game_type, created_by, white_user_id, black_user_id, started_at")
          .eq("id", matchId)
          .single();

        if (error) throw error;
        setMatchData(data);

        // If match is active and it's Ludo, redirect to Ludo page
        if (data.status === "active" && (data.game_type === "ludo" || gameTypeParam === "ludo")) {
          router.replace(`/games/ludo?match=${matchId}&multiplayer=true`);
        }
      } catch (err) {
        console.error("Match fetch error:", err);
        setMatchError((err as Error).message);
      } finally {
        setIsLoadingMatch(false);
      }
    };

    fetchMatch();

    // Subscribe to match changes
    const supabase = createClient();
    const channel = supabase
      .channel(`match-status:${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "matches",
          filter: `id=eq.${matchId}`,
        },
        (payload) => {
          const updated = payload.new as MatchData;
          setMatchData(updated);

          // Redirect when match becomes active
          if (updated.status === "active") {
            if (updated.game_type === "ludo" || gameTypeParam === "ludo") {
              router.replace(`/games/ludo?match=${matchId}&multiplayer=true`);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, router, gameTypeParam]);

  // Show lobby for pending/lobby status
  const showLobby = matchData && (matchData.status === "pending" || matchData.status === "lobby");
  const isLudoGame = matchData?.game_type === "ludo" || gameTypeParam === "ludo";

  // Only use chess hooks if this is a chess game and match is active
  const shouldUseChessHooks = matchData && matchData.status === "active" && !isLudoGame;

  if (isLoadingMatch) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="w-8 h-8 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (matchError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--background)] gap-4">
        <p className="text-red-600 font-semibold">Error loading match: {matchError}</p>
        <Link href="/friends" className="text-[var(--accent)] hover:underline">
          Back to Friends
        </Link>
      </div>
    );
  }

  // Redirect to lobby route for pending games
  if (showLobby) {
    router.replace(`/match/${matchId}/lobby?game=${isLudoGame ? "ludo" : "chess"}`);
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="w-8 h-8 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // For active chess games, render the chess board
  if (shouldUseChessHooks) {
    return <ChessMatchView matchId={matchId} user={user} />;
  }

  // Fallback loading state
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[var(--muted)]">Loading game...</p>
      </div>
    </div>
  );
}

// Separate component for chess match to avoid hook rules issues
function ChessMatchView({ matchId, user }: { matchId: string; user: { id: string } | null }) {
  const { match, gameState, isLoading, error, myColor, isMyTurn, makeMove, getLegalMoves, moveHistory } =
    useRealtimeMatch(matchId);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [isResigning, setIsResigning] = useState(false);
  const [boardTheme, setBoardTheme] = useState<BoardTheme>(defaultTheme);
  const [showGameSettings, setShowGameSettings] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showChat, setShowChat] = useState(false);

  const displayColor = useMemo<"w" | "b">(() => {
    const base = myColor ?? "w";
    return isFlipped ? (base === "w" ? "b" : "w") : base;
  }, [myColor, isFlipped]);

  useEffect(() => {
    if (!match) return;
    const fetchProfiles = async () => {
      const supabase = createClient();
      const ids = [match.white_user_id, match.black_user_id].filter(Boolean) as string[];
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url, country")
        .in("id", ids);
      const map: Record<string, ProfileLite> = {};
      (data ?? []).forEach((p) => {
        map[p.id] = p;
      });
      setProfiles(map);
    };
    fetchProfiles();
  }, [match]);

  const whiteProfile = match?.white_user_id ? profiles[match.white_user_id] : null;
  const blackProfile = match?.black_user_id ? profiles[match.black_user_id] : null;
  const topProfile = myColor === "w" ? blackProfile : whiteProfile;
  const bottomProfile = myColor === "w" ? whiteProfile : blackProfile;
  const topColor = myColor === "w" ? "b" : "w";
  const bottomColor = myColor === "w" ? "w" : "b";

  const statusLabel = useMemo(() => {
    if (!match) return "Loading match...";
    if (match.status === "completed") return "Match complete";
    return isMyTurn ? "Your move" : "Opponent's move";
  }, [match, isMyTurn]);

  const handleResign = async () => {
    if (!match || !user) return;
    setIsResigning(true);
    try {
      const supabase = createClient();
      const winnerColor =
        myColor === "w" ? "black" : myColor === "b" ? "white" : "draw";
      await supabase.rpc("complete_match", {
        p_match_id: match.id,
        p_winner_color: winnerColor,
        p_reason: "resign",
        p_duration_seconds: match.started_at
          ? Math.max(
            1,
            Math.floor(
              (Date.now() - new Date(match.started_at).getTime()) / 1000
            )
          )
          : null,
        p_final_fen: gameState.fen,
      });
    } finally {
      setIsResigning(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="w-8 h-8 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col font-sans text-[var(--foreground)] selection:bg-[var(--accent)]/20">
      <header className="h-16 lg:h-20 flex items-center justify-between px-4 lg:px-8 border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-40">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 lg:w-10 lg:h-10 bg-[var(--accent)] rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 shadow-sm">
            <svg className="w-5 h-5 lg:w-6 lg:h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19,22H5V20H19V22M17,10C17,8.89 16.1,8 15,8V7C15,5.89 14.1,5 13,5V4C13,2.89 12.1,2 11,2H9C7.89,2 7,2.89 7,4V5C5.89,5 5,5.89 5,7V8C3.89,8 3,8.89 3,10V18H21V10C21,8.89 20.1,8 19,8V7C19,5.89 18.1,5 17,10M17,18H7V10H17V18Z" />
            </svg>
          </div>
          <span className="text-xl lg:text-2xl font-bold tracking-tight uppercase">
            Chess<span className="text-[var(--accent)]">Pro</span>
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <span className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-xs font-semibold text-[var(--muted)]">
            {statusLabel}
          </span>
          <button
            onClick={handleResign}
            disabled={isResigning}
            className="rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-bold text-white transition hover:brightness-110 active:scale-95 shadow-sm disabled:opacity-50"
          >
            {isResigning ? "Resigning..." : "Resign"}
          </button>
        </div>
      </header>

      <main className="flex-1 lg:grid lg:grid-cols-[1fr_560px_1fr] lg:gap-8 p-4 lg:p-8 max-w-[1800px] mx-auto w-full items-start">
        <div className="hidden lg:flex flex-col gap-6 sticky top-28">
          <PlayerProfile
            name={topProfile?.full_name || topProfile?.username || "Opponent"}
            rating="1200"
            avatar={topProfile?.avatar_url || "/avatars/user-placeholder.jpg"}
            country={topProfile?.country || "EARTH"}
            time={0}
            isActive={gameState.turn === topColor}
            isTop={true}
          />

          <ActionSidebar
            onNewGame={() => (window.location.href = "/play")}
            onSettings={() => setShowGameSettings(true)}
            onFlip={() => setIsFlipped((prev) => !prev)}
            onShare={() => {
              if (navigator?.clipboard) {
                navigator.clipboard.writeText(window.location.href);
              }
            }}
            onHint={() => { }}
            onUndo={() => { }}
            onChat={() => setShowChat(true)}
            onRematch={() => (window.location.href = "/play")}
            isGameOver={gameState.isGameOver}
          />

          <PlayerProfile
            name={bottomProfile?.full_name || bottomProfile?.username || "You"}
            rating="1200"
            avatar={bottomProfile?.avatar_url || "/avatars/user-placeholder.jpg"}
            country={bottomProfile?.country || "EARTH"}
            time={0}
            isActive={gameState.turn === bottomColor}
          />
        </div>

        <div className="lg:hidden mb-4">
          <PlayerProfile
            name={blackProfile?.full_name || blackProfile?.username || "Opponent"}
            rating="1200"
            avatar={blackProfile?.avatar_url || "/avatars/user-placeholder.jpg"}
            country={blackProfile?.country || "EARTH"}
            time={0}
            isActive={gameState.turn === "b"}
            isTop={true}
          />
        </div>

        <div className="relative flex flex-col items-center">
          <div className="w-full max-w-[min(90vw,calc(100vh-160px))] lg:max-w-[min(90vw,calc(100vh-160px))] relative aspect-square group px-4 lg:px-0">
            <div className="absolute -inset-10 bg-[var(--accent)]/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
            <div className="w-full h-full bg-white rounded-2xl p-4 lg:p-6 shadow-[0_30px_100px_-20px_rgba(0,0,0,0.15)] border border-[var(--foreground)]/5 relative z-10 transition-transform duration-500 lg:hover:scale-[1.01]">
              <ChessBoardWrapper
                fen={gameState.fen}
                theme={boardTheme}
                playerColor={displayColor}
                lastMove={gameState.lastMove}
                hintMove={null}
                isThinking={false}
                onPieceDrop={(source, target) => makeMove(source, target)}
                getLegalMoves={getLegalMoves}
              />
            </div>
          </div>

          <div className="lg:hidden w-full mt-8 flex flex-col gap-4">
            <PlayerProfile
              name={whiteProfile?.full_name || whiteProfile?.username || "You"}
              rating="1200"
              avatar={whiteProfile?.avatar_url || "/avatars/user-placeholder.jpg"}
              country={whiteProfile?.country || "EARTH"}
              time={0}
              isActive={gameState.turn === "w"}
            />
          </div>
        </div>

        <div className="hidden lg:flex flex-col gap-6 sticky top-28">
          <MoveHistory moves={moveHistory} />
          <CapturedDisplay
            whiteCaptured={gameState.capturedPieces.white}
            blackCaptured={gameState.capturedPieces.black}
          />
        </div>
      </main>

      {error && (
        <div className="fixed bottom-6 right-6 rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white">
          {error}
        </div>
      )}

      <GameSettingsModal
        isOpen={showGameSettings}
        onClose={() => setShowGameSettings(false)}
        boardTheme={boardTheme}
        onThemeChange={(themeId) => {
          const theme = getThemeById(themeId);
          setBoardTheme(theme);
        }}
        difficulty={{ id: "easy", name: "Easy", depth: 2, description: "Casual player", rating: "~800" }}
        onDifficultyChange={() => { }}
      />

      <ChatModal
        isOpen={showChat}
        onClose={() => setShowChat(false)}
        fen={gameState.fen}
      />
    </div>
  );
}
