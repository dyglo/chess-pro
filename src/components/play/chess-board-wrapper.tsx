"use client";

import { useState } from "react";
import { Chessboard } from "react-chessboard";
import { Square } from "chess.js";
import { BoardTheme } from "@/lib/board-themes";

interface ChessBoardWrapperProps {
    fen: string;
    theme: BoardTheme;
    playerColor: "w" | "b";
    lastMove: { from: Square; to: Square } | null;
    onPieceDrop: (sourceSquare: Square, targetSquare: Square) => boolean;
    getLegalMoves: (square: Square) => Square[];
    isThinking: boolean;
}

export function ChessBoardWrapper({
    fen,
    theme,
    playerColor,
    lastMove,
    onPieceDrop,
    getLegalMoves,
    isThinking,
}: ChessBoardWrapperProps) {
    const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
    const [legalMoves, setLegalMoves] = useState<Square[]>([]);

    // Build custom square styles
    const buildSquareStyles = (): Record<string, React.CSSProperties> => {
        const styles: Record<string, React.CSSProperties> = {};

        // Highlight last move
        if (lastMove) {
            styles[lastMove.from] = {
                backgroundColor: theme.lastMoveLight,
            };
            styles[lastMove.to] = {
                backgroundColor: theme.lastMoveDark,
            };
        }

        // Highlight selected square
        if (selectedSquare) {
            styles[selectedSquare] = {
                backgroundColor: theme.highlightLight,
            };
        }

        // Show legal move indicators (dots)
        legalMoves.forEach((square) => {
            const isLightSquare = isLight(square);
            styles[square] = {
                ...styles[square],
                backgroundColor: styles[square]?.backgroundColor || (isLightSquare ? theme.lightSquare : theme.darkSquare),
                backgroundImage: `radial-gradient(circle, rgba(0,0,0,0.2) 25%, transparent 25%)`,
                cursor: "pointer",
            };
        });

        return styles;
    };

    // Check if a square is light colored
    const isLight = (square: Square): boolean => {
        const file = square.charCodeAt(0) - 97;
        const rank = parseInt(square[1]) - 1;
        return (file + rank) % 2 === 1;
    };

    // Handle square click
    const handleSquareClick = (square: string) => {
        if (isThinking) return;

        const sq = square as Square;

        // If clicking on a legal move destination, make the move
        if (selectedSquare && legalMoves.includes(sq)) {
            const success = onPieceDrop(selectedSquare, sq);
            if (success) {
                setSelectedSquare(null);
                setLegalMoves([]);
            }
            return;
        }

        // If clicking on the same square, deselect
        if (selectedSquare === sq) {
            setSelectedSquare(null);
            setLegalMoves([]);
            return;
        }

        // Try to select this square if it has a piece that can move
        const moves = getLegalMoves(sq);
        if (moves.length > 0) {
            setSelectedSquare(sq);
            setLegalMoves(moves);
        } else {
            // Clicked on empty square or opponent's piece with nothing selected
            setSelectedSquare(null);
            setLegalMoves([]);
        }
    };

    // Handle piece click (same as square click for our purposes)
    const handlePieceClick = (piece: string, square: string) => {
        handleSquareClick(square);
    };

    return (
        <div className="relative w-full aspect-square max-w-[min(100vw-2rem,560px)] mx-auto">
            {/* Thinking overlay */}
            {isThinking && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/20 rounded-xl backdrop-blur-sm">
                    <div className="flex items-center gap-3 bg-white/95 px-6 py-3 rounded-full shadow-xl">
                        <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm font-semibold text-[var(--foreground)]">Thinking...</span>
                    </div>
                </div>
            )}

            {/* Board container with shadow and border */}
            <div className="w-full h-full rounded-xl overflow-hidden shadow-2xl ring-1 ring-black/10">
                <Chessboard
                    options={{
                        position: fen,
                        boardOrientation: playerColor === "w" ? "white" : "black",
                        boardStyle: {
                            borderRadius: "0",
                        },
                        darkSquareStyle: {
                            backgroundColor: theme.darkSquare,
                        },
                        lightSquareStyle: {
                            backgroundColor: theme.lightSquare,
                        },
                        squareStyles: buildSquareStyles(),
                        onSquareClick: ({ square }) => handleSquareClick(square),
                        onPieceClick: ({ piece, square }) => handlePieceClick(piece.pieceType, square || ""),
                        allowDragging: false,
                        showNotation: true,
                        animationDurationInMs: 200,
                        darkSquareNotationStyle: {
                            fontSize: "11px",
                            fontWeight: "600",
                            color: theme.id === "modern" ? "#888" : "#fff",
                        },
                        lightSquareNotationStyle: {
                            fontSize: "11px",
                            fontWeight: "600",
                            color: theme.id === "modern" ? "#888" : "#666",
                        },
                    }}
                />
            </div>
        </div>
    );
}
