-- Background broadcast jobs. Created when a super admin saves a new event date;
-- drained in batches by /api/cron-broadcast-worker so we can scale past Vercel's
-- 10-second function timeout. Failed sends are re-queued for up to 3 retry
-- passes so every user actually gets notified.

create table if not exists public.broadcasts (
  id            bigserial   primary key,
  message       text        not null,
  recipients    text[]      not null default '{}',
  next_offset   int         not null default 0,
  sent          int         not null default 0,
  failed        int         not null default 0,
  done          boolean     not null default false,
  created_by    bigint,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  last_error    text
);

-- Idempotent additions (safe to re-run after the original table was created)
alter table public.broadcasts add column if not exists failed_recipients text[] not null default '{}';
alter table public.broadcasts add column if not exists retry_count       int    not null default 0;

create index if not exists broadcasts_pending_idx
  on public.broadcasts (created_at)
  where done = false;

alter table public.broadcasts enable row level security;

drop policy if exists "anon all broadcasts" on public.broadcasts;
create policy "anon all broadcasts" on public.broadcasts
  for all to anon using (true) with check (true);
