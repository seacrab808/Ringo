import { format } from "date-fns";
import { getCategoryStyle } from "@/lib/categories";
import { newTaskId } from "@/lib/planner-api";
import type { PendingTaskDraft, PlannerTask } from "@/types/schedule";

export function isoToTimeString(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return format(d, "HH:mm");
}

export function taskToDraft(task: PlannerTask): PendingTaskDraft {
  return {
    draftId: `draft-${task.id}`,
    summary: task.summary,
    plannedDate: task.plannedDate ?? task.startIso?.slice(0, 10) ?? "",
    startTime: task.isTimeFixed ? isoToTimeString(task.startIso) : "",
    endTime: task.isTimeFixed ? isoToTimeString(task.endIso) : "",
    isTimeFixed: task.isTimeFixed,
    category: task.category,
    isRecurring: Boolean(task.recurrence),
    recurrence: task.recurrence,
  };
}

export function draftToPlannerTask(
  draft: PendingTaskDraft,
  order: number,
): PlannerTask {
  const style = getCategoryStyle(draft.category);
  let startIso: string | undefined;
  let endIso: string | undefined;
  let deadlineIso: string | undefined;

  if (draft.isTimeFixed && draft.startTime && draft.plannedDate) {
    const [sh, sm] = draft.startTime.split(":").map(Number);
    const start = new Date(`${draft.plannedDate}T12:00:00`);
    start.setHours(sh, sm || 0, 0, 0);
    startIso = start.toISOString();

    if (draft.endTime) {
      const [eh, em] = draft.endTime.split(":").map(Number);
      const end = new Date(`${draft.plannedDate}T12:00:00`);
      end.setHours(eh, em || 0, 0, 0);
      endIso = end.toISOString();
    } else {
      const end = new Date(start);
      end.setHours(end.getHours() + 1);
      endIso = end.toISOString();
    }
  } else if (draft.plannedDate) {
    deadlineIso = `${draft.plannedDate}T23:59:59+09:00`;
  }

  const recurrence = draft.recurrence;
  const byHour =
    recurrence?.byHour ??
    (startIso ? new Date(startIso).getHours() : undefined);

  const finalRecurrence =
    draft.isRecurring && recurrence
      ? { ...recurrence, byHour, byMinute: recurrence.byMinute ?? 0 }
      : undefined;

  return {
    id: newTaskId(),
    summary: draft.summary.trim(),
    timetableLabel: draft.summary.trim().slice(0, 12),
    isTimeFixed: draft.isTimeFixed && Boolean(draft.startTime),
    plannedDate: finalRecurrence ? undefined : draft.plannedDate || undefined,
    startIso,
    endIso,
    deadlineIso: draft.isTimeFixed ? undefined : deadlineIso,
    category: draft.category,
    categoryColor: style.bg,
    createdOrder: order,
    listOrder: order,
    completed: false,
    recurrence: finalRecurrence,
  };
}
