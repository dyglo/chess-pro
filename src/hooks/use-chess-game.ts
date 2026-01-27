"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Chess, Move, Square, PieceSymbol, Color } from "chess.js";
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
    onGameEnd?: (winner: "white" | "black" | "draw" | null, finalState?: GameState, timeState?: { whiteTime: number; blackTime: number }) => void;
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

    // Simplest fix: Add time refs to track time for callbacks.
    const whiteTimeRef = useRef(600);
    const blackTimeRef = useRef(600);

    useEffect(() => { whiteTimeRef.current = whiteTime; }, [whiteTime]);
    useEffect(() => { blackTimeRef.current = blackTime; }, [blackTime]);

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
            onGameEnd(newState.winner, newState, { whiteTime: whiteTimeRef.current, blackTime: blackTimeRef.current });
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

    // AI Worker Ref
    const workerRef = useRef<Worker | null>(null);
    // Queue for pending hint resolvers to handle async worker responses
    const hintResolverRef = useRef<((move: { from: Square; to: Square } | null) => void) | null>(null);

    useEffect(() => {
        // Initialize worker
        workerRef.current = new Worker(new URL("../workers/stockfish.worker.ts", import.meta.url));

        workerRef.current.onmessage = (e) => {
            const { bestMove, type } = e.data;

            if (type === 'hint') {
                if (hintResolverRef.current) {
                    hintResolverRef.current(bestMove ? { from: bestMove.from, to: bestMove.to } : null);
                    hintResolverRef.current = null;
                }
            } else {
                // Default 'move' behavior for AI opponent
                if (bestMove) {
                    gameRef.current.move(bestMove);
                    updateState();
                }
                setIsThinking(false);
            }
        };

        return () => {
            workerRef.current?.terminate();
        };
    }, [updateState]);

    const makeAIMove = useCallback(async () => {
        if (gameRef.current.isGameOver() || gameRef.current.turn() === playerColor) {
            return;
        }

        setIsThinking(true);

        const fen = gameRef.current.fen();
        const depth = difficultyLevel.depth;

        if (workerRef.current) {
            workerRef.current.postMessage({ fen, depth, type: 'move' });
        } else {
            console.error("Worker not initialized");
            setIsThinking(false);
        }

    }, [playerColor, difficultyLevel.depth]);

    const getBestMove = useCallback(async (): Promise<{ from: Square, to: Square } | null> => {
        return new Promise((resolve) => {
            if (!workerRef.current) {
                resolve(null);
                return;
            }

            // Cancel any pending hint
            if (hintResolverRef.current) {
                hintResolverRef.current(null);
            }

            hintResolverRef.current = resolve;
            // Use a fixed depth for hints or current difficulty
            const depth = Math.max(4, difficultyLevel.depth);
            workerRef.current.postMessage({ fen: gameRef.current.fen(), depth, type: 'hint' });
        });
    }, [difficultyLevel.depth]);

    // Timer logic
    useEffect(() => {
        if (gameState.isGameOver || isThinking) return;

        const interval = setInterval(() => {
            if (gameState.turn === "w") {
                setWhiteTime((t) => {
                    const next = Math.max(0, t - 1);
                    if (next === 0) {
                        const winner = "black";
                        const finalState = { ...gameState, isGameOver: true, winner };
                        onGameEnd?.(winner, finalState as GameState, { whiteTime: 0, blackTime: blackTimeRef.current });
                        setGameState(finalState as GameState);
                    }
                    return next;
                });
            } else {
                setBlackTime((t) => {
                    const next = Math.max(0, t - 1);
                    if (next === 0) {
                        const winner = "white";
                        const finalState = { ...gameState, isGameOver: true, winner };
                        onGameEnd?.(winner, finalState as GameState, { whiteTime: whiteTimeRef.current, blackTime: 0 });
                        setGameState(finalState as GameState);
                    }
                    return next;
                });
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [gameState.turn, gameState.isGameOver, isThinking, onGameEnd, gameState]); // Added gameState dependency for timer end state construction

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
        getBestMove,
        gameRef, // Exposing gameRef if needed for validation, but getBestMove handles it
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
