-- Permissive RLS so the frontend (anon key) can read/write via supabase-js.
-- Tighten later once an auth strategy is in place.

alter table users enable row level security;
alter table tickets enable row level security;
alter table suggestions enable row level security;

drop policy if exists "anon all users" on users;
create policy "anon all users" on users for all to anon using (true) with check (true);

drop policy if exists "anon all tickets" on tickets;
create policy "anon all tickets" on tickets for all to anon using (true) with check (true);

drop policy if exists "anon all suggestions" on suggestions;
create policy "anon all suggestions" on suggestions for all to anon using (true) with check (true);
