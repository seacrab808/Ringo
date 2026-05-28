import type {
  PlannerTask,
  RecurrenceRulePayload,
  TaskRecurrence,
} from "@/types/schedule";
import { getTaskDateKey, taskMatchesDate } from "@/lib/task-date";
import {
  addDaysToIso,
  getCalendarDayIso,
  getWeekdayInKst,
  parseIsoDateAtNoonKst,
} from "@/lib/ringo-timezone";

const BYDAY_IDX: Record<string, number> = {
  MO: 0,
  TU: 1,
  WE: 2,
  TH: 3,
  FR: 4,
  SA: 5,
  SU: 6,
};

const KO_TO_BYDAY: Record<string, string> = {
  월: "MO",
  화: "TU",
  수: "WE",
  목: "TH",
  금: "FR",
  토: "SA",
  일: "SU",
};

export function defaultSemesterRange(referenceIso: string): {
  semesterStart: string;
  semesterEnd: string;
} {
  const d = new Date(referenceIso + "T12:00:00");
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  if (m >= 9) {
    return { semesterStart: `${y}-09-01`, semesterEnd: `${y}-12-20` };
  }
  if (m >= 3) {
    return { semesterStart: `${y}-03-01`, semesterEnd: `${y}-06-30` };
  }
  return { semesterStart: `${y}-03-01`, semesterEnd: `${y}-06-30` };
}

export function byDayFromKorean(text: string): string[] {
  const found: string[] = [];
  for (const [ko, code] of Object.entries(KO_TO_BYDAY)) {
    if (text.includes(`${ko}요일`)) found.push(code);
  }
  return found;
}

export function mapRecurrenceFromApi(raw?: RecurrenceRulePayload | null): TaskRecurrence | undefined {
  if (!raw || !raw.by_day?.length) return undefined;
  const { semesterStart, semesterEnd } = defaultSemesterRange(
    raw.semester_start ?? getCalendarDayIso(),
  );
  return {
    frequency: "WEEKLY",
    byDay: raw.by_day.map((d) => d.toUpperCase()),
    byHour: raw.by_hour ?? undefined,
    byMinute: raw.by_minute ?? undefined,
    semesterStart: raw.semester_start ?? semesterStart,
    semesterEnd: raw.semester_end ?? raw.until ?? semesterEnd,
    cancelledDates: [],
  };
}

export function occursOnDate(rule: TaskRecurrence, dateIso: string): boolean {
  if (rule.cancelledDates?.includes(dateIso)) return false;
  if (rule.semesterStart && dateIso < rule.semesterStart) return false;
  if (rule.semesterEnd && dateIso > rule.semesterEnd) return false;
  const wd = getWeekdayInKst(dateIso);
  const mondayBased = wd === 0 ? 6 : wd - 1;
  return rule.byDay.some((d) => BYDAY_IDX[d] === mondayBased);
}

export function instanceId(templateId: string, dateIso: string): string {
  return `${templateId}@${dateIso}`;
}

export function parseInstanceId(id: string): { templateId: string; dateIso: string } | null {
  const i = id.indexOf("@");
  if (i < 0) return null;
  return { templateId: id.slice(0, i), dateIso: id.slice(i + 1) };
}

export function expandTaskForDate(template: PlannerTask, dateIso: string): PlannerTask | null {
  const rule = template.recurrence;
  if (!rule || !occursOnDate(rule, dateIso)) return null;

  const sh = rule.byHour ?? (template.startIso ? new Date(template.startIso).getHours() : 9);
  const sm = rule.byMinute ?? 0;
  const start = parseIsoDateAtNoonKst(dateIso);
  start.setHours(sh, sm, 0, 0);

  let end: Date;
  if (template.endIso && template.startIso) {
    const dur =
      new Date(template.endIso).getTime() - new Date(template.startIso).getTime();
    end = new Date(start.getTime() + dur);
  } else {
    end = new Date(start);
    end.setHours(end.getHours() + 1);
  }

  return {
    ...template,
    id: instanceId(template.id, dateIso),
    plannedDate: dateIso,
    startIso: start.toISOString(),
    endIso: end.toISOString(),
    isTimeFixed: true,
    recurrenceInstance: true,
    templateId: template.id,
    completed: false,
  };
}

export function expandTasksForDate(tasks: PlannerTask[], dateIso: string): PlannerTask[] {
  const oneOff = tasks.filter((t) => !t.recurrence && taskMatchesDate(t, dateIso));
  const templates = tasks.filter((t) => t.recurrence);
  const expanded = templates
    .map((t) => expandTaskForDate(t, dateIso))
    .filter((t): t is PlannerTask => t !== null);
  return [...expanded, ...oneOff];
}

export function iterOccurrenceDates(
  rule: TaskRecurrence,
  fromIso: string,
  toIso: string,
): string[] {
  const out: string[] = [];
  let cur = fromIso;
  while (cur <= toIso) {
    if (occursOnDate(rule, cur)) out.push(cur);
    cur = addDaysToIso(cur, 1);
  }
  return out;
}

export function countTasksByDateWithRecurrence(tasks: PlannerTask[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const t of tasks) {
    if (!t.recurrence) {
      const key = getTaskDateKey(t);
      if (key) counts[key] = (counts[key] ?? 0) + 1;
      continue;
    }
    const rule = t.recurrence;
    const from = rule.semesterStart ?? "2020-01-01";
    const to = rule.semesterEnd ?? "2030-12-31";
    for (const d of iterOccurrenceDates(rule, from, to)) {
      counts[d] = (counts[d] ?? 0) + 1;
    }
  }
  return counts;
}
