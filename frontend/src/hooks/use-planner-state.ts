"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { eventsToTasks, mergeTasks, parseSchedule } from "@/lib/api";
import { getCategoryStyle } from "@/lib/categories";
import {
  assignAutoListOrder,
  ensureListOrder,
  orderByListOrder,
  reorderTasks,
} from "@/lib/task-sort";
import type { ChatMessage, PlannerTask } from "@/types/schedule";

const STORAGE_KEY = "ringo-planner-v2";

interface PlannerPersist {
  tasks: PlannerTask[];
  diary: string;
  messages: ChatMessage[];
  selectedDate: string;
}

function todayIso(): string {
  return format(new Date(), "yyyy-MM-dd");
}

const SAMPLE_TASKS: PlannerTask[] = [
  {
    id: "sample-1",
    summary: "소프트웨어공학 수업",
    timetableLabel: "SW공학",
    isTimeFixed: true,
    startIso: new Date(new Date().setHours(14, 0, 0, 0)).toISOString(),
    endIso: new Date(new Date().setHours(15, 0, 0, 0)).toISOString(),
    category: "class",
    categoryColor: getCategoryStyle("class").bg,
    createdOrder: 0,
    listOrder: 0,
    completed: false,
  },
  {
    id: "sample-2",
    summary: "이번 주 보고서 정리",
    timetableLabel: "보고서",
    isTimeFixed: false,
    deadlineIso: new Date(new Date().setDate(new Date().getDate() + 3)).toISOString(),
    category: "research",
    categoryColor: getCategoryStyle("research").bg,
    createdOrder: 1,
    listOrder: 1,
    completed: false,
  },
];

function loadPersist(): PlannerPersist | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PlannerPersist;
  } catch {
    return null;
  }
}

export function usePlannerState() {
  const [selectedDate, setSelectedDate] = useState(todayIso);
  const [tasks, setTasks] = useState<PlannerTask[]>(SAMPLE_TASKS);
  const [diary, setDiary] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "ringo",
      text: "안녕! 일정을 말해줘. 예: 「이번주 금요일 2시에 딥러닝 수업 있어」",
      at: new Date().toISOString(),
    },
  ]);
  const [parsing, setParsing] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = loadPersist();
    if (saved) {
      setTasks(
        ensureListOrder(saved.tasks.length ? saved.tasks : SAMPLE_TASKS),
      );
      setDiary(saved.diary);
      setMessages(saved.messages);
      setSelectedDate(saved.selectedDate);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const payload: PlannerPersist = { tasks, diary, messages, selectedDate };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [tasks, diary, messages, selectedDate, hydrated]);

  const sortedTasks = useMemo(() => orderByListOrder(tasks), [tasks]);

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
        const newTasks = eventsToTasks(res.events, tasks.length);
        if (newTasks.length === 0) {
          const hint =
            res.unparsed_fragments.length > 0
              ? `\n\n(파서 메모: ${res.unparsed_fragments.slice(0, 2).join("; ")})`
              : "";
          addMessage({
            role: "ringo",
            text: `일정을 제대로 못 읽었어. 날짜·시간·할 일을 한 문장으로 다시 말해줄래? 예) 이번주 금요일 오후 1시부터 5시까지 AI 세미나${hint}`,
          });
        } else {
          setTasks((prev) => mergeTasks(prev, newTasks));
          const titles = newTasks.map((t) => `· ${t.summary}`).join("\n");
          addMessage({
            role: "ringo",
            text: `등록했어!\n${titles}${
              res.unparsed_fragments.length
                ? `\n\n(참고: ${res.unparsed_fragments.join(", ")})`
                : ""
            }`,
          });
        }
      } catch (e) {
        const err = e instanceof Error ? e.message : "연결 실패";
        addMessage({
          role: "error",
          text: `백엔드에 연결하지 못했어 (${err}). 연구실 서버에서 FastAPI가 켜져 있는지 확인해줘.`,
        });
      } finally {
        setParsing(false);
      }
    },
    [addMessage, selectedDate, tasks.length],
  );

  const onDragEnd = useCallback((sourceIndex: number, destIndex: number) => {
    setTasks((prev) => reorderTasks(prev, sourceIndex, destIndex));
  }, []);

  const toggleComplete = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)),
    );
  }, []);

  const formattedDate = useMemo(() => {
    const d = new Date(selectedDate + "T12:00:00");
    return format(d, "M월 d일 EEEE", { locale: ko });
  }, [selectedDate]);

  return {
    selectedDate,
    setSelectedDate,
    formattedDate,
    tasks: sortedTasks,
    diary,
    setDiary,
    messages,
    parsing,
    sendChat,
    onDragEnd,
    toggleComplete,
    hydrated,
  };
}
