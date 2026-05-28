"use client";

import { useMemo } from "react";
import {
  buildTimetableSlots,
  getTaskBlockRange,
  MINUTES_PER_SLOT,
  SLOTS_PER_HOUR,
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
        "flex h-full min-h-0 flex-col overflow-hidden rounded-3xl bg-white/95 shadow-sm ring-1 ring-stone-200/60",
        className,
      )}
    >
      <div className="shrink-0 border-b border-stone-100 px-3 py-2">
        <h2 className="text-sm font-semibold tracking-wide text-stone-800">TIMETABLE</h2>
        <p className="text-[10px] text-muted-foreground">
          06:00 → 익일 05:00 · 10분 단위
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden p-1.5">
        <div
          className="relative grid h-full w-full"
          style={{
            gridTemplateRows: `repeat(${TIMETABLE_SLOT_COUNT}, minmax(0, 1fr))`,
          }}
        >
          {slots.map((slot) => {
            const isHourEnd = slot.index % SLOTS_PER_HOUR === SLOTS_PER_HOUR - 1;
            return (
              <div
                key={slot.index}
                className={cn(
                  "col-span-full grid grid-cols-[2rem_1fr] items-stretch",
                  slot.isNextDay && "bg-stone-50/40",
                  isHourEnd ? "border-b border-stone-200/70" : "border-b border-stone-100/50",
                )}
                style={{ gridRow: slot.index + 1 }}
              >
                <div className="relative flex items-start justify-end pr-1">
                  {slot.showHourLabel && (
                    <span className="text-[9px] font-medium tabular-nums leading-none text-stone-500">
                      {slot.hour.toString().padStart(2, "0")}:00
                    </span>
                  )}
                </div>
                <div
                  className={cn(
                    "border-l border-dashed border-stone-200/70",
                    slot.minute > 0 && slot.minute % (MINUTES_PER_SLOT * 2) === 0 && "bg-stone-50/30",
                  )}
                />
              </div>
            );
          })}

          <div
            className="pointer-events-none absolute inset-0 left-8 grid"
            style={{
              gridTemplateRows: `repeat(${TIMETABLE_SLOT_COUNT}, minmax(0, 1fr))`,
            }}
          >
            {blocks.map(({ task, startSlot, span }) => (
              <div
                key={task.id}
                className="pointer-events-auto mx-0.5 flex items-center overflow-hidden rounded-md px-1.5 text-[10px] font-medium leading-tight text-stone-800 shadow-sm ring-1 ring-black/5"
                style={{
                  gridRow: `${startSlot + 1} / span ${span}`,
                  backgroundColor: task.categoryColor,
                  alignSelf: "stretch",
                }}
                title={`${task.summary} (${task.startIso?.slice(11, 16)}–${task.endIso?.slice(11, 16)})`}
              >
                <span className="line-clamp-2">{task.timetableLabel}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
