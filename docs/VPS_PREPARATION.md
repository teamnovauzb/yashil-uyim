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
- Explicit export/import/reconciliation tools and a Docker Compose/Caddy deployment definition. No ticket-retention deletion job exists on the VPS backend.

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

`server:test` uses embedded PostgreSQL (PGlite) and mock Telegram transport. `test:postgres` creates and removes only its own randomly named local PostgreSQL 17 container; it does not build an application or use existing databases. The harness refuses external database hosts or a non-test database user. Both run the same authentication, authorization, receipt, approval, concurrent scanner/worker, reminder, and migration tests.

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

These are instructions for a **new, isolated target** after server/domain credentials are supplied. They have not been executed. Do not run them against the upcoming event's existing system.

1. Configure a private server firewall and DNS. Copy `deploy/.env.example` to `deploy/.env`; supply the actual domain, a hex database password, independent random secrets, and a **test** bot initially. Keep `ENABLE_TELEGRAM_DELIVERY=false`. Restrict the file to the operator (`chmod 600`). PostgreSQL/API ports are not published; Caddy is the only public entry point.
2. At the worktree root, produce the future web bundle with `npm run build:vps`. This writes `dist-vps`, never `dist`. The current task deliberately did not run this command. A website served on the API domain uses an empty `VITE_API_URL`.
3. In `deploy`, build only the new backend (`docker compose build api`), start the new database (`docker compose up -d db`), and initialize its schema:

   ```sh
   docker compose run --rm --no-deps api sh -c 'MIGRATION_TARGET_URL="$DATABASE_URL" node scripts/migrate.js --apply'
   docker compose up -d api web
   ```

4. Copy a rehearsal snapshot into the target backup volume as the application user:

   ```sh
   docker compose exec -T api mkdir -p /app/backups/migration
   tar -C /secure/path/to/snapshot -cf - . | docker compose exec -T api tar -xf - -C /app/backups/migration
   docker compose exec -T -e SNAPSHOT_DIR=/app/backups/migration api sh -c 'MIGRATION_TARGET_URL="$DATABASE_URL" node scripts/transfer.js import'
   ```

   Review the plan, then repeat the last command with `import --apply`. Run `verify` the same way. Use a fresh empty target for every rehearsal; importing over existing records is intentionally refused.
5. Only after reconciliation, configure the actual bootstrap super-admin IDs and run `scripts/bootstrap-admins.js --apply` with the explicit target variable as above. Granting these roles before reconciliation can legitimately change the expected row counts. Configure the test bot webhook manually with the matching `TELEGRAM_WEBHOOK_SECRET`; no repository script changes a webhook automatically. Verify login, receipt approval, QR display, two-device scanning, and denied permissions on the test system.
6. Before the eventual final switch, freeze the old system, make fresh source/target backups, repeat export/import/verification to a fresh target, and verify all owners/assets/check-ins. Update website/Mini App routing and the production bot webhook together. Resume a single bot/worker only after validation. Set `ENABLE_TELEGRAM_DELIVERY=true` and start exactly one worker with `docker compose --profile deliveries up -d worker` when queued broadcasts/reminders have been reviewed.

`deploy/backup.sh` stops only previously running target API/worker services, saves the database and uploads consistently, hashes them, and restarts those services. Schedule it on the new VPS and copy backups off-server. A backup without its matching uploaded files is incomplete. Test a restore into a separate empty PostgreSQL instance and upload volume before cutover; never test restore over the serving database.

Before target writes resume, rollback means returning routing/webhook to the frozen old system and stopping the target worker. After target writes resume, route-only rollback would lose new users/tickets/check-ins: freeze the target, export/reconcile its new data, and plan the reverse transfer first. Never restore an older database over newer transactions.

## Mobile handoff

The implementation follows the existing green festival palette: low visual variance (3), low motion (2), comfortable density (4), visible labels, a paste/autofill-friendly code field, 48px controls, safe-area CSS, and network/error recovery. Android gets a back-button integration; iOS uses the native WebView/system browser. Native refresh storage is used only on native platforms; the secure-storage plugin's browser localStorage fallback is never called.

After the target API is ready, set `VITE_API_URL` to its HTTPS origin in a worktree-local `.env.vps.local`, run `npm run build:vps`, then:

```sh
npm run mobile:init -- android
npm run mobile:sync
# On macOS/Xcode, use ios instead of android.
```

The initialization script adds camera permission descriptions and generates local native projects. It refuses to build assets for you and refuses iOS generation outside macOS. Generated projects are ignored; the committed configuration/initialization script is the source of truth. Set the final app identifier before store registration. Store icons, signing, privacy/support pages, store-required account-management behavior, native bundle builds, and physical Android/iPhone permission/keyboard/storage/scanner tests remain release tasks. Push notifications are not implemented; Telegram plus in-app ticket status remain the notification paths.

## Operational limits

- Telegram delivery has durable retries and single-claim leases. Telegram does not offer an idempotency key: a process crash after Telegram accepts a message but before the database acknowledges it can still cause a duplicate. Do not claim exactly-once delivery.
- This system intentionally has no automatic ticket/receipt deletion. Choose and implement an event-aware retention/archive policy before adding scheduled deletion.
- No actual source schema, production storage inventory, VPS configuration, bot/webhook, native build, or device behavior has been verified in this preparation. The import's strict schema checks will expose differences when credentials arrive.
