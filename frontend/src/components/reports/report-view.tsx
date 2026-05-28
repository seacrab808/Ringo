"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format, addMonths } from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReportMarkdown } from "@/components/reports/report-markdown";
import { useRingo } from "@/hooks/use-ringo-store";
import { buildReportClientContext } from "@/lib/report-context";
import {
  fetchCachedReport,
  generateReport,
  type AiReport,
  type ReportPeriod,
} from "@/lib/reports-api";
import { USE_RINGO_DB } from "@/lib/planner-api";
import { cn } from "@/lib/utils";

function periodAnchorIso(period: ReportPeriod, offset: number): string {
  const d = new Date();
  if (period === "month") {
    const shifted = offset === 0 ? d : addMonths(d, offset);
    return format(shifted, "yyyy-MM-01");
  }
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1) + offset * 7);
  return format(monday, "yyyy-MM-dd");
}

function rangeForAnchor(period: ReportPeriod, anchor: string): { start: string; end: string } {
  if (period === "month") {
    const d = new Date(anchor + "T12:00:00");
    const start = format(d, "yyyy-MM-01");
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return { start, end: format(last, "yyyy-MM-dd") };
  }
  const endD = new Date(anchor + "T12:00:00");
  endD.setDate(endD.getDate() + 6);
  return { start: anchor, end: format(endD, "yyyy-MM-dd") };
}

function formatRange(start: string, end: string) {
  const fmt = (iso: string) => {
    const [y, m, d] = iso.split("-");
    return `${y}.${m}.${d}`;
  };
  return `${fmt(start)} ~ ${fmt(end)}`;
}

export function ReportView() {
  const { allTasks, allDiaries, hydrated } = useRingo();
  const [period, setPeriod] = useState<ReportPeriod>("week");
  const [offset, setOffset] = useState(0);
  const [report, setReport] = useState<AiReport | null>(null);
  const [loading, setLoading] = useState(false);

  const anchorDate = useMemo(
    () => periodAnchorIso(period, offset),
    [period, offset],
  );

  const load = useCallback(
    async (refresh: boolean) => {
      setLoading(true);
      try {
        if (!refresh) {
          const cached = await fetchCachedReport(period, anchorDate);
          if (cached) {
            setReport(cached);
            return;
          }
        }

        const { start, end } = rangeForAnchor(period, anchorDate);
        const clientContext = !USE_RINGO_DB
          ? buildReportClientContext(allTasks, allDiaries, start, end)
          : undefined;

        const res = await generateReport(period, {
          anchorDate,
          refresh,
          clientContext,
        });
        setReport(res);
      } catch (e) {
        setReport({
          period,
          anchor_date: anchorDate,
          start_date: "",
          end_date: "",
          title: "리포트",
          markdown: "",
          summary_stats: {
            total_tasks: 0,
            completed_tasks: 0,
            diary_days: 0,
            habits_met: 0,
            habits_total: 0,
            github_commit_days: null,
          },
          model: "",
          generated_at: new Date().toISOString(),
          cached: false,
          error: e instanceof Error ? e.message : "리포트 생성 실패",
        });
      } finally {
        setLoading(false);
      }
    },
    [period, anchorDate, allTasks, allDiaries],
  );

  useEffect(() => {
    if (!hydrated) return;
    setReport(null);
    void load(false);
  }, [hydrated, period, anchorDate, load]);

  const periodLabel =
    period === "week"
      ? format(new Date(anchorDate + "T12:00:00"), "M월 d일 주", { locale: ko })
      : format(new Date(anchorDate + "T12:00:00"), "yyyy년 M월", { locale: ko });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-orange-100/80 bg-white/90 px-4 py-4 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-orange-950">AI 리포트</h1>
            <p className="text-sm text-muted-foreground">
              Ringo가 일정·일기·습관을 요약해 주간·월간 회고를 작성해요
            </p>
          </div>
          <div className="flex rounded-2xl border border-stone-200 bg-stone-50 p-1">
            {(["week", "month"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setPeriod(p);
                  setOffset(0);
                }}
                className={cn(
                  "rounded-xl px-3 py-1.5 text-sm font-medium transition-colors",
                  period === p
                    ? "bg-orange-500 text-white"
                    : "text-stone-600 hover:text-orange-900",
                )}
              >
                {p === "week" ? "주간" : "월간"}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="rounded-xl"
            disabled={loading}
            onClick={() => setOffset((o) => o - 1)}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-[180px] rounded-2xl border border-stone-200 bg-stone-50 px-4 py-2 text-center text-sm font-semibold">
            {periodLabel}
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="rounded-xl"
            disabled={loading}
            onClick={() => setOffset((o) => o + 1)}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
          {offset !== 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-xl text-orange-800"
              onClick={() => setOffset(0)}
            >
              이번 {period === "week" ? "주" : "달"}
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            className="rounded-xl bg-orange-500 hover:bg-orange-600"
            disabled={loading}
            onClick={() => void load(true)}
          >
            {loading ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-1 h-4 w-4" />
            )}
            {report?.markdown ? "다시 생성" : "리포트 생성"}
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4 md:p-8">
        {loading && (
          <div className="flex flex-col items-center justify-center gap-2 py-20 text-stone-500">
            <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
            <p className="text-sm">Ollama가 리포트를 작성 중이에요… (30초~2분)</p>
          </div>
        )}

        {!loading && report?.error && (
          <div className="mx-auto mb-4 max-w-2xl rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
            {report.error}
          </div>
        )}

        {!loading && report?.markdown && (
          <article className="mx-auto max-w-2xl rounded-3xl border border-orange-100 bg-white p-6 shadow-sm md:p-8">
            {report.start_date && report.end_date && (
              <p className="mb-4 text-xs text-stone-400">
                {formatRange(report.start_date, report.end_date)}
                {report.cached ? " · 캐시" : ""}
                {report.model ? ` · ${report.model}` : ""}
              </p>
            )}

            {report.summary_stats.total_tasks > 0 && (
              <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <StatChip
                  label="일정 완료"
                  value={`${report.summary_stats.completed_tasks}/${report.summary_stats.total_tasks}`}
                />
                <StatChip label="일기" value={`${report.summary_stats.diary_days}일`} />
                <StatChip
                  label="습관"
                  value={`${report.summary_stats.habits_met}/${report.summary_stats.habits_total}`}
                />
                {report.summary_stats.github_commit_days != null && (
                  <StatChip
                    label="Git"
                    value={`${report.summary_stats.github_commit_days}일`}
                  />
                )}
              </div>
            )}

            <ReportMarkdown markdown={report.markdown} />
          </article>
        )}

        {!loading && !report?.markdown && !report?.error && (
          <p className="py-20 text-center text-sm text-stone-500">
            「리포트 생성」을 눌러 주간·월간 회고를 받아 보세요.
          </p>
        )}
      </div>
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-orange-50 px-3 py-2 text-center">
      <p className="text-[10px] font-medium uppercase tracking-wide text-orange-700/80">
        {label}
      </p>
      <p className="text-sm font-bold text-orange-950">{value}</p>
    </div>
  );
}
