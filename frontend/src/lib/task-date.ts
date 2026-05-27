import type { PlannerTask } from "@/types/schedule";

/** Which calendar day this task belongs on (YYYY-MM-DD). */
export function getTaskDateKey(task: PlannerTask): string | null {
  if (task.plannedDate) return task.plannedDate;
  if (task.startIso) return task.startIso.slice(0, 10);
  if (task.deadlineIso) return task.deadlineIso.slice(0, 10);
  return null;
}

export function taskMatchesDate(task: PlannerTask, dateIso: string): boolean {
  const key = getTaskDateKey(task);
  return key === dateIso;
}

export function filterTasksForDate(tasks: PlannerTask[], dateIso: string): PlannerTask[] {
  return tasks.filter((t) => taskMatchesDate(t, dateIso));
}

export function countTasksByDate(tasks: PlannerTask[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const t of tasks) {
    const key = getTaskDateKey(t);
    if (!key) continue;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}
