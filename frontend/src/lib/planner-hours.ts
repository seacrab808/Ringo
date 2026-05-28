/** Motemote axis: 06:00 today → 05:00 next day. */
export const TIMETABLE_START_HOUR = 6;
export const SLOTS_PER_HOUR = 6;
export const MINUTES_PER_SLOT = 10;
export const TIMETABLE_HOUR_COUNT = 24;
export const TIMETABLE_SLOT_COUNT = TIMETABLE_HOUR_COUNT * SLOTS_PER_HOUR;

export interface TimetableSlot {
  index: number;
  hour: number;
  minute: number;
  /** Show hour:00 label in the left gutter */
  showHourLabel: boolean;
  isNextDay: boolean;
}

export function buildTimetableSlots(): TimetableSlot[] {
  const slots: TimetableSlot[] = [];
  for (let i = 0; i < TIMETABLE_SLOT_COUNT; i++) {
    const totalMinutes = TIMETABLE_START_HOUR * 60 + i * MINUTES_PER_SLOT;
    const hour = Math.floor(totalMinutes / 60) % 24;
    const minute = totalMinutes % 60;
    slots.push({
      index: i,
      hour,
      minute,
      showHourLabel: minute === 0,
      isNextDay: totalMinutes >= 24 * 60,
    });
  }
  return slots;
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
