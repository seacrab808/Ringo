"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, format, subDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { getPlannerDayIso } from "@/lib/planner-day";
import { cn } from "@/lib/utils";

interface PlannerHeaderProps {
  formattedDate: string;
  selectedDate: string;
  onDateChange: (iso: string) => void;
  taskCount: number;
}

export function PlannerHeader({
  formattedDate,
  selectedDate,
  onDateChange,
  taskCount,
}: PlannerHeaderProps) {
  const plannerToday = getPlannerDayIso();
  const isPlannerToday = selectedDate === plannerToday;

  const shift = (delta: number) => {
    const d = new Date(selectedDate + "T12:00:00");
    const next = delta > 0 ? addDays(d, 1) : subDays(d, 1);
    onDateChange(format(next, "yyyy-MM-dd"));
  };

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-white/90 px-4 py-3 shadow-sm ring-1 ring-orange-100/70">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-xl"
          onClick={() => shift(-1)}
          aria-label="이전 날"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div>
          <p className="text-lg font-bold text-orange-950">{formattedDate}</p>
          <p className={cn("text-xs text-muted-foreground", isPlannerToday && "text-orange-600")}>
            {isPlannerToday ? "오늘의 페이지 (06:00 기준)" : "모트모트 플래너"}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-xl"
          onClick={() => shift(1)}
          aria-label="다음 날"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
      <div className="flex items-center gap-3 text-sm">
        {!isPlannerToday && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl border-orange-200 text-orange-800"
            onClick={() => onDateChange(plannerToday)}
          >
            오늘 (06시~)
          </Button>
        )}
        <span className="rounded-2xl bg-orange-100 px-3 py-1 font-medium text-orange-800">
          Task {taskCount}
        </span>
        <span className="hidden text-muted-foreground sm:inline">D-day · 추후 설정</span>
      </div>
    </header>
  );
}
