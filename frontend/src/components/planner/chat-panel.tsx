"use client";

import Image from "next/image";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { ChatMessageList } from "@/components/chat/chat-message-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRingo } from "@/hooks/use-ringo-store";
import { cn } from "@/lib/utils";

interface ChatPanelProps {
  className?: string;
}

export function ChatPanel({ className }: ChatPanelProps) {
  const {
    messages,
    parsing,
    sendChat,
    updateDraft,
    confirmDrafts,
    retryDrafts,
  } = useRingo();

  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, parsing]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || parsing) return;
    sendChat(input);
    setInput("");
  };

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden rounded-3xl bg-white/90 shadow-[0_8px_40px_-12px_rgba(232,93,44,0.15)] ring-1 ring-orange-100/80 backdrop-blur-sm",
        className,
      )}
    >
      <div className="flex shrink-0 items-center gap-3 border-b border-orange-50 px-4 py-3">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50">
          <Image
            src="/assets/ringo-mascot.png"
            alt="Ringo"
            fill
            className="object-cover"
            sizes="48px"
            priority
          />
        </div>
        <div>
          <p className="font-semibold text-orange-950">Ringo</p>
          <p className="text-xs text-muted-foreground">확인 후 등록</p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3">
        <div className="flex min-h-full flex-col gap-2.5">
          <ChatMessageList
            messages={messages}
            parsing={parsing}
            onUpdateDraft={updateDraft}
            onConfirm={confirmDrafts}
            onRetry={(id, source) => {
              retryDrafts(id);
              if (source) setInput(source);
            }}
          />
          {parsing && (
            <div className="mr-auto flex items-center gap-2 rounded-2xl bg-orange-50 px-3.5 py-2 text-xs text-orange-800">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              일정 파싱 중… (첫 요청은 모델 로딩으로 20~40초 걸릴 수 있어요)
            </div>
          )}
          <div ref={bottomRef} className="h-1 shrink-0" />
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex shrink-0 gap-2 border-t border-orange-50 p-3"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="이번주 금요일 2시에 …"
          className="rounded-2xl border-orange-100 bg-orange-50/30 focus-visible:ring-orange-300"
          disabled={parsing}
        />
        <Button
          type="submit"
          size="icon"
          disabled={parsing || !input.trim()}
          className="shrink-0 rounded-2xl bg-orange-500 hover:bg-orange-600"
        >
          {parsing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  );
}
