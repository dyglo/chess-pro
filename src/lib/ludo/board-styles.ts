export interface LudoBoardStyle {
    id: string;
    name: string;
    description: string;
    background: string; // CSS background for the board container
    boardFill: string; // Fill for the main board rect
    gridStroke: string; // Color of grid lines
    safeSquareColor: string; // Color of the star/safe square background
    arrowColors: {
        red: string;
        green: string;
        yellow: string;
        blue: string;
    };
    zoneColors: {
        red: string;
        green: string;
        yellow: string;
        blue: string;
    };
    trackColors: { // The colored tiles on the track
        red: string;
        green: string;
        yellow: string;
        blue: string;
    }
}

export const ludoStyles: LudoBoardStyle[] = [
    {
        id: "classic",
        name: "Classic",
        description: "Traditional clean white board",
        background: "#ffffff",
        boardFill: "#fafafa",
        gridStroke: "#e5e5e5",
        safeSquareColor: "#e5e5e5", // Slightly darker than board
        arrowColors: {
            red: "#ef4444",
            green: "#22c55e",
            yellow: "#eab308",
            blue: "#3b82f6"
        },
        zoneColors: {
            red: "#fca5a5", // lighter
            green: "#86efac",
            yellow: "#fde047",
            blue: "#93c5fd"
        },
        trackColors: {
            red: "#ef4444",
            green: "#22c55e",
            yellow: "#eab308",
            blue: "#3b82f6"
        }
    },
    {
        id: "wood",
        name: "Wooden",
        description: "Classic warm wood finish",
        background: "#deb887",
        boardFill: "#f3e5ab", // Parchment/light wood
        gridStroke: "#8b4513",
        safeSquareColor: "#deb887",
        arrowColors: {
            red: "#a52a2a", // Brownish red
            green: "#006400", // Dark green
            yellow: "#daa520", // Goldenrod
            blue: "#00008b"  // Dark blue
        },
        zoneColors: {
            red: "#cd5c5c",
            green: "#228b22",
            yellow: "#f0e68c",
            blue: "#4682b4"
        },
        trackColors: {
            red: "#a52a2a",
            green: "#006400",
            yellow: "#daa520",
            blue: "#00008b"
        }
    },
    {
        id: "minimal",
        name: "Dark",
        description: "Sleek dark mode",
        background: "#18181b", // Zinc 900
        boardFill: "#27272a", // Zinc 800
        gridStroke: "#3f3f46", // Zinc 700
        safeSquareColor: "#3f3f46",
        arrowColors: {
            red: "#f87171",
            green: "#4ade80",
            yellow: "#facc15",
            blue: "#60a5fa"
        },
        zoneColors: {
            red: "#450a0a",
            green: "#052e16",
            yellow: "#422006",
            blue: "#172554"
        },
        trackColors: {
            red: "#7f1d1d",
            green: "#14532d",
            yellow: "#713f12",
            blue: "#1e3a8a"
        }
    }
];

export const defaultLudoStyle = ludoStyles[0];

export function getLudoStyleById(id: string): LudoBoardStyle {
    return ludoStyles.find(s => s.id === id) || defaultLudoStyle;
}
