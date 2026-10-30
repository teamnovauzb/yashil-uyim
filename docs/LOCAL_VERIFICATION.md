# Local verification — 2026-10-26

Later store-release authorization (26–27 October) supersedes the no-build snapshot below for the isolated guest app only. The signed Android AAB/APK, eco-tree store assets, live Supabase screenshot capture, production-entry checks, signature/SDK/permission verification and native emulator evidence are described in [GOOGLE_PLAY_RELEASE.md](GOOGLE_PLAY_RELEASE.md). The original Mini App was still not rebuilt or changed. PostgreSQL 18.6 was rerun after shared projection extraction: all 20 tests passed.

Prepared on `codex/vps-ready` in `D:/Projects/teamnovauzb/yashiluyim/.worktrees/mobile-vps`, based on `c56c6c6`.

| Check | Result |
| --- | --- |
| Server integration/migration suite, embedded PostgreSQL | 17 passed |
| Same suite on disposable local PostgreSQL 17 | 17 passed, including simultaneous scanner/worker operations |
| PostgreSQL 18.6 (`server_version_num=180006`), including the native shared-host profile and public content boundary | 20 passed; restricted runtime role, cross-database isolation, live public database updates, and private-field/media exclusion exercised |
| VPS browser journeys, mobile Chrome viewport | 3 passed |
| Default browser/Telegram compatibility journeys | 2 passed |
| Separate guest browser journeys, mobile Chrome viewport | 5 passed; login-free GET-only access without cookies, API refresh, offline fallback, saved sessions, private-route exclusion, 320px layout, dark mode, and keyboard input |
| Separate public-source gateway checks | 6 passed; read-only Supabase projection, cache/concurrency, same route on VPS source, no auth/write endpoints, upstream failure recovery, source key/origin validation |
| Live published-content read through the local gateway handler | HTTP 200; 7 programs, 4 news, 12 gallery, 5 venue/date fields; anonymous GETs only, no listener/deployment or database writes |
| Scoped VPS/guest/mobile ESLint | Passed |
| Server JavaScript syntax | Passed |
| Capacitor configuration TypeScript check | Passed |
| Public build configuration guard | Missing API URL rejected; configured mode selects `dist-public`. Config evaluation only, no build executed |
| Docker Compose configuration validation | Passed |
| Shared-host HTTP/TLS site configuration with Nginx 1.28 | Both passed syntax validation locally |
| Shared-host systemd API/worker units on disposable Ubuntu 26.04 | Passed static verification; services were not started |
| Production dependency audits, frontend and server | No reported vulnerabilities |
| Original checkout source/assets/existing build-output hashes | 88 files checked, zero changes |

Browser requests to external services were blocked; backend Telegram transport was mocked. Migration checks used synthetic data, not the existing Supabase project. Temporary test PostgreSQL containers were removed after each run.

The guest app's offline snapshot was separately captured with anonymous, read-only requests for whitelisted published fields: 7 programs, 4 news posts, 12 gallery entries, and 5 venue/date settings. No customer, ticket, receipt, payment, account, or admin data was queried by that export. Browser tests mock the public content response and block external media. They verify the API contract and interface locally, not deployed VPS or physical-device behavior. Guest screenshots were inspected locally. The default Capacitor config selects `dist-public` with only App/Browser plugins; its TypeScript check used `--types node` explicitly.

The shared-host adaptation was prepared after the separate read-only server inventory. No remote connection, deployment, installation, configuration reload, or server-side test was performed during this adaptation. Its local PostgreSQL test executes the actual bootstrap/grant files, refuses a repeat bootstrap, processes a ticket through the DML-only runtime role, rejects schema/migration-history changes and cross-database logins, and checks that another fixture database remains unchanged. The local validators reject remote Docker contexts before creating containers. The old Compose file is now `deploy/compose.standalone.yml`, requiring explicit selection; it is not the profile for the shared server.

The original checkout is still `main` at `c56c6c6`, with only the pre-existing untracked `.claude/` directory. It was not rebuilt, committed, pushed, or deployed. No live environment, database, storage policy, bot/webhook, or event data was changed.

Repository-wide ESLint still reports legacy React hook/JSX-unused-variable findings outside the scoped new-code check. Production dependency audit results do not cover separate development-tooling advisories.

No `dist-vps/`, `dist-public/`, Android project, iOS project, APK, AAB, IPA, or production build was generated. Native device behavior, store signing/release configuration, actual VPS provisioning, and the final source-data migration remain unverified until those later stages are authorized and configured. Use [VPS_PREPARATION.md](VPS_PREPARATION.md) for the deployment/migration handoff and [PUBLIC_GUEST_APP.md](PUBLIC_GUEST_APP.md) for the later public API URL wiring.
