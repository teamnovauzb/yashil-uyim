# Local verification — 2026-10-26

Prepared on `codex/vps-ready` in `D:/Projects/teamnovauzb/yashiluyim-vps-ready`, based on `c56c6c6`.

| Check | Result |
| --- | --- |
| Server integration/migration suite, embedded PostgreSQL | 17 passed |
| Same suite on disposable local PostgreSQL 17 | 17 passed, including simultaneous scanner/worker operations |
| PostgreSQL 18.6 (`server_version_num=180006`), including the native shared-host profile | 18 passed; restricted runtime role and cross-database isolation exercised |
| VPS browser journeys, mobile Chrome viewport | 3 passed |
| Default browser/Telegram compatibility journeys | 2 passed |
| Scoped VPS/mobile ESLint | Passed |
| Server JavaScript syntax | Passed |
| Capacitor configuration TypeScript check | Passed |
| Docker Compose configuration validation | Passed |
| Shared-host HTTP/TLS site configuration with Nginx 1.28 | Both passed syntax validation locally |
| Shared-host systemd API/worker units on disposable Ubuntu 26.04 | Passed static verification; services were not started |
| Production dependency audits, frontend and server | No reported vulnerabilities |
| Original checkout source/assets/existing build-output hashes | 88 files checked, zero changes |

Browser requests to external services were blocked; backend Telegram transport was mocked. Migration checks used synthetic data, not the existing Supabase project. Temporary test PostgreSQL containers were removed after each run.

The shared-host adaptation was prepared after the separate read-only server inventory. No remote connection, deployment, installation, configuration reload, or server-side test was performed during this adaptation. Its local PostgreSQL test executes the actual bootstrap/grant files, refuses a repeat bootstrap, processes a ticket through the DML-only runtime role, rejects schema/migration-history changes and cross-database logins, and checks that another fixture database remains unchanged. The local validators reject remote Docker contexts before creating containers. The old Compose file is now `deploy/compose.standalone.yml`, requiring explicit selection; it is not the profile for the shared server.

The original checkout is still `main` at `c56c6c6`, with only the pre-existing untracked `.claude/` directory. It was not rebuilt, committed, pushed, or deployed. No live environment, database, storage policy, bot/webhook, or event data was changed.

Repository-wide ESLint still reports legacy React hook/JSX-unused-variable findings outside the scoped new-code check. Production dependency audit results do not cover separate development-tooling advisories.

No `dist-vps/`, Android project, iOS project, APK, AAB, IPA, or production build was generated. Native device behavior, store signing/release configuration, actual VPS provisioning, and the final source-data migration remain unverified until those later stages are authorized and configured. Use [VPS_PREPARATION.md](VPS_PREPARATION.md) for the deployment/migration handoff.
