export type PlayerColor = 'blue' | 'red' | 'green' | 'yellow';

export interface Token {
    id: number;
    playerIndex: number;
    /**
     * Token position on the track:
     * -1: In home base (not yet spawned)
     * 0-51: Relative position on the player's track (0 is their spawn point)
     * 52-57: Home stretch (final 6 cells before finish)
     * 58: Finished (reached home center)
     * 
     * Each player has their own relative track. Position 0 for each player
     * maps to their unique starting cell on the global board:
     * - Blue: Global position 0 (bottom-left entry)
     * - Red: Global position 13 (left-top entry)
     * - Green: Global position 26 (top-right entry)
     * - Yellow: Global position 39 (right-bottom entry)
     */
    position: number;
    color: PlayerColor;
}

export interface LudoState {
    players: {
        id: string;
        name: string;
        color: PlayerColor;
        isAi: boolean;
        avatarUrl?: string | null;
        country?: string | null;
    }[];
    tokens: Token[];
    currentPlayerIndex: number;
    diceValue: number | null;
    gameStatus: 'waiting' | 'playing' | 'finished';
    winner: number | null;
}

/**
 * Global starting positions for each color.
 * When a token spawns (moves from base to track), it starts at relative position 0,
 * which maps to these global positions on the 52-cell track.
 */
export const INITIAL_POSITIONS: Record<PlayerColor, number> = {
    blue: 0,
    red: 13,
    green: 26,
    yellow: 39,
};

export const TRACK_LENGTH = 52;
export const HOME_START = 52;
export const HOME_END = 57;
export const FINISH_POS = 58;
export const DOOR_INDEX = 51;
export const SAFE_CELLS = [0, 8, 13, 21, 26, 34, 39, 47];
export const START_OFFSETS = [0, 13, 26, 39];

/**
 * Player index to color mapping (fixed assignment)
 */
export const PLAYER_COLORS: PlayerColor[] = ['blue', 'red', 'green', 'yellow'];

export function createInitialState(playerNames: string[] = ['Player 1', 'AI 1', 'AI 2', 'AI 3']): LudoState {
    const tokens: Token[] = [];

    // Each player gets 4 tokens, all starting in their home base
    for (let playerIdx = 0; playerIdx < 4; playerIdx++) {
        for (let tokenIdx = 0; tokenIdx < 4; tokenIdx++) {
            tokens.push({
                id: playerIdx * 4 + tokenIdx,
                playerIndex: playerIdx,
                position: -1, // In home base
                color: PLAYER_COLORS[playerIdx],
            });
        }
    }

    return {
        players: playerNames.map((name, i) => ({
            id: `p${i}`,
            name,
            color: PLAYER_COLORS[i],
            isAi: i > 0, // Default: p0 is human, others AI
        })),
        tokens,
        currentPlayerIndex: 0,
        diceValue: null,
        gameStatus: 'playing',
        winner: null,
    };
}

/**
 * Get valid token IDs that can move with the given dice value.
 * Rules:
 * - A 6 is required to spawn a token from base
 * - Tokens on the track can move forward by dice value
 * - Cannot move past position 58 (finish)
 */
export function getValidMoves(state: LudoState, diceValue: number): number[] {
    const currentPlayerTokens = state.tokens.filter(t => t.playerIndex === state.currentPlayerIndex);
    const validTokenIds: number[] = [];

    for (const token of currentPlayerTokens) {
        // Token already finished
        if (token.position === FINISH_POS) continue;

        const nextPos = computeNextPosition(token.position, diceValue);
        if (nextPos === null) continue;

        // Check for blockades on the path for track moves
        if (!isPathBlocked(state, token.playerIndex, token.position, diceValue)) {
            validTokenIds.push(token.id);
        }
    }

    return validTokenIds;
}

/**
 * Move a token by the dice value.
 * - If token is in base (position -1), spawns it to position 0 (their start cell)
 * - If token is on track, moves it forward
 * - Captures opponent tokens if landing on same global cell (except safe cells)
 * - Rolling a 6 grants another turn
 */
/**
 * Rules summary:
 * - Track is relative per player (0..51), door at 51, home lane 52..57, finish 58.
 * - Enter lane immediately after crossing the door (no wrap-around).
 * - Knockouts occur on non-safe track squares; knocked tokens return to base.
 */
export function moveToken(state: LudoState, tokenId: number, diceValue: number): LudoState {
    const nextState = { ...state, tokens: [...state.tokens] };
    const tokenIndex = nextState.tokens.findIndex(t => t.id === tokenId);
    const token = { ...nextState.tokens[tokenIndex] };

    const nextPos = computeNextPosition(token.position, diceValue);
    if (nextPos === null) {
        return nextState;
    }
    token.position = nextPos;

    nextState.tokens[tokenIndex] = token;

    // Check for captures (only on main track, not home stretch or base)
    if (token.position >= 0 && token.position < TRACK_LENGTH) {
        const globalPos = getGlobalPosition(token.position, token.playerIndex);

        // Only capture if not on a safe cell
        if (!isSafeCell(globalPos)) {
            nextState.tokens = nextState.tokens.map(t => {
                // Check opponent tokens on the main track
                if (t.playerIndex !== token.playerIndex && t.position >= 0 && t.position < TRACK_LENGTH) {
                    const otherGlobalPos = getGlobalPosition(t.position, t.playerIndex);
                    if (globalPos === otherGlobalPos) {
                        // Capture! Send opponent back to base
                        return { ...t, position: -1 };
                    }
                }
                return t;
            });
        }
    }

    // Check for winner (all 4 tokens at position 58)
    const playerTokens = nextState.tokens.filter(t => t.playerIndex === state.currentPlayerIndex);
    if (playerTokens.every(t => t.position === FINISH_POS)) {
        nextState.winner = state.currentPlayerIndex;
        nextState.gameStatus = 'finished';
    }

    // Next turn: rolling a 6 grants another turn, otherwise pass to next player
    if (diceValue !== 6) {
        nextState.currentPlayerIndex = (nextState.currentPlayerIndex + 1) % 4;
    }
    nextState.diceValue = null;

    return nextState;
}

/**
 * Convert a player's relative position (0-51) to global board position (0-51)
 * Track starts: Blue=[6,9], Red=[0,6], Green=[8,5], Yellow=[14,8]
 */
export function getGlobalPosition(relativePos: number, playerIndex: number): number {
    return (relativePos + START_OFFSETS[playerIndex]) % TRACK_LENGTH;
}

/**
 * Check if a path is blocked by an opponent's blockade.
 * A blockade is defined as 2 or more tokens of the same color on a non-safe cell.
 * Returns true if ANY cell on the path (excluding the current cell but including the target) is blocked.
 */
function isPathBlocked(state: LudoState, playerIndex: number, currentPos: number, steps: number): boolean {
    // Spawning from base (currentPos === -1) to entry (steps === 0)
    // User requested: "Spawn on colored entry square with another token present -> allowed"
    // "Safe squares do NOT block movement"
    if (currentPos === -1) return false;

    for (let i = 1; i <= steps; i++) {
        const nextRelativePos = currentPos + i;

        // Home stretch is always safe/not blockable by opponents
        if (nextRelativePos >= HOME_START) continue;

        const globalPos = getGlobalPosition(nextRelativePos, playerIndex);

        // Safe squares never block
        if (isSafeCell(globalPos)) continue;

        // Check if any opponent has 2 or more tokens on this global position
        const opponentTokensAtPos = state.tokens.filter(t =>
            t.playerIndex !== playerIndex &&
            t.position >= 0 && t.position < 52 &&
            getGlobalPosition(t.position, t.playerIndex) === globalPos
        );

        // Group by color to check for individual opponent blockades
        const counts: Record<number, number> = {};
        for (const t of opponentTokensAtPos) {
            counts[t.playerIndex] = (counts[t.playerIndex] || 0) + 1;
            if (counts[t.playerIndex] >= 2) return true; // Blocked!
        }
    }

    return false;
}

/**
 * Check if a global position is a safe cell (no captures allowed)
 * Safe cells are: starting positions and star cells
 */
export function isSafeCell(globalPos: number): boolean {
    return SAFE_CELLS.includes(globalPos);
}

/**
 * Compute the next position using canonical Ludo rules.
 * - Track positions: 0..51 (relative to player start)
 * - Home lane: 52..57
 * - Finish: 58
 */
export function computeNextPosition(currentPos: number, diceValue: number): number | null {
    if (currentPos === FINISH_POS) return null;

    if (currentPos === -1) {
        return diceValue === 6 ? 0 : null;
    }

    if (currentPos >= 0 && currentPos <= DOOR_INDEX) {
        const stepsToDoor = DOOR_INDEX - currentPos;
        if (diceValue <= stepsToDoor) {
            return currentPos + diceValue;
        }
        const remaining = diceValue - stepsToDoor - 1;
        const nextPos = HOME_START + remaining;
        return nextPos > FINISH_POS ? null : nextPos;
    }

    if (currentPos >= HOME_START && currentPos <= HOME_END) {
        const nextPos = currentPos + diceValue;
        return nextPos > FINISH_POS ? null : nextPos;
    }

    return null;
}

