"use client";

import { useEffect, useState } from "react";
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd";
import { CalendarX2, GripVertical, Repeat, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getCategoryStyle } from "@/lib/categories";
import { formatTimeRange } from "@/lib/planner-hours";
import type { PlannerTask } from "@/types/schedule";

interface TaskListProps {
  tasks: PlannerTask[];
  onDragEnd: (source: number, dest: number) => void;
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (task: PlannerTask) => void;
  className?: string;
}

export function TaskList({
  tasks,
  onDragEnd,
  onToggleComplete,
  onDelete,
  onEdit,
  className,
}: TaskListProps) {
  const [dndReady, setDndReady] = useState(false);

  useEffect(() => {
    setDndReady(true);
  }, []);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    if (result.source.index === result.destination.index) return;
    onDragEnd(result.source.index, result.destination.index);
  };

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col rounded-3xl bg-white/95 shadow-sm ring-1 ring-stone-200/60",
        className,
      )}
    >
      <div className="shrink-0 border-b border-stone-100 px-4 py-3">
        <h2 className="text-sm font-semibold tracking-wide text-stone-800">TASK</h2>
        <p className="text-xs text-muted-foreground">⋮⋮ 잡고 드래그해서 순서 변경</p>
      </div>

      {!dndReady ? (
        <div className="flex flex-1 items-center justify-center p-4 text-sm text-muted-foreground">
          목록 불러오는 중…
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="ringo-tasks">
            {(provided) => (
              <ul
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2"
              >
                {tasks.length === 0 && (
                  <li className="px-3 py-8 text-center text-sm text-muted-foreground">
                    Ringo에게 일정을 말해보세요
                  </li>
                )}
                {tasks.map((task, index) => {
                  const cat = getCategoryStyle(task.category);
                  return (
                    <Draggable
                      key={task.id}
                      draggableId={task.id}
                      index={index}
                      isDragDisabled={Boolean(task.recurrenceInstance)}
                    >
                      {(drag, snapshot) => (
                        <li
                          ref={drag.innerRef}
                          {...drag.draggableProps}
                          className={cn(
                            "rounded-2xl touch-none",
                            snapshot.isDragging &&
                              "z-50 shadow-lg ring-2 ring-orange-300",
                          )}
                          style={{
                            ...drag.draggableProps.style,
                            backgroundColor: task.categoryColor || cat.bg,
                          }}
                        >
                          <div className="flex items-start gap-2 px-2 py-2.5">
                            <button
                              type="button"
                              onClick={() => onToggleComplete(task.id)}
                              className={cn(
                                "mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-stone-400 bg-white text-xs",
                                task.completed &&
                                  "border-green-600 bg-green-500 text-white",
                              )}
                              aria-label="완료 토글"
                            >
                              {task.completed ? "✓" : ""}
                            </button>
                            <button
                              type="button"
                              className="min-w-0 flex-1 text-left"
                              onClick={() => onEdit(task)}
                            >
                              <p
                                className={cn(
                                  "flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-base font-medium leading-snug text-stone-900",
                                  task.completed && "line-through opacity-60",
                                )}
                              >
                                <span className="shrink-0 text-stone-700">
                                  {cat.label}
                                </span>
                                <span className="hover:underline">{task.summary}</span>
                              </p>
                              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                {task.recurrenceInstance && (
                                  <Badge className="rounded-lg bg-white/80 text-[10px] text-violet-700">
                                    <Repeat className="mr-0.5 inline h-3 w-3" />
                                    매주
                                  </Badge>
                                )}
                                {task.isTimeFixed && task.startIso && (
                                  <span className="text-[11px] font-medium text-stone-600">
                                    {formatTimeRange(task.startIso, task.endIso)}
                                  </span>
                                )}
                                {!task.isTimeFixed && task.deadlineIso && (
                                  <span className="text-[11px] text-amber-800">
                                    ~{" "}
                                    {new Date(task.deadlineIso).toLocaleDateString(
                                      "ko-KR",
                                      { month: "short", day: "numeric" },
                                    )}{" "}
                                    까지
                                  </span>
                                )}
                              </div>
                            </button>
                            <div className="mt-0.5 flex shrink-0 flex-col items-center gap-0.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDelete(task.id);
                                }}
                                className="rounded-lg p-1 text-stone-400 hover:bg-white/60 hover:text-red-600"
                                aria-label={
                                  task.recurrenceInstance ? "오늘 휴강" : "삭제"
                                }
                                title={
                                  task.recurrenceInstance ? "오늘만 휴강" : "삭제"
                                }
                              >
                                {task.recurrenceInstance ? (
                                  <CalendarX2 className="h-4 w-4" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </button>
                              <div
                                className="text-stone-500"
                                {...drag.dragHandleProps}
                              >
                                <GripVertical className="h-5 w-5" />
                              </div>
                            </div>
                          </div>
                        </li>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </ul>
            )}
          </Droppable>
        </DragDropContext>
      )}
    </div>
  );
}
