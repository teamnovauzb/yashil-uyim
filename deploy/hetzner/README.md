# Shared Hetzner host: local deployment preparation

Target assessed earlier on 2026-10-26: `37.27.5.14`, Ubuntu 26.04, Node 24, PostgreSQL 18.6, and Nginx 1.28. Existing Nginx occupies 80/443; PostgreSQL listens locally on 5432. Other PM2 applications and the classroom service are already serving users.

**These files have only been prepared and tested locally. Nothing has been installed, enabled, restarted, reloaded, deployed, or changed on the server.** Keep the existing Mini App on its current deployment through the upcoming event. The procedures below are a future operator handoff, not authorization to run them now.

## Layout and boundaries

| Component | New application only |
| --- | --- |
| Linux user/group | `yashiluyim` (no interactive shell) |
| Immutable release | `/srv/yashiluyim/releases/<commit>/server` and `web` |
| Selected release | `/srv/yashiluyim/current` |
| API | `127.0.0.1:3001`, `yashiluyim-api.service` |
| Worker | `yashiluyim-worker.service`, disabled until explicitly enabled |
| Runtime secrets | `/etc/yashiluyim/app.env`, root-owned mode 0600 |
| Maintenance secrets | `/etc/yashiluyim/maintenance.env`, root-owned mode 0600; never loaded into services |
| Private uploaded files | `/var/lib/yashiluyim/uploads`, owned by `yashiluyim`, mode 0700 |
| Source snapshots | `/var/lib/yashiluyim/import`, root-owned mode 0700 |
| ACME webroot | `/var/lib/yashiluyim/acme`, readable by Nginx |
| Data backups | `/var/backups/yashiluyim`, root-owned mode 0700 |
| PostgreSQL database | `yashiluyim` on the existing 18/main cluster |
| Database owner/login | `yashiluyim_migrator`, no superuser/CREATEDB/CREATEROLE privileges |
| Runtime database login | `yashiluyim_app`, DML only, no schema changes or table ownership |

The profile does not install Docker/Caddy, start a new PostgreSQL cluster, replace existing Nginx configuration, touch other databases/roles, or use PM2. The API and worker are distinct systemd units; their ordering references the existing cluster but does not start/restart it. Port 3001 was free during the earlier audit and must be rechecked immediately before installation. No database port or additional firewall port needs opening.

## Validate locally

From the isolated `yashiluyim-vps-ready` checkout:

```sh
npm run test:postgres -- 18
npm run check:hetzner
npm run lint:vps
```

The PostgreSQL runner defaults to 18 and verifies the actual major version; `-- 17` retains the older test option. It creates a randomly named, disposable local container bound to a random loopback port. Telegram transport is mocked. The existing integration/migration tests run unchanged, plus a profile test that executes these exact bootstrap/grant SQL files, validates HBA rules, exercises checkout/approval/check-in using the restricted runtime role, rejects cross-database logins/DDL/migration-history writes, refuses repeat bootstrap, and checks another database's sentinel data is unchanged. Docker port forwarding changes the test client's source address; only the disposable HBA fixture gets an extra exact-address Docker gateway allow rule. The deployment fragment remains loopback-only.

`check:hetzner` renders a fake `.test` domain locally, generates an ephemeral self-signed test certificate, runs `nginx -t` for both site variants with Nginx 1.28, and runs `systemd-analyze verify` in a disposable Ubuntu 26.04 container. The validator installs systemd validation tools only in that container and supplies a dummy Node executable for unit syntax checking. It does not start services, build an application, contact the target server, or prove real host/SELinux/AppArmor/resource-limit behavior. Native hardening still needs an eventual target smoke test. Temporary certificates/validation files are removed; no real secrets are committed.

## Future preflight, before any target write

After explicit deployment authorization, recheck current disk/RAM/ports and existing service health, choose a **new** domain, and confirm it is absent from existing Nginx sites. Verify `/usr/bin/node` is Node 24 and executable by the new service user; if Node only exists under `/root`, provide an approved system-wide executable and adjust both unit files first. Verify `/usr/lib/postgresql/18/bin/{psql,pg_dump}` and cluster `18/main` on 5432. Do not update/reboot the host or alter unrelated applications as part of this deployment.

Confirm none of the new Unix/database accounts, database, service names, release directories, or site names collide with existing resources. Stop and inspect any collision instead of taking ownership or replacing it. Choose a separate test bot for initial verification. Do not copy live Mini App environment files, change its public URL, or register the production bot webhook during rehearsal.

## Future installation sequence

1. Create only the new unprivileged Unix user/group and directories in the table. Keep release code root-owned and readable/executable by the service user; only uploads are writable by it. Nginx reads the `web` directory, never the backend source, secrets, snapshots, or private uploads. Files/directories copied from a release must not contain `.env`, source data snapshots, or development credentials.
2. Prepare a new immutable release outside the serving checkout. Build future web assets only when authorized, using `npm run build:vps` in the isolated/build checkout, then copy `dist-vps/` into the release's `web/`. Install Linux server dependencies with the committed server lockfile (`npm ci --omit=dev` in the release's `server/`), using Node 24. No frontend/native bundle was built during this adaptation.
3. Copy the two env examples privately to their `/etc/yashiluyim/` destinations, mode 0600. Replace every placeholder and generate independent 64-character hex passwords/secrets. Use the chosen domain consistently in `PUBLIC_URL`/`ALLOWED_ORIGINS`, leave the API on loopback, and keep `ENABLE_TELEGRAM_DELIVERY=false`. Runtime credentials must use `yashiluyim_app`; only maintenance credentials use `yashiluyim_migrator`. Set the release symlink only after its files and ownership have been checked.
4. With root's private maintenance environment loaded (`set -a; . /etc/yashiluyim/maintenance.env; set +a`), run `postgres-bootstrap.sql` through the existing cluster's `psql -X`, as the cluster administrator connected to `postgres`. Use `runuser -u postgres --preserve-environment -- /usr/lib/postgresql/18/bin/psql -X -h /var/run/postgresql -p 5432 -d postgres -f <release>/deploy/hetzner/postgres-bootstrap.sql`. `psql` reads passwords from environment variables rather than argv. Bootstrap deliberately refuses existing names; role creation and CREATE DATABASE are not one atomic transaction, so a partial failure requires inspection, never an automatic drop/reset.
5. Back up the existing `pg_hba.conf` privately. Insert the supplied four-rule fragment **before** generic rules while retaining every pre-existing line. Rules are scoped only to the two newly created roles. Validate `pg_hba_file_rules` has no errors, then explicitly reload configuration through `SELECT pg_reload_conf()` as the administrator. Do not restart PostgreSQL, change `listen_addresses`, or open 5432. This scoped HBA block matters because other databases may grant CONNECT to PUBLIC; changing their ACLs would affect unrelated applications.
6. Keep the new API/worker stopped. From the new release's `server/`, with only the private maintenance environment loaded, run `node scripts/migrate.js --apply`. This uses `MIGRATION_TARGET_URL` explicitly and never falls back to source credentials. Apply `postgres-runtime-grants.sql` as `yashiluyim_migrator`, connected to `yashiluyim`, using `PGPASSWORD="$YASHILUYIM_MIGRATOR_PASSWORD" /usr/lib/postgresql/18/bin/psql -X -h 127.0.0.1 -p 5432 -U yashiluyim_migrator -d yashiluyim -f <release>/deploy/hetzner/postgres-runtime-grants.sql`. Reapply these grants after each schema migration. The runtime role can read migration version metadata but cannot rewrite it.
7. Rehearse import into an empty new database using the export/import/verification tools in [the preparation guide](../../docs/VPS_PREPARATION.md). Keep source snapshots root-private. When a root-run import writes uploaded files, verify/reconcile first, then set ownership of **only** `/var/lib/yashiluyim/uploads` to the application user and verify file readability before starting services. Do not start the API while maintenance credentials/imports are active. Configure bootstrap admin IDs only after reconciliation. For final cutover, freeze original writes/bot/worker and export again; a rehearsal snapshot is never current after new purchases arrive.
8. Install only the two new unit files into `/etc/systemd/system/` and reload systemd's unit definitions. Start/check only `yashiluyim-api.service` initially; do not run broad PM2 restart/stop commands. The worker has an `ExecCondition` and will be skipped unless its delivery flag is explicitly true. Check `/api/ready` over loopback, authentication, and file permissions with the test environment first. Never load the root-only maintenance env into these services.
9. Render the chosen domain locally with `node deploy/hetzner/render.mjs <new-domain> <new-local-output-directory>`. The renderer cannot install anything and refuses overwrites. Install the HTTP bootstrap as a **new** Nginx site. Test the entire existing Nginx configuration (`nginx -t`) before a graceful reload. Obtain the new domain's certificate with the existing Certbot/webroot workflow using `/var/lib/yashiluyim/acme`; do not reconfigure other certificates/sites. Replace only that new site's content with the TLS variant, run `nginx -t` again, then gracefully reload. The bootstrap returns 503 outside ACME and does not expose login over HTTP. TLS proxying preserves `/api/`, supports the bounded media upload size, overwrites spoofable forwarding headers, and disables request logging for signed assets.
10. Test the new site and test bot in isolation. Only a separately approved final cutover may update Mini App routing or the production Telegram webhook. Before enabling deliveries, review imported pending broadcasts/reminders. Set the delivery flag true and start exactly one new worker only when ready. Verify the existing Nginx sites/PM2 apps/classroom service remain healthy before and after this later operation.

Default resource ceilings are 768 MiB/one CPU for the API and 256 MiB/quarter CPU for the worker, to bound their impact on the shared host. These are initial limits, not a load-test guarantee; inspect representative upload/concurrency memory usage before a high-attendance event. The API uses at most 10 pooled database connections per process; the runtime role allows 24 across API/worker. Do not tune the existing cluster globally without a separate assessment.

## Backup and rollback

`backup.sh --run` is an explicit root-only backup for this profile. It validates the database name/version, locks against concurrent backup runs, remembers only these two units' prior state, stops them for a consistent database+uploads copy, saves/checksums under `/var/backups/yashiluyim`, and restores only previously running application units on exit. It never stops Nginx, PostgreSQL, PM2, or unrelated services. It is not scheduled/installed automatically. PostgreSQL backup uses the existing administrator's local peer connection, not app credentials or a new exposed port. Copy backups to private off-server storage; test restoring database plus files into a separate empty target before live cutover.

Before target writes resume, rollback means removing/disabling only the new site/units and restoring the prior routing/webhook. Do not drop the database/uploads to roll back code. After target writes resume, preserve and reconcile new users/tickets/check-ins before changing routing or restoring an older snapshot. Keep older releases and config backups for review; no cleanup/delete command is automated here.

The standalone Docker/Caddy example remains in `deploy/compose.standalone.yml` for a different fresh host. It is intentionally not the default Compose filename and must not be used on this shared server.
