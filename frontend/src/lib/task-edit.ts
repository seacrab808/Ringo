import { getCategoryStyle } from "@/lib/categories";
import type { PendingTaskDraft, PlannerTask, TaskRecurrence } from "@/types/schedule";

export interface TaskEditPatch {
  summary?: string;
  category?: string;
  plannedDate?: string;
  startTime?: string;
  endTime?: string;
  isTimeFixed?: boolean;
  recurrence?: TaskRecurrence;
}

export function applyTaskEdit(
  task: PlannerTask,
  patch: TaskEditPatch,
  /** When editing a recurring instance, anchor times to this date. */
  instanceDate?: string,
): PlannerTask {
  const summary = patch.summary?.trim() ?? task.summary;
  const category = patch.category ?? task.category;
  const style = getCategoryStyle(category);
  const isTimeFixed = patch.isTimeFixed ?? task.isTimeFixed;
  const dateKey =
    patch.plannedDate ?? instanceDate ?? task.plannedDate ?? task.startIso?.slice(0, 10);

  let startIso = task.startIso;
  let endIso = task.endIso;
  let deadlineIso = task.deadlineIso;

  if (isTimeFixed && patch.startTime && dateKey) {
    const [sh, sm] = patch.startTime.split(":").map(Number);
    const start = new Date(`${dateKey}T12:00:00`);
    start.setHours(sh, sm || 0, 0, 0);
    startIso = start.toISOString();

    if (patch.endTime) {
      const [eh, em] = patch.endTime.split(":").map(Number);
      const end = new Date(`${dateKey}T12:00:00`);
      end.setHours(eh, em || 0, 0, 0);
      endIso = end.toISOString();
    } else {
      const end = new Date(start);
      end.setHours(end.getHours() + 1);
      endIso = end.toISOString();
    }
    deadlineIso = undefined;
  } else if (!isTimeFixed && dateKey) {
    startIso = undefined;
    endIso = undefined;
    deadlineIso = `${dateKey}T23:59:59+09:00`;
  }

  let recurrence = patch.recurrence ?? task.recurrence;
  if (recurrence && startIso) {
    recurrence = {
      ...recurrence,
      byHour: new Date(startIso).getHours(),
      byMinute: new Date(startIso).getMinutes(),
    };
  }

  return {
    ...task,
    summary,
    timetableLabel: summary.slice(0, 12),
    category,
    categoryColor: style.bg,
    isTimeFixed: isTimeFixed && Boolean(startIso || patch.startTime),
    plannedDate: recurrence ? undefined : dateKey,
    startIso,
    endIso,
    deadlineIso: isTimeFixed ? undefined : deadlineIso,
    recurrence,
    recurrenceInstance: undefined,
    templateId: undefined,
    id: task.recurrence ? task.id : task.id,
  };
}

export function taskToEditPatch(task: PlannerTask, instanceDate?: string): TaskEditPatch {
  const date =
    instanceDate ?? task.plannedDate ?? task.startIso?.slice(0, 10) ?? "";
  const startTime = task.startIso
    ? new Date(task.startIso).toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : "";
  const endTime = task.endIso
    ? new Date(task.endIso).toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : "";

  return {
    summary: task.summary,
    category: task.category,
    plannedDate: date,
    startTime,
    endTime,
    isTimeFixed: task.isTimeFixed,
    recurrence: task.recurrence,
  };
}

export function editPatchToDraft(patch: TaskEditPatch, draftId: string): PendingTaskDraft {
  return {
    draftId,
    summary: patch.summary ?? "",
    plannedDate: patch.plannedDate ?? "",
    startTime: patch.startTime ?? "",
    endTime: patch.endTime ?? "",
    isTimeFixed: patch.isTimeFixed ?? false,
    category: patch.category ?? "other",
    isRecurring: Boolean(patch.recurrence),
    recurrence: patch.recurrence,
  };
}
