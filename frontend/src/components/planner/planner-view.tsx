"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRingo } from "@/hooks/use-ringo-store";
import { ChatPanel } from "./chat-panel";
import { DiarySection } from "./diary-section";
import { PlannerHeader } from "./planner-header";
import { TaskList } from "./task-list";
import { Timetable } from "./timetable";

export function PlannerView() {
  const {
    selectedDate,
    setSelectedDate,
    formattedDate,
    tasksForDay,
    diary,
    setDiary,
    onDragEnd,
    toggleComplete,
    hydrated,
  } = useRingo();

  if (!hydrated) {
    return (
      <div className="flex h-full items-center justify-center text-orange-800">
        Ringo 불러오는 중…
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      <div className="shrink-0 px-4 pt-4 pb-1 md:px-6 md:pt-5">
        <PlannerHeader
          formattedDate={formattedDate}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          taskCount={tasksForDay.length}
        />
      </div>

      <div className="mx-auto hidden min-h-0 w-full max-w-[1600px] flex-1 gap-4 px-4 pb-4 md:px-6 md:pb-6 lg:grid lg:grid-cols-[minmax(280px,320px)_minmax(0,1fr)]">
        <div className="flex min-h-0 flex-col">
          <ChatPanel className="h-full min-h-0" />
        </div>
        <div className="flex min-h-0 flex-col gap-4">
          <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-2">
            <TaskList
              className="h-full"
              tasks={tasksForDay}
              onDragEnd={onDragEnd}
              onToggleComplete={toggleComplete}
            />
            <Timetable className="h-full" tasks={tasksForDay} dayIso={selectedDate} />
          </div>
          <DiarySection value={diary} onChange={setDiary} />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 lg:hidden">
        <Tabs defaultValue="planner" className="flex min-h-0 flex-1 flex-col gap-3">
          <TabsList className="grid w-full shrink-0 grid-cols-2 rounded-2xl bg-orange-100/50 p-1">
            <TabsTrigger value="planner" className="rounded-xl">
              플래너
            </TabsTrigger>
            <TabsTrigger value="chat" className="rounded-xl">
              Ringo 채팅
            </TabsTrigger>
          </TabsList>
          <TabsContent
            value="planner"
            className="mt-0 flex min-h-0 flex-1 flex-col gap-3 data-[state=inactive]:hidden"
          >
            <div className="grid min-h-0 flex-1 gap-3 sm:grid-cols-2">
              <TaskList
                className="min-h-[280px]"
                tasks={tasksForDay}
                onDragEnd={onDragEnd}
                onToggleComplete={toggleComplete}
              />
              <Timetable
                className="min-h-[280px]"
                tasks={tasksForDay}
                dayIso={selectedDate}
              />
            </div>
            <DiarySection value={diary} onChange={setDiary} />
          </TabsContent>
          <TabsContent
            value="chat"
            className="mt-0 min-h-0 flex-1 data-[state=inactive]:hidden"
          >
            <ChatPanel className="h-full min-h-[50vh]" />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
