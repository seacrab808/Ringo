import type {
  NaturalLanguageParseResponse,
  ParsedScheduleEvent,
  PlannerTask,
} from "@/types/schedule";
import { getCategoryStyle } from "@/lib/categories";
import { newTaskId } from "@/lib/planner-api";
import {
  byDayFromKorean,
  defaultSemesterRange,
  mapRecurrenceFromApi,
} from "@/lib/recurrence";
import { assignAutoListOrder } from "@/lib/task-sort";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8000";

function getAuthHeaders(): HeadersInit {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("ringo_token");
    if (token) headers["X-Ringo-Token"] = token;
  }
  return headers;
}

const PARSE_TIMEOUT_MS = 90_000;

export async function parseSchedule(
  text: string,
  referenceDate?: string,
): Promise<NaturalLanguageParseResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PARSE_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}/api/v1/parse/schedule`, {
      method: "POST",
      headers: getAuthHeaders(),
      signal: controller.signal,
      body: JSON.stringify({
        text,
        reference_date: referenceDate,
        timezone: "Asia/Seoul",
      }),
    });
    if (!res.ok) {
      const detail = await res.text();
      throw new Error(detail || `Parse failed (${res.status})`);
    }
    return res.json();
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(
        "파싱이 90초 넘게 걸렸어. Ollama가 켜져 있는지, 백엔드(8001)가 응답하는지 확인해줘.",
      );
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function dtToIso(dt?: { date_time?: string | null; date?: string | null } | null): string | undefined {
  if (!dt) return undefined;
  if (dt.date_time) return dt.date_time;
  if (dt.date) return `${dt.date}T23:59:59+09:00`;
  return undefined;
}

function plannedDateFromEvent(
  ev: ParsedScheduleEvent,
  fallbackDate?: string,
): string | undefined {
  const start = dtToIso(ev.start ?? undefined);
  if (start) return start.slice(0, 10);
  const deadline = dtToIso(ev.deadline ?? undefined);
  if (deadline) return deadline.slice(0, 10);
  return fallbackDate;
}

export function eventsToTasks(
  events: ParsedScheduleEvent[],
  startOrder: number,
  fallbackDate?: string,
  userText?: string,
): PlannerTask[] {
  const tasks: PlannerTask[] = events.map((ev, i) => {
    const style = getCategoryStyle(ev.category);
    const startIso = dtToIso(ev.start ?? undefined);
    const plannedDate = plannedDateFromEvent(ev, fallbackDate);
    let recurrence =
      mapRecurrenceFromApi(ev.recurrence_rule) ??
      (byDayFromKorean(userText ?? ev.summary).length > 0
        ? (() => {
            const range = defaultSemesterRange(fallbackDate ?? new Date().toISOString().slice(0, 10));
            const h = startIso ? new Date(startIso).getHours() : 14;
            return {
              frequency: "WEEKLY" as const,
              byDay: byDayFromKorean(userText ?? ev.summary),
              byHour: h,
              semesterStart: range.semesterStart,
              semesterEnd: range.semesterEnd,
              cancelledDates: [] as string[],
            };
          })()
        : undefined);

    if (recurrence && startIso) {
      recurrence = { ...recurrence, byHour: new Date(startIso).getHours() };
    }

    return {
      id: newTaskId(),
      summary: ev.summary,
      timetableLabel: ev.timetable_label?.trim() || ev.summary,
      isTimeFixed: ev.is_time_fixed,
      plannedDate: recurrence ? undefined : plannedDate,
      startIso: recurrence ? startIso : startIso,
      endIso: dtToIso(ev.end ?? undefined),
      deadlineIso: dtToIso(ev.deadline ?? undefined),
      category: ev.category,
      categoryColor: ev.category_color ?? style.bg,
      createdOrder: startOrder + i,
      listOrder: startOrder + i,
      completed: false,
      recurrence,
    };
  });
  return tasks;
}

export function mergeTasks(
  existing: PlannerTask[],
  incoming: PlannerTask[],
): PlannerTask[] {
  const maxOrder = existing.reduce((m, t) => Math.max(m, t.createdOrder), -1);
  const adjusted = incoming.map((t, i) => ({
    ...t,
    createdOrder: maxOrder + 1 + i,
  }));
  return assignAutoListOrder([...existing, ...adjusted]);
}
