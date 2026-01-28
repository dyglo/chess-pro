"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { MatchChatMessage } from "@/hooks/use-match-chat";

type LudoMatchChatProps = {
  messages: MatchChatMessage[];
  isLoading: boolean;
  error: string | null;
  onSend: (content: string) => Promise<{ success: boolean; error?: string }>;
  currentUserId?: string;
  className?: string;
};

export function LudoMatchChat({
  messages,
  isLoading,
  error,
  onSend,
  currentUserId,
  className,
}: LudoMatchChatProps) {
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const compactMessages = useMemo(() => messages.slice(-120), [messages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [compactMessages.length]);

  const handleSend = async () => {
    if (!input.trim() || isSending) return;
    setIsSending(true);
    const result = await onSend(input);
    if (result.success) {
      setInput("");
    }
    setIsSending(false);
  };

  return (
    <div className={cn("bg-[var(--ludo-bg-card)] rounded-xl border border-[var(--ludo-border-card)] p-3 shadow-sm", className)}>
      <div className="flex items-center justify-between">
        <div className="text-xs font-bold uppercase tracking-widest text-[var(--ludo-text-muted)]">
          Live Chat
        </div>
        <div className="text-[10px] text-[var(--ludo-text-muted)]">
          {isLoading ? "Loading..." : `${messages.length}`}
        </div>
      </div>
      <div className="mt-2 h-40 overflow-y-auto space-y-2 pr-1">
        {compactMessages.length === 0 && !isLoading && (
          <div className="text-[11px] text-[var(--ludo-text-muted)]">
            No messages yet. Say hi!
          </div>
        )}
        {compactMessages.map((msg) => {
          const isMe = msg.user_id === currentUserId;
          return (
            <div key={msg.id} className={cn("flex gap-2 text-[11px]", isMe && "justify-end")}>
              {!isMe && (
                <div className="h-6 w-6 rounded-full overflow-hidden bg-[var(--ludo-border-card)] flex items-center justify-center">
                  {msg.avatar_url ? (
                    <Image src={msg.avatar_url} alt={msg.display_name ?? "Player"} width={24} height={24} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-[9px] font-bold text-[var(--ludo-text-muted)]">P</span>
                  )}
                </div>
              )}
              <div className={cn(
                "max-w-[70%] rounded-xl px-2.5 py-1.5",
                isMe ? "bg-[var(--accent)]/10 text-[var(--accent)]" : "bg-white/70 text-[var(--ludo-text-primary)]"
              )}>
                {!isMe && (
                  <div className="text-[10px] font-semibold text-[var(--ludo-text-muted)]">
                    {msg.display_name ?? "Player"}
                  </div>
                )}
                <div className="text-[11px] leading-relaxed">{msg.content}</div>
              </div>
              {isMe && (
                <div className="h-6 w-6 rounded-full overflow-hidden bg-[var(--ludo-border-card)] flex items-center justify-center">
                  {msg.avatar_url ? (
                    <Image src={msg.avatar_url} alt="Me" width={24} height={24} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-[9px] font-bold text-[var(--ludo-text-muted)]">Me</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      {error && (
        <div className="mt-2 text-[10px] text-red-500">
          {error}
        </div>
      )}
      <div className="mt-2 flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Message..."
          className="flex-1 rounded-lg border border-[var(--ludo-border-card)] bg-white/70 px-3 py-2 text-[12px] outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <button
          onClick={handleSend}
          disabled={isSending || !input.trim()}
          className="h-9 w-9 rounded-lg bg-[var(--accent)] text-white flex items-center justify-center disabled:opacity-50"
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
