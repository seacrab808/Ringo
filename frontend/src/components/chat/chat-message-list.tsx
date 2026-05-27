"use client";

import Image from "next/image";
import { ScheduleConfirmCard } from "@/components/chat/schedule-confirm-card";
import { cn } from "@/lib/utils";
import type { ChatMessage, PendingTaskDraft } from "@/types/schedule";

interface ChatMessageListProps {
  messages: ChatMessage[];
  parsing: boolean;
  onUpdateDraft: (messageId: string, draftId: string, patch: Partial<PendingTaskDraft>) => void;
  onConfirm: (messageId: string) => void;
  onRetry: (messageId: string, sourceText?: string) => void;
}

export function ChatMessageList({
  messages,
  parsing,
  onUpdateDraft,
  onConfirm,
  onRetry,
}: ChatMessageListProps) {
  return (
    <>
      {messages.map((m) => {
        if (m.role === "confirm" && m.drafts && m.drafts.length > 0 && !m.confirmed) {
          return (
            <div key={m.id} className="flex flex-col gap-3">
              <div className="mr-auto max-w-[92%] rounded-2xl bg-white px-3.5 py-2.5 text-sm text-stone-700 ring-1 ring-orange-100/80">
                {m.text}
              </div>
              {m.drafts.map((draft, i) => (
                <ScheduleConfirmCard
                  key={draft.draftId}
                  draft={draft}
                  index={i}
                  total={m.drafts!.length}
                  disabled={parsing}
                  onChange={(patch) => onUpdateDraft(m.id, draft.draftId, patch)}
                  onConfirm={() => onConfirm(m.id)}
                  onRetry={() => onRetry(m.id, m.sourceText)}
                />
              ))}
            </div>
          );
        }

        if (m.role === "user") {
          return (
            <div
              key={m.id}
              className="ml-auto max-w-[92%] rounded-2xl rounded-br-md bg-orange-500 px-3.5 py-2.5 text-sm text-white"
            >
              {m.text}
            </div>
          );
        }

        return (
          <div
            key={m.id}
            className={cn(
              "mr-auto max-w-[92%] rounded-2xl rounded-bl-md px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
              m.role === "error"
                ? "bg-red-50 text-red-800 ring-1 ring-red-100"
                : "bg-orange-50 text-orange-950 ring-1 ring-orange-100/80",
            )}
          >
            {m.role === "ringo" && (
              <span className="mb-1 mr-1.5 inline-block align-middle">
                <Image
                  src="/assets/ringo-mascot.png"
                  alt=""
                  width={20}
                  height={20}
                  className="inline rounded-full"
                />
              </span>
            )}
            {m.text}
          </div>
        );
      })}
    </>
  );
}
