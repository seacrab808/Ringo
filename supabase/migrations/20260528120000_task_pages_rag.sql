-- Task pages: memo, attachments, RAG chunks, generated study guides

create table if not exists public.ringo_task_pages (
  task_id uuid primary key references public.ringo_tasks (id) on delete cascade,
  memo text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ringo_attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.ringo_tasks (id) on delete cascade,
  filename text not null,
  mime_type text not null default 'application/pdf',
  storage_path text not null,
  kind text not null default 'lecture', -- lecture | example_guide | summary_pdf
  byte_size bigint not null default 0,
  extracted_text text,
  created_at timestamptz not null default now()
);

create index if not exists ringo_attachments_task_id_idx
  on public.ringo_attachments (task_id);

create table if not exists public.ringo_document_chunks (
  id uuid primary key default gen_random_uuid(),
  attachment_id uuid not null references public.ringo_attachments (id) on delete cascade,
  chunk_index int not null,
  content text not null,
  token_estimate int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists ringo_document_chunks_attachment_idx
  on public.ringo_document_chunks (attachment_id, chunk_index);

create table if not exists public.ringo_study_guides (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.ringo_tasks (id) on delete cascade,
  body_markdown text not null,
  model text not null default '',
  source_attachment_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists ringo_study_guides_task_id_idx
  on public.ringo_study_guides (task_id, created_at desc);

drop trigger if exists ringo_task_pages_updated_at on public.ringo_task_pages;
create trigger ringo_task_pages_updated_at
  before update on public.ringo_task_pages
  for each row execute function public.ringo_set_updated_at();
