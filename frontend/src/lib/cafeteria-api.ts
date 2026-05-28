import { apiFetch } from "@/lib/planner-api";

export interface CafeteriaMenuItem {
  category: string;
  menu: string;
}

export interface CafeteriaDayMenu {
  date: string;
  weekday: string;
  items: CafeteriaMenuItem[];
}

export interface SogangCafeteriaWeek {
  hall: string;
  config_id: number;
  start_date: string;
  end_date: string;
  origin: string;
  days: CafeteriaDayMenu[];
  source_url: string;
  fetched_at: string;
  cached: boolean;
  error: string | null;
}

export async function fetchSogangBwMenu(
  weekOffset = 0,
  refresh = false,
): Promise<SogangCafeteriaWeek> {
  const params = new URLSearchParams({
    week_offset: String(weekOffset),
    refresh: String(refresh),
  });
  return apiFetch<SogangCafeteriaWeek>(`/api/v1/cafeteria/sogang/bw?${params}`);
}
