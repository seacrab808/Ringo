"use client";

import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { ChatComposer } from "@/components/chat/chat-composer";
import { ChatMessageList } from "@/components/chat/chat-message-list";
import { useRingo } from "@/hooks/use-ringo-store";

const SUGGESTIONS = [
  "이번주 금요일까지 딥러닝 과제",
  "내일 오후 2시 조교 미팅",
  "첨부 PDF로 학습지 만들어줘",
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

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, parsing]);

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
          PDF 첨부 후 일정 등록 또는 학습지 생성
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-8">
        <div className="mx-auto flex max-w-2xl flex-col gap-3">
          <ChatMessageList
            messages={messages}
            parsing={parsing}
            onUpdateDraft={updateDraft}
            onConfirm={confirmDrafts}
            onRetry={(id) => retryDrafts(id)}
          />
          {parsing && (
            <div className="mr-auto flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm text-orange-800 shadow-sm ring-1 ring-orange-100">
              <Loader2 className="h-4 w-4 animate-spin" />
              처리 중…
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
                onClick={() => sendChat(s, [])}
                className="rounded-full bg-orange-50 px-3 py-1.5 text-xs text-orange-900 ring-1 ring-orange-100 hover:bg-orange-100"
              >
                {s}
              </button>
            ))}
          </div>
          <ChatComposer parsing={parsing} onSend={sendChat} className="flex gap-2" />
        </div>
      </footer>
    </div>
  );
}
