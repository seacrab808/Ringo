"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAllCategoryStyles } from "@/lib/categories";
import { parseInstanceId } from "@/lib/recurrence";
import { taskToEditPatch, type TaskEditPatch } from "@/lib/task-edit";
import { useRingo } from "@/hooks/use-ringo-store";
import type { PlannerTask } from "@/types/schedule";

interface TaskEditSheetProps {
  task: PlannerTask | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaskEditSheet({ task, open, onOpenChange }: TaskEditSheetProps) {
  const { updateTask, deleteTask, setSelectedDate } = useRingo();
  const [patch, setPatch] = useState<TaskEditPatch>({});

  const inst = task ? parseInstanceId(task.id) : null;
  const isRecurring = Boolean(task?.recurrence || task?.recurrenceInstance);

  useEffect(() => {
    if (!task || !open) return;
    setPatch(taskToEditPatch(task, inst?.dateIso));
  }, [task, open, inst?.dateIso]);

  if (!open || !task) return null;

  const set = (p: Partial<TaskEditPatch>) => setPatch((prev) => ({ ...prev, ...p }));

  const handleSave = () => {
    updateTask(task.id, patch);
    onOpenChange(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 sm:items-center">
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-5 shadow-xl ring-1 ring-orange-100"
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-orange-950">일정 수정</h2>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-xl p-2 text-stone-500 hover:bg-stone-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isRecurring && (
          <p className="mb-3 text-xs text-violet-700">
            매주 반복 일정이에요. 수정하면 전체 학기 일정에 반영돼요.
          </p>
        )}

        <div className="space-y-3">
          <label className="block text-xs text-stone-500">
            제목
            <Input
              value={patch.summary ?? ""}
              onChange={(e) => set({ summary: e.target.value })}
              className="mt-1 rounded-xl"
            />
          </label>

          <label className="block text-xs text-stone-500">
            카테고리
            <select
              value={patch.category ?? "other"}
              onChange={(e) => set({ category: e.target.value })}
              className="mt-1 w-full rounded-xl border border-input px-3 py-2 text-sm"
            >
              {getAllCategoryStyles().map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          {!isRecurring && (
            <label className="block text-xs text-stone-500">
              날짜
              <input
                type="date"
                value={patch.plannedDate ?? ""}
                onChange={(e) => set({ plannedDate: e.target.value })}
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              />
            </label>
          )}

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={patch.isTimeFixed ?? false}
              onChange={(e) => set({ isTimeFixed: e.target.checked })}
            />
            시간 고정
          </label>

          {patch.isTimeFixed && (
            <div className="flex gap-2">
              <label className="flex-1 text-xs text-stone-500">
                시작
                <input
                  type="time"
                  value={patch.startTime ?? ""}
                  onChange={(e) => set({ startTime: e.target.value })}
                  className="mt-1 w-full rounded-xl border px-2 py-1.5 text-sm"
                />
              </label>
              <label className="flex-1 text-xs text-stone-500">
                종료
                <input
                  type="time"
                  value={patch.endTime ?? ""}
                  onChange={(e) => set({ endTime: e.target.value })}
                  className="mt-1 w-full rounded-xl border px-2 py-1.5 text-sm"
                />
              </label>
            </div>
          )}

          {isRecurring && patch.recurrence && (
            <div className="flex gap-2">
              <label className="flex-1 text-xs text-stone-500">
                개강
                <input
                  type="date"
                  value={patch.recurrence.semesterStart ?? ""}
                  onChange={(e) =>
                    set({
                      recurrence: {
                        ...patch.recurrence!,
                        semesterStart: e.target.value,
                      },
                    })
                  }
                  className="mt-1 w-full rounded-xl border px-2 py-1.5 text-sm"
                />
              </label>
              <label className="flex-1 text-xs text-stone-500">
                종강
                <input
                  type="date"
                  value={patch.recurrence.semesterEnd ?? ""}
                  onChange={(e) =>
                    set({
                      recurrence: {
                        ...patch.recurrence!,
                        semesterEnd: e.target.value,
                      },
                    })
                  }
                  className="mt-1 w-full rounded-xl border px-2 py-1.5 text-sm"
                />
              </label>
            </div>
          )}
        </div>

        {(patch.plannedDate || inst?.dateIso) && (
          <Link
            href="/planner"
            onClick={() => {
              setSelectedDate(inst?.dateIso ?? patch.plannedDate!);
              onOpenChange(false);
            }}
            className="mb-3 block text-center text-sm text-orange-600 hover:underline"
          >
            플래너에서 이 날 보기 →
          </Link>
        )}

        <div className="mt-5 flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1 rounded-xl"
            onClick={() => {
              deleteTask(task.id);
              onOpenChange(false);
            }}
          >
            {task.recurrenceInstance ? "오늘 휴강" : "삭제"}
          </Button>
          <Button
            type="button"
            className="flex-1 rounded-xl bg-orange-500 hover:bg-orange-600"
            onClick={handleSave}
          >
            저장
          </Button>
        </div>
      </div>
    </div>
  );
}
