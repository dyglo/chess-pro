"use client";


interface ActionSidebarProps {
    onNewGame: () => void;
    onSettings: () => void;
    onFlip: () => void;
    onShare: () => void;
    onHint: () => void;
    onUndo: () => void;
    onChat: () => void;
    onRematch: () => void;
    isGameOver?: boolean;
}

export function ActionSidebar({
    onNewGame,
    onSettings,
    onFlip,
    onShare,
    onHint,
    onUndo,
    onChat,
    onRematch,
    isGameOver
}: ActionSidebarProps) {
    return (
        <div className="flex flex-col items-center gap-4 lg:gap-8 py-4 lg:py-8">
            <div className="grid grid-cols-3 lg:grid-cols-2 gap-x-8 lg:gap-x-12 gap-y-6 lg:gap-y-10">
                <SidebarIcon icon={<PlusIcon />} label="New game" onClick={onNewGame} />
                <SidebarIcon icon={<SettingsIcon />} label="Settings" onClick={onSettings} />
                <SidebarIcon icon={<FlipIcon />} label="Flip board" shortcut="F" onClick={onFlip} />
                <SidebarIcon icon={<ShareIcon />} label="Share game" onClick={onShare} />
                <SidebarIcon icon={<HintIcon />} label="Hint" onClick={onHint} />
                <SidebarIcon icon={<UndoIcon />} label="Undo" onClick={onUndo} />
                <SidebarIcon icon={<ChatIcon />} label="Chat (soon)" onClick={onChat} />
            </div>

            {isGameOver && (
                <button
                    onClick={onRematch}
                    className="mt-4 px-8 py-2 bg-[var(--accent)] hover:brightness-110 text-white font-bold rounded-md transition-all shadow-lg active:scale-95"
                >
                    Rematch
                </button>
            )}
        </div>
    );
}

function SidebarIcon({ icon, label, shortcut, onClick }: { icon: React.ReactNode; label: string; shortcut?: string; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="group flex flex-col items-center gap-2 text-[var(--foreground)]/40 hover:text-[var(--foreground)] transition-all"
        >
            <div className="w-8 h-8 flex items-center justify-center group-hover:scale-110 transition-transform">
                {icon}
            </div>
            <div className="flex flex-col items-center">
                <span className="text-[10px] font-bold uppercase tracking-tight">{label}</span>
                {shortcut && <span className="text-[8px] font-bold opacity-50">[{shortcut}]</span>}
            </div>
        </button>
    );
}

function PlusIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function SettingsIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
            <path d="M4 8h16M4 16h16M8 5v6M16 13v6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function FlipIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
            <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function ShareIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
            <path d="M4 12v7a2 2 0 002 2h12a2 2 0 002-2v-7M16 6l-4-4-4 4M12 2v13" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function HintIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
            <path d="M9.663 17h4.674M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.989-2.386l-.548-.547z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function ChatIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
            <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function UndoIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
            <path d="M9 14l-4-4 4-4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M5 10h9a5 5 0 110 10h-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}
