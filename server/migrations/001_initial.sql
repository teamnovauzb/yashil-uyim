CREATE TABLE users (
 telegram_id bigint PRIMARY KEY, username text, first_name text, last_name text,
 phone text, is_tester boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE admins (
 telegram_id bigint PRIMARY KEY REFERENCES users(telegram_id), username text, first_name text,
 is_super boolean NOT NULL DEFAULT false, added_by bigint, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE SEQUENCE ticket_number_seq START 100000;
CREATE TABLE tickets (
 id bigserial PRIMARY KEY, ticket_number integer UNIQUE DEFAULT nextval('ticket_number_seq'),
 full_name text NOT NULL, phone text NOT NULL, ticket_count integer NOT NULL DEFAULT 1,
 status text NOT NULL DEFAULT 'pending', chat_id bigint REFERENCES users(telegram_id),
 receipt_url text, qr_token text UNIQUE, qr_url text, checked_in_count integer NOT NULL DEFAULT 0,
 last_checkin_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), request_key uuid UNIQUE
);
CREATE INDEX tickets_owner_idx ON tickets(chat_id, created_at DESC);
CREATE TABLE ticket_seats (
 ticket_id bigint NOT NULL REFERENCES tickets(id) ON DELETE CASCADE, seat_index integer NOT NULL CHECK(seat_index>0),
 qr_token text NOT NULL UNIQUE, qr_url text, checked_in_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(ticket_id, seat_index)
);
CREATE TABLE suggestions (
 id bigserial PRIMARY KEY, full_name text, email text, phone text, message text NOT NULL,
 chat_id bigint REFERENCES users(telegram_id), reply text, replied_at timestamptz, replied_by bigint,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX suggestions_owner_idx ON suggestions(chat_id, created_at DESC);
CREATE TABLE news (
 id bigserial PRIMARY KEY, title text NOT NULL, content text NOT NULL, image_url text,
 published_at timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE programs (
 id bigserial PRIMARY KEY, title text NOT NULL, description text, speaker text, category text,
 image_url text, start_time text, end_time text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE gallery (
 id bigserial PRIMARY KEY, media_type text NOT NULL CHECK(media_type IN ('image','video')),
 media_url text NOT NULL, thumbnail_url text, caption text, sort_order integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE settings (key text PRIMARY KEY, value text NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE broadcasts (
 id bigserial PRIMARY KEY, message text NOT NULL, recipients text[] NOT NULL DEFAULT '{}',
 next_offset integer NOT NULL DEFAULT 0, sent integer NOT NULL DEFAULT 0, failed integer NOT NULL DEFAULT 0,
 done boolean NOT NULL DEFAULT false, created_by bigint, created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(), last_error text, failed_recipients text[] NOT NULL DEFAULT '{}',
 retry_count integer NOT NULL DEFAULT 0, fire_at timestamptz, program_id bigint, audience text NOT NULL DEFAULT 'all',
 expanded_at timestamptz
);
CREATE TABLE login_challenges (
 id text PRIMARY KEY, verifier_hash text NOT NULL, telegram_id bigint REFERENCES users(telegram_id),
 code_hash text, attempts integer NOT NULL DEFAULT 0, expires_at timestamptz NOT NULL,
 consumed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE sessions (
 id uuid PRIMARY KEY, telegram_id bigint NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
 access_hash text NOT NULL UNIQUE, refresh_hash text NOT NULL UNIQUE,
 access_expires_at timestamptz NOT NULL, expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), revoked_at timestamptz
);
CREATE TABLE telegram_updates (id bigint PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE deliveries (
 id bigserial PRIMARY KEY, job_id bigint REFERENCES broadcasts(id) ON DELETE CASCADE,
 dedupe_key text NOT NULL UNIQUE, chat_id bigint NOT NULL, kind text NOT NULL DEFAULT 'message',
 payload jsonb NOT NULL, status text NOT NULL DEFAULT 'pending', attempts integer NOT NULL DEFAULT 0,
 available_at timestamptz NOT NULL DEFAULT now(), leased_until timestamptz,
 lease_token uuid, last_error text, created_at timestamptz NOT NULL DEFAULT now(), sent_at timestamptz
);
CREATE INDEX deliveries_pending_idx ON deliveries(status, available_at);
CREATE TABLE audit_log (
 id bigserial PRIMARY KEY, actor_id bigint, action text NOT NULL, entity_type text NOT NULL,
 entity_id text, details jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
