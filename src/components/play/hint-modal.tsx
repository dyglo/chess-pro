"use client";

interface HintModalProps {
    isOpen: boolean;
    onClose: () => void;
    hint: string;
    isLoading: boolean;
}

export function HintModal({ isOpen, onClose, hint, isLoading }: HintModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg flex items-center gap-2 text-[var(--foreground)]">
                        <div className="w-8 h-8 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        Grandmaster Hint
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-8 gap-3">
                        <div className="w-8 h-8 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-sm font-medium text-gray-500 animate-pulse">Analyzing position...</p>
                    </div>
                ) : (
                    <div className="py-2">
                        <p className="text-[var(--foreground)] leading-relaxed text-sm font-medium bg-[var(--surface)] p-4 rounded-xl border border-[var(--line)]">
                            {hint}
                        </p>
                        <button
                            onClick={onClose}
                            className="mt-6 w-full py-2.5 rounded-xl bg-[var(--foreground)] text-white font-bold text-sm hover:opacity-90 transition-opacity"
                        >
                            Got it
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
