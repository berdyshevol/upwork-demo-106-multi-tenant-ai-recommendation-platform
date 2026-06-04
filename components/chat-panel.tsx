"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, Bot, User, KeyRound, ChevronDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { sendChatMessage, NO_KEY } from "@/lib/api-client";
import type { Tenant, Citation } from "@/lib/types";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
}

interface ChatPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: Tenant;
  providerIds: string[];
  onOpenSettings: () => void;
}

export function ChatPanel({
  open,
  onOpenChange,
  tenant,
  providerIds,
  onOpenSettings,
}: ChatPanelProps) {
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [noKey, setNoKey] = React.useState(false);
  const endRef = React.useRef<HTMLDivElement>(null);

  // Reset when dialog opens fresh
  React.useEffect(() => {
    if (open) {
      setNoKey(false);
    }
  }, [open]);

  // Auto-scroll to bottom
  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setSending(true);
    setNoKey(false);

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    const result = await sendChatMessage(tenant.slug, text, providerIds, history);

    setSending(false);

    if (!result.ok) {
      if (result.code === NO_KEY) {
        setNoKey(true);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Sorry, something went wrong. Please try again.",
          },
        ]);
      }
      return;
    }

    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: result.data.answer,
        citations: result.data.citations.length > 0 ? result.data.citations : undefined,
      },
    ]);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg flex flex-col h-[85vh] sm:h-[600px] p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand shrink-0">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base">Ask a follow-up</DialogTitle>
              <DialogDescription className="text-xs">
                Ask anything about the providers shown
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0">
          {messages.length === 0 && !noKey && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
              <div className="h-12 w-12 rounded-full bg-brand/10 flex items-center justify-center">
                <Bot className="h-6 w-6 text-brand" />
              </div>
              <p className="text-sm text-muted-foreground max-w-xs">
                Ask me to compare providers, explain a score, or dive deeper into any detail.
              </p>
            </div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                data-testid="chat-message"
                className={cn(
                  "flex gap-2.5",
                  msg.role === "user" ? "flex-row-reverse" : "flex-row",
                )}
              >
                {/* Avatar */}
                <div
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                    msg.role === "user"
                      ? "bg-brand/10 text-brand"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {msg.role === "user" ? (
                    <User className="h-3.5 w-3.5" />
                  ) : (
                    <Bot className="h-3.5 w-3.5" />
                  )}
                </div>

                {/* Bubble */}
                <div className={cn("max-w-[80%] space-y-2", msg.role === "user" && "items-end")}>
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                      msg.role === "user"
                        ? "bg-brand/15 text-brand rounded-tr-sm"
                        : "bg-muted text-foreground rounded-tl-sm",
                    )}
                  >
                    {msg.content}
                  </div>

                  {/* Citations */}
                  {msg.citations && msg.citations.length > 0 && (
                    <CitationList citations={msg.citations} />
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing indicator */}
          {sending && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-2.5"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Bot className="h-3.5 w-3.5" />
              </div>
              <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-3">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </motion.div>
          )}

          {/* No-key hint */}
          {noKey && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg border border-brand/20 bg-brand/5 p-4 text-sm space-y-3"
            >
              <div className="flex items-center gap-2 font-medium text-brand">
                <KeyRound className="h-4 w-4" />
                OpenAI key required for chat
              </div>
              <p className="text-muted-foreground">
                Add your OpenAI key to unlock AI-powered follow-up conversation.
              </p>
              <Button
                variant="brand"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onOpenSettings();
                }}
              >
                <KeyRound className="h-3.5 w-3.5" />
                Add key
              </Button>
            </motion.div>
          )}

          <div ref={endRef} />
        </div>

        {/* Input */}
        <div className="shrink-0 border-t border-border px-4 py-3 flex gap-2 items-center">
          <Input
            data-testid="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about a provider…"
            disabled={sending}
            className="flex-1"
          />
          <Button
            variant="brand"
            size="icon"
            data-testid="chat-send"
            onClick={() => void handleSend()}
            disabled={!input.trim() || sending}
            aria-label="Send message"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Inline citation list under a message ─────────────────────────────── */

function CitationList({ citations }: { citations: Citation[] }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div>
      <button
        type="button"
        className="flex items-center gap-1 text-xs text-brand/60 hover:text-brand transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
        {citations.length} source{citations.length !== 1 ? "s" : ""}
      </button>
      {open && (
        <div className="mt-1.5 space-y-1.5">
          {citations.map((c) => (
            <div
              key={c.chunkId}
              data-testid="citation"
              className="rounded border border-border/50 bg-muted/20 px-3 py-2"
            >
              <p className="text-xs font-medium text-muted-foreground mb-0.5">{c.source}</p>
              <p className="text-xs text-foreground/60 italic">"{c.snippet}"</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
