# Local VPS and mobile preparation

This work is on `codex/vps-ready`, based on `c56c6c6`, in the sibling checkout `D:/Projects/teamnovauzb/yashiluyim-vps-ready`. The original `yashiluyim` checkout remains on `main`. Keeping this work outside the original directory also avoids changing its Tailwind/tooling file scanning. Nothing here is pushed, deployed, connected to the existing Supabase project, or registered with Telegram. No production or native application bundle was built. Existing `dist`, `.env`, `.vercel`, `api/`, and Supabase SQL in the original checkout are untouched.

The upcoming festival should continue using the existing deployment. Schedule the eventual cutover separately, preferably after the event. Committing this branch locally does not switch the application or repair the live deployment's existing security issues.

## What is implemented

- An independent Fastify/Node 24 API with private PostgreSQL access. Only the new API is mounted by the VPS container; legacy Vercel handlers and permissive Supabase policies are excluded.
- Telegram bot code login bound to an app-generated verifier. Codes expire after five minutes, have five attempts, and work once. The bot first receives a private `/start login_<challenge>` deep link; a phone number or username alone is never accepted as identity.
- Server-validated Telegram `initData` for the future VPS-backed Mini App. Authentication and authorization are checked on every protected request; submitted Telegram/admin IDs are not trusted.
- Revocable, rotating refresh sessions: native refresh tokens use iOS Keychain/Android Keystore; browser refresh tokens use HttpOnly cookies. Telegram embedded clients keep refresh tokens in memory to avoid dependence on third-party cookies. Access tokens are kept in memory. No authentication tokens go to localStorage/sessionStorage.
- Private, normalized receipt images; signed receipt/QR links; bounded image/video uploads; streamed files and video range requests. Public gallery content and private ticket assets have separate access rules.
- Transactional, idempotent checkout and ticket approval. Server-generated ticket numbers, client request keys, preserved QR tokens on repeated approval, atomic single-seat check-in, super-admin-only reset, and audit records.
- Durable Telegram delivery jobs, retry leases, role-checked callbacks, webhook authentication, and Tashkent-time program reminders. QR delivery is generated from stored tokens, independently of QR file-upload availability.
- An opt-in frontend adapter (`VITE_BACKEND=vps`) reusing the existing screens, a code-login screen, logout, and Capacitor configuration for Android/iOS. The default mode still uses the existing Supabase/Telegram integration.
- Explicit export/import/reconciliation tools and a native Nginx/systemd shared-host profile and a separate standalone Docker/Caddy definition. No ticket-retention deletion job exists on the VPS backend.

## Local verification

Run from this worktree, not the original checkout:

```sh
npm ci
npm ci --prefix server
npm run lint:vps
npm run check --prefix server
npm run server:test
npm run test:postgres
npm run test:e2e
npm run test:legacy
```

`server:test` uses embedded PostgreSQL (PGlite) and mock Telegram transport. `test:postgres` creates and removes only its own randomly named local PostgreSQL 18 container (or explicitly selected 17); it does not build an application or use existing databases. The harness refuses external database hosts or a non-test database user. Both run the same authentication, authorization, receipt, approval, concurrent scanner/worker, reminder, and migration tests.

Browser checks use a local Vite development server, mocked API responses, and blocked external requests. They exercise code entry/error recovery, profile/logout, administrator navigation, and compatibility with the default browser/Telegram modes. They do not contact Supabase or send Telegram messages. Screenshots/traces stay under ignored `.local/`.

The targeted lint command covers new VPS/mobile code. The repository-wide lint command still reports pre-existing React hook/unused JSX-variable findings in legacy components. Production dependency audits for both package roots pass; development tooling may report separate advisories and must be reviewed before release tooling is run. No forced major dependency upgrade is included.

## Local interactive development

Use a new local database and a separate test bot. Copy `server/.env.example` to `server/.env`, fill its test values, and set `MIGRATION_TARGET_URL` to the new local database explicitly. Schema and administrator writes require an explicit flag:

```sh
cd server
npm run migrate -- --apply
node --env-file=.env scripts/bootstrap-admins.js --apply
npm start
```

In another terminal at this worktree root:

```sh
npm run dev:vps -- --host 127.0.0.1 --port 4173 --strictPort
```

`VITE_API_URL` can stay empty for browser development; Vite proxies `/api` to the local server. Do not copy the original live `.env` or use the existing bot token to test. A local web server cannot receive Telegram webhooks without a separately configured HTTPS test endpoint. The automated tests mock this interaction.

## Migration design

Export requires **explicit** `SOURCE_DATABASE_URL`, `SOURCE_SUPABASE_URL`, `SOURCE_STORAGE_KEY`, and a new `SNAPSHOT_DIR`. It opens a repeatable-read, read-only database transaction and separately downloads all objects from the `receipts` and `media` buckets. It writes a manifest last, recording row counts and SHA-256 hashes. No source write operation is implemented.

```sh
# Environment supplied privately; credentials never go in command arguments or Git.
cd server
npm run migration:export
```

Import/verify require **explicit** `MIGRATION_TARGET_URL`; they do not fall back to application or source credentials:

```sh
npm run migration:import             # Plan only
npm run migration:import -- --apply  # Empty target only
npm run migration:verify             # Per-record values and per-file hashes
```

Import preserves database IDs, Telegram identities, QR tokens, check-in timestamps, receipt/media bytes, and job state. It maps stored Supabase URLs to local file references and advances all sequences. Historical ticket/admin owners absent from `users` get deterministic placeholder rows, reported in the plan. It rejects unknown public tables/columns, missing referenced files, partial seat sets, changed checksums, or populated targets. Do not regenerate existing tickets/QR codes during migration.

Historical anonymous tickets stay anonymous. Claiming them through a matching phone number alone is not implemented; any future account linking must verify ownership.

The source export is a database snapshot, not a distributed snapshot of database plus storage. For the final export, stop source writes/uploads and the source bot/worker first, then export and reconcile. Rehearsal exports must never be used for an eventual live switch while the original app continues receiving tickets.

## Future VPS setup and cutover

For the assessed shared Hetzner server, use [deploy/hetzner/README.md](../deploy/hetzner/README.md). That profile uses the existing Nginx and PostgreSQL 18 with dedicated systemd services, runtime/migration database roles, and a new application domain. It does not install Docker/Caddy or replace existing sites/services. All files remain local; installation, configuration reloads, data transfer, and cutover require a later explicit deployment instruction.

The separate fresh-host Docker/Caddy reference is now deploy/compose.standalone.yml and must be selected explicitly with docker compose -f compose.standalone.yml. It must not be used on the shared server. The older deploy/backup.sh is only for that standalone Docker profile; deploy/hetzner/backup.sh is the native shared-host backup.

## Mobile handoff

The requested store-facing variant is now the **guest app**, described in [PUBLIC_GUEST_APP.md](PUBLIC_GUEST_APP.md). It uses `dist-public`, no login, and the configurable VPS public content endpoint. Its API URL will be set after the later deployment. The authenticated mobile profile below remains an explicit alternative, not the guest app's default.

The implementation follows the existing green festival palette: low visual variance (3), low motion (2), comfortable density (4), visible labels, a paste/autofill-friendly code field, 48px controls, safe-area CSS, and network/error recovery. Android gets a back-button integration; iOS uses the native WebView/system browser. Native refresh storage is used only on native platforms; the secure-storage plugin's browser localStorage fallback is never called.

After the target API is ready, set `VITE_API_URL` to its HTTPS origin in a worktree-local `.env.vps.local`, run `npm run build:vps`, then:

```sh
npm run mobile:init -- android vps
npm run mobile:sync -- vps
# On macOS/Xcode, use ios instead of android.
```

The initialization script adds camera permission descriptions and generates local native projects. It refuses to build assets for you and refuses iOS generation outside macOS. Generated projects are ignored; the committed configuration/initialization script is the source of truth. Set the final app identifier before store registration. Store icons, signing, privacy/support pages, store-required account-management behavior, native bundle builds, and physical Android/iPhone permission/keyboard/storage/scanner tests remain release tasks. Push notifications are not implemented; Telegram plus in-app ticket status remain the notification paths.

## Operational limits

- Telegram delivery has durable retries and single-claim leases. Telegram does not offer an idempotency key: a process crash after Telegram accepts a message but before the database acknowledges it can still cause a duplicate. Do not claim exactly-once delivery.
- This system intentionally has no automatic ticket/receipt deletion. Choose and implement an event-aware retention/archive policy before adding scheduled deletion.
- The server inventory was inspected read-only in the earlier audit; no remote connection or server write was performed during the shared-host adaptation. Actual source schema/storage migration, bot/webhook, target installation, native builds, and device behavior remain unverified. The import's strict schema checks will expose differences when credentials arrive.
