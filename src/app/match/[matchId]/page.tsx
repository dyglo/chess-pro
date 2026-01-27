"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
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

export default function MatchPage() {
  const params = useParams();
  const matchId = params.matchId as string;
  const { user } = useAuth();
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
          <div className="w-8 h-8 lg:w-10 lg:h-10 bg-[var(--foreground)] rounded-xl flex items-center justify-center transition-transform group-hover:scale-105">
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
            className="rounded-full border border-[var(--line)] px-4 py-2 text-xs font-semibold text-[var(--muted)] transition hover:text-[var(--foreground)]"
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
            onHint={() => {}}
            onUndo={() => {}}
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
        onDifficultyChange={() => {}}
      />

      <ChatModal
        isOpen={showChat}
        onClose={() => setShowChat(false)}
        fen={gameState.fen}
      />
    </div>
  );
}
