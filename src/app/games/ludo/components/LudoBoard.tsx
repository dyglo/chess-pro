"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Token, PlayerColor } from "@/lib/ludo/ludo-state";
import { LudoBoardStyle, defaultLudoStyle } from "@/lib/ludo/board-styles";

interface LudoBoardProps {
    className?: string;
    tokens: Token[];
    onTokenClick?: (tokenId: number) => void;
    validMoveTokenIds?: number[];
    style?: LudoBoardStyle;
    captureEffect?: { globalPos: number; color: PlayerColor } | null;
    knockedTokenIds?: number[];
}

export function LudoBoard({
    className,
    tokens,
    onTokenClick,
    validMoveTokenIds = [],
    style = defaultLudoStyle,
    captureEffect = null,
    knockedTokenIds = [],
}: LudoBoardProps) {
    const BOARD_SIZE = 450;
    const CELL_SIZE = BOARD_SIZE / 15;
    const TOKEN_RADIUS = CELL_SIZE * 0.35;

    const getCellCoords = (pathIndex: number) => {
        const track = [
            [6, 13], [6, 12], [6, 11], [6, 10], [6, 9],   // Blue entry segment
            [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8], // Bottom left
            [0, 7],                                       // Left side middle
            [0, 6], [1, 6], [2, 6], [3, 6], [4, 6], [5, 6], // Top left segment
            [6, 5], [6, 4], [6, 3], [6, 2], [6, 1], [6, 0], // Top left middle segment
            [7, 0],                                       // Top side middle
            [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], // Top right segment
            [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [14, 6], // Right side top segment
            [14, 7],                                      // Right side middle
            [14, 8], [13, 8], [12, 8], [11, 8], [10, 8], [9, 8], // Right side bottom segment
            [8, 9], [8, 10], [8, 11], [8, 12], [8, 13], [8, 14], // Bottom right segment
            [7, 14],                                      // Bottom side middle
            [6, 14]                                       // Bottom left entrance
        ];
        return track[pathIndex % 52];
    };

    const getHomeStretchCoords = (playerColor: PlayerColor, step: number) => {
        if (playerColor === 'blue') return [7, 13 - step];
        if (playerColor === 'red') return [1 + step, 7];
        if (playerColor === 'green') return [7, 1 + step];
        if (playerColor === 'yellow') return [13 - step, 7];
        return [7, 7];
    };

    const getBaseCoords = (playerColor: PlayerColor, tokenIndex: number) => {
        const offsets = [[0.3, 0.3], [0.7, 0.3], [0.3, 0.7], [0.7, 0.7]];
        const bases = { blue: { cx: 2.5, cy: 11.5 }, red: { cx: 2.5, cy: 2.5 }, green: { cx: 11.5, cy: 2.5 }, yellow: { cx: 11.5, cy: 11.5 } };
        const base = bases[playerColor];
        const offset = offsets[tokenIndex % 4];
        return [base.cx + (offset[0] - 0.5) * 2, base.cy + (offset[1] - 0.5) * 2];
    };

    const isStartCell = (i: number, j: number): PlayerColor | null => {
        if (i === 6 && j === 13) return 'blue';
        if (i === 1 && j === 6) return 'red';
        if (i === 8 && j === 1) return 'green';
        if (i === 13 && j === 8) return 'yellow';
        return null;
    };

    const renderStarMarker = (cx: number, cy: number, color: string) => {
        const size = CELL_SIZE * 0.35;
        const points = [];
        for (let i = 0; i < 5; i++) {
            const angle = (i * 144 - 90) * Math.PI / 180;
            points.push(`${cx + Math.cos(angle) * size},${cy + Math.sin(angle) * size}`);
            const innerAngle = ((i * 144) + 72 - 90) * Math.PI / 180;
            points.push(`${cx + Math.cos(innerAngle) * size * 0.4},${cy + Math.sin(innerAngle) * size * 0.4}`);
        }
        return <polygon points={points.join(' ')} fill={color} opacity={0.8} />;
    };

    const renderToken = (token: Token) => {
        let x, y;
        if (token.position === -1) {
            [x, y] = getBaseCoords(token.color, token.id % 4);
        } else if (token.position >= 58) {
            return null;
        } else if (token.position >= 52) {
            [x, y] = getHomeStretchCoords(token.color, token.position - 52);
        } else {
            const startOffsets = { blue: 0, red: 13, green: 26, yellow: 39 };
            const globalPos = (token.position + startOffsets[token.color]) % 52;
            [x, y] = getCellCoords(globalPos);
        }

        const centerX = x * CELL_SIZE + CELL_SIZE / 2;
        const centerY = y * CELL_SIZE + CELL_SIZE / 2;
        const isClickable = validMoveTokenIds.includes(token.id);
        const isKnocked = knockedTokenIds.includes(token.id);

        return (
            <g key={token.id} onClick={() => isClickable && onTokenClick?.(token.id)} className={cn("transition-all duration-300 cursor-pointer", isClickable ? "opacity-100" : "opacity-90")}>
                <ellipse cx={centerX} cy={centerY + 2} rx={TOKEN_RADIUS} ry={TOKEN_RADIUS * 0.5} fill="rgba(0,0,0,0.2)" />
                <circle
                    cx={centerX}
                    cy={centerY}
                    r={TOKEN_RADIUS}
                    fill={`url(#grad-${token.color})`}
                    stroke="white"
                    strokeWidth={2}
                    className={cn(isClickable && "animate-pulse", isKnocked && "ludo-knock-flash")}
                />
                <circle cx={centerX - TOKEN_RADIUS * 0.2} cy={centerY - TOKEN_RADIUS * 0.2} r={TOKEN_RADIUS * 0.3} fill="white" opacity={0.4} />
                {isClickable && <circle cx={centerX} cy={centerY} r={TOKEN_RADIUS + 4} fill="none" stroke={`url(#grad-${token.color})`} strokeWidth={2} className="animate-ping" opacity={0.6} />}
            </g>
        );
    };

    return (
        <div className={cn("p-3 rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.12)] border border-gray-100", className)} style={{ background: style.background }}>
            <svg width="100%" height="100%" viewBox={`0 0 ${BOARD_SIZE} ${BOARD_SIZE}`} className="rounded-xl">
                <defs>
                    <linearGradient id="grad-blue"><stop offset="0%" stopColor={style.arrowColors.blue} /><stop offset="100%" stopColor={style.zoneColors.blue} /></linearGradient>
                    <linearGradient id="grad-red"><stop offset="0%" stopColor={style.arrowColors.red} /><stop offset="100%" stopColor={style.zoneColors.red} /></linearGradient>
                    <linearGradient id="grad-green"><stop offset="0%" stopColor={style.arrowColors.green} /><stop offset="100%" stopColor={style.zoneColors.green} /></linearGradient>
                    <linearGradient id="grad-yellow"><stop offset="0%" stopColor={style.arrowColors.yellow} /><stop offset="100%" stopColor={style.zoneColors.yellow} /></linearGradient>
                </defs>
                <rect width={BOARD_SIZE} height={BOARD_SIZE} fill={style.boardFill} rx="12" />
                <rect x={0} y={0} width={CELL_SIZE * 6} height={CELL_SIZE * 6} fill="url(#grad-red)" rx="12" />
                <rect x={CELL_SIZE * 9} y={0} width={CELL_SIZE * 6} height={CELL_SIZE * 6} fill="url(#grad-green)" rx="12" />
                <rect x={0} y={CELL_SIZE * 9} width={CELL_SIZE * 6} height={CELL_SIZE * 6} fill="url(#grad-blue)" rx="12" />
                <rect x={CELL_SIZE * 9} y={CELL_SIZE * 9} width={CELL_SIZE * 6} height={CELL_SIZE * 6} fill="url(#grad-yellow)" rx="12" />
                <rect x={CELL_SIZE * 1.2} y={CELL_SIZE * 1.2} width={CELL_SIZE * 3.6} height={CELL_SIZE * 3.6} fill={style.background} rx="16" />
                <rect x={CELL_SIZE * 10.2} y={CELL_SIZE * 1.2} width={CELL_SIZE * 3.6} height={CELL_SIZE * 3.6} fill={style.background} rx="16" />
                <rect x={CELL_SIZE * 1.2} y={CELL_SIZE * 10.2} width={CELL_SIZE * 3.6} height={CELL_SIZE * 3.6} fill={style.background} rx="16" />
                <rect x={CELL_SIZE * 10.2} y={CELL_SIZE * 10.2} width={CELL_SIZE * 3.6} height={CELL_SIZE * 3.6} fill={style.background} rx="16" />
                <polygon points={`${CELL_SIZE * 6},${CELL_SIZE * 6} ${CELL_SIZE * 9},${CELL_SIZE * 6} ${BOARD_SIZE / 2},${BOARD_SIZE / 2}`} fill="url(#grad-green)" />
                <polygon points={`${CELL_SIZE * 9},${CELL_SIZE * 6} ${CELL_SIZE * 9},${CELL_SIZE * 9} ${BOARD_SIZE / 2},${BOARD_SIZE / 2}`} fill="url(#grad-yellow)" />
                <polygon points={`${CELL_SIZE * 9},${CELL_SIZE * 9} ${CELL_SIZE * 6},${CELL_SIZE * 9} ${BOARD_SIZE / 2},${BOARD_SIZE / 2}`} fill="url(#grad-blue)" />
                <polygon points={`${CELL_SIZE * 6},${CELL_SIZE * 9} ${CELL_SIZE * 6},${CELL_SIZE * 6} ${BOARD_SIZE / 2},${BOARD_SIZE / 2}`} fill="url(#grad-red)" />
                {Array.from({ length: 15 }).map((_, i) => Array.from({ length: 15 }).map((_, j) => {
                    const isMiddle = (i >= 6 && i <= 8) || (j >= 6 && j <= 8);
                    if (!isMiddle || (i >= 6 && i <= 8 && j >= 6 && j <= 8)) return null;
                    let fill = style.boardFill;
                    if (i === 7 && j > 0 && j < 6) fill = style.trackColors.red;
                    if (i === 7 && j > 8 && j < 14) fill = style.trackColors.yellow;
                    if (j === 7 && i > 0 && i < 6) fill = style.trackColors.green;
                    if (j === 7 && i > 8 && i < 14) fill = style.trackColors.blue;
                    const startColor = isStartCell(i, j);
                    if (startColor) fill = style.trackColors[startColor];
                    return (
                        <g key={`${i}-${j}`}>
                            <rect x={i * CELL_SIZE} y={j * CELL_SIZE} width={CELL_SIZE} height={CELL_SIZE} fill={fill} stroke={style.gridStroke} strokeWidth="0.5" />
                            {startColor && renderStarMarker(i * CELL_SIZE + CELL_SIZE / 2, j * CELL_SIZE + CELL_SIZE / 2, style.safeSquareColor)}
                        </g>
                    );
                }))}
                {captureEffect && (
                    (() => {
                        const [x, y] = getCellCoords(captureEffect.globalPos);
                        const centerX = x * CELL_SIZE + CELL_SIZE / 2;
                        const centerY = y * CELL_SIZE + CELL_SIZE / 2;
                        const ringColor = style.trackColors[captureEffect.color];
                        return (
                            <g className="ludo-capture-burst">
                                <circle cx={centerX} cy={centerY} r={TOKEN_RADIUS * 0.6} fill={ringColor} opacity={0.2} />
                                <circle cx={centerX} cy={centerY} r={TOKEN_RADIUS * 1.8} fill="none" stroke={ringColor} strokeWidth={3} className="ludo-capture-ring" />
                            </g>
                        );
                    })()
                )}
                {tokens.map(renderToken)}
            </svg>
        </div>
    );
}
