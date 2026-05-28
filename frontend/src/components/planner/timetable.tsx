"use client";

import { useMemo } from "react";
import {
  blockToRowSegments,
  buildTimetableHours,
  getTaskBlockRange,
  SLOTS_PER_HOUR,
  TIMETABLE_HOUR_COUNT,
} from "@/lib/planner-hours";
import { cn } from "@/lib/utils";
import type { PlannerTask } from "@/types/schedule";

interface TimetableProps {
  tasks: PlannerTask[];
  dayIso: string;
  className?: string;
}

export function Timetable({ tasks, dayIso, className }: TimetableProps) {
  const hours = useMemo(() => buildTimetableHours(), []);
  const dayStart = useMemo(() => new Date(`${dayIso}T00:00:00`), [dayIso]);

  const timedTasks = tasks.filter((t) => t.isTimeFixed && t.startIso && t.endIso);

  const blockSegments = useMemo(() => {
    const out: Array<{
      task: PlannerTask;
      row: number;
      col: number;
      colSpan: number;
      showLabel: boolean;
    }> = [];

    for (const task of timedTasks) {
      const range = getTaskBlockRange(task.startIso!, task.endIso!, dayStart);
      if (!range) continue;
      const segments = blockToRowSegments(range.startSlot, range.span);
      segments.forEach((seg, i) => {
        out.push({
          task,
          row: seg.row,
          col: seg.col,
          colSpan: seg.colSpan,
          showLabel: i === 0,
        });
      });
    }

    return out;
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

      <div className="relative min-h-0 flex-1 overflow-hidden p-1.5">
        <div
          className="grid h-full w-full"
          style={{ gridTemplateRows: `repeat(${TIMETABLE_HOUR_COUNT}, minmax(0, 1fr))` }}
        >
          {hours.map((row) => (
            <div
              key={row.index}
              className={cn(
                "grid min-h-0 grid-cols-[2rem_repeat(6,minmax(0,1fr))] border-b border-stone-200/70",
                row.isNextDay && "bg-stone-50/40",
              )}
              style={{ gridRow: row.index + 1 }}
            >
              <div className="flex items-start justify-end pr-1 pt-0.5">
                <span className="text-[9px] font-medium tabular-nums leading-none text-stone-500">
                  {row.hour.toString().padStart(2, "0")}:00
                </span>
              </div>
              {Array.from({ length: SLOTS_PER_HOUR }, (_, col) => (
                <div
                  key={col}
                  className={cn(
                    "border-l border-dashed border-stone-200/60",
                    col > 0 && col % 2 === 0 && "bg-stone-50/25",
                  )}
                />
              ))}
            </div>
          ))}
        </div>

        <div
          className="pointer-events-none absolute inset-1.5 left-[calc(0.375rem+2rem)] grid"
          style={{
            gridTemplateRows: `repeat(${TIMETABLE_HOUR_COUNT}, minmax(0, 1fr))`,
            gridTemplateColumns: `repeat(${SLOTS_PER_HOUR}, minmax(0, 1fr))`,
          }}
        >
          {blockSegments.map(({ task, row, col, colSpan, showLabel }, i) => (
            <div
              key={`${task.id}-${row}-${col}-${i}`}
              className="pointer-events-auto mx-px flex items-center overflow-hidden rounded-sm px-1 text-[10px] font-medium leading-tight text-stone-800 shadow-sm ring-1 ring-black/5"
              style={{
                gridRow: row + 1,
                gridColumn: `${col + 1} / span ${colSpan}`,
                backgroundColor: task.categoryColor,
                alignSelf: "stretch",
              }}
              title={`${task.summary} (${task.startIso?.slice(11, 16)}–${task.endIso?.slice(11, 16)})`}
            >
              {showLabel && <span className="line-clamp-2">{task.timetableLabel}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
