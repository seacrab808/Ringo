import { format } from "date-fns";
import { TIMETABLE_START_HOUR } from "@/lib/planner-hours";
import type { ChatMessage } from "@/types/schedule";

/** Motemote day: 06:00 today → 05:00 tomorrow. Before 06:00 counts as previous planner day. */
export function getPlannerDayIso(now = new Date()): string {
  const d = new Date(now);
  if (d.getHours() < TIMETABLE_START_HOUR) {
    d.setDate(d.getDate() - 1);
  }
  return format(d, "yyyy-MM-dd");
}

export function createWelcomeMessages(): ChatMessage[] {
  return [
    {
      id: "welcome",
      role: "ringo",
      text: "안녕! 나는 Ringo 🐿️ 일정을 편하게 말해 줘. 파싱한 뒤 확인하고 등록할 수 있어!",
      at: new Date().toISOString(),
    },
  ];
}
