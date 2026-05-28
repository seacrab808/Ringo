"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { getPlannerDayIso } from "@/lib/planner-day";
import {
  addDaysToIso,
  isoDateToCompact,
  parseIsoDateAtNoonKst,
} from "@/lib/ringo-timezone";

interface PlannerHeaderProps {
  selectedDate: string;
  onDateChange: (iso: string) => void;
  taskCount: number;
}

export function PlannerHeader({
  selectedDate,
  onDateChange,
  taskCount,
}: PlannerHeaderProps) {
  const plannerToday = getPlannerDayIso();
  const isPlannerToday = selectedDate === plannerToday;
  const dateCompact = isoDateToCompact(selectedDate);
  const weekdayEn = format(parseIsoDateAtNoonKst(selectedDate), "EEEE", {
    locale: enUS,
  }).toUpperCase();

  return (
    <header className="relative flex items-center justify-center rounded-3xl bg-white/90 px-14 py-4 shadow-sm ring-1 ring-orange-100/70">
      <Button
        variant="ghost"
        size="icon"
        className="absolute left-3 rounded-xl"
        onClick={() => onDateChange(addDaysToIso(selectedDate, -1))}
        aria-label="이전 날"
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>

      <div className="text-center">
        <p className="text-3xl font-extrabold tracking-tight text-stone-950 tabular-nums md:text-4xl">
          {dateCompact}
        </p>
        <p className="mt-0.5 text-xl font-bold uppercase tracking-wide text-red-600 md:text-2xl">
          {weekdayEn}
        </p>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="absolute right-3 rounded-xl"
        onClick={() => onDateChange(addDaysToIso(selectedDate, 1))}
        aria-label="다음 날"
      >
        <ChevronRight className="h-5 w-5" />
      </Button>

      <div className="absolute right-14 top-1/2 hidden -translate-y-1/2 items-center gap-2 sm:flex">
        {!isPlannerToday && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl border-orange-200 text-orange-800"
            onClick={() => onDateChange(plannerToday)}
          >
            오늘
          </Button>
        )}
        <span className="rounded-2xl bg-orange-100 px-3 py-1 text-sm font-medium text-orange-800">
          {taskCount}
        </span>
      </div>
    </header>
  );
}
