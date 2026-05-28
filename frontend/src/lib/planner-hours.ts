/** Motemote axis: 06:00 today → 05:00 next day. */
export const TIMETABLE_START_HOUR = 6;
export const SLOTS_PER_HOUR = 6;
export const MINUTES_PER_SLOT = 10;
export const TIMETABLE_HOUR_COUNT = 24;
export const TIMETABLE_SLOT_COUNT = TIMETABLE_HOUR_COUNT * SLOTS_PER_HOUR;

export interface TimetableHourRow {
  index: number;
  hour: number;
  isNextDay: boolean;
}

export interface TimetableBlockSegment {
  row: number;
  col: number;
  colSpan: number;
}

export function buildTimetableHours(): TimetableHourRow[] {
  const rows: TimetableHourRow[] = [];
  for (let i = 0; i < TIMETABLE_HOUR_COUNT; i++) {
    const totalMinutes = TIMETABLE_START_HOUR * 60 + i * 60;
    rows.push({
      index: i,
      hour: Math.floor(totalMinutes / 60) % 24,
      isNextDay: totalMinutes >= 24 * 60,
    });
  }
  return rows;
}

/** Split a 10-min block into per-hour row segments (6 columns per row). */
export function blockToRowSegments(
  startSlot: number,
  span: number,
): TimetableBlockSegment[] {
  const segments: TimetableBlockSegment[] = [];
  let slot = startSlot;
  let remaining = span;

  while (remaining > 0) {
    const row = Math.floor(slot / SLOTS_PER_HOUR);
    const col = slot % SLOTS_PER_HOUR;
    const take = Math.min(remaining, SLOTS_PER_HOUR - col);
    segments.push({ row, col, colSpan: take });
    slot += take;
    remaining -= take;
  }

  return segments;
}

export function getTaskBlockRange(
  startIso: string,
  endIso: string,
  dayStart: Date,
): { startSlot: number; span: number } | null {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const axisStart = new Date(dayStart);
  axisStart.setHours(TIMETABLE_START_HOUR, 0, 0, 0);

  const axisEnd = new Date(axisStart);
  axisEnd.setMinutes(axisEnd.getMinutes() + TIMETABLE_SLOT_COUNT * MINUTES_PER_SLOT);

  if (end <= axisStart || start >= axisEnd) return null;

  const clampedStart = start < axisStart ? axisStart : start;
  const clampedEnd = end > axisEnd ? axisEnd : end;

  const startMinutes =
    (clampedStart.getTime() - axisStart.getTime()) / (60 * 1000);
  const endMinutes = (clampedEnd.getTime() - axisStart.getTime()) / (60 * 1000);

  const startSlot = Math.floor(startMinutes / MINUTES_PER_SLOT);
  const endSlot = Math.ceil(endMinutes / MINUTES_PER_SLOT);
  const span = Math.max(1, endSlot - startSlot);

  return {
    startSlot: Math.max(0, Math.min(TIMETABLE_SLOT_COUNT - 1, startSlot)),
    span: Math.min(TIMETABLE_SLOT_COUNT - startSlot, span),
  };
}

export function formatTimeRange(startIso?: string, endIso?: string): string {
  if (!startIso) return "";
  const s = new Date(startIso);
  const e = endIso ? new Date(endIso) : null;
  const fmt = (d: Date) =>
    d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });
  return e ? `${fmt(s)} – ${fmt(e)}` : fmt(s);
}
