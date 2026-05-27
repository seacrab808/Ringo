import type { PlannerTask } from "@/types/schedule";

/** Auto-layout: timed tasks first (by clock), then flexible (by createdOrder). */
export function sortPlannerTasks(tasks: PlannerTask[]): PlannerTask[] {
  return [...tasks].sort((a, b) => {
    const fixedRank = (t: PlannerTask) => (t.isTimeFixed ? 0 : 1);
    const fa = fixedRank(a);
    const fb = fixedRank(b);
    if (fa !== fb) return fa - fb;

    if (a.isTimeFixed && b.isTimeFixed) {
      const ta = a.startIso ? new Date(a.startIso).getTime() : 0;
      const tb = b.startIso ? new Date(b.startIso).getTime() : 0;
      if (ta !== tb) return ta - tb;
      return a.id.localeCompare(b.id);
    }

    if (a.createdOrder !== b.createdOrder) return a.createdOrder - b.createdOrder;
    return a.id.localeCompare(b.id);
  });
}

export function orderByListOrder(tasks: PlannerTask[]): PlannerTask[] {
  return [...tasks].sort((a, b) => a.listOrder - b.listOrder);
}

/** Apply auto-sort rules and write listOrder for display. */
export function assignAutoListOrder(tasks: PlannerTask[]): PlannerTask[] {
  return sortPlannerTasks(tasks).map((t, i) => ({ ...t, listOrder: i }));
}

export function reorderTasks(
  tasks: PlannerTask[],
  sourceIndex: number,
  destIndex: number,
): PlannerTask[] {
  const ordered = orderByListOrder(tasks);
  const [removed] = ordered.splice(sourceIndex, 1);
  ordered.splice(destIndex, 0, removed);
  return ordered.map((t, i) => ({ ...t, listOrder: i }));
}

export function ensureListOrder(tasks: PlannerTask[]): PlannerTask[] {
  const hasAll = tasks.every((t) => typeof t.listOrder === "number");
  if (hasAll) return orderByListOrder(tasks);
  return assignAutoListOrder(
    tasks.map((t, i) => ({
      ...t,
      listOrder: typeof t.listOrder === "number" ? t.listOrder : i,
    })),
  );
}
