"use client";

import { useState, useCallback } from "react";
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
    hintMove?: { from: Square; to: Square } | null;
    isThinking?: boolean;
}

export function ChessBoardWrapper({
    fen,
    theme,
    playerColor,
    lastMove,
    onPieceDrop,
    getLegalMoves,
    hintMove,
    isThinking = false,
}: ChessBoardWrapperProps) {
    const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
    const [legalMoves, setLegalMoves] = useState<Square[]>([]);

    // Check if a square is light colored
    const isLight = useCallback((square: Square): boolean => {
        const file = square.charCodeAt(0) - 97;
        const rank = parseInt(square[1]) - 1;
        return (file + rank) % 2 === 1;
    }, []);

    // Build custom square styles
    const buildSquareStyles = useCallback((): Record<string, React.CSSProperties> => {
        const styles: Record<string, React.CSSProperties> = {};

        // Highlight last move
        if (lastMove) {
            styles[lastMove.from] = { backgroundColor: theme.lastMoveLight };
            styles[lastMove.to] = { backgroundColor: theme.lastMoveDark };
        }

        // Highlight hint move source
        if (hintMove) {
            styles[hintMove.from] = { backgroundColor: 'rgba(255, 255, 0, 0.5)' };
            styles[hintMove.to] = { backgroundColor: 'rgba(255, 255, 0, 0.5)' };
        }

        // Highlight selected square
        if (selectedSquare) {
            styles[selectedSquare] = { backgroundColor: theme.highlightLight };
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
    }, [lastMove, hintMove, selectedSquare, legalMoves, theme, isLight]);

    // Build arrows for hint visualization (correct Arrow type)
    const arrows: { startSquare: string; endSquare: string; color: string }[] = [];
    if (hintMove) {
        arrows.push({ startSquare: hintMove.from, endSquare: hintMove.to, color: "rgba(255, 200, 0, 0.8)" });
    }

    // Handle square click
    const handleSquareClick = useCallback(({ square }: { piece: { pieceType: string } | null; square: string }) => {
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
    }, [isThinking, selectedSquare, legalMoves, onPieceDrop, getLegalMoves]);

    // Handle piece click (matches PieceHandlerArgs type)
    const handlePieceClick = useCallback(({ square }: { isSparePiece: boolean; piece: { pieceType: string }; square: string | null }) => {
        if (square) {
            handleSquareClick({ piece: null, square });
        }
    }, [handleSquareClick]);

    return (
        <div className="relative w-full aspect-square max-w-[min(100vw-2rem,560px)] mx-auto">
            <div className="w-full h-full rounded-xl overflow-hidden shadow-2xl ring-1 ring-black/10">
                <Chessboard
                    options={{
                        position: fen,
                        boardOrientation: playerColor === "w" ? "white" : "black",
                        squareStyles: buildSquareStyles(),
                        arrows: arrows,
                        onSquareClick: handleSquareClick,
                        onPieceClick: handlePieceClick,
                        allowDragging: false,
                        darkSquareStyle: { backgroundColor: theme.darkSquare },
                        lightSquareStyle: { backgroundColor: theme.lightSquare },
                        animationDurationInMs: 200,
                        showNotation: true,
                    }}
                />
            </div>
        </div>
    );
}
