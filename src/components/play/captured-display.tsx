"use client";

import { PieceSymbol } from "chess.js";

interface CapturedDisplayProps {
    whiteCaptured: PieceSymbol[];
    blackCaptured: PieceSymbol[];
}

const PIECE_UNICODE: Record<string, { white: string; black: string }> = {
    p: { white: "♙", black: "♟" },
    n: { white: "♘", black: "♞" },
    b: { white: "♗", black: "♝" },
    r: { white: "♖", black: "♜" },
    q: { white: "♕", black: "♛" },
    k: { white: "♔", black: "♚" },
};

const PIECE_VALUES: Record<PieceSymbol, number> = {
    p: 1,
    n: 3,
    b: 3,
    r: 5,
    q: 9,
    k: 0,
};

function calculateMaterialAdvantage(whiteCaptured: PieceSymbol[], blackCaptured: PieceSymbol[]): number {
    const whiteValue = blackCaptured.reduce((sum, p) => sum + PIECE_VALUES[p], 0);
    const blackValue = whiteCaptured.reduce((sum, p) => sum + PIECE_VALUES[p], 0);
    return whiteValue - blackValue;
}

function sortPieces(pieces: PieceSymbol[]): PieceSymbol[] {
    const order: PieceSymbol[] = ["q", "r", "b", "n", "p"];
    return [...pieces].sort((a, b) => order.indexOf(a) - order.indexOf(b));
}

export function CapturedDisplay({ whiteCaptured, blackCaptured }: CapturedDisplayProps) {
    const advantage = calculateMaterialAdvantage(whiteCaptured, blackCaptured);

    // Pieces taken from black (by white)
    const takenFromBlack = sortPieces(blackCaptured);
    // Pieces taken from white (by black)
    const takenFromWhite = sortPieces(whiteCaptured);

    return (
        <div className="flex items-center gap-4">
            {advantage !== 0 && (
                <div className="px-2 py-0.5 bg-[var(--foreground)]/10 rounded-md text-[10px] font-black text-[var(--foreground)]/60">
                    {advantage > 0 ? `+${advantage}` : advantage}
                </div>
            )}

            <div className="flex items-center -space-x-1">
                {takenFromBlack.map((p, i) => (
                    <span key={i} className="text-xl text-gray-800 drop-shadow-sm">{PIECE_UNICODE[p].black}</span>
                ))}
            </div>

            <div className="flex items-center -space-x-1">
                {takenFromWhite.map((p, i) => (
                    <span key={i} className="text-xl text-gray-400 drop-shadow-sm">{PIECE_UNICODE[p].white}</span>
                ))}
            </div>
        </div>
    );
}
