import { Chess, Move, Square, PieceSymbol, Color } from "chess.js";

export interface CapturedPieces {
  white: PieceSymbol[];
  black: PieceSymbol[];
}

export interface GameState {
  fen: string;
  turn: Color;
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean;
  isGameOver: boolean;
  moveHistory: Move[];
  capturedPieces: CapturedPieces;
  lastMove: { from: Square; to: Square } | null;
  winner: "white" | "black" | "draw" | null;
}

export function getCapturedPieces(history: Move[]): CapturedPieces {
  const captured: CapturedPieces = { white: [], black: [] };

  for (const move of history) {
    if (move.captured) {
      if (move.color === "w") {
        captured.black.push(move.captured as PieceSymbol);
      } else {
        captured.white.push(move.captured as PieceSymbol);
      }
    }
  }

  return captured;
}

export function buildGameState(game: Chess): GameState {
  const history = game.history({ verbose: true });
  const capturedPieces = getCapturedPieces(history);
  const lastMove =
    history.length > 0
      ? { from: history[history.length - 1].from, to: history[history.length - 1].to }
      : null;

  let winner: "white" | "black" | "draw" | null = null;
  if (game.isCheckmate()) {
    winner = game.turn() === "w" ? "black" : "white";
  } else if (game.isDraw() || game.isStalemate()) {
    winner = "draw";
  }

  return {
    fen: game.fen(),
    turn: game.turn(),
    isCheck: game.isCheck(),
    isCheckmate: game.isCheckmate(),
    isStalemate: game.isStalemate(),
    isDraw: game.isDraw(),
    isGameOver: game.isGameOver(),
    moveHistory: history,
    capturedPieces,
    lastMove,
    winner,
  };
}
