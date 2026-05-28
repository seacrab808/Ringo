-- Habit tracker + GitHub commit logs

create table if not exists public.ringo_habits (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  emoji text not null default '✅',
  frequency text not null default 'daily',
  target_count int not null default 1,
  enabled boolean not null default true,
  auto_github boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.ringo_habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.ringo_habits(id) on delete cascade,
  log_date date not null,
  completed boolean not null default false,
  source text not null default 'manual',
  note text not null default '',
  created_at timestamptz not null default now(),
  unique (habit_id, log_date)
);

create index if not exists ringo_habit_logs_date_idx
  on public.ringo_habit_logs (log_date);

create table if not exists public.ringo_habit_settings (
  id int primary key default 1 check (id = 1),
  github_username text not null default '',
  last_github_sync_at timestamptz,
  last_github_sync_message text
);

insert into public.ringo_habit_settings (id) values (1)
on conflict (id) do nothing;
