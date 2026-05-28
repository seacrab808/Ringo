"use client";

import Image from "next/image";
import Link from "next/link";
import { FileText, Download } from "lucide-react";
import { ScheduleConfirmCard } from "@/components/chat/schedule-confirm-card";
import { Button } from "@/components/ui/button";
import { StudyGuideContent } from "@/components/study-guide/study-guide-content";
import { downloadPdfBase64 } from "@/lib/chat-api";
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
              {m.pendingStudyGuide && (
                <div className="mr-auto max-w-[92%] rounded-2xl bg-violet-50 px-3.5 py-2.5 text-xs text-violet-900 ring-1 ring-violet-100">
                  등록하면 첨부 자료와 학습지가 이 일정의{" "}
                  <span className="font-semibold">Task 페이지</span>에 저장됩니다.
                </div>
              )}
              <div className="mr-auto max-w-[92%] rounded-2xl bg-white px-3.5 py-2.5 text-sm text-stone-700 ring-1 ring-orange-100/80">
                {m.text || "일정 확인"}
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
              {m.attachments && m.attachments.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1">
                  {m.attachments.map((a) => (
                    <span
                      key={a.id}
                      className="inline-flex items-center gap-1 rounded-lg bg-white/20 px-2 py-0.5 text-xs"
                    >
                      <FileText className="h-3 w-3" />
                      {a.filename}
                    </span>
                  ))}
                </div>
              )}
              {m.text}
            </div>
          );
        }

        if (m.role === "study_guide") {
          return (
            <div
              key={m.id}
              className="mr-auto max-w-[92%] rounded-2xl bg-violet-50 px-3.5 py-2.5 text-sm text-stone-800 ring-1 ring-violet-100"
            >
              <p className="mb-2 font-medium text-violet-900">{m.text}</p>
              {m.fewShotUsed && m.fewShotUsed.length > 0 && (
                <p className="mb-2 text-xs text-violet-700">
                  참고 예시: {m.fewShotUsed.join(", ")}
                </p>
              )}
              {m.studyGuideMarkdown && (
                <StudyGuideContent content={m.studyGuideMarkdown} />
              )}
              {m.studyGuidePdfBase64 && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-2 rounded-xl"
                  onClick={() =>
                    downloadPdfBase64(m.studyGuidePdfBase64!, "ringo-study-guide.pdf")
                  }
                >
                  <Download className="mr-1 h-3.5 w-3.5" />
                  PDF 저장
                </Button>
              )}
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
            {m.linkedTaskId && (
              <Link
                href={`/tasks/${m.linkedTaskId}`}
                className="mt-2 inline-flex rounded-xl bg-white px-3 py-1.5 text-xs font-medium text-orange-800 ring-1 ring-orange-200 hover:bg-orange-50"
              >
                Task 페이지에서 학습지 보기 →
              </Link>
            )}
          </div>
        );
      })}
    </>
  );
}
