"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { ChatMessageList } from "@/components/chat/chat-message-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRingo } from "@/hooks/use-ringo-store";

const SUGGESTIONS = [
  "이번주 금요일까지 딥러닝 과제",
  "내일 오후 2시 조교 미팅",
  "매주 수요일 14시 소프트웨어공학 수업",
];

export function ChatView() {
  const {
    messages,
    parsing,
    sendChat,
    updateDraft,
    confirmDrafts,
    retryDrafts,
    hydrated,
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

  if (!hydrated) {
    return (
      <div className="flex h-full items-center justify-center text-orange-800">
        불러오는 중…
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-[#faf8f5]">
      <header className="shrink-0 border-b border-orange-100/80 bg-white/80 px-6 py-4 backdrop-blur-sm">
        <h1 className="text-lg font-bold text-orange-950">Ringo에게 말하기</h1>
        <p className="text-sm text-muted-foreground">
          편하게 말해 주세요. 확인 후 등록할 수 있어요.
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-8">
        <div className="mx-auto flex max-w-2xl flex-col gap-3">
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
            <div className="mr-auto flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm text-orange-800 shadow-sm ring-1 ring-orange-100">
              <Loader2 className="h-4 w-4 animate-spin" />
              일정 파싱 중…
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <footer className="shrink-0 border-t border-orange-100 bg-white/90 px-4 py-4 md:px-8">
        <div className="mx-auto max-w-2xl">
          <div className="mb-3 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setInput(s)}
                className="rounded-full bg-orange-50 px-3 py-1.5 text-xs text-orange-900 ring-1 ring-orange-100 hover:bg-orange-100"
              >
                {s}
              </button>
            ))}
          </div>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="일정을 말해 줘…"
              className="h-12 flex-1 rounded-2xl border-orange-100 bg-orange-50/40 text-base"
              disabled={parsing}
            />
            <Button
              type="submit"
              size="icon"
              disabled={parsing || !input.trim()}
              className="h-12 w-12 shrink-0 rounded-2xl bg-orange-500 hover:bg-orange-600"
            >
              <Send className="h-5 w-5" />
            </Button>
          </form>
        </div>
      </footer>
    </div>
  );
}
