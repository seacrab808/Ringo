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
  cancelRecurrenceDate,
  createCategoryApi,
  createTask,
  deleteCategoryApi,
  fetchCategories,
  fetchDiaries,
  fetchHealth,
  fetchTasks,
  isDatabaseConnected,
  deleteTask as deleteTaskApi,
  patchTask,
  reorderTasksApi,
  updateCategoryApi,
  upsertDiary,
} from "@/lib/planner-api";
import {
  defaultCategoryItems,
  getCategoryStyle,
  setCategoryRegistry,
  slugifyCategory,
} from "@/lib/categories";
import { draftToPlannerTask, taskToDraft } from "@/lib/draft-task";
import {
  countTasksByDateWithRecurrence,
  expandTasksForDate,
  parseInstanceId,
} from "@/lib/recurrence";
import {
  createWelcomeMessages,
  getPlannerDayIso,
} from "@/lib/planner-day";
import { applyTaskEdit, type TaskEditPatch } from "@/lib/task-edit";
import { filterTasksForDate, getTaskDateKey } from "@/lib/task-date";
import {
  assignAutoListOrder,
  ensureListOrder,
  orderByListOrder,
  reorderTasks,
} from "@/lib/task-sort";
import { TaskEditSheet } from "@/components/task/task-edit-sheet";
import type {
  CategoryItem,
  ChatMessage,
  PendingTaskDraft,
  PlannerTask,
  TaskRecurrence,
} from "@/types/schedule";

const STORAGE_KEY = "ringo-planner-v6";

interface RingoPersist {
  tasks: PlannerTask[];
  diaries: Record<string, string>;
  messages: ChatMessage[];
  categories?: CategoryItem[];
  selectedDate: string;
  calendarMonth: string;
  lastPlannerSessionDay?: string;
}

function todayIso(): string {
  return getPlannerDayIso();
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
  deleteTask: (id: string) => void;
  categories: CategoryItem[];
  addCategory: (label: string, colorHex: string) => void;
  updateCategory: (slug: string, patch: Partial<CategoryItem>) => void;
  removeCategory: (slug: string) => void;
  addRecurringTask: (input: {
    summary: string;
    category: string;
    recurrence: TaskRecurrence;
    startIso?: string;
    endIso?: string;
  }) => void;
  updateTask: (id: string, patch: TaskEditPatch) => void;
  getTasksForDate: (dateIso: string) => PlannerTask[];
  editingTask: PlannerTask | null;
  setEditingTask: (task: PlannerTask | null) => void;
  resetChat: () => void;
  hydrated: boolean;
}

const RingoContext = createContext<RingoContextValue | null>(null);

export function RingoProvider({ children }: { children: ReactNode }) {
  const [selectedDate, setSelectedDate] = useState(todayIso);
  const [calendarMonth, setCalendarMonth] = useState(monthIso);
  const [tasks, setTasks] = useState<PlannerTask[]>(SAMPLE_TASKS);
  const [diaries, setDiaries] = useState<Record<string, string>>({});
  const [messages, setMessages] = useState<ChatMessage[]>(createWelcomeMessages());
  const [parsing, setParsing] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [dbEnabled, setDbEnabled] = useState(false);
  const [categories, setCategories] = useState<CategoryItem[]>(defaultCategoryItems());
  const [lastPlannerSessionDay, setLastPlannerSessionDay] = useState(todayIso);
  const [editingTask, setEditingTask] = useState<PlannerTask | null>(null);

  const beginPlannerSession = useCallback((plannerDay: string) => {
    setSelectedDate(plannerDay);
    setCalendarMonth(format(new Date(plannerDay + "T12:00:00"), "yyyy-MM"));
    setMessages(createWelcomeMessages());
    setLastPlannerSessionDay(plannerDay);
  }, []);

  const resetChat = useCallback(() => {
    setMessages(createWelcomeMessages());
  }, []);

  useEffect(() => {
    setCategoryRegistry(categories);
  }, [categories]);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const saved = loadPersist();
      const plannerToday = getPlannerDayIso();
      const initialCategories = saved?.categories?.length
        ? saved.categories
        : defaultCategoryItems();
      setCategories(initialCategories);
      setCategoryRegistry(initialCategories);

      const isNewPlannerDay =
        !saved?.lastPlannerSessionDay || saved.lastPlannerSessionDay !== plannerToday;

      if (saved) {
        setTasks(ensureListOrder(saved.tasks.length ? saved.tasks : SAMPLE_TASKS));
        setDiaries(saved.diaries ?? {});
        if (isNewPlannerDay) {
          beginPlannerSession(plannerToday);
        } else {
          setMessages(saved.messages);
          setSelectedDate(plannerToday);
          setCalendarMonth(format(new Date(plannerToday + "T12:00:00"), "yyyy-MM"));
          setLastPlannerSessionDay(plannerToday);
        }
      } else {
        beginPlannerSession(plannerToday);
      }

      if (USE_RINGO_DB && !cancelled) {
        try {
          const health = await fetchHealth();
          if (isDatabaseConnected(health)) {
            setDbEnabled(true);
            const { from, to } = syncDateRange(plannerToday);
            const [remoteTasks, remoteDiaries, remoteCats] = await Promise.all([
              fetchTasks(from, to),
              fetchDiaries(from, to),
              fetchCategories().catch(() => [] as CategoryItem[]),
            ]);
            if (!cancelled) {
              if (remoteTasks.length > 0) {
                setTasks(ensureListOrder(remoteTasks));
              }
              if (Object.keys(remoteDiaries).length > 0) {
                setDiaries((prev) => ({ ...prev, ...remoteDiaries }));
              }
              if (remoteCats.length > 0) {
                setCategories(remoteCats);
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
  }, [beginPlannerSession]);

  useEffect(() => {
    if (!hydrated) return;
    const tick = () => {
      const plannerToday = getPlannerDayIso();
      if (plannerToday !== lastPlannerSessionDay) {
        beginPlannerSession(plannerToday);
      }
    };
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, [hydrated, lastPlannerSessionDay, beginPlannerSession]);

  useEffect(() => {
    if (!hydrated) return;
    const payload: RingoPersist = {
      tasks,
      diaries,
      messages,
      categories,
      selectedDate,
      calendarMonth,
      lastPlannerSessionDay,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [
    tasks,
    diaries,
    messages,
    categories,
    selectedDate,
    calendarMonth,
    lastPlannerSessionDay,
    hydrated,
  ]);

  const getTasksForDate = useCallback(
    (dateIso: string) => orderByListOrder(expandTasksForDate(tasks, dateIso)),
    [tasks],
  );

  const tasksForDay = useMemo(
    () => orderByListOrder(expandTasksForDate(tasks, selectedDate)),
    [tasks, selectedDate],
  );

  const taskCountByDate = useMemo(
    () => countTasksByDateWithRecurrence(tasks),
    [tasks],
  );

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
        const newTasks = eventsToTasks(res.events, tasks.length, selectedDate, trimmed);
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
            ? t.endIso
              ? `${format(new Date(t.startIso), "HH:mm")}–${format(new Date(t.endIso), "HH:mm")}`
              : format(new Date(t.startIso), "HH:mm")
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
      const inst = parseInstanceId(id);
      const baseId = inst?.templateId ?? id.split("@")[0];
      setTasks((prev) => {
        const next = prev.map((t) =>
          t.id === baseId ? { ...t, completed: !t.completed } : t,
        );
        const updated = next.find((t) => t.id === baseId);
        if (dbEnabled && updated) {
          patchTask(baseId, { completed: updated.completed }).catch(() => undefined);
        }
        return next;
      });
    },
    [dbEnabled],
  );

  const deleteTask = useCallback(
    (id: string) => {
      const inst = parseInstanceId(id);
      if (inst) {
        setTasks((prev) =>
          prev.map((t) => {
            if (t.id !== inst.templateId || !t.recurrence) return t;
            const cancelled = new Set(t.recurrence.cancelledDates ?? []);
            cancelled.add(inst.dateIso);
            return {
              ...t,
              recurrence: {
                ...t.recurrence,
                cancelledDates: [...cancelled],
              },
            };
          }),
        );
        if (dbEnabled) {
          cancelRecurrenceDate(inst.templateId, inst.dateIso).catch(() => undefined);
        }
        return;
      }
      setTasks((prev) => prev.filter((t) => t.id !== id));
      if (dbEnabled) {
        deleteTaskApi(id).catch(() => undefined);
      }
    },
    [dbEnabled],
  );

  const addCategory = useCallback(
    (label: string, colorHex: string) => {
      const slug = slugifyCategory(label);
      const item: CategoryItem = {
        slug,
        label,
        colorHex,
        sortOrder: categories.length,
      };
      setCategories((prev) => [...prev, item]);
      if (dbEnabled) {
        createCategoryApi(item).catch(() => undefined);
      }
    },
    [categories.length, dbEnabled],
  );

  const updateCategory = useCallback(
    (slug: string, patch: Partial<CategoryItem>) => {
      setCategories((prev) =>
        prev.map((c) => (c.slug === slug ? { ...c, ...patch } : c)),
      );
      setTasks((prev) =>
        prev.map((t) =>
          t.category === slug && patch.colorHex
            ? { ...t, categoryColor: patch.colorHex }
            : t,
        ),
      );
      if (dbEnabled) {
        updateCategoryApi(slug, patch).catch(() => undefined);
      }
    },
    [dbEnabled],
  );

  const removeCategory = useCallback(
    (slug: string) => {
      setCategories((prev) => prev.filter((c) => c.slug !== slug));
      if (dbEnabled) {
        deleteCategoryApi(slug).catch(() => undefined);
      }
    },
    [dbEnabled],
  );

  const updateTask = useCallback(
    (id: string, patch: TaskEditPatch) => {
      const inst = parseInstanceId(id);
      const baseId = inst?.templateId ?? id.split("@")[0];

      setTasks((prev) => {
        const next = prev.map((t) => {
          if (t.id !== baseId) return t;
          return applyTaskEdit(t, patch, inst?.dateIso);
        });
        const updated = next.find((t) => t.id === baseId);
        if (dbEnabled && updated) {
          patchTask(baseId, updated).catch(() => undefined);
        }
        return next;
      });
    },
    [dbEnabled],
  );

  const addRecurringTask = useCallback(
    (input: {
      summary: string;
      category: string;
      recurrence: TaskRecurrence;
      startIso?: string;
      endIso?: string;
    }) => {
      const style = getCategoryStyle(input.category);
      const task: PlannerTask = {
        id: crypto.randomUUID?.() ?? `task-${Date.now()}`,
        summary: input.summary,
        timetableLabel: input.summary.slice(0, 12),
        isTimeFixed: true,
        startIso: input.startIso,
        endIso: input.endIso,
        category: input.category,
        categoryColor: style.bg,
        createdOrder: tasks.length,
        listOrder: tasks.length,
        completed: false,
        recurrence: input.recurrence,
      };
      setTasks((prev) => [...prev, task]);
      if (dbEnabled) {
        createTask(task).catch(() => undefined);
      }
    },
    [tasks.length, dbEnabled],
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
    deleteTask,
    categories,
    addCategory,
    updateCategory,
    removeCategory,
    addRecurringTask,
    updateTask,
    getTasksForDate,
    editingTask,
    setEditingTask,
    resetChat,
    hydrated,
  };

  return (
    <RingoContext.Provider value={value}>
      {children}
      <TaskEditSheet
        task={editingTask}
        open={Boolean(editingTask)}
        onOpenChange={(open) => {
          if (!open) setEditingTask(null);
        }}
      />
    </RingoContext.Provider>
  );
}

export function useRingo() {
  const ctx = useContext(RingoContext);
  if (!ctx) throw new Error("useRingo must be used within RingoProvider");
  return ctx;
}

/** @deprecated use useRingo */
export const usePlannerState = useRingo;
