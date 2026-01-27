import { Chess } from "chess.js";
import { findBestMove } from "@/lib/chess-engine";

self.onmessage = (e: MessageEvent) => {
    const { fen, depth, type } = e.data;

    try {
        const game = new Chess(fen);
        const bestMove = findBestMove(game, depth);

        self.postMessage({ bestMove, type: type || 'move' });
    } catch (error) {
        console.error("Worker error:", error);
        self.postMessage({ error: "Failed to calculate move", type: type || 'move' });
    }
};
