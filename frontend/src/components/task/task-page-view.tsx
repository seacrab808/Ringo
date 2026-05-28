"use client";

import Link from "next/link";
import { DragEvent, useCallback, useEffect, useState } from "react";
import { ArrowLeft, Download, FileUp, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useRingo } from "@/hooks/use-ringo-store";
import { getCategoryStyle } from "@/lib/categories";
import {
  downloadTaskAttachment,
  exportStudyGuidePdf,
  fetchTaskPage,
  generateStudyGuide,
  updateTaskMemo,
  uploadTaskAttachment,
  type TaskPage,
} from "@/lib/task-page-api";
import {
  ALLOWED_ATTACHMENT_ACCEPT,
  ALLOWED_ATTACHMENT_LABEL,
  isAllowedAttachment,
} from "@/lib/allowed-attachments";
import { StudyGuideContent } from "@/components/study-guide/study-guide-content";
import { StudyGuideRevisePanel } from "@/components/study-guide/study-guide-revise-panel";
import { cn } from "@/lib/utils";

interface TaskPageViewProps {
  taskId: string;
}

export function TaskPageView({ taskId }: TaskPageViewProps) {
  const { allTasks } = useRingo();
  const task = allTasks.find((t) => t.id === taskId);
  const [page, setPage] = useState<TaskPage | null>(null);
  const [memo, setMemo] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const p = await fetchTaskPage(taskId);
      setPage(p);
      setMemo(p.memo);
    } catch (e) {
      setError(e instanceof Error ? e.message : "불러오기 실패");
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    load();
  }, [load]);

  const saveMemo = async () => {
    const p = await updateTaskMemo(taskId, memo);
    setPage(p);
  };

  const onUpload = async (file: File | null) => {
    if (!file) return;
    if (!isAllowedAttachment(file)) {
      setError(`${ALLOWED_ATTACHMENT_LABEL}만 업로드할 수 있어요.`);
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const p = await uploadTaskAttachment(taskId, file);
      setPage(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : "업로드 실패");
    } finally {
      setUploading(false);
    }
  };

  const handleFileDrop = async (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragActive(false);
    if (uploading) return;
    const files = Array.from(e.dataTransfer.files ?? []);
    const first = files.find(isAllowedAttachment);
    await onUpload(first ?? null);
  };

  const onGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await generateStudyGuide(taskId, {
        lecture_topic: task?.summary,
      });
      setPage((prev) =>
        prev
          ? { ...prev, latest_study_guide: res.study_guide }
          : {
              task_id: taskId,
              memo,
              attachments: [],
              latest_study_guide: res.study_guide,
            },
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "생성 실패");
    } finally {
      setGenerating(false);
    }
  };

  if (!task) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-stone-600">
        <p>일정을 찾을 수 없어요.</p>
        <Link
          href="/planner"
          className="inline-flex rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-medium hover:bg-stone-50"
        >
          플래너로 돌아가기
        </Link>
      </div>
    );
  }

  const cat = getCategoryStyle(task.category);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <header
        className="shrink-0 border-b border-stone-200/80 px-4 py-4 md:px-8"
        style={{ backgroundColor: task.categoryColor || cat.bg }}
      >
        <div className="mx-auto flex max-w-3xl items-start gap-3">
          <Link
            href="/planner"
            aria-label="플래너"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/60 hover:bg-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <span
              className="inline-flex rounded-full border border-solid bg-white/75 px-2 py-0.5 text-sm font-medium"
              style={{ borderColor: cat.color }}
            >
              {cat.label}
            </span>
            <h1 className="mt-2 text-2xl font-bold text-stone-900">{task.summary}</h1>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto bg-stone-50/50 px-4 py-6 md:px-8">
        <div className="mx-auto max-w-3xl space-y-6">
          {error && (
            <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
          )}
          {loading && (
            <p className="flex items-center gap-2 text-sm text-stone-500">
              <Loader2 className="h-4 w-4 animate-spin" /> 불러오는 중…
            </p>
          )}

          {!loading && (
            <>
              <section className="space-y-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-stone-200/60">
                <h2 className="text-sm font-semibold text-stone-800">메모</h2>
                <Textarea
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="수업 메모, 링크, 할 일…"
                  className="min-h-[160px] resize-none rounded-2xl border-stone-200"
                />
                <Button onClick={saveMemo} className="rounded-xl">
                  메모 저장
                </Button>
              </section>

              <section className="space-y-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-stone-200/60">
                <h2 className="text-sm font-semibold text-stone-800">강의 자료 (원본)</h2>
                <p className="text-xs text-stone-500">
                  PDF/PPT 원본을 업로드·다운로드할 수 있어요. RAG 학습지 생성에도 사용됩니다.
                </p>
                <label
                  className={cn(
                    "flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-orange-200 bg-orange-50/50 px-4 py-8 text-sm font-medium text-orange-900 transition-colors hover:bg-orange-50",
                    dragActive && "border-orange-400 bg-orange-100/70",
                  )}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (!uploading) setDragActive(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setDragActive(false);
                  }}
                  onDrop={handleFileDrop}
                >
                  <FileUp className="h-5 w-5" />
                  {uploading ? "업로드 중…" : "PDF/PPT 선택 또는 여기로 드롭"}
                  <input
                    type="file"
                    accept={ALLOWED_ATTACHMENT_ACCEPT}
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => onUpload(e.target.files?.[0] ?? null)}
                  />
                </label>
                <ul className="space-y-2">
                  {page?.attachments.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-center gap-2 rounded-xl bg-stone-50 px-3 py-2 text-sm"
                    >
                      <span className="min-w-0 flex-1 truncate font-medium">{a.filename}</span>
                      <span className="shrink-0 text-xs text-stone-500">
                        {a.has_text ? "텍스트 추출됨" : "추출 대기"}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="shrink-0 rounded-lg h-8 px-2"
                        disabled={downloadingId === a.id}
                        onClick={async () => {
                          setDownloadingId(a.id);
                          try {
                            await downloadTaskAttachment(taskId, a.id, a.filename);
                          } catch (e) {
                            setError(e instanceof Error ? e.message : "다운로드 실패");
                          } finally {
                            setDownloadingId(null);
                          }
                        }}
                      >
                        {downloadingId === a.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Download className="h-3.5 w-3.5" />
                        )}
                        <span className="sr-only">다운로드</span>
                      </Button>
                    </li>
                  ))}
                  {!page?.attachments.length && (
                    <li className="text-center text-sm text-stone-400">아직 자료 없음</li>
                  )}
                </ul>
              </section>

              <section className="space-y-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-stone-200/60">
                <h2 className="text-sm font-semibold text-stone-800">AI 학습지</h2>
                <p className="text-xs text-stone-500">
                  페이지별 용어·도식·A4 인쇄형 HTML 학습지 (상세·긴 분량) + 강의 자료 RAG
                </p>
                <Button
                  onClick={onGenerate}
                  disabled={generating || !page?.attachments.length}
                  className="w-full rounded-xl gap-2"
                >
                  {generating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  학습지 생성
                </Button>
                {page?.latest_study_guide ? (
                  <>
                    <StudyGuideRevisePanel
                      disabled={generating}
                      onRevise={async (instruction) => {
                        setError(null);
                        const { reviseStudyGuide } = await import("@/lib/task-page-api");
                        const res = await reviseStudyGuide(taskId, {
                          instruction,
                          task_title: task.summary,
                        });
                        setPage((prev) =>
                          prev ? { ...prev, latest_study_guide: res.study_guide } : prev,
                        );
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                      disabled={exportingPdf}
                      onClick={async () => {
                        setExportingPdf(true);
                        try {
                          const blob = await exportStudyGuidePdf(
                            taskId,
                            page.latest_study_guide!.body_markdown,
                            task.summary,
                          );
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `study-guide-${task.summary.slice(0, 30)}.pdf`;
                          a.click();
                          URL.revokeObjectURL(url);
                        } catch (e) {
                          setError(e instanceof Error ? e.message : "PDF 실패");
                        } finally {
                          setExportingPdf(false);
                        }
                      }}
                    >
                      {exportingPdf ? (
                        <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Download className="mr-1 h-3.5 w-3.5" />
                      )}
                      학습지 PDF 저장
                    </Button>
                    <StudyGuideContent
                      content={page.latest_study_guide.body_markdown}
                      title={task.summary}
                    />
                  </>
                ) : (
                  <p className="text-center text-sm text-stone-400">
                    자료를 업로드한 뒤 생성해 보세요.
                  </p>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
