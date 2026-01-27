"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess, Square, Move } from "chess.js";
import { createClient } from "@/lib/supabase/client";
import { buildGameState, GameState } from "@/lib/chess-state";
import { useAuth } from "@/hooks/use-auth";

const INITIAL_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

interface MatchRow {
  id: string;
  status: "pending" | "active" | "completed" | "cancelled";
  white_user_id: string | null;
  black_user_id: string | null;
  current_turn_user_id: string | null;
  current_turn: "w" | "b" | null;
  fen: string | null;
  move_count: number;
  game_id: string | null;
  started_at: string | null;
  ended_at: string | null;
}

interface MatchMove {
  move_number: number;
  from_square: Square;
  to_square: Square;
  uci: string | null;
  san: string | null;
  fen: string | null;
}

function getPromotionFromUci(uci: string | null): string | undefined {
  if (!uci || uci.length !== 5) return undefined;
  return uci[4];
}

export function useRealtimeMatch(matchId: string) {
  const { user } = useAuth();
  const [match, setMatch] = useState<MatchRow | null>(null);
  const [gameState, setGameState] = useState<GameState>(() =>
    buildGameState(new Chess())
  );
  const [moveRows, setMoveRows] = useState<MatchMove[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const gameRef = useRef(new Chess());
  const completionRef = useRef(false);

  const myColor = useMemo<"w" | "b" | null>(() => {
    if (!user || !match) return null;
    if (match.white_user_id === user.id) return "w";
    if (match.black_user_id === user.id) return "b";
    return null;
  }, [user, match]);

  const isMyTurn = useMemo(() => {
    if (!match || !user) return false;
    if (match.current_turn_user_id) {
      return match.current_turn_user_id === user.id;
    }
    if (!myColor) return false;
    if (match.current_turn) {
      return match.current_turn === myColor;
    }
    return gameRef.current.turn() === myColor;
  }, [match, myColor, user]);

  const syncState = useCallback((fen?: string | null) => {
    if (fen) {
      gameRef.current = new Chess(fen);
    }
    setGameState(buildGameState(gameRef.current));
  }, []);

  const loadMatch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from("matches")
        .select("*")
        .eq("id", matchId)
        .single();
      if (fetchError) throw fetchError;
      const row = data as MatchRow;
      setMatch(row);
      syncState(row.fen ?? INITIAL_FEN);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [matchId, syncState]);

  useEffect(() => {
    loadMatch();
  }, [loadMatch]);

  useEffect(() => {
    const loadMoves = async () => {
      try {
        const supabase = createClient();
        const { data, error: movesError } = await supabase
          .from("moves")
          .select("move_number, from_square, to_square, uci, san, fen")
          .eq("match_id", matchId)
          .order("move_number", { ascending: true });
        if (movesError) throw movesError;
        setMoveRows((data as MatchMove[]) ?? []);
      } catch (err) {
        setError((err as Error).message);
      }
    };
    loadMoves();
  }, [matchId]);

  useEffect(() => {
    const supabase = createClient();
    const matchChannel = supabase
      .channel(`match:${matchId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "matches", filter: `id=eq.${matchId}` },
        (payload) => {
          const updated = payload.new as MatchRow;
          setMatch(updated);
          syncState(updated.fen ?? INITIAL_FEN);
        }
      )
      .subscribe();

    const movesChannel = supabase
      .channel(`match-moves:${matchId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "moves", filter: `match_id=eq.${matchId}` },
        (payload) => {
          const move = payload.new as MatchMove;
          const currentCount = gameRef.current.history().length;
          if (move.move_number <= currentCount) return;
          const promotion = getPromotionFromUci(move.uci ?? null);
          try {
            gameRef.current.move({
              from: move.from_square,
              to: move.to_square,
              promotion,
            });
            setGameState(buildGameState(gameRef.current));
            setMatch((prev) =>
              prev
                ? {
                    ...prev,
                    move_count: move.move_number,
                    current_turn: gameRef.current.turn(),
                    current_turn_user_id:
                      gameRef.current.turn() === "w"
                        ? prev.white_user_id
                        : prev.black_user_id,
                    fen: gameRef.current.fen(),
                  }
                : prev
            );
            setMoveRows((prev) => {
              if (prev.some((m) => m.move_number === move.move_number)) return prev;
              return [...prev, move].sort((a, b) => a.move_number - b.move_number);
            });
          } catch {
            // Fallback to authoritative fen
            if (move.fen) {
              gameRef.current = new Chess(move.fen);
              setGameState(buildGameState(gameRef.current));
              setMatch((prev) =>
                prev
                  ? {
                      ...prev,
                      move_count: move.move_number,
                      current_turn: gameRef.current.turn(),
                      current_turn_user_id:
                        gameRef.current.turn() === "w"
                          ? prev.white_user_id
                          : prev.black_user_id,
                      fen: move.fen,
                    }
                  : prev
              );
              setMoveRows((prev) => {
                if (prev.some((m) => m.move_number === move.move_number)) return prev;
                return [...prev, move].sort((a, b) => a.move_number - b.move_number);
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(matchChannel);
      supabase.removeChannel(movesChannel);
    };
  }, [matchId, syncState]);

  useEffect(() => {
    if (!match || completionRef.current) return;
    if (match.status !== "active") return;
    if (!gameState.isGameOver) return;

    const winner =
      gameState.winner === "draw"
        ? "draw"
        : gameState.winner === "white"
          ? "white"
          : "black";

    const durationSeconds = match.started_at
      ? Math.max(
          1,
          Math.floor((Date.now() - new Date(match.started_at).getTime()) / 1000)
        )
      : null;

    const supabase = createClient();
    completionRef.current = true;
    supabase.rpc("complete_match", {
      p_match_id: match.id,
      p_winner_color: winner,
      p_reason: gameState.isCheckmate ? "checkmate" : gameState.isDraw ? "draw" : "resign",
      p_duration_seconds: durationSeconds,
      p_final_fen: gameState.fen,
    });
  }, [match, gameState]);

  const makeMove = useCallback(
    async (from: Square, to: Square) => {
      if (!match || !user || !myColor) return false;
      if (!isMyTurn || match.status !== "active" || isSubmitting) return false;

      const expectedCount = match.move_count ?? 0;
      const localCount = gameRef.current.history().length;
      if (localCount > expectedCount) {
        syncState(match.fen ?? INITIAL_FEN);
        return false;
      }
      if (localCount < expectedCount) {
        syncState(match.fen ?? INITIAL_FEN);
      }

      let move: Move | null = null;
      try {
        move = gameRef.current.move({ from, to, promotion: "q" });
      } catch {
        return false;
      }
      if (!move) return false;

      setIsSubmitting(true);
      const moveNumber = expectedCount + 1;
      const nextTurn = gameRef.current.turn();
      const supabase = createClient();
      const { error: submitError } = await supabase.rpc("submit_match_move", {
        p_match_id: match.id,
        p_move_number: moveNumber,
        p_from: move.from,
        p_to: move.to,
        p_san: move.san,
        p_uci: `${move.from}${move.to}${move.promotion ?? ""}`,
        p_fen: gameRef.current.fen(),
        p_next_turn: nextTurn,
      });

      if (submitError) {
        setError(submitError.message);
        gameRef.current.undo();
        setGameState(buildGameState(gameRef.current));
        setIsSubmitting(false);
        return false;
      }

      setGameState(buildGameState(gameRef.current));
      setIsSubmitting(false);
      return true;
    },
    [match, user, myColor, isMyTurn, isSubmitting, syncState]
  );

  const getLegalMoves = useCallback(
    (square: Square) => {
      if (!isMyTurn || match?.status !== "active" || isSubmitting) return [];
      const moves = gameRef.current.moves({ square, verbose: true }) as Move[];
      return moves.map((m) => m.to);
    },
    [isMyTurn, match, isSubmitting]
  );

  const moveHistory = useMemo(() => {
    if (moveRows.length === 0) return [];
    const game = new Chess();
    const history: Move[] = [];
    for (const row of [...moveRows].sort((a, b) => a.move_number - b.move_number)) {
      const promotion = getPromotionFromUci(row.uci ?? null);
      const applied =
        row.uci
          ? game.move({ from: row.from_square, to: row.to_square, promotion })
          : row.san
            ? game.move(row.san)
            : null;
      if (applied) history.push(applied);
    }
    return history;
  }, [moveRows]);

  return {
    match,
    gameState,
    isLoading,
    error,
    myColor,
    isMyTurn,
    makeMove,
    getLegalMoves,
    isSubmitting,
    moveHistory,
  };
}
