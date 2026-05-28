export type HabitFrequency = "daily" | "weekly" | "monthly";
export type HabitView = "day" | "week" | "month";

export interface Habit {
  id: string;
  slug: string;
  name: string;
  emoji: string;
  frequency: HabitFrequency;
  target_count: number;
  enabled: boolean;
  auto_github: boolean;
  sort_order: number;
}

export interface HabitLog {
  id: string;
  habit_id: string;
  log_date: string;
  completed: boolean;
  source: string;
  note: string;
}

export interface HabitPeriodStat {
  habit_id: string;
  period_key: string;
  completed_count: number;
  target_count: number;
  met: boolean;
}

export interface HabitsBundle {
  habits: Habit[];
  logs: HabitLog[];
  stats: HabitPeriodStat[];
}

export interface GitHubSettings {
  username: string;
  configured: boolean;
  last_sync_at: string | null;
  last_sync_message: string | null;
}
