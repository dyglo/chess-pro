"use client";

import { PieceSymbol } from "chess.js";

interface CapturedPiecesProps {
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

export function CapturedPieces({ whiteCaptured, blackCaptured }: CapturedPiecesProps) {
    const materialAdvantage = calculateMaterialAdvantage(whiteCaptured, blackCaptured);
    const sortedWhiteCaptured = sortPieces(whiteCaptured);
    const sortedBlackCaptured = sortPieces(blackCaptured);

    return (
        <div className="flex flex-col gap-2 p-3 rounded-xl bg-white border border-[var(--line)] shadow-sm">
            {/* Black captured (by white) */}
            <div className="flex items-center gap-2 min-h-[28px]">
                <div className="w-4 h-4 rounded-full bg-white border-2 border-[var(--line)]" />
                <div className="flex flex-wrap gap-0.5 text-xl leading-none">
                    {sortedBlackCaptured.map((piece, i) => (
                        <span key={`b-${piece}-${i}`} className="text-gray-800">
                            {PIECE_UNICODE[piece].black}
                        </span>
                    ))}
                </div>
                {materialAdvantage > 0 && (
                    <span className="ml-auto text-xs font-bold text-[var(--accent-3)] bg-[var(--surface-2)] px-2 py-0.5 rounded-full">
                        +{materialAdvantage}
                    </span>
                )}
            </div>

            {/* White captured (by black) */}
            <div className="flex items-center gap-2 min-h-[28px]">
                <div className="w-4 h-4 rounded-full bg-[var(--accent-3)] border-2 border-[var(--accent-3)]" />
                <div className="flex flex-wrap gap-0.5 text-xl leading-none">
                    {sortedWhiteCaptured.map((piece, i) => (
                        <span key={`w-${piece}-${i}`} className="text-gray-400">
                            {PIECE_UNICODE[piece].white}
                        </span>
                    ))}
                </div>
                {materialAdvantage < 0 && (
                    <span className="ml-auto text-xs font-bold text-[var(--accent-3)] bg-[var(--surface-2)] px-2 py-0.5 rounded-full">
                        +{Math.abs(materialAdvantage)}
                    </span>
                )}
            </div>
        </div>
    );
}
