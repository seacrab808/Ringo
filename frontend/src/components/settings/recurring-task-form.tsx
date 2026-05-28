"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAllCategoryStyles } from "@/lib/categories";
import { defaultSemesterRange } from "@/lib/recurrence";
import { useRingo } from "@/hooks/use-ringo-store";
import type { TaskRecurrence } from "@/types/schedule";

const WEEKDAYS = [
  { code: "MO", label: "월" },
  { code: "TU", label: "화" },
  { code: "WE", label: "수" },
  { code: "TH", label: "목" },
  { code: "FR", label: "금" },
  { code: "SA", label: "토" },
  { code: "SU", label: "일" },
] as const;

export function RecurringTaskForm() {
  const { selectedDate, addRecurringTask } = useRingo();
  const range = defaultSemesterRange(selectedDate);

  const [summary, setSummary] = useState("");
  const [category, setCategory] = useState("class");
  const [byDay, setByDay] = useState<string[]>(["FR"]);
  const [startTime, setStartTime] = useState("14:00");
  const [endTime, setEndTime] = useState("15:00");
  const [semesterStart, setSemesterStart] = useState(range.semesterStart);
  const [semesterEnd, setSemesterEnd] = useState(range.semesterEnd);

  const toggleDay = (code: string) => {
    setByDay((prev) =>
      prev.includes(code) ? prev.filter((d) => d !== code) : [...prev, code],
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary.trim() || byDay.length === 0) return;

    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    const anchor = new Date(`${selectedDate}T12:00:00`);
    anchor.setHours(sh, sm || 0, 0, 0);
    const end = new Date(anchor);
    end.setHours(eh, em || 0, 0, 0);

    const recurrence: TaskRecurrence = {
      frequency: "WEEKLY",
      byDay,
      byHour: sh,
      byMinute: sm || 0,
      semesterStart,
      semesterEnd,
      cancelledDates: [],
    };

    addRecurringTask({
      summary: summary.trim(),
      category,
      recurrence,
      startIso: anchor.toISOString(),
      endIso: end.toISOString(),
    });
    setSummary("");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        매주 같은 요일·시간에 타임테이블에 표시됩니다. 개강~종강 기간만 반복해요.
      </p>

      <Input
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        placeholder="예: 소프트웨어공학 수업"
        className="rounded-xl"
        required
      />

      <div className="flex flex-wrap gap-1.5">
        {WEEKDAYS.map(({ code, label }) => (
          <button
            key={code}
            type="button"
            onClick={() => toggleDay(code)}
            className={`rounded-full px-3 py-1.5 text-sm ${
              byDay.includes(code)
                ? "bg-orange-500 text-white"
                : "bg-stone-100 text-stone-600"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <label className="flex flex-col gap-1 text-xs text-stone-500">
          시작
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="rounded-xl border px-2 py-1.5"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-stone-500">
          종료
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="rounded-xl border px-2 py-1.5"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-stone-500">
          카테고리
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-xl border px-2 py-1.5 text-sm"
          >
            {getAllCategoryStyles().map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <label className="flex flex-col gap-1 text-xs text-stone-500">
          개강
          <input
            type="date"
            value={semesterStart}
            onChange={(e) => setSemesterStart(e.target.value)}
            className="rounded-xl border px-2 py-1.5"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-stone-500">
          종강
          <input
            type="date"
            value={semesterEnd}
            onChange={(e) => setSemesterEnd(e.target.value)}
            className="rounded-xl border px-2 py-1.5"
          />
        </label>
      </div>

      <Button type="submit" className="w-full rounded-xl bg-orange-500">
        반복 일정 등록
      </Button>
    </form>
  );
}
