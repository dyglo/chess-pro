/**
 * Premium chessboard themes for ChessPro
 */

export interface BoardTheme {
    id: string;
    name: string;
    lightSquare: string;
    darkSquare: string;
    highlightLight: string;
    highlightDark: string;
    lastMoveLight: string;
    lastMoveDark: string;
    description: string;
}

export const boardThemes: BoardTheme[] = [
    {
        id: "wooden",
        name: "Wooden",
        lightSquare: "#f0d9b5",
        darkSquare: "#b58863",
        highlightLight: "rgba(255, 255, 0, 0.4)",
        highlightDark: "rgba(255, 255, 0, 0.4)",
        lastMoveLight: "rgba(155, 199, 0, 0.41)",
        lastMoveDark: "rgba(155, 199, 0, 0.41)",
        description: "Classic warm wood finish",
    },
    {
        id: "modern",
        name: "Modern",
        lightSquare: "#ffffff",
        darkSquare: "#1a1a1a",
        highlightLight: "rgba(99, 102, 241, 0.4)",
        highlightDark: "rgba(99, 102, 241, 0.5)",
        lastMoveLight: "rgba(99, 102, 241, 0.3)",
        lastMoveDark: "rgba(99, 102, 241, 0.4)",
        description: "Sleek black & white",
    },
    {
        id: "classic",
        name: "Classic",
        lightSquare: "#eeeed2",
        darkSquare: "#769656",
        highlightLight: "rgba(255, 255, 0, 0.4)",
        highlightDark: "rgba(255, 255, 0, 0.4)",
        lastMoveLight: "rgba(155, 199, 0, 0.41)",
        lastMoveDark: "rgba(155, 199, 0, 0.41)",
        description: "Traditional green board",
    },
    {
        id: "marble",
        name: "Marble",
        lightSquare: "#f5f5f5",
        darkSquare: "#607d8b",
        highlightLight: "rgba(33, 150, 243, 0.4)",
        highlightDark: "rgba(33, 150, 243, 0.5)",
        lastMoveLight: "rgba(33, 150, 243, 0.3)",
        lastMoveDark: "rgba(33, 150, 243, 0.4)",
        description: "Elegant gray marble",
    },
    {
        id: "emerald",
        name: "Emerald",
        lightSquare: "#e8f5e9",
        darkSquare: "#2e7d32",
        highlightLight: "rgba(255, 193, 7, 0.5)",
        highlightDark: "rgba(255, 193, 7, 0.5)",
        lastMoveLight: "rgba(255, 193, 7, 0.3)",
        lastMoveDark: "rgba(255, 193, 7, 0.4)",
        description: "Rich green luxury",
    },
];

export const defaultTheme = boardThemes[0]; // Wooden

export function getThemeById(id: string): BoardTheme {
    return boardThemes.find((t) => t.id === id) || defaultTheme;
}

/**
 * Difficulty levels for the chess AI
 */
export interface DifficultyLevel {
    id: string;
    name: string;
    depth: number;
    description: string;
    rating: string;
}

export const difficultyLevels: DifficultyLevel[] = [
    {
        id: "beginner",
        name: "Beginner",
        depth: 1,
        description: "Learning the basics",
        rating: "~400",
    },
    {
        id: "easy",
        name: "Easy",
        depth: 2,
        description: "Casual player",
        rating: "~800",
    },
    {
        id: "medium",
        name: "Medium",
        depth: 3,
        description: "Club player level",
        rating: "~1200",
    },
    {
        id: "hard",
        name: "Hard",
        depth: 4,
        description: "Strong tactics",
        rating: "~1600",
    },
    {
        id: "expert",
        name: "Expert",
        depth: 5,
        description: "Near-master play",
        rating: "~2000",
    },
];

export const defaultDifficulty = difficultyLevels[2]; // Medium

export function getDifficultyById(id: string): DifficultyLevel {
    return difficultyLevels.find((d) => d.id === id) || defaultDifficulty;
}
