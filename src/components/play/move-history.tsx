"use client";

import { Move } from "chess.js";

interface MoveHistoryProps {
    moves: Move[];
}

export function MoveHistory({ moves }: MoveHistoryProps) {
    // Group moves into pairs (white, black)
    const movePairs: { white: Move; black?: Move }[] = [];
    for (let i = 0; i < moves.length; i += 2) {
        movePairs.push({
            white: moves[i],
            black: moves[i + 1],
        });
    }

    return (
        <div className="w-64 h-full flex flex-col bg-white/50 backdrop-blur-sm rounded-2xl overflow-hidden border border-[var(--foreground)]/5 shadow-xl">
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <table className="w-full text-xs border-collapse">
                    <tbody className="divide-y divide-[var(--foreground)]/5">
                        {movePairs.map((pair, index) => (
                            <tr key={index} className="hover:bg-[var(--foreground)]/5 transition-colors">
                                <td className="py-2 px-4 w-12 font-bold text-[var(--foreground)]/30 border-r border-[var(--foreground)]/5">
                                    {index + 1}
                                </td>
                                <td className="py-2 px-4 font-bold text-[var(--foreground)]">
                                    <div className="flex items-center gap-2">
                                        <PieceIcon piece={pair.white.piece} color="w" />
                                        {pair.white.san}
                                    </div>
                                </td>
                                <td className="py-2 px-4 font-bold text-[var(--foreground)]">
                                    {pair.black && (
                                        <div className="flex items-center gap-2">
                                            <PieceIcon piece={pair.black.piece} color="b" />
                                            {pair.black.san}
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {moves.length === 0 && (
                    <div className="h-full flex items-center justify-center text-[var(--foreground)]/20 font-bold uppercase tracking-widest py-12">
                        No moves
                    </div>
                )}
            </div>

            {/* Bottom Controls */}
            <div className="p-4 border-t border-[var(--foreground)]/5 bg-[var(--foreground)]/5 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-[var(--foreground)]/40">
                <div className="flex items-center gap-2">
                    <span>1—0</span>
                    <button className="flex items-center gap-1 hover:text-[var(--foreground)] transition-colors">
                        <DownloadIcon />
                        PGN
                    </button>
                </div>
            </div>
        </div>
    );
}

function PieceIcon({ piece, color }: { piece: string, color: "w" | "b" }) {
    // Return a simple character or icon for the piece
    const icons: Record<string, string> = {
        p: "♟",
        n: "♞",
        b: "♝",
        r: "♜",
        q: "♛",
        k: "♚",
    };
    return (
        <span className={`text-sm ${color === "w" ? "text-gray-400" : "text-gray-800"}`}>
            {icons[piece.toLowerCase()]}
        </span>
    );
}

function DownloadIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-2.5 h-2.5">
            <path d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 12V4m0 8l-4-4m4 4l4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}
