export type ScheduleKind = "timed" | "deadline" | "flexible";

export interface CalendarDateTime {
  date?: string | null;
  date_time?: string | null;
  time_zone?: string;
}

export interface RecurrenceRulePayload {
  frequency?: string;
  by_day?: string[];
  by_hour?: number | null;
  by_minute?: number | null;
  semester_start?: string | null;
  semester_end?: string | null;
  until?: string | null;
}

export interface TaskRecurrence {
  frequency: "WEEKLY";
  byDay: string[];
  byHour?: number;
  byMinute?: number;
  semesterStart?: string;
  semesterEnd?: string;
  cancelledDates?: string[];
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
  recurrence_rule?: RecurrenceRulePayload | null;
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
  plannedDate?: string;
  startIso?: string;
  endIso?: string;
  deadlineIso?: string;
  category: string;
  categoryColor: string;
  createdOrder: number;
  listOrder: number;
  completed: boolean;
  /** Weekly semester template (stored once, expanded per day in UI). */
  recurrence?: TaskRecurrence;
  /** Expanded instance of a recurring template. */
  recurrenceInstance?: boolean;
  templateId?: string;
}

export interface CategoryItem {
  slug: string;
  label: string;
  colorHex: string;
  sortOrder: number;
  isBuiltin?: boolean;
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
  isRecurring?: boolean;
  recurrence?: TaskRecurrence;
}

export interface ChatMessage {
  id: string;
  role: "user" | "ringo" | "error" | "confirm";
  text: string;
  at: string;
  drafts?: PendingTaskDraft[];
  sourceText?: string;
  confirmed?: boolean;
}
