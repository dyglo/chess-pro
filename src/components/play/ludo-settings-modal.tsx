"use client";

import { type LudoBoardStyle, ludoStyles } from "@/lib/ludo/board-styles";
import { Check, X } from "lucide-react";

interface LudoSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    boardStyle: LudoBoardStyle;
    onStyleChange: (styleId: string) => void;
}

export function LudoSettingsModal({
    isOpen,
    onClose,
    boardStyle,
    onStyleChange
}: LudoSettingsModalProps) {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-md flex items-center justify-center p-4 transition-all duration-300 animate-in fade-in"
            onClick={onClose}
        >
            <div
                className="bg-[var(--ludo-bg-card)] rounded-[2rem] w-full max-w-[360px] overflow-hidden shadow-[0_20px_50px_-12px_rgba(0,0,0,0.3)] border border-[var(--ludo-border-card)] animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 ease-out"
                onClick={e => e.stopPropagation()}
            >
                {/* Compact Header */}
                <div className="px-6 py-5 border-b border-[var(--ludo-border-card)] flex items-center justify-between bg-[var(--ludo-bg-card)]">
                    <div>
                        <h2 className="text-lg font-bold text-[var(--ludo-text-primary)] tracking-tight">Ludo Settings</h2>
                        <p className="text-[10px] text-[var(--ludo-text-muted)] font-bold uppercase tracking-wider">Customize Interface</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-[var(--ludo-border-card)] rounded-full transition-all duration-200 group"
                    >
                        <X className="w-4 h-4 text-[var(--ludo-text-muted)] group-hover:text-[var(--ludo-text-primary)] transition-all duration-200" />
                    </button>
                </div>

                {/* Compact Content */}
                <div className="p-6 space-y-6">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--ludo-text-muted)]">Board Style</h3>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {ludoStyles.map((style) => {
                                const isActive = boardStyle.id === style.id;
                                return (
                                    <button
                                        key={style.id}
                                        type="button"
                                        onClick={() => onStyleChange(style.id)}
                                        className={`group relative flex flex-col items-center p-3 rounded-2xl border-2 transition-all duration-300 text-center hover:border-[var(--accent)]/30 ${isActive
                                            ? "border-[var(--accent)] bg-[var(--accent)]/[0.02] shadow-[0_4px_12px_-4px_rgba(0,0,0,0.1)]"
                                            : "border-[var(--ludo-border-card)] bg-[var(--ludo-border-card)]/30 grayscale-[0.3] hover:grayscale-0"
                                            }`}
                                    >
                                        {/* Simplified Board Preview */}
                                        <div
                                            className="w-full aspect-square rounded-xl mb-2.5 overflow-hidden border border-black/5 relative group-hover:scale-[1.04] transition-transform duration-300"
                                            style={{ background: style.background }}
                                        >
                                            <div className="absolute inset-2 grid grid-cols-2 grid-rows-2 gap-1 opacity-90">
                                                <div className="rounded-[3px]" style={{ background: style.zoneColors.red }}></div>
                                                <div className="rounded-[3px]" style={{ background: style.zoneColors.green }}></div>
                                                <div className="rounded-[3px]" style={{ background: style.zoneColors.blue }}></div>
                                                <div className="rounded-[3px]" style={{ background: style.zoneColors.yellow }}></div>
                                            </div>
                                            {isActive && (
                                                <div className="absolute inset-0 bg-[var(--accent)]/5 flex items-center justify-center">
                                                    <div className="bg-white rounded-full p-1 shadow-sm animate-in zoom-in-50">
                                                        <Check className="w-3 h-3 text-[var(--accent)] stroke-[4]" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <p className={`font-bold text-[11px] ${isActive ? "text-[var(--accent)]" : "text-[var(--ludo-text-secondary)]"}`}>
                                            {style.name}
                                        </p>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Compact Footer */}
                <div className="px-6 pb-6">
                    <button
                        onClick={onClose}
                        className="w-full bg-[var(--accent)] text-white py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest hover:brightness-110 active:scale-[0.98] transition-all duration-200"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
