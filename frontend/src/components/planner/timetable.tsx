"use client";

import { useMemo } from "react";
import {
  buildTimetableSlots,
  getTaskBlockRange,
  TIMETABLE_SLOT_COUNT,
} from "@/lib/planner-hours";
import { cn } from "@/lib/utils";
import type { PlannerTask } from "@/types/schedule";

interface TimetableProps {
  tasks: PlannerTask[];
  dayIso: string;
  className?: string;
}

export function Timetable({ tasks, dayIso, className }: TimetableProps) {
  const slots = useMemo(() => buildTimetableSlots(), []);
  const dayStart = useMemo(() => new Date(`${dayIso}T00:00:00`), [dayIso]);

  const timedTasks = tasks.filter((t) => t.isTimeFixed && t.startIso && t.endIso);

  const blocks = useMemo(() => {
    return timedTasks
      .map((task) => {
        const range = getTaskBlockRange(task.startIso!, task.endIso!, dayStart);
        if (!range) return null;
        return { task, ...range };
      })
      .filter(Boolean) as Array<{
      task: PlannerTask;
      startSlot: number;
      span: number;
    }>;
  }, [timedTasks, dayStart]);

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col rounded-3xl bg-white/95 shadow-sm ring-1 ring-stone-200/60",
        className,
      )}
    >
      <div className="border-b border-stone-100 px-4 py-3">
        <h2 className="text-sm font-semibold tracking-wide text-stone-800">TIMETABLE</h2>
        <p className="text-xs text-muted-foreground">06:00 → 익일 05:00</p>
      </div>

      <div className="relative min-h-0 flex-1 overflow-y-auto p-2">
        <div
          className="relative grid min-h-[54rem] gap-0"
          style={{
            gridTemplateRows: `repeat(${TIMETABLE_SLOT_COUNT}, minmax(2.25rem, 1fr))`,
          }}
        >
          {slots.map((slot, i) => (
            <div
              key={`${slot.hour}-${i}`}
              className={cn(
                "grid grid-cols-[3rem_1fr] items-stretch border-b border-stone-100/80",
                slot.isNextDay && "bg-stone-50/50",
              )}
            >
              <span className="py-1 pr-2 text-right text-[10px] tabular-nums text-stone-400">
                {slot.label}
              </span>
              <div className="relative min-h-[2.25rem] border-l border-dashed border-stone-200/80" />
            </div>
          ))}

          <div
            className="pointer-events-none absolute inset-0 left-12 grid gap-0 p-0"
            style={{
              gridTemplateRows: `repeat(${TIMETABLE_SLOT_COUNT}, minmax(2.25rem, 1fr))`,
            }}
          >
            {blocks.map(({ task, startSlot, span }) => (
              <div
                key={task.id}
                className="mx-1 flex items-center overflow-hidden rounded-xl px-2.5 text-xs font-medium text-stone-800 shadow-sm"
                style={{
                  gridRow: `${startSlot + 1} / span ${span}`,
                  backgroundColor: task.categoryColor,
                  alignSelf: "stretch",
                }}
                title={task.summary}
              >
                <span className="truncate">{task.timetableLabel}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
