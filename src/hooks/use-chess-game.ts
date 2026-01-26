"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Chess, Move, Square, PieceSymbol, Color } from "chess.js";
import { findBestMove } from "@/lib/chess-engine";
import { getDifficultyById, DifficultyLevel, defaultDifficulty } from "@/lib/board-themes";

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

export interface UseChessGameOptions {
    playerColor?: "w" | "b";
    difficulty?: string;
    onGameEnd?: (winner: "white" | "black" | "draw" | null) => void;
}

export function useChessGame(options: UseChessGameOptions = {}) {
    const {
        playerColor = "w",
        difficulty = defaultDifficulty.id,
        onGameEnd
    } = options;

    const gameRef = useRef(new Chess());
    const [difficultyLevel, setDifficultyLevel] = useState<DifficultyLevel>(() =>
        getDifficultyById(difficulty)
    );
    const [whiteTime, setWhiteTime] = useState(600); // 10 minutes default
    const [blackTime, setBlackTime] = useState(600);
    const [isThinking, setIsThinking] = useState(false);

    const getGameState = useCallback((game: Chess): GameState => {
        const history = game.history({ verbose: true });
        const capturedPieces = getCapturedPieces(history);
        const lastMove = history.length > 0
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
    }, []);

    const [gameState, setGameState] = useState<GameState>(() => getGameState(new Chess()));


    const updateState = useCallback(() => {
        const newState = getGameState(gameRef.current);
        setGameState(newState);

        if (newState.isGameOver && onGameEnd) {
            onGameEnd(newState.winner);
        }
    }, [onGameEnd, getGameState]);

    const makeMove = useCallback((from: Square, to: Square, promotion?: PieceSymbol): boolean => {
        try {
            const move = gameRef.current.move({ from, to, promotion: promotion || "q" });
            if (move) {
                updateState();
                return true;
            }
        } catch {
            // Invalid move
        }
        return false;
    }, [updateState]);

    const makeAIMove = useCallback(async () => {
        if (gameRef.current.isGameOver() || gameRef.current.turn() === playerColor) {
            return;
        }

        setIsThinking(true);

        // Use setTimeout to allow UI to update before heavy computation
        setTimeout(() => {
            const bestMove = findBestMove(gameRef.current, difficultyLevel.depth);

            if (bestMove) {
                gameRef.current.move(bestMove);
                updateState();
            }

            setIsThinking(false);
        }, 300);
    }, [playerColor, difficultyLevel.depth, updateState]);

    // Timer logic
    useEffect(() => {
        if (gameState.isGameOver || isThinking) return;

        const interval = setInterval(() => {
            if (gameState.turn === "w") {
                setWhiteTime((t) => {
                    const next = Math.max(0, t - 1);
                    if (next === 0) {
                        onGameEnd?.("black");
                        setGameState(s => ({ ...s, isGameOver: true, winner: "black" }));
                    }
                    return next;
                });
            } else {
                setBlackTime((t) => {
                    const next = Math.max(0, t - 1);
                    if (next === 0) {
                        onGameEnd?.("white");
                        setGameState(s => ({ ...s, isGameOver: true, winner: "white" }));
                    }
                    return next;
                });
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [gameState.turn, gameState.isGameOver, isThinking, onGameEnd]);

    // Trigger AI move when it's AI's turn
    useEffect(() => {
        if (!gameState.isGameOver && gameState.turn !== playerColor && !isThinking) {
            setTimeout(() => makeAIMove(), 0);
        }
    }, [gameState.turn, gameState.isGameOver, playerColor, isThinking, makeAIMove]);

    const newGame = useCallback((color?: "w" | "b") => {
        gameRef.current = new Chess();
        setWhiteTime(600);
        setBlackTime(600);
        updateState();

        // If player chose black, AI plays first
        if (color === "b" || (color === undefined && playerColor === "b")) {
            setTimeout(() => makeAIMove(), 500);
        }
    }, [updateState, makeAIMove, playerColor]);

    const resign = useCallback(() => {
        // Mark the game as over with the opponent winning
        const winner = playerColor === "w" ? "black" : "white";
        if (onGameEnd) {
            onGameEnd(winner);
        }
        // We'll handle this in the component by showing the modal
        return winner;
    }, [playerColor, onGameEnd]);

    const getLegalMoves = useCallback((square: Square): Square[] => {
        const moves = gameRef.current.moves({ square, verbose: true });
        return moves.map((m) => m.to);
    }, []);

    const changeDifficulty = useCallback((newDifficulty: string) => {
        setDifficultyLevel(getDifficultyById(newDifficulty));
    }, []);

    const undoMove = useCallback(() => {
        // Undo both player's move and AI's response
        gameRef.current.undo();
        gameRef.current.undo();
        updateState();
    }, [updateState]);

    return {
        gameState,
        isThinking,
        difficultyLevel,
        whiteTime,
        blackTime,
        makeMove,
        newGame,
        resign,
        undoMove,
        getLegalMoves,
        changeDifficulty,
    };
}

function getCapturedPieces(history: Move[]): CapturedPieces {
    const captured: CapturedPieces = { white: [], black: [] };

    for (const move of history) {
        if (move.captured) {
            // If white moved and captured, the captured piece was black
            if (move.color === "w") {
                captured.black.push(move.captured as PieceSymbol);
            } else {
                captured.white.push(move.captured as PieceSymbol);
            }
        }
    }

    return captured;
}
