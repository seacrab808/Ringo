import { expandTasksForDate } from "@/lib/recurrence";
import { getTaskDateKey } from "@/lib/task-date";
import type { ReportClientContext } from "@/lib/reports-api";
import type { PlannerTask } from "@/types/schedule";

function addDaysIso(iso: string, n: number): string {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export function buildReportClientContext(
  tasks: PlannerTask[],
  diaries: Record<string, string>,
  startDate: string,
  endDate: string,
): ReportClientContext {
  const snapshots: ReportClientContext["tasks"] = [];
  let cur = startDate;
  while (cur <= endDate) {
    for (const t of expandTasksForDate(tasks, cur)) {
      snapshots.push({
        summary: t.summary,
        planned_date: cur,
        completed: t.completed,
        category: t.category,
        is_recurring: Boolean(t.recurrence || t.recurrenceInstance),
      });
    }
    cur = addDaysIso(cur, 1);
  }

  for (const t of tasks) {
    if (t.recurrence) continue;
    const key = getTaskDateKey(t);
    if (!key || key < startDate || key > endDate) continue;
    if (snapshots.some((s) => s.summary === t.summary && s.planned_date === key)) continue;
    snapshots.push({
      summary: t.summary,
      planned_date: key,
      completed: t.completed,
      category: t.category,
      is_recurring: false,
    });
  }

  const diarySlice: Record<string, string> = {};
  for (const [k, v] of Object.entries(diaries)) {
    if (k >= startDate && k <= endDate && v.trim()) {
      diarySlice[k] = v;
    }
  }

  return { tasks: snapshots, diaries: diarySlice };
}
