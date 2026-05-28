import { apiFetch } from "@/lib/planner-api";
import type {
  GitHubSettings,
  Habit,
  HabitFrequency,
  HabitsBundle,
  HabitView,
} from "@/types/habits";

export async function fetchHabitsBundle(
  anchorDate: string,
  view: HabitView,
): Promise<HabitsBundle> {
  const q = new URLSearchParams({ anchor_date: anchorDate, view });
  return apiFetch<HabitsBundle>(`/api/v1/habits?${q}`);
}

export async function createHabit(body: {
  name: string;
  emoji?: string;
  frequency?: HabitFrequency;
  target_count?: number;
}): Promise<Habit> {
  return apiFetch<Habit>("/api/v1/habits", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateHabit(
  id: string,
  patch: Partial<{
    name: string;
    emoji: string;
    frequency: HabitFrequency;
    target_count: number;
    enabled: boolean;
  }>,
): Promise<Habit> {
  return apiFetch<Habit>(`/api/v1/habits/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function upsertHabitLog(
  habitId: string,
  body: { log_date: string; completed: boolean; note?: string },
) {
  return apiFetch(`/api/v1/habits/${habitId}/log`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function fetchGitHubSettings(): Promise<GitHubSettings> {
  return apiFetch<GitHubSettings>("/api/v1/habits/github/settings");
}

export async function updateGitHubUsername(username: string): Promise<GitHubSettings> {
  return apiFetch<GitHubSettings>("/api/v1/habits/github/settings", {
    method: "PUT",
    body: JSON.stringify({ username }),
  });
}

export async function syncGitHubCommits(body?: {
  date_from?: string;
  date_to?: string;
}) {
  return apiFetch<{
    username: string;
    days_checked: number;
    days_with_commits: string[];
    logs_updated: number;
    message: string;
  }>("/api/v1/habits/github/sync", {
    method: "POST",
    body: JSON.stringify(body ?? {}),
  });
}
