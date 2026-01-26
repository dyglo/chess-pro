"use client";

interface SignInPromptModalProps {
    isOpen: boolean;
    onClose: () => void;
    feature: "hint" | "analysis" | "leaderboard";
}

const FEATURE_CONTENT = {
    hint: {
        title: "Get Smart Hints",
        description: "Sign in to unlock AI-powered hints that help you find the best moves and improve your game.",
        icon: (
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
        ),
    },
    analysis: {
        title: "Deep Game Analysis",
        description: "Sign in to analyze your games move by move, understand mistakes, and learn from your play.",
        icon: (
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
        ),
    },
    leaderboard: {
        title: "Join the Leaderboard",
        description: "Sign up to track your rating, compete with players worldwide, and climb the rankings!",
        icon: (
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
        ),
    },
};

export function SignInPromptModal({ isOpen, onClose, feature }: SignInPromptModalProps) {
    if (!isOpen) return null;

    const content = FEATURE_CONTENT[feature];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-[var(--surface-2)] transition-colors z-10"
                >
                    <svg className="w-5 h-5 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Content */}
                <div className="p-8 text-center">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-[var(--accent-2)]/20 to-[var(--accent)]/20 flex items-center justify-center text-[var(--accent)]">
                        {content.icon}
                    </div>

                    <h2 className="text-2xl font-bold text-[var(--foreground)] mb-3">
                        {content.title}
                    </h2>

                    <p className="text-[var(--muted)] mb-8 leading-relaxed">
                        {content.description}
                    </p>

                    <div className="space-y-3">
                        <button className="w-full py-3.5 px-6 rounded-xl bg-[var(--accent-3)] text-white font-semibold shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-transform">
                            Sign In
                        </button>
                        <button className="w-full py-3.5 px-6 rounded-xl border border-[var(--line)] bg-white text-[var(--foreground)] font-semibold hover:bg-[var(--surface-2)] transition-colors">
                            Create Account
                        </button>
                    </div>

                    <p className="mt-6 text-xs text-[var(--muted)]">
                        Free accounts get limited hints. Upgrade for unlimited access.
                    </p>
                </div>
            </div>
        </div>
    );
}
