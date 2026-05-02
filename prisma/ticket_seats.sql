-- One row per individual seat / QR code on a ticket.
-- Each seat carries its own qr_token (single-use), so a 3-person ticket gets
-- 3 QRs and each can be checked in independently.

create table if not exists public.ticket_seats (
  ticket_id      bigint      not null references public.tickets(id) on delete cascade,
  seat_index     int         not null check (seat_index >= 1),
  qr_token       text        not null unique,
  qr_url         text,
  checked_in_at  timestamptz,
  created_at     timestamptz not null default now(),
  primary key (ticket_id, seat_index)
);

create index if not exists ticket_seats_qr_token_idx on public.ticket_seats (qr_token);
create index if not exists ticket_seats_ticket_id_idx on public.ticket_seats (ticket_id);

alter table public.ticket_seats enable row level security;

drop policy if exists "anon all ticket_seats" on public.ticket_seats;
create policy "anon all ticket_seats" on public.ticket_seats
  for all to anon using (true) with check (true);
