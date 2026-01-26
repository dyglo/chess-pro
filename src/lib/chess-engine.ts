/**
 * ChessPro AI Engine
 * Implements minimax with alpha-beta pruning for chess AI
 */

import { Chess, Square, PieceSymbol, Move } from "chess.js";

// Piece values for evaluation
const PIECE_VALUES: Record<PieceSymbol, number> = {
    p: 100,
    n: 320,
    b: 330,
    r: 500,
    q: 900,
    k: 20000,
};

// Piece-square tables for positional evaluation
// Values from white's perspective, flipped for black

const PAWN_TABLE = [
    0, 0, 0, 0, 0, 0, 0, 0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
    5, 5, 10, 25, 25, 10, 5, 5,
    0, 0, 0, 20, 20, 0, 0, 0,
    5, -5, -10, 0, 0, -10, -5, 5,
    5, 10, 10, -20, -20, 10, 10, 5,
    0, 0, 0, 0, 0, 0, 0, 0,
];

const KNIGHT_TABLE = [
    -50, -40, -30, -30, -30, -30, -40, -50,
    -40, -20, 0, 0, 0, 0, -20, -40,
    -30, 0, 10, 15, 15, 10, 0, -30,
    -30, 5, 15, 20, 20, 15, 5, -30,
    -30, 0, 15, 20, 20, 15, 0, -30,
    -30, 5, 10, 15, 15, 10, 5, -30,
    -40, -20, 0, 5, 5, 0, -20, -40,
    -50, -40, -30, -30, -30, -30, -40, -50,
];

const BISHOP_TABLE = [
    -20, -10, -10, -10, -10, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 10, 10, 5, 0, -10,
    -10, 5, 5, 10, 10, 5, 5, -10,
    -10, 0, 10, 10, 10, 10, 0, -10,
    -10, 10, 10, 10, 10, 10, 10, -10,
    -10, 5, 0, 0, 0, 0, 5, -10,
    -20, -10, -10, -10, -10, -10, -10, -20,
];

const ROOK_TABLE = [
    0, 0, 0, 0, 0, 0, 0, 0,
    5, 10, 10, 10, 10, 10, 10, 5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    0, 0, 0, 5, 5, 0, 0, 0,
];

const QUEEN_TABLE = [
    -20, -10, -10, -5, -5, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 5, 5, 5, 0, -10,
    -5, 0, 5, 5, 5, 5, 0, -5,
    0, 0, 5, 5, 5, 5, 0, -5,
    -10, 5, 5, 5, 5, 5, 0, -10,
    -10, 0, 5, 0, 0, 0, 0, -10,
    -20, -10, -10, -5, -5, -10, -10, -20,
];

const KING_MIDDLE_TABLE = [
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -20, -30, -30, -40, -40, -30, -30, -20,
    -10, -20, -20, -20, -20, -20, -20, -10,
    20, 20, 0, 0, 0, 0, 20, 20,
    20, 30, 10, 0, 0, 10, 30, 20,
];

const PIECE_TABLES: Record<PieceSymbol, number[]> = {
    p: PAWN_TABLE,
    n: KNIGHT_TABLE,
    b: BISHOP_TABLE,
    r: ROOK_TABLE,
    q: QUEEN_TABLE,
    k: KING_MIDDLE_TABLE,
};

function getSquareIndex(square: Square, isWhite: boolean): number {
    const file = square.charCodeAt(0) - 97; // a=0, h=7
    const rank = parseInt(square[1]) - 1; // 1=0, 8=7

    if (isWhite) {
        return (7 - rank) * 8 + file;
    } else {
        return rank * 8 + file;
    }
}

/**
 * Evaluate the board position
 * Positive = white advantage, Negative = black advantage
 */
export function evaluateBoard(game: Chess): number {
    if (game.isCheckmate()) {
        return game.turn() === "w" ? -Infinity : Infinity;
    }

    if (game.isDraw() || game.isStalemate()) {
        return 0;
    }

    let score = 0;
    const board = game.board();

    for (let rank = 0; rank < 8; rank++) {
        for (let file = 0; file < 8; file++) {
            const piece = board[rank][file];
            if (piece) {
                const isWhite = piece.color === "w";
                const pieceValue = PIECE_VALUES[piece.type];
                const square = (String.fromCharCode(97 + file) + (8 - rank)) as Square;
                const tableIndex = getSquareIndex(square, isWhite);
                const positionalValue = PIECE_TABLES[piece.type][tableIndex];

                const totalValue = pieceValue + positionalValue;
                score += isWhite ? totalValue : -totalValue;
            }
        }
    }

    return score;
}

/**
 * Order moves for better alpha-beta pruning
 */
function orderMoves(moves: Move[]): Move[] {
    return moves.sort((a, b) => {
        let scoreA = 0;
        let scoreB = 0;

        // Captures are prioritized (MVV-LVA)
        if (a.captured) {
            scoreA += PIECE_VALUES[a.captured as PieceSymbol] - PIECE_VALUES[a.piece as PieceSymbol] / 10;
        }
        if (b.captured) {
            scoreB += PIECE_VALUES[b.captured as PieceSymbol] - PIECE_VALUES[b.piece as PieceSymbol] / 10;
        }

        // Promotions
        if (a.promotion) scoreA += 800;
        if (b.promotion) scoreB += 800;

        // Checks
        if (a.san.includes("+")) scoreA += 50;
        if (b.san.includes("+")) scoreB += 50;

        return scoreB - scoreA;
    });
}

/**
 * Minimax with alpha-beta pruning
 */
function minimax(
    game: Chess,
    depth: number,
    alpha: number,
    beta: number,
    isMaximizing: boolean
): number {
    if (depth === 0 || game.isGameOver()) {
        return evaluateBoard(game);
    }

    const moves = orderMoves(game.moves({ verbose: true }));

    if (isMaximizing) {
        let maxEval = -Infinity;
        for (const move of moves) {
            game.move(move);
            const evaluation = minimax(game, depth - 1, alpha, beta, false);
            game.undo();
            maxEval = Math.max(maxEval, evaluation);
            alpha = Math.max(alpha, evaluation);
            if (beta <= alpha) break;
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (const move of moves) {
            game.move(move);
            const evaluation = minimax(game, depth - 1, alpha, beta, true);
            game.undo();
            minEval = Math.min(minEval, evaluation);
            beta = Math.min(beta, evaluation);
            if (beta <= alpha) break;
        }
        return minEval;
    }
}

/**
 * Find the best move for the AI
 */
export function findBestMove(game: Chess, depth: number): Move | null {
    const moves = orderMoves(game.moves({ verbose: true }));

    if (moves.length === 0) return null;

    // For beginner level, add randomness
    if (depth === 1) {
        // 40% chance of random move at beginner level
        if (Math.random() < 0.4) {
            return moves[Math.floor(Math.random() * moves.length)];
        }
    }

    const isMaximizing = game.turn() === "w";
    let bestMove: Move | null = null;
    let bestValue = isMaximizing ? -Infinity : Infinity;

    for (const move of moves) {
        game.move(move);
        const value = minimax(game, depth - 1, -Infinity, Infinity, !isMaximizing);
        game.undo();

        if (isMaximizing) {
            if (value > bestValue) {
                bestValue = value;
                bestMove = move;
            }
        } else {
            if (value < bestValue) {
                bestValue = value;
                bestMove = move;
            }
        }
    }

    return bestMove;
}

/**
 * Get a hint for the current position
 */
export function getHint(game: Chess): Move | null {
    // Use depth 4 for hints to give good suggestions
    return findBestMove(game, 4);
}

/**
 * Analyze the last move quality
 */
export function analyzeMoveQuality(
    gameBefore: Chess,
    move: Move
): "brilliant" | "good" | "inaccuracy" | "mistake" | "blunder" {
    const evalBefore = evaluateBoard(gameBefore);

    const gameAfter = new Chess(gameBefore.fen());
    gameAfter.move(move);
    const evalAfter = evaluateBoard(gameAfter);

    const isWhite = gameBefore.turn() === "w";
    const evalDiff = isWhite ? evalAfter - evalBefore : evalBefore - evalAfter;

    // Find best move evaluation for comparison
    const bestMove = findBestMove(gameBefore, 4);
    if (bestMove) {
        const gameWithBest = new Chess(gameBefore.fen());
        gameWithBest.move(bestMove);
        const bestEval = evaluateBoard(gameWithBest);
        const bestDiff = isWhite ? bestEval - evalBefore : evalBefore - bestEval;

        const lostValue = bestDiff - evalDiff;

        if (lostValue < 10) return "brilliant";
        if (lostValue < 50) return "good";
        if (lostValue < 150) return "inaccuracy";
        if (lostValue < 350) return "mistake";
        return "blunder";
    }

    return "good";
}
