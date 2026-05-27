export type ScheduleKind = "timed" | "deadline" | "flexible";

export interface CalendarDateTime {
  date?: string | null;
  date_time?: string | null;
  time_zone?: string;
}

export interface ParsedScheduleEvent {
  summary: string;
  description?: string | null;
  is_time_fixed: boolean;
  schedule_kind?: ScheduleKind;
  start?: CalendarDateTime | null;
  end?: CalendarDateTime | null;
  deadline?: CalendarDateTime | null;
  timetable_label?: string | null;
  category: string;
  category_color?: string | null;
  parsing_notes?: string | null;
}

export interface NaturalLanguageParseResponse {
  events: ParsedScheduleEvent[];
  model: string;
  latency_ms: number;
  reference_date: string;
  timezone: string;
  unparsed_fragments: string[];
}

export interface PlannerTask {
  id: string;
  summary: string;
  timetableLabel: string;
  isTimeFixed: boolean;
  /** Calendar day this task appears on (YYYY-MM-DD). */
  plannedDate?: string;
  startIso?: string;
  endIso?: string;
  deadlineIso?: string;
  category: string;
  categoryColor: string;
  createdOrder: number;
  /** Display order (drag-and-drop); lower = higher in list. */
  listOrder: number;
  completed: boolean;
}

/** Editable preview before registering a parsed schedule. */
export interface PendingTaskDraft {
  draftId: string;
  summary: string;
  plannedDate: string;
  startTime: string;
  endTime: string;
  isTimeFixed: boolean;
  category: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "ringo" | "error" | "confirm";
  text: string;
  at: string;
  /** Shown when role === "confirm" — user edits then registers. */
  drafts?: PendingTaskDraft[];
  /** Original utterance for "다시 말하기". */
  sourceText?: string;
  confirmed?: boolean;
}
