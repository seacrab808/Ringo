-- Ringo MVP schema (single-user; access via FastAPI service role)

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Categories (optional presets; tasks still store slug + color denormalized)
-- ---------------------------------------------------------------------------
create table if not exists public.ringo_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  color_hex text not null default '#FDBA74',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

insert into public.ringo_categories (slug, label, color_hex, sort_order) values
  ('class', '수업', '#93C5FD', 0),
  ('ta', '조교', '#A5B4FC', 1),
  ('research', '연구', '#C4B5FD', 2),
  ('health', '건강', '#86EFAC', 3),
  ('personal', '개인', '#FCD34D', 4),
  ('other', '기타', '#D6D3D1', 99)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Tasks
-- ---------------------------------------------------------------------------
create table if not exists public.ringo_tasks (
  id uuid primary key default gen_random_uuid(),
  summary text not null,
  timetable_label text not null,
  is_time_fixed boolean not null default false,
  planned_date date,
  start_at timestamptz,
  end_at timestamptz,
  deadline_at timestamptz,
  category text not null default 'other',
  category_color text not null default '#D6D3D1',
  created_order int not null default 0,
  list_order int not null default 0,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ringo_tasks_planned_date_idx
  on public.ringo_tasks (planned_date);

create index if not exists ringo_tasks_start_at_idx
  on public.ringo_tasks (start_at)
  where start_at is not null;

-- ---------------------------------------------------------------------------
-- Diaries (one entry per calendar day)
-- ---------------------------------------------------------------------------
create table if not exists public.ringo_diaries (
  id uuid primary key default gen_random_uuid(),
  diary_date date not null unique,
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ringo_diaries_diary_date_idx
  on public.ringo_diaries (diary_date);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.ringo_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists ringo_tasks_updated_at on public.ringo_tasks;
create trigger ringo_tasks_updated_at
  before update on public.ringo_tasks
  for each row execute function public.ringo_set_updated_at();

drop trigger if exists ringo_diaries_updated_at on public.ringo_diaries;
create trigger ringo_diaries_updated_at
  before update on public.ringo_diaries
  for each row execute function public.ringo_set_updated_at();

-- RLS: disabled for MVP (backend uses service role only).
alter table public.ringo_tasks enable row level security;
alter table public.ringo_diaries enable row level security;
alter table public.ringo_categories enable row level security;

-- No policies — anon/authenticated blocked; service_role bypasses RLS.
