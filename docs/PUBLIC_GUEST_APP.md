# Public guest mobile app

The requested mobile app is a guest festival companion: no account, Telegram login, contact sharing, ticket purchase/payment, personal profile, feedback submission, or administrator route. It shows the actual festival program, news, gallery, and venue. Program search and saved sessions work on-device without an account.

The original Mini App remains on its existing checkout/deployment. This implementation is local in the separate `codex/vps-ready` worktree. No production/native application bundle was built and no server was deployed or changed for this work.

## Data wiring after deployment

The primary data source is **the VPS**, through `GET /api/public/content`. The screen reads this endpoint on launch, manual refresh, return to the foreground, reconnection, and every five minutes while visible. It sends no authentication header/cookie and makes no data-write requests. The endpoint returns only explicitly projected program/news/gallery columns and the five venue/date settings; customer records, tickets/receipts, roles, feedback, payment details, and private asset links are excluded.

After the separately approved VPS deployment and data migration, copy `deploy/public-app.env.example` to `.env.public.local` in this isolated checkout and set:

```dotenv
VITE_PUBLIC_API_URL=https://THE_ACTUAL_GUEST_API_DOMAIN
VITE_PUBLIC_PRIVACY_URL=https://THE_PUBLISHER_PRIVACY_POLICY
```

The API setting is a public HTTPS origin, not a key/password. Nothing needs changing in the screens when that URL is known. The public release build refuses an absent/invalid HTTPS origin. Set the publisher-approved privacy URL to expose its link on the app information screen. Verify the real endpoint and its media URLs before making the final store binary. Updates written to the same VPS database appear after refresh without a new app release. The original Mini App's Supabase database and the future VPS database are not automatically synchronized: complete the approved data migration/source-of-truth cutover first rather than assuming a rehearsal copy stays current.

During local development with an empty URL, `/api` is proxied to the local backend on 127.0.0.1:3001. Browser tests substitute controlled responses; no VPS deployment is required for them.

## Offline recovery

`src/public/content.json` contains a whitelist-only snapshot of the **existing published** content, captured with anonymous GET requests on 2026-10-26: 7 program items, 4 news posts, 12 gallery items, and 5 venue/date fields. The export tool never queried accounts, tickets, receipts, roles, feedback, payment fields, or secrets; no Supabase key is stored in the snapshot or public app.

This snapshot and any newer successfully fetched public response are fallback copies, not replacements for the VPS source. They keep program/news text and venue information available if the network fails. The app displays the copy timestamp and a fallback/offline notice. Photos/videos can still require connectivity. Saved-session IDs and cached public content stay in localStorage on that device and are not sent back to a server.

Do not refresh the snapshot from the old Supabase project after VPS cutover. For a future release, capture the then-current VPS public endpoint instead. This initial legacy export command reads only public fields and never writes to the source:

```sh
node scripts/export-public-content.mjs <legacy-env-file> src/public/content.json
```

## Local preview and verification

```sh
npm run dev:public -- --host 127.0.0.1 --port 4175 --strictPort
npm run test:public
npm run test:legacy
npm run lint:vps
npm run test:postgres -- 18
```

The public entry (`src/public/main.jsx`) is separate from the legacy/authenticated frontend. It does not import the Telegram SDK, Supabase SDK, login/session code, ticket screens, or admin screens. Private/deprecated paths redirect to the public home. The default `npm run dev`/existing Mini App behavior is unchanged. The public mode uses its own CSS and no downloaded font/analytics SDK.

Public browser checks cover guest entry, GET-only API access without credentials, search/bookmark persistence, network fallback, updates after changing the API response, private-route exclusion, the venue/gallery/about screens, narrow-screen overflow, dark mode, and keyboard input. Backend tests use PostgreSQL 18 and assert the endpoint reflects actual database changes and cannot export private fields/assets. Test values remain in tests; the bundled snapshot contains the existing published data.

## Future native build

After the backend URL is ready and a new mobile build is authorized:

```sh
npm run build:public
npm run mobile:init -- android public
npm run mobile:sync -- public
# On macOS/Xcode, replace android with ios.
```

The default Capacitor configuration now selects `dist-public` and includes only App/Browser plugins. The public initialization path adds no camera permission, phone/contact access, location permission, or authentication-storage plugin. Do not reuse an older full-feature native project with camera/auth permissions; generate and review a clean public project. The authenticated VPS profile remains available only when explicitly selected (`... vps`). Signing, native builds, actual device tests, and store submission have not been performed here.

## Store submission scope

Removing login gives reviewers the same open experience as everyone else. It does **not** guarantee approval. Apple requires adequate utility beyond a repackaged website and guest access where significant account features are absent; Google rejects limited-content/non-functional apps. The schedule, on-device saved sessions, live updates, offline content, gallery, and venue information provide the intended festival utility.

Before submission, the publisher must verify actual deployed content, physical iPhone/Android behavior, icons/screenshots/signing, and accurate App Privacy/Data Safety answers for the final binary/backend. A publisher-approved, publicly reachable privacy policy URL is still needed in store metadata, with an accessible in-app policy link; the current in-app data-use explanation is not a substitute for that final policy. Network/content hosting can receive ordinary request metadata even though this frontend adds no advertising/tracking SDK or account collection.

Sources checked 2026-10-26: [Apple App Review Guidelines, 4.2 and 5.1.1](https://developer.apple.com/app-store/review/guidelines/), [Google Play functionality/content policy](https://support.google.com/googleplay/android-developer/answer/9898783).
