import type { CategoryItem, PlannerTask, TaskRecurrence } from "@/types/schedule";

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
  recurrence?: ApiRecurrence | null;
}

interface ApiRecurrence {
  frequency?: string;
  by_day?: string[];
  by_hour?: number | null;
  by_minute?: number | null;
  semester_start?: string | null;
  semester_end?: string | null;
  cancelled_dates?: string[];
}

export interface ApiCategory {
  id: string;
  slug: string;
  label: string;
  color_hex: string;
  sort_order: number;
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

function apiRecurrenceToPlanner(raw?: ApiRecurrence | null): TaskRecurrence | undefined {
  if (!raw?.by_day?.length) return undefined;
  return {
    frequency: "WEEKLY",
    byDay: raw.by_day.map((d) => d.toUpperCase()),
    byHour: raw.by_hour ?? undefined,
    byMinute: raw.by_minute ?? undefined,
    semesterStart: raw.semester_start ?? undefined,
    semesterEnd: raw.semester_end ?? undefined,
    cancelledDates: raw.cancelled_dates ?? [],
  };
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
    recurrence: apiRecurrenceToPlanner(t.recurrence),
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
    recurrence: t.recurrence
      ? {
          frequency: t.recurrence.frequency,
          by_day: t.recurrence.byDay,
          by_hour: t.recurrence.byHour ?? null,
          by_minute: t.recurrence.byMinute ?? null,
          semester_start: t.recurrence.semesterStart ?? null,
          semester_end: t.recurrence.semesterEnd ?? null,
          cancelled_dates: t.recurrence.cancelledDates ?? [],
        }
      : null,
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
  if (t.recurrence !== undefined) {
    body.recurrence = t.recurrence
      ? {
          frequency: t.recurrence.frequency,
          by_day: t.recurrence.byDay,
          by_hour: t.recurrence.byHour ?? null,
          by_minute: t.recurrence.byMinute ?? null,
          semester_start: t.recurrence.semesterStart ?? null,
          semester_end: t.recurrence.semesterEnd ?? null,
          cancelled_dates: t.recurrence.cancelledDates ?? [],
        }
      : null;
  }
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
  const baseId = id.split("@")[0];
  await apiFetch<void>(`/api/v1/tasks/${baseId}`, { method: "DELETE" });
}

export async function cancelRecurrenceDate(
  templateId: string,
  dateIso: string,
): Promise<PlannerTask> {
  const row = await apiFetch<ApiTask>(
    `/api/v1/tasks/${templateId}/cancel-recurrence`,
    {
      method: "POST",
      body: JSON.stringify({ date: dateIso }),
    },
  );
  return apiTaskToPlanner(row);
}

export async function fetchCategories(): Promise<CategoryItem[]> {
  const rows = await apiFetch<ApiCategory[]>("/api/v1/categories");
  return rows.map((c) => ({
    slug: c.slug,
    label: c.label,
    colorHex: c.color_hex,
    sortOrder: c.sort_order,
    isBuiltin: false,
  }));
}

export async function createCategoryApi(item: CategoryItem): Promise<CategoryItem> {
  const row = await apiFetch<ApiCategory>("/api/v1/categories", {
    method: "POST",
    body: JSON.stringify({
      slug: item.slug,
      label: item.label,
      color_hex: item.colorHex,
      sort_order: item.sortOrder,
    }),
  });
  return {
    slug: row.slug,
    label: row.label,
    colorHex: row.color_hex,
    sortOrder: row.sort_order,
  };
}

export async function updateCategoryApi(
  slug: string,
  patch: Partial<CategoryItem>,
): Promise<CategoryItem> {
  const row = await apiFetch<ApiCategory>(`/api/v1/categories/${slug}`, {
    method: "PATCH",
    body: JSON.stringify({
      label: patch.label,
      color_hex: patch.colorHex,
      sort_order: patch.sortOrder,
    }),
  });
  return {
    slug: row.slug,
    label: row.label,
    colorHex: row.color_hex,
    sortOrder: row.sort_order,
  };
}

export async function deleteCategoryApi(slug: string): Promise<void> {
  await apiFetch<void>(`/api/v1/categories/${slug}`, { method: "DELETE" });
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
