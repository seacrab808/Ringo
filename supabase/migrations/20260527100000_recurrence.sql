-- Recurring semester schedules on tasks (template rows)

alter table public.ringo_tasks
  add column if not exists recurrence jsonb;

comment on column public.ringo_tasks.recurrence is
  'Weekly semester rule: {frequency, by_day[], by_hour, by_minute, semester_start, semester_end, cancelled_dates[]}';

create index if not exists ringo_tasks_recurrence_idx
  on public.ringo_tasks ((recurrence is not null))
  where recurrence is not null;
