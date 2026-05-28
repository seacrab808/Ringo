"use client";

import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAllCategoryStyles } from "@/lib/categories";
import type { PendingTaskDraft } from "@/types/schedule";

interface ScheduleConfirmCardProps {
  draft: PendingTaskDraft;
  index: number;
  total: number;
  disabled?: boolean;
  onChange: (patch: Partial<PendingTaskDraft>) => void;
  onConfirm: () => void;
  onRetry: () => void;
}

export function ScheduleConfirmCard({
  draft,
  index,
  total,
  disabled,
  onChange,
  onConfirm,
  onRetry,
}: ScheduleConfirmCardProps) {
  const dateLabel = draft.plannedDate
    ? format(new Date(draft.plannedDate + "T12:00:00"), "M월 d일 (EEE)", {
        locale: ko,
      })
    : "날짜 미정";

  return (
    <div className="w-full max-w-md rounded-2xl border border-orange-100 bg-white p-4 shadow-sm ring-1 ring-orange-50">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-orange-800">
        <Sparkles className="h-4 w-4 text-orange-500" />
        이렇게 등록할까요?
        {total > 1 && (
          <span className="text-xs font-normal text-muted-foreground">
            ({index + 1}/{total})
          </span>
        )}
      </div>

      <Input
        value={draft.summary}
        onChange={(e) => onChange({ summary: e.target.value })}
        disabled={disabled}
        className="mb-3 border-0 bg-transparent px-0 text-lg font-semibold text-stone-900 shadow-none focus-visible:ring-0"
        placeholder="일정 제목"
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <label className="flex flex-col gap-1 rounded-xl bg-stone-50 px-3 py-2 text-xs text-stone-500">
          날짜
          <input
            type="date"
            value={draft.plannedDate}
            onChange={(e) => onChange({ plannedDate: e.target.value })}
            disabled={disabled}
            className="border-0 bg-transparent text-sm font-medium text-stone-800 outline-none"
          />
        </label>

        <label className="flex flex-col gap-1 rounded-xl bg-stone-50 px-3 py-2 text-xs text-stone-500">
          <span className="flex items-center gap-2">
            시간
            <input
              type="checkbox"
              checked={draft.isTimeFixed}
              onChange={(e) =>
                onChange({
                  isTimeFixed: e.target.checked,
                  startTime: e.target.checked ? draft.startTime || "09:00" : "",
                  endTime: e.target.checked ? draft.endTime || "" : "",
                })
              }
              disabled={disabled}
              className="rounded"
            />
          </span>
          {draft.isTimeFixed ? (
            <div className="flex items-center gap-1 text-sm font-medium text-stone-800">
              <input
                type="time"
                value={draft.startTime}
                onChange={(e) => onChange({ startTime: e.target.value })}
                disabled={disabled}
                className="w-[5.5rem] border-0 bg-transparent outline-none"
              />
              <span className="text-stone-400">~</span>
              <input
                type="time"
                value={draft.endTime}
                onChange={(e) => onChange({ endTime: e.target.value })}
                disabled={disabled}
                className="w-[5.5rem] border-0 bg-transparent outline-none"
              />
            </div>
          ) : (
            <span className="text-sm text-stone-600">시간 없음 (TODO)</span>
          )}
        </label>

        <label className="flex flex-col gap-1 rounded-xl bg-stone-50 px-3 py-2 text-xs text-stone-500">
          카테고리
          <select
            value={draft.category}
            onChange={(e) => onChange({ category: e.target.value })}
            disabled={disabled}
            className="border-0 bg-transparent text-sm font-medium text-stone-800 outline-none"
          >
            {getAllCategoryStyles().map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {draft.isRecurring && draft.recurrence && (
        <p className="mb-2 text-xs font-medium text-violet-700">
          매주 반복 · {draft.recurrence.byDay.join(", ")} ·{" "}
          {draft.recurrence.semesterStart} ~ {draft.recurrence.semesterEnd}
        </p>
      )}

      <p className="mb-3 text-xs text-muted-foreground">{dateLabel}</p>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1 rounded-xl border-stone-200 bg-stone-50"
          onClick={onRetry}
          disabled={disabled}
        >
          다시 말하기
        </Button>
        <Button
          type="button"
          className="flex-1 rounded-xl bg-orange-500 hover:bg-orange-600"
          onClick={onConfirm}
          disabled={disabled || !draft.summary.trim() || !draft.plannedDate}
        >
          등록하기
        </Button>
      </div>
    </div>
  );
}
