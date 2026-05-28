"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchSogangBwMenu, type SogangCafeteriaWeek } from "@/lib/cafeteria-api";
import { cn } from "@/lib/utils";

function formatRange(start: string, end: string) {
  const fmt = (iso: string) => {
    const [y, m, d] = iso.split("-");
    return `${y}.${m}.${d}`;
  };
  return `${fmt(start)} ~ ${fmt(end)}`;
}

export function SogangMenuView() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [data, setData] = useState<SogangCafeteriaWeek | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (offset: number, refresh = false) => {
    setLoading(true);
    try {
      const res = await fetchSogangBwMenu(offset, refresh);
      setData(res);
    } catch (e) {
      setData({
        hall: "베르크만스우정원(BW관) · 우정학식",
        config_id: 1,
        start_date: "",
        end_date: "",
        origin: "",
        days: [],
        source_url: "https://www.sogang.ac.kr/ko/menu-life-info",
        fetched_at: new Date().toISOString(),
        cached: false,
        error: e instanceof Error ? e.message : "불러오기 실패",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(weekOffset);
  }, [weekOffset, load]);

  const maxRows =
    data?.days.reduce((m, d) => Math.max(m, d.items.length), 0) ?? 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-orange-100/80 bg-white/90 px-4 py-4 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-orange-950">우정학식</h1>
            <p className="text-sm text-muted-foreground">
              베르크만스우정원(BW관) · 평일 11:00–15:00
            </p>
          </div>
          <a
            href="https://www.sogang.ac.kr/ko/menu-life-info"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-orange-800 hover:underline"
          >
            공식 페이지
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="rounded-xl"
            disabled={loading}
            onClick={() => setWeekOffset((w) => w - 1)}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-[200px] rounded-2xl border border-stone-200 bg-stone-50 px-4 py-2 text-center text-sm font-semibold tabular-nums">
            {data ? formatRange(data.start_date, data.end_date) : "—"}
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="rounded-xl"
            disabled={loading}
            onClick={() => setWeekOffset((w) => w + 1)}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-xl"
            disabled={loading}
            onClick={() => load(weekOffset, true)}
          >
            <RefreshCw className={cn("mr-1 h-4 w-4", loading && "animate-spin")} />
            새로고침
          </Button>
          {weekOffset !== 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-xl text-orange-800"
              onClick={() => setWeekOffset(0)}
            >
              이번 주
            </Button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4 md:p-6">
        {loading && (
          <div className="flex items-center justify-center gap-2 py-16 text-stone-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            식단 불러오는 중…
          </div>
        )}

        {!loading && data?.error && (
          <div className="mx-auto max-w-lg rounded-2xl bg-amber-50 px-4 py-4 text-sm text-amber-900 ring-1 ring-amber-200">
            {data.error}
            <p className="mt-2 text-xs text-amber-800">
              <a
                href={data.source_url}
                className="underline"
                target="_blank"
                rel="noreferrer"
              >
                서강대 생활정보 식단표
              </a>
              에서도 확인할 수 있어요.
            </p>
          </div>
        )}

        {!loading && data && !data.error && maxRows === 0 && (
          <p className="py-16 text-center text-sm text-stone-500">
            이 주간에 등록된 식단이 없습니다.
          </p>
        )}

        {!loading && data && !data.error && maxRows > 0 && (
          <div className="mx-auto max-w-5xl overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-t-2 border-stone-800">
                  <th className="bg-stone-100 px-3 py-3 text-left font-bold">구분</th>
                  {data.days.map((day) => (
                    <th
                      key={day.date}
                      className="bg-stone-100 px-3 py-3 text-center font-bold"
                    >
                      {day.weekday}
                      <span className="mt-0.5 block text-xs font-normal text-stone-500">
                        {day.date.slice(5).replace("-", "/")}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: maxRows }, (_, row) => (
                  <tr key={row} className="border-b border-stone-200">
                    <td className="px-3 py-3 align-top text-xs text-stone-400">메뉴</td>
                    {data.days.map((day) => {
                      const item = day.items[row];
                      return (
                        <td key={day.date} className="px-3 py-3 align-top">
                          {item ? (
                            <>
                              {item.category && (
                                <p className="font-bold text-[#A72018]">{item.category}</p>
                              )}
                              <p className="whitespace-pre-line text-stone-700">
                                {item.menu}
                              </p>
                            </>
                          ) : null}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>

            {data.origin && (
              <div className="mt-6 rounded-2xl bg-stone-50 p-4 text-xs leading-relaxed text-stone-600">
                <p className="mb-1 font-semibold text-stone-800">원산지</p>
                <p className="whitespace-pre-line">{data.origin}</p>
              </div>
            )}

            <p className="mt-3 text-center text-[11px] text-stone-400">
              {data.cached ? "캐시된 데이터 · " : ""}
              {new Date(data.fetched_at).toLocaleString("ko-KR")} 갱신
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
