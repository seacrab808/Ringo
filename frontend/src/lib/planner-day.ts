import type { ChatMessage } from "@/types/schedule";

export {
  getCalendarDayIso,
  getPlannerDayIso,
  RINGO_TIMEZONE,
} from "@/lib/ringo-timezone";

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
