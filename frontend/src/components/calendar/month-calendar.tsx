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
import { cn } from "@/lib/utils";
import { useRingo } from "@/hooks/use-ringo-store";

const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"];

export function MonthCalendar() {
  const router = useRouter();
  const {
    calendarMonth,
    setCalendarMonth,
    selectedDate,
    setSelectedDate,
    taskCountByDate,
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
            날짜를 누르면 그날 플래너로 이동해요
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

      <div className="flex min-h-0 flex-1 flex-col rounded-3xl bg-white p-4 shadow-sm ring-1 ring-stone-200/60">
        <div className="mb-2 grid grid-cols-7 gap-1">
          {WEEKDAYS.map((w) => (
            <div
              key={w}
              className="py-1 text-center text-xs font-medium text-stone-500"
            >
              {w}
            </div>
          ))}
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-6 gap-1">
          {days.map((day) => {
            const iso = format(day, "yyyy-MM-dd");
            const inMonth = isSameMonth(day, monthStart);
            const isSelected = iso === selectedDate;
            const count = taskCountByDate[iso] ?? 0;
            const isToday = iso === format(new Date(), "yyyy-MM-dd");

            return (
              <button
                key={iso}
                type="button"
                onClick={() => pickDay(iso)}
                className={cn(
                  "flex min-h-[52px] flex-col items-center justify-start rounded-xl border p-1 text-sm transition-colors md:min-h-[72px]",
                  inMonth ? "border-stone-100 bg-stone-50/50" : "border-transparent bg-transparent opacity-40",
                  isSelected && "border-orange-400 bg-orange-50 ring-2 ring-orange-200",
                  !isSelected && inMonth && "hover:border-orange-200 hover:bg-orange-50/60",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium",
                    isToday && "bg-orange-500 text-white",
                    !isToday && isSelected && "text-orange-700",
                  )}
                >
                  {format(day, "d")}
                </span>
                {count > 0 && (
                  <span className="mt-0.5 rounded-full bg-orange-400/90 px-1.5 text-[10px] font-medium text-white">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
