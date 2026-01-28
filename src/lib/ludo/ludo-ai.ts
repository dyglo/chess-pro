import { LudoState, getValidMoves, computeNextPosition, getGlobalPosition, isSafeCell } from "./ludo-state";

export function getBestMove(state: LudoState, diceValue: number): number | null {
    const validTokenIds = getValidMoves(state, diceValue);
    if (validTokenIds.length === 0) return null;
    if (validTokenIds.length === 1) return validTokenIds[0];

    const scores = validTokenIds.map(tokenId => ({
        tokenId,
        score: calculateMoveScore(state, tokenId, diceValue)
    }));

    scores.sort((a, b) => b.score - a.score);
    return scores[0].tokenId;
}

function calculateMoveScore(state: LudoState, tokenId: number, diceValue: number): number {
    const token = state.tokens.find(t => t.id === tokenId)!;
    let score = 0;

    // 1. Prioritize getting out of base
    if (token.position === -1 && diceValue === 6) {
        score += 100;
    }

    // 2. Prioritize killing an opponent
    const nextPos = computeNextPosition(token.position, diceValue);
    if (nextPos !== null && nextPos < 52) {
        const globalPos = getGlobalPosition(nextPos, token.playerIndex);
        const opponentAtPos = state.tokens.find(t =>
            t.playerIndex !== token.playerIndex &&
            t.position >= 0 && t.position < 52 &&
            getGlobalPosition(t.position, t.playerIndex) === globalPos
        );
        if (opponentAtPos && !isSafeCell(globalPos)) {
            score += 150;
        }
    }

    // 3. Prioritize reaching home stretch and finishing
    if (nextPos !== null && nextPos >= 52) {
        score += 50 + (nextPos - 52) * 5;
    }

    if (nextPos === 58) {
        score += 200;
    }

    // 4. Prefer moving tokens that are further away from home (to build structure)
    score += (58 - token.position) * 0.1;

    // 5. Avoid leaving safe zones if an opponent is nearby (basic risk assessment)
    // This could be more complex, but for a "simple decision tree" this is okay.

    return score;
}

