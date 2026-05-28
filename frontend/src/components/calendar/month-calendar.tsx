"use client";

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getPlannerDayIso } from "@/lib/planner-day";
import { cn } from "@/lib/utils";
import { useRingo } from "@/hooks/use-ringo-store";

const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"];
const MAX_CHIPS = 3;

export function MonthCalendar() {
  const router = useRouter();
  const {
    calendarMonth,
    setCalendarMonth,
    selectedDate,
    setSelectedDate,
    getTasksForDate,
    setEditingTask,
    hydrated,
  } = useRingo();

  if (!hydrated) {
    return (
      <div className="flex h-full items-center justify-center text-orange-800">
        불러오는 중…
      </div>
    );
  }

  const monthStart = new Date(calendarMonth + "-01T12:00:00");
  const gridStart = startOfWeek(startOfMonth(monthStart), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(monthStart), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const plannerToday = getPlannerDayIso();

  const goMonth = (delta: number) => {
    const next = addMonths(monthStart, delta);
    setCalendarMonth(format(next, "yyyy-MM"));
  };

  const pickDay = (iso: string) => {
    setSelectedDate(iso);
    router.push("/planner");
  };

  return (
    <div className="flex h-full flex-col p-4 md:p-6">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-orange-950">캘린더</h1>
          <p className="text-sm text-muted-foreground">
            일정을 눌러 수정 · 빈 칸을 누르면 플래너로 이동
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => goMonth(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <span className="min-w-[120px] text-center font-semibold text-stone-800">
            {format(monthStart, "yyyy년 M월", { locale: ko })}
          </span>
          <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => goMonth(1)}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col rounded-3xl bg-white p-3 shadow-sm ring-1 ring-stone-200/60 md:p-4">
        <div className="mb-2 grid grid-cols-7 gap-1">
          {WEEKDAYS.map((w) => (
            <div key={w} className="py-1 text-center text-xs font-medium text-stone-500">
              {w}
            </div>
          ))}
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-6 gap-1">
          {days.map((day) => {
            const iso = format(day, "yyyy-MM-dd");
            const inMonth = isSameMonth(day, monthStart);
            const isSelected = iso === selectedDate;
            const isToday = iso === plannerToday;
            const dayTasks = getTasksForDate(iso);
            const visible = dayTasks.slice(0, MAX_CHIPS);
            const more = dayTasks.length - visible.length;

            return (
              <div
                key={iso}
                className={cn(
                  "flex min-h-[72px] flex-col rounded-xl border p-0.5 md:min-h-[96px]",
                  inMonth ? "border-stone-100 bg-stone-50/50" : "border-transparent opacity-40",
                  isSelected && "border-orange-400 ring-2 ring-orange-200",
                )}
              >
                <button
                  type="button"
                  onClick={() => pickDay(iso)}
                  className={cn(
                    "flex w-full shrink-0 items-center justify-center rounded-lg py-0.5 text-xs font-medium",
                    isToday && "bg-orange-500 text-white",
                    !isToday && "text-stone-700 hover:bg-orange-50",
                  )}
                >
                  {format(day, "d")}
                </button>

                <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden p-0.5">
                  {visible.map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingTask(task);
                      }}
                      className="truncate rounded-md px-1 py-0.5 text-left text-[10px] font-medium text-stone-800 md:text-[11px]"
                      style={{ backgroundColor: task.categoryColor }}
                      title={task.summary}
                    >
                      {task.timetableLabel || task.summary}
                    </button>
                  ))}
                  {more > 0 && (
                    <span className="px-1 text-[10px] text-stone-500">+{more}개</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
