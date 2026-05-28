import { apiFetch } from "@/lib/planner-api";

export type ReportPeriod = "week" | "month";

export interface ReportClientTaskSnapshot {
  summary: string;
  planned_date: string | null;
  completed: boolean;
  category: string;
  is_recurring?: boolean;
}

export interface ReportClientContext {
  tasks: ReportClientTaskSnapshot[];
  diaries: Record<string, string>;
}

export interface ReportSummaryStats {
  total_tasks: number;
  completed_tasks: number;
  diary_days: number;
  habits_met: number;
  habits_total: number;
  github_commit_days: number | null;
}

export interface AiReport {
  period: ReportPeriod;
  anchor_date: string;
  start_date: string;
  end_date: string;
  title: string;
  markdown: string;
  summary_stats: ReportSummaryStats;
  model: string;
  generated_at: string;
  cached: boolean;
  error: string | null;
}

export async function fetchCachedReport(
  period: ReportPeriod,
  anchorDate?: string,
): Promise<AiReport | null> {
  const params = new URLSearchParams({ period });
  if (anchorDate) params.set("anchor_date", anchorDate);
  try {
    return await apiFetch<AiReport>(`/api/v1/reports?${params}`);
  } catch {
    return null;
  }
}

export async function generateReport(
  period: ReportPeriod,
  options?: {
    anchorDate?: string;
    refresh?: boolean;
    clientContext?: ReportClientContext;
  },
): Promise<AiReport> {
  const body: Record<string, unknown> = {
    period,
    refresh: options?.refresh ?? false,
  };
  if (options?.anchorDate) body.anchor_date = options.anchorDate;
  if (options?.clientContext) body.client_context = options.clientContext;

  return apiFetch<AiReport>("/api/v1/reports/generate", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
