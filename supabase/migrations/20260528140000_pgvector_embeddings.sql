-- pgvector for RAG chunk search (run after task_pages migration)

create extension if not exists vector with schema extensions;

alter table public.ringo_document_chunks
  add column if not exists embedding extensions.vector(768);

create index if not exists ringo_document_chunks_embedding_idx
  on public.ringo_document_chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 50);

create or replace function public.match_document_chunks(
  query_embedding extensions.vector(768),
  filter_task_id uuid,
  match_count int default 8
)
returns table (
  id uuid,
  content text,
  similarity float
)
language sql stable
as $$
  select
    c.id,
    c.content,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.ringo_document_chunks c
  join public.ringo_attachments a on a.id = c.attachment_id
  where a.task_id = filter_task_id
    and c.embedding is not null
  order by c.embedding <=> query_embedding
  limit match_count;
$$;
