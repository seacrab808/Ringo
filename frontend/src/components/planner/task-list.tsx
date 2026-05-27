"use client";

import { useEffect, useState } from "react";
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd";
import { GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getCategoryStyle } from "@/lib/categories";
import { formatTimeRange } from "@/lib/planner-hours";
import type { PlannerTask } from "@/types/schedule";

interface TaskListProps {
  tasks: PlannerTask[];
  onDragEnd: (source: number, dest: number) => void;
  onToggleComplete: (id: string) => void;
  className?: string;
}

export function TaskList({
  tasks,
  onDragEnd,
  onToggleComplete,
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
                    <Draggable key={task.id} draggableId={task.id} index={index}>
                      {(drag, snapshot) => (
                        <li
                          ref={drag.innerRef}
                          {...drag.draggableProps}
                          {...drag.dragHandleProps}
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
                            <div className="min-w-0 flex-1">
                              <p
                                className={cn(
                                  "font-medium text-stone-900",
                                  task.completed && "line-through opacity-60",
                                )}
                              >
                                {task.summary}
                              </p>
                              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                <Badge
                                  variant="secondary"
                                  className="rounded-lg bg-white/70 text-[10px] font-normal text-stone-700"
                                >
                                  {cat.label}
                                </Badge>
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
                            </div>
                            <div className="mt-1 shrink-0 text-stone-500">
                              <GripVertical className="h-5 w-5" />
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
