/** Motemote axis: 06:00 today → 05:00 next day (24 slots). */
export const TIMETABLE_START_HOUR = 6;
export const TIMETABLE_SLOT_COUNT = 24;

export interface TimetableSlot {
  hour: number;
  label: string;
  isNextDay: boolean;
}

export function buildTimetableSlots(): TimetableSlot[] {
  const slots: TimetableSlot[] = [];
  for (let i = 0; i < TIMETABLE_SLOT_COUNT; i++) {
    const hour = (TIMETABLE_START_HOUR + i) % 24;
    slots.push({
      hour,
      label: `${hour.toString().padStart(2, "0")}:00`,
      isNextDay: TIMETABLE_START_HOUR + i >= 24,
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
  axisEnd.setHours(axisEnd.getHours() + TIMETABLE_SLOT_COUNT);

  if (end <= axisStart || start >= axisEnd) return null;

  const clampedStart = start < axisStart ? axisStart : start;
  const clampedEnd = end > axisEnd ? axisEnd : end;

  const startMinutes =
    (clampedStart.getTime() - axisStart.getTime()) / (60 * 1000);
  const endMinutes = (clampedEnd.getTime() - axisStart.getTime()) / (60 * 1000);

  const startSlot = Math.floor(startMinutes / 60);
  const endSlot = Math.ceil(endMinutes / 60);
  const span = Math.max(1, endSlot - startSlot);

  return { startSlot: Math.max(0, Math.min(23, startSlot)), span };
}

export function formatTimeRange(startIso?: string, endIso?: string): string {
  if (!startIso) return "";
  const s = new Date(startIso);
  const e = endIso ? new Date(endIso) : null;
  const fmt = (d: Date) =>
    d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });
  return e ? `${fmt(s)} – ${fmt(e)}` : fmt(s);
}
