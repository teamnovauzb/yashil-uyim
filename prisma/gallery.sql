-- Admin-managed home gallery: images and short videos shown above the
-- "Festivalda ishtirok eting!" features section. Backed by Supabase storage
-- bucket `media` under the `gallery/` prefix.

create table if not exists public.gallery (
  id            bigserial   primary key,
  media_type    text        not null check (media_type in ('image', 'video')),
  media_url     text        not null,
  thumbnail_url text,
  caption       text,
  sort_order    int         not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists gallery_sort_idx
  on public.gallery (sort_order desc, created_at desc);

alter table public.gallery enable row level security;

drop policy if exists "anon all gallery" on public.gallery;
create policy "anon all gallery" on public.gallery
  for all to anon using (true) with check (true);
