"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  addWeeks,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from "date-fns";
import { ko } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  GitBranch,
  Loader2,
  Plus,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  createHabit,
  fetchGitHubSettings,
  fetchHabitsBundle,
  syncGitHubCommits,
  updateGitHubUsername,
  upsertHabitLog,
} from "@/lib/habits-api";
import { getCalendarDayIso } from "@/lib/ringo-timezone";
import type { Habit, HabitView, HabitsBundle } from "@/types/habits";

const VIEWS: { id: HabitView; label: string }[] = [
  { id: "day", label: "일" },
  { id: "week", label: "주" },
  { id: "month", label: "월" },
];

function weekDays(anchor: string): string[] {
  const start = startOfWeek(parseISO(`${anchor}T12:00:00`), { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) =>
    format(addDays(start, i), "yyyy-MM-dd"),
  );
}

function monthDays(anchor: string): string[] {
  const start = startOfMonth(parseISO(`${anchor}T12:00:00`));
  const end = addMonths(start, 1);
  const days: string[] = [];
  let d = start;
  while (d < end) {
    days.push(format(d, "yyyy-MM-dd"));
    d = addDays(d, 1);
  }
  return days;
}

export function HabitTrackerView() {
  const [view, setView] = useState<HabitView>("week");
  const [anchor, setAnchor] = useState(() => getCalendarDayIso());
  const [bundle, setBundle] = useState<HabitsBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ghUser, setGhUser] = useState("");
  const [ghStatus, setGhStatus] = useState<Awaited<ReturnType<typeof fetchGitHubSettings>> | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, gh] = await Promise.all([
        fetchHabitsBundle(anchor, view),
        fetchGitHubSettings(),
      ]);
      setBundle(data);
      setGhStatus(gh);
      setGhUser(gh.username);
    } catch (e) {
      setError(e instanceof Error ? e.message : "불러오기 실패");
    } finally {
      setLoading(false);
    }
  }, [anchor, view]);

  useEffect(() => {
    load();
  }, [load]);

  const enabledHabits = useMemo(
    () => (bundle?.habits ?? []).filter((h) => h.enabled),
    [bundle],
  );

  const logMap = useMemo(() => {
    const m = new Map<string, boolean>();
    for (const lg of bundle?.logs ?? []) {
      if (lg.completed) m.set(`${lg.habit_id}:${lg.log_date}`, true);
    }
    return m;
  }, [bundle]);

  const statMap = useMemo(() => {
    const m = new Map<string, { done: number; target: number; met: boolean }>();
    for (const s of bundle?.stats ?? []) {
      m.set(s.habit_id, {
        done: s.completed_count,
        target: s.target_count,
        met: s.met,
      });
    }
    return m;
  }, [bundle]);

  const toggle = async (habitId: string, day: string, current: boolean) => {
    await upsertHabitLog(habitId, {
      log_date: day,
      completed: !current,
    });
    await load();
  };

  const shiftAnchor = (dir: -1 | 1) => {
    const d = parseISO(`${anchor}T12:00:00`);
    if (view === "day") {
      setAnchor(format(dir < 0 ? subDays(d, 1) : addDays(d, 1), "yyyy-MM-dd"));
    } else if (view === "week") {
      setAnchor(format(dir < 0 ? subWeeks(d, 1) : addWeeks(d, 1), "yyyy-MM-dd"));
    } else {
      setAnchor(format(dir < 0 ? subMonths(d, 1) : addMonths(d, 1), "yyyy-MM-dd"));
    }
  };

  const periodLabel = useMemo(() => {
    const d = parseISO(`${anchor}T12:00:00`);
    if (view === "day") return format(d, "yyyy.MM.dd (EEE)", { locale: ko });
    if (view === "week") {
      const days = weekDays(anchor);
      const a = parseISO(`${days[0]}T12:00:00`);
      const b = parseISO(`${days[6]}T12:00:00`);
      return `${format(a, "M/d")} – ${format(b, "M/d")}`;
    }
    return format(d, "yyyy년 M월", { locale: ko });
  }, [anchor, view]);

  const onSyncGithub = async () => {
    setSyncing(true);
    setError(null);
    try {
      if (ghUser.trim()) await updateGitHubUsername(ghUser.trim());
      const days = view === "month" ? monthDays(anchor) : weekDays(anchor);
      await syncGitHubCommits({
        date_from: days[0],
        date_to: days[days.length - 1],
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "GitHub 동기화 실패");
    } finally {
      setSyncing(false);
    }
  };

  const onAddHabit = async () => {
    const name = newName.trim();
    if (!name) return;
    setAdding(true);
    try {
      await createHabit({ name, emoji: "✅" });
      setNewName("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "추가 실패");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-[#faf8f5] px-4 py-6 md:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-orange-950">습관 트래커</h1>
          <p className="text-sm text-stone-500">
            일·주·월 단위로 습관을 추적하고, GitHub 커밋은 자동 연동할 수 있어요.
          </p>
        </header>

        <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-orange-100">
          <div className="flex flex-wrap items-center gap-2">
            <GitBranch className="h-5 w-5 text-stone-600" />
            <span className="text-sm font-medium text-stone-800">GitHub 커밋</span>
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Input
              value={ghUser}
              onChange={(e) => setGhUser(e.target.value)}
              placeholder="GitHub 사용자명"
              className="rounded-xl"
            />
            <Button
              type="button"
              variant="outline"
              className="rounded-xl shrink-0"
              disabled={syncing}
              onClick={onSyncGithub}
            >
              {syncing ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-1 h-4 w-4" />
              )}
              동기화
            </Button>
          </div>
          <p className="mt-2 text-xs text-stone-500">
            {ghStatus?.configured
              ? `연동 준비됨 · ${ghStatus.last_sync_message ?? "아직 동기화 안 함"}`
              : "서버 .env에 GITHUB_TOKEN + 사용자명이 필요해요 (PAT, repo 읽기 권한)."}
          </p>
        </section>

        <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-orange-100">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-1 rounded-xl bg-orange-50 p-1">
              {VIEWS.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setView(v.id)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-sm font-medium",
                    view === v.id
                      ? "bg-orange-500 text-white"
                      : "text-stone-600 hover:bg-orange-100",
                  )}
                >
                  {v.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="rounded-xl"
                onClick={() => shiftAnchor(-1)}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <span className="min-w-[140px] text-center text-sm font-semibold text-stone-800">
                {periodLabel}
              </span>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="rounded-xl"
                onClick={() => shiftAnchor(1)}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="ml-2 rounded-xl text-xs"
                onClick={() => setAnchor(getCalendarDayIso())}
              >
                오늘
              </Button>
            </div>
          </div>

          {error && (
            <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
          )}
          {loading && (
            <p className="mt-6 flex items-center justify-center gap-2 text-sm text-stone-500">
              <Loader2 className="h-4 w-4 animate-spin" /> 불러오는 중…
            </p>
          )}

          {!loading && view === "day" && (
            <ul className="mt-4 space-y-2">
              {enabledHabits.map((h) => {
                const done = logMap.get(`${h.id}:${anchor}`) ?? false;
                const st = statMap.get(h.id);
                return (
                  <HabitDayRow
                    key={h.id}
                    habit={h}
                    done={done}
                    stat={st}
                    onToggle={() => toggle(h.id, anchor, done)}
                  />
                );
              })}
            </ul>
          )}

          {!loading && view === "week" && (
            <WeekGrid
              habits={enabledHabits}
              days={weekDays(anchor)}
              logMap={logMap}
              statMap={statMap}
              onToggle={toggle}
            />
          )}

          {!loading && view === "month" && (
            <MonthSummary
              habits={enabledHabits}
              days={monthDays(anchor)}
              logMap={logMap}
              statMap={statMap}
              onToggle={toggle}
            />
          )}
        </section>

        <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-orange-100">
          <h2 className="mb-3 text-sm font-semibold text-stone-800">습관 추가</h2>
          <div className="flex gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="새 습관 이름"
              className="rounded-xl"
              onKeyDown={(e) => e.key === "Enter" && onAddHabit()}
            />
            <Button
              type="button"
              className="rounded-xl shrink-0"
              disabled={adding || !newName.trim()}
              onClick={onAddHabit}
            >
              {adding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}

function HabitDayRow({
  habit,
  done,
  stat,
  onToggle,
}: {
  habit: Habit;
  done: boolean;
  stat?: { done: number; target: number; met: boolean };
  onToggle: () => void;
}) {
  const freqLabel =
    habit.frequency === "daily"
      ? "매일"
      : habit.frequency === "weekly"
        ? `주 ${habit.target_count}회`
        : `월 ${habit.target_count}회`;

  return (
    <li className="flex items-center gap-3 rounded-2xl bg-stone-50 px-3 py-3">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg transition-colors",
          done ? "bg-emerald-500 text-white" : "bg-white ring-1 ring-stone-200",
        )}
        aria-label={done ? "완료 취소" : "완료"}
      >
        {habit.emoji}
      </button>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-stone-900">{habit.name}</p>
        <p className="text-xs text-stone-500">
          {freqLabel}
          {habit.auto_github && " · GitHub 자동"}
          {stat && habit.frequency !== "daily" && (
            <span className={stat.met ? " text-emerald-600" : ""}>
              {" "}
              · {stat.done}/{stat.target}
            </span>
          )}
        </p>
      </div>
    </li>
  );
}

function WeekGrid({
  habits,
  days,
  logMap,
  statMap,
  onToggle,
}: {
  habits: Habit[];
  days: string[];
  logMap: Map<string, boolean>;
  statMap: Map<string, { done: number; target: number; met: boolean }>;
  onToggle: (habitId: string, day: string, current: boolean) => void;
}) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[520px] border-collapse text-sm">
        <thead>
          <tr>
            <th className="p-2 text-left font-medium text-stone-600">습관</th>
            {days.map((d) => (
              <th key={d} className="p-1 text-center text-xs font-medium text-stone-500">
                {format(parseISO(`${d}T12:00:00`), "EEE", { locale: ko })}
                <br />
                {format(parseISO(`${d}T12:00:00`), "M/d")}
              </th>
            ))}
            <th className="p-2 text-center text-xs text-stone-500">목표</th>
          </tr>
        </thead>
        <tbody>
          {habits.map((h) => {
            const st = statMap.get(h.id);
            return (
              <tr key={h.id} className="border-t border-stone-100">
                <td className="p-2 font-medium text-stone-800">
                  <span className="mr-1">{h.emoji}</span>
                  {h.name}
                </td>
                {days.map((d) => {
                  const done = logMap.get(`${h.id}:${d}`) ?? false;
                  return (
                    <td key={d} className="p-1 text-center">
                      <button
                        type="button"
                        onClick={() => onToggle(h.id, d, done)}
                        className={cn(
                          "mx-auto flex h-8 w-8 items-center justify-center rounded-lg text-sm",
                          done
                            ? "bg-emerald-500 text-white"
                            : "bg-stone-100 text-stone-400 hover:bg-orange-50",
                        )}
                      >
                        {done ? "✓" : ""}
                      </button>
                    </td>
                  );
                })}
                <td className="p-2 text-center text-xs">
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2 py-0.5",
                      st?.met ? "bg-emerald-100 text-emerald-800" : "bg-stone-100 text-stone-600",
                    )}
                  >
                    {st ? `${st.done}/${st.target}` : `0/${h.target_count}`}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MonthSummary({
  habits,
  days,
  logMap,
  statMap,
  onToggle,
}: {
  habits: Habit[];
  days: string[];
  logMap: Map<string, boolean>;
  statMap: Map<string, { done: number; target: number; met: boolean }>;
  onToggle: (habitId: string, day: string, current: boolean) => void;
}) {
  return (
    <div className="mt-4 space-y-4">
      {habits.map((h) => {
        const st = statMap.get(h.id);
        const isDaily = h.frequency === "daily";
        return (
          <div key={h.id} className="rounded-2xl bg-stone-50 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-medium text-stone-900">
                {h.emoji} {h.name}
              </span>
              <span
                className={cn(
                  "text-xs font-medium",
                  st?.met ? "text-emerald-600" : "text-stone-500",
                )}
              >
                {st ? `${st.done}/${st.target} (${st.met ? "달성" : "진행 중"})` : ""}
              </span>
            </div>
            {isDaily ? (
              <div className="flex flex-wrap gap-1">
                {days.map((d) => {
                  const done = logMap.get(`${h.id}:${d}`) ?? false;
                  return (
                    <button
                      key={d}
                      type="button"
                      title={d}
                      onClick={() => onToggle(h.id, d, done)}
                      className={cn(
                        "h-6 w-6 rounded text-[10px]",
                        done
                          ? "bg-emerald-500 text-white"
                          : "bg-white ring-1 ring-stone-200 text-stone-400",
                      )}
                    >
                      {format(parseISO(`${d}T12:00:00`), "d")}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-stone-500">
                주·월 습관은 주간/일간 뷰에서 날짜별 체크하세요.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
