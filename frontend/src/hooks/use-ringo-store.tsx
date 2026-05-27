"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { addMonths, format, subMonths } from "date-fns";
import { ko } from "date-fns/locale";
import { eventsToTasks, mergeTasks, parseSchedule } from "@/lib/api";
import {
  USE_RINGO_DB,
  createTask,
  fetchDiaries,
  fetchHealth,
  fetchTasks,
  isDatabaseConnected,
  patchTask,
  reorderTasksApi,
  upsertDiary,
} from "@/lib/planner-api";
import { getCategoryStyle } from "@/lib/categories";
import { draftToPlannerTask, taskToDraft } from "@/lib/draft-task";
import { countTasksByDate, filterTasksForDate, getTaskDateKey } from "@/lib/task-date";
import {
  assignAutoListOrder,
  ensureListOrder,
  orderByListOrder,
  reorderTasks,
} from "@/lib/task-sort";
import type { ChatMessage, PendingTaskDraft, PlannerTask } from "@/types/schedule";

const STORAGE_KEY = "ringo-planner-v4";

interface RingoPersist {
  tasks: PlannerTask[];
  diaries: Record<string, string>;
  messages: ChatMessage[];
  selectedDate: string;
  calendarMonth: string;
}

function todayIso(): string {
  return format(new Date(), "yyyy-MM-dd");
}

function monthIso(d = new Date()): string {
  return format(d, "yyyy-MM");
}

const SAMPLE_TASKS: PlannerTask[] = (() => {
  const today = todayIso();
  const d = new Date();
  d.setHours(14, 0, 0, 0);
  const start = d.toISOString();
  d.setHours(15, 0, 0, 0);
  return [
    {
      id: "sample-1",
      summary: "소프트웨어공학 수업",
      timetableLabel: "SW공학",
      isTimeFixed: true,
      plannedDate: today,
      startIso: start,
      endIso: d.toISOString(),
      category: "class",
      categoryColor: getCategoryStyle("class").bg,
      createdOrder: 0,
      listOrder: 0,
      completed: false,
    },
  ];
})();

function syncDateRange(center: string): { from: string; to: string } {
  const d = new Date(center + "T12:00:00");
  return {
    from: format(subMonths(d, 3), "yyyy-MM-dd"),
    to: format(addMonths(d, 3), "yyyy-MM-dd"),
  };
}

function loadPersist(): RingoPersist | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as RingoPersist & { diary?: string };
    if (data.diary && !data.diaries) {
      data.diaries = { [data.selectedDate ?? todayIso()]: data.diary };
    }
    return data;
  } catch {
    return null;
  }
}

interface RingoContextValue {
  selectedDate: string;
  setSelectedDate: (iso: string) => void;
  calendarMonth: string;
  setCalendarMonth: (ym: string) => void;
  formattedDate: string;
  tasksForDay: PlannerTask[];
  allTasks: PlannerTask[];
  taskCountByDate: Record<string, number>;
  diary: string;
  setDiary: (text: string) => void;
  messages: ChatMessage[];
  parsing: boolean;
  sendChat: (text: string) => void;
  updateDraft: (
    messageId: string,
    draftId: string,
    patch: Partial<PendingTaskDraft>,
  ) => void;
  confirmDrafts: (messageId: string) => void;
  retryDrafts: (messageId: string) => void;
  onDragEnd: (source: number, dest: number) => void;
  toggleComplete: (id: string) => void;
  hydrated: boolean;
}

const RingoContext = createContext<RingoContextValue | null>(null);

export function RingoProvider({ children }: { children: ReactNode }) {
  const [selectedDate, setSelectedDate] = useState(todayIso);
  const [calendarMonth, setCalendarMonth] = useState(monthIso);
  const [tasks, setTasks] = useState<PlannerTask[]>(SAMPLE_TASKS);
  const [diaries, setDiaries] = useState<Record<string, string>>({});
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "ringo",
      text: "안녕! 나는 Ringo 🐿️ 일정을 편하게 말해 줘. 파싱한 뒤 확인하고 등록할 수 있어!",
      at: new Date().toISOString(),
    },
  ]);
  const [parsing, setParsing] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [dbEnabled, setDbEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const saved = loadPersist();
      const initialDate = saved?.selectedDate ?? todayIso();

      if (saved) {
        setTasks(ensureListOrder(saved.tasks.length ? saved.tasks : SAMPLE_TASKS));
        setDiaries(saved.diaries ?? {});
        setMessages(saved.messages);
        setSelectedDate(saved.selectedDate);
        setCalendarMonth(saved.calendarMonth ?? monthIso());
      }

      if (USE_RINGO_DB && !cancelled) {
        try {
          const health = await fetchHealth();
          if (isDatabaseConnected(health)) {
            setDbEnabled(true);
            const { from, to } = syncDateRange(initialDate);
            const [remoteTasks, remoteDiaries] = await Promise.all([
              fetchTasks(from, to),
              fetchDiaries(from, to),
            ]);
            if (!cancelled) {
              if (remoteTasks.length > 0) {
                setTasks(ensureListOrder(remoteTasks));
              }
              if (Object.keys(remoteDiaries).length > 0) {
                setDiaries((prev) => ({ ...prev, ...remoteDiaries }));
              }
            }
          }
        } catch {
          /* localStorage fallback */
        }
      }

      if (!cancelled) setHydrated(true);
    }

    hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const payload: RingoPersist = {
      tasks,
      diaries,
      messages,
      selectedDate,
      calendarMonth,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [tasks, diaries, messages, selectedDate, calendarMonth, hydrated]);

  const tasksForDay = useMemo(
    () => orderByListOrder(filterTasksForDate(tasks, selectedDate)),
    [tasks, selectedDate],
  );

  const taskCountByDate = useMemo(() => countTasksByDate(tasks), [tasks]);

  const diary = diaries[selectedDate] ?? "";

  const setDiary = useCallback(
    (text: string) => {
      setDiaries((prev) => ({ ...prev, [selectedDate]: text }));
    },
    [selectedDate],
  );

  useEffect(() => {
    if (!hydrated || !dbEnabled) return;
    const timer = setTimeout(() => {
      upsertDiary(selectedDate, diary).catch(() => undefined);
    }, 600);
    return () => clearTimeout(timer);
  }, [diary, selectedDate, hydrated, dbEnabled]);

  const addMessage = useCallback((msg: Omit<ChatMessage, "id" | "at">) => {
    setMessages((prev) => [
      ...prev,
      { ...msg, id: `msg-${Date.now()}`, at: new Date().toISOString() },
    ]);
  }, []);

  const sendChat = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      addMessage({ role: "user", text: trimmed });
      setParsing(true);

      try {
        const res = await parseSchedule(trimmed, selectedDate);
        const newTasks = eventsToTasks(res.events, tasks.length, selectedDate);
        if (newTasks.length === 0) {
          const hint =
            res.unparsed_fragments.length > 0
              ? `\n\n(파서 메모: ${res.unparsed_fragments.slice(0, 2).join("; ")})`
              : "";
          addMessage({
            role: "ringo",
            text: `일정을 제대로 못 읽었어. 날짜·시간·할 일을 한 문장으로 다시 말해줄래?${hint}`,
          });
        } else {
          const drafts = newTasks.map((t) => taskToDraft(t));
          setMessages((prev) => [
            ...prev,
            {
              id: `msg-${Date.now()}-ringo`,
              role: "ringo",
              text: "파싱했어요! 아래 내용이 맞는지 확인해 주세요.",
              at: new Date().toISOString(),
            },
            {
              id: `msg-${Date.now()}-confirm`,
              role: "confirm",
              text: "",
              at: new Date().toISOString(),
              drafts,
              sourceText: trimmed,
            },
          ]);
        }
      } catch (e) {
        const err = e instanceof Error ? e.message : "연결 실패";
        addMessage({
          role: "error",
          text: `백엔드에 연결하지 못했어 (${err}). FastAPI(8001)와 Ollama가 켜져 있는지 확인해줘.`,
        });
      } finally {
        setParsing(false);
      }
    },
    [addMessage, selectedDate, tasks.length],
  );

  const updateDraft = useCallback(
    (messageId: string, draftId: string, patch: Partial<PendingTaskDraft>) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId || !m.drafts) return m;
          return {
            ...m,
            drafts: m.drafts.map((d) =>
              d.draftId === draftId ? { ...d, ...patch } : d,
            ),
          };
        }),
      );
    },
    [],
  );

  const confirmDrafts = useCallback(
    async (messageId: string) => {
      const msg = messages.find((m) => m.id === messageId);
      if (!msg?.drafts?.length) return;

      const plannerTasks = msg.drafts.map((d, i) =>
        draftToPlannerTask(d, tasks.length + i),
      );

      let saved = plannerTasks;
      if (dbEnabled) {
        try {
          saved = [];
          for (const t of plannerTasks) {
            saved.push(await createTask(t));
          }
        } catch {
          addMessage({
            role: "error",
            text: "DB에 저장하지 못했어. Supabase 설정과 백엔드를 확인해줘.",
          });
          return;
        }
      }

      setTasks((prev) => mergeTasks(prev, saved));

      const firstDate = getTaskDateKey(saved[0]);
      if (firstDate) {
        setSelectedDate(firstDate);
        setCalendarMonth(firstDate.slice(0, 7));
      }

      const lines = saved.map((t) => {
        const d = getTaskDateKey(t);
        const day =
          d && format(new Date(d + "T12:00:00"), "M/d (EEE)", { locale: ko });
        const time =
          t.isTimeFixed && t.startIso
            ? format(new Date(t.startIso), "HH:mm")
            : "";
        return `· ${t.summary}${day ? ` — ${day}` : ""}${time ? ` ${time}` : ""}`;
      });

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                confirmed: true,
                drafts: undefined,
                role: "ringo",
                text: `등록했어!\n${lines.join("\n")}`,
              }
            : m,
        ),
      );
    },
    [messages, tasks.length, dbEnabled, addMessage],
  );

  const retryDrafts = useCallback((messageId: string) => {
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === messageId);
      if (idx < 0) return prev;
      return prev.filter((_, i) => i !== idx && i !== idx - 1);
    });
  }, []);

  const onDragEnd = useCallback(
    (sourceIndex: number, destIndex: number) => {
      let reorderedIds: string[] = [];
      setTasks((prev) => {
        const dayTasks = filterTasksForDate(prev, selectedDate);
        const others = prev.filter((t) => getTaskDateKey(t) !== selectedDate);
        const reordered = reorderTasks(dayTasks, sourceIndex, destIndex);
        reorderedIds = reordered.map((t) => t.id);
        return [...others, ...reordered];
      });
      if (dbEnabled && reorderedIds.length > 0) {
        reorderTasksApi(selectedDate, reorderedIds).catch(() => undefined);
      }
    },
    [selectedDate, dbEnabled],
  );

  const toggleComplete = useCallback(
    (id: string) => {
      setTasks((prev) => {
        const next = prev.map((t) =>
          t.id === id ? { ...t, completed: !t.completed } : t,
        );
        const updated = next.find((t) => t.id === id);
        if (dbEnabled && updated) {
          patchTask(id, { completed: updated.completed }).catch(() => undefined);
        }
        return next;
      });
    },
    [dbEnabled],
  );

  const formattedDate = useMemo(() => {
    const d = new Date(selectedDate + "T12:00:00");
    return format(d, "M월 d일 EEEE", { locale: ko });
  }, [selectedDate]);

  const value: RingoContextValue = {
    selectedDate,
    setSelectedDate,
    calendarMonth,
    setCalendarMonth,
    formattedDate,
    tasksForDay,
    allTasks: tasks,
    taskCountByDate,
    diary,
    setDiary,
    messages,
    parsing,
    sendChat,
    updateDraft,
    confirmDrafts,
    retryDrafts,
    onDragEnd,
    toggleComplete,
    hydrated,
  };

  return <RingoContext.Provider value={value}>{children}</RingoContext.Provider>;
}

export function useRingo() {
  const ctx = useContext(RingoContext);
  if (!ctx) throw new Error("useRingo must be used within RingoProvider");
  return ctx;
}

/** @deprecated use useRingo */
export const usePlannerState = useRingo;
