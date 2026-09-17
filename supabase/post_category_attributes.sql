-- SHAKH dynamic post attributes
-- Safe, additive migration. Existing posts and columns are preserved.
begin;

alter table public.posts
  add column if not exists attributes jsonb not null default '{}'::jsonb;

create index if not exists posts_attributes_gin_idx
  on public.posts using gin (attributes);

commit;
