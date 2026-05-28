import type { PlannerTask } from "@/types/schedule";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8000";

export const USE_RINGO_DB =
  process.env.NEXT_PUBLIC_USE_RINGO_DB === "true";

export interface ApiTask {
  id: string;
  summary: string;
  timetable_label: string;
  is_time_fixed: boolean;
  planned_date: string | null;
  start_at: string | null;
  end_at: string | null;
  deadline_at: string | null;
  category: string;
  category_color: string;
  created_order: number;
  list_order: number;
  completed: boolean;
}

export interface ApiDiary {
  id: string;
  diary_date: string;
  body: string;
}

export interface ApiTimetableBlock {
  task_id: string;
  summary: string;
  timetable_label: string;
  category: string;
  category_color: string;
  start_slot: number;
  span: number;
  start_at: string;
  end_at: string;
}

export interface ApiHealth {
  database?: "connected" | "disabled" | "unreachable";
}

function getAuthHeaders(): HeadersInit {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("ringo_token");
    if (token) headers["X-Ringo-Token"] = token;
  }
  return headers;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...getAuthHeaders(), ...init?.headers },
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(detail || `API ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function fetchHealth(): Promise<ApiHealth> {
  return apiFetch<ApiHealth>("/health");
}

export function isDatabaseConnected(health: ApiHealth): boolean {
  return health.database === "connected";
}

export function apiTaskToPlanner(t: ApiTask): PlannerTask {
  return {
    id: t.id,
    summary: t.summary,
    timetableLabel: t.timetable_label,
    isTimeFixed: t.is_time_fixed,
    plannedDate: t.planned_date ?? undefined,
    startIso: t.start_at ?? undefined,
    endIso: t.end_at ?? undefined,
    deadlineIso: t.deadline_at ?? undefined,
    category: t.category,
    categoryColor: t.category_color,
    createdOrder: t.created_order,
    listOrder: t.list_order,
    completed: t.completed,
  };
}

export function plannerTaskToApiCreate(t: PlannerTask): Record<string, unknown> {
  return {
    id: isUuid(t.id) ? t.id : undefined,
    summary: t.summary,
    timetable_label: t.timetableLabel,
    is_time_fixed: t.isTimeFixed,
    planned_date: t.plannedDate ?? null,
    start_at: t.startIso ?? null,
    end_at: t.endIso ?? null,
    deadline_at: t.deadlineIso ?? null,
    category: t.category,
    category_color: t.categoryColor,
    created_order: t.createdOrder,
    list_order: t.listOrder,
    completed: t.completed,
  };
}

export function plannerTaskToApiPatch(
  t: Partial<PlannerTask>,
): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (t.summary !== undefined) body.summary = t.summary;
  if (t.timetableLabel !== undefined) body.timetable_label = t.timetableLabel;
  if (t.isTimeFixed !== undefined) body.is_time_fixed = t.isTimeFixed;
  if (t.plannedDate !== undefined) body.planned_date = t.plannedDate;
  if (t.startIso !== undefined) body.start_at = t.startIso;
  if (t.endIso !== undefined) body.end_at = t.endIso;
  if (t.deadlineIso !== undefined) body.deadline_at = t.deadlineIso;
  if (t.category !== undefined) body.category = t.category;
  if (t.categoryColor !== undefined) body.category_color = t.categoryColor;
  if (t.createdOrder !== undefined) body.created_order = t.createdOrder;
  if (t.listOrder !== undefined) body.list_order = t.listOrder;
  if (t.completed !== undefined) body.completed = t.completed;
  return body;
}

function isUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id,
  );
}

export function newTaskId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function fetchTasks(from: string, to: string): Promise<PlannerTask[]> {
  const rows = await apiFetch<ApiTask[]>(
    `/api/v1/tasks?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
  );
  return rows.map(apiTaskToPlanner);
}

export async function createTask(task: PlannerTask): Promise<PlannerTask> {
  const row = await apiFetch<ApiTask>("/api/v1/tasks", {
    method: "POST",
    body: JSON.stringify(plannerTaskToApiCreate(task)),
  });
  return apiTaskToPlanner(row);
}

export async function deleteTask(id: string): Promise<void> {
  await apiFetch<void>(`/api/v1/tasks/${id}`, { method: "DELETE" });
}

export async function patchTask(
  id: string,
  patch: Partial<PlannerTask>,
): Promise<PlannerTask> {
  const row = await apiFetch<ApiTask>(`/api/v1/tasks/${id}`, {
    method: "PATCH",
    body: JSON.stringify(plannerTaskToApiPatch(patch)),
  });
  return apiTaskToPlanner(row);
}

export async function reorderTasksApi(
  plannedDate: string,
  taskIds: string[],
): Promise<void> {
  await apiFetch<ApiTask[]>("/api/v1/tasks/reorder", {
    method: "PUT",
    body: JSON.stringify({
      planned_date: plannedDate,
      task_ids: taskIds,
    }),
  });
}

export async function fetchDiaries(
  from: string,
  to: string,
): Promise<Record<string, string>> {
  const rows = await apiFetch<ApiDiary[]>(
    `/api/v1/diaries?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
  );
  const map: Record<string, string> = {};
  for (const d of rows) map[d.diary_date] = d.body;
  return map;
}

export async function upsertDiary(date: string, body: string): Promise<void> {
  await apiFetch<ApiDiary>(`/api/v1/diaries/${date}`, {
    method: "PUT",
    body: JSON.stringify({ body }),
  });
}

export async function fetchTimetableBlocks(
  day: string,
): Promise<ApiTimetableBlock[]> {
  const data = await apiFetch<{ blocks: ApiTimetableBlock[] }>(
    `/api/v1/timetable/${day}`,
  );
  return data.blocks;
}
