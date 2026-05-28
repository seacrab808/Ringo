import { TIMETABLE_START_HOUR } from "@/lib/planner-hours";

export const RINGO_TIMEZONE = "Asia/Seoul";

export interface ZonedDateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

export function getZonedParts(
  date: Date = new Date(),
  timeZone: string = RINGO_TIMEZONE,
): ZonedDateParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    hourCycle: "h23",
  }).formatToParts(date);

  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");

  return {
    year: pick("year"),
    month: pick("month"),
    day: pick("day"),
    hour: pick("hour"),
    minute: pick("minute"),
  };
}

export function formatIsoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Calendar date in Korea (YYYY-MM-DD). */
export function getCalendarDayIso(
  now: Date = new Date(),
  timeZone: string = RINGO_TIMEZONE,
): string {
  const { year, month, day } = getZonedParts(now, timeZone);
  return formatIsoDate(year, month, day);
}

/**
 * Motemote planner day in Korea: 06:00–next 05:59 counts as that calendar date.
 * Before 06:00 KST belongs to the previous planner day.
 */
export function getPlannerDayIso(
  now: Date = new Date(),
  timeZone: string = RINGO_TIMEZONE,
): string {
  const { year, month, day, hour } = getZonedParts(now, timeZone);
  const today = formatIsoDate(year, month, day);
  if (hour < TIMETABLE_START_HOUR) {
    return addDaysToIso(today, -1, timeZone);
  }
  return today;
}

export function addDaysToIso(
  iso: string,
  delta: number,
  timeZone: string = RINGO_TIMEZONE,
): string {
  const [y, m, d] = iso.split("-").map(Number);
  const anchor = new Date(Date.UTC(y, m - 1, d, 3, 0, 0));
  anchor.setUTCDate(anchor.getUTCDate() + delta);
  const parts = getZonedParts(anchor, timeZone);
  return formatIsoDate(parts.year, parts.month, parts.day);
}

/** Noon KST on a calendar date — safe anchor for weekday / month math. */
export function parseIsoDateAtNoonKst(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 3, 0, 0));
}

export function getWeekdayInKst(iso: string): number {
  return parseIsoDateAtNoonKst(iso).getUTCDay();
}

/** 06:00 KST on planner day `dateIso`. */
export function plannerDayAxisStart(dateIso: string): Date {
  const [y, m, d] = dateIso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, TIMETABLE_START_HOUR - 9, 0, 0));
}

export function isoDateToCompact(iso: string): string {
  return iso.replace(/-/g, "");
}

export function isoToMonthKey(iso: string): string {
  return iso.slice(0, 7);
}
