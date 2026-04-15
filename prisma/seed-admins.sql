-- Seed the two current admins; 5803735374 = super
insert into admins (telegram_id, is_super) values
  (5803735374, true),
  (543847007, false)
on conflict (telegram_id) do nothing;

-- Default festival date
insert into settings (key, value) values
  ('festival_date', '2026-04-25T09:00:00'),
  ('festival_location', 'Toshkent')
on conflict (key) do nothing;

-- RLS policies for the new tables
alter table news enable row level security;
alter table programs enable row level security;
alter table admins enable row level security;
alter table settings enable row level security;

drop policy if exists "anon all news" on news;
create policy "anon all news" on news for all to anon using (true) with check (true);

drop policy if exists "anon all programs" on programs;
create policy "anon all programs" on programs for all to anon using (true) with check (true);

drop policy if exists "anon all admins" on admins;
create policy "anon all admins" on admins for all to anon using (true) with check (true);

drop policy if exists "anon all settings" on settings;
create policy "anon all settings" on settings for all to anon using (true) with check (true);
