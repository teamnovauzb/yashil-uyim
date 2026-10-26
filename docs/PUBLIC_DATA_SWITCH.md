# Current Mini App data now, VPS data later

The mobile app stays a public festival guide before, during, and after review: events/program, upcoming announcements, gallery, venue, search, and on-device saved sessions. It has no account creation, login, purchases, or private screens. This change prepares a data-host migration without changing that experience.

## One permanent address in the mobile binary

```text
Guest mobile app
  GET https://YOUR_STABLE_GUEST_DOMAIN/api/public/content
    initially: public gateway -> current Supabase published content
    later:     public gateway -> VPS /api/public/content
```

Set `VITE_PUBLIC_API_URL` to the gateway's permanent HTTPS origin before the first store build. That value is compiled into the binary; editing a local `.env` after upload does not change installed apps. The gateway moves the choice of source to server configuration instead. The existing guest screens and mobile data code already use the required endpoint; they need no source-specific changes.

The gateway must actually be hosted with working HTTPS before submission. A local preview or the bundled offline snapshot cannot provide live remote updates to reviewers/users. This preparation does not deploy it, provision DNS/TLS, generate a native binary, or submit to either store. The final domain and privacy URL are still needed. Use a separate service/domain; do not modify the current Mini App deployment, its cron jobs, bot, Supabase policies, or database contents.

## Initial source: current published data

Copy `deploy/guest-gateway.env.example` privately to the gateway host. Set:

```dotenv
GUEST_API_ORIGIN=https://YOUR_STABLE_GUEST_DOMAIN
PUBLIC_CONTENT_SOURCE=supabase
GUEST_SUPABASE_URL=https://YOUR_CURRENT_PROJECT.supabase.co
GUEST_SUPABASE_PUBLIC_KEY=YOUR_PUBLISHABLE_OR_EXISTING_ANON_KEY
GUEST_ALLOWED_ORIGINS=https://localhost,capacitor://localhost,https://YOUR_STABLE_GUEST_DOMAIN
```

Use only a Supabase publishable key or the existing `anon` key, never a secret/service-role key. These values stay on the gateway; the mobile app receives no Supabase key. No new Supabase user is created. The adapter sends anonymous GET requests for explicitly selected program/news/gallery columns and five venue/date settings. It neither queries private tables nor writes anything. Existing RLS applies; this does not fix or broaden existing database permissions.

The standalone Node 24 entry is `server/src/public-gateway-main.js`. It requires no PostgreSQL connection, Telegram token, worker, webhook, or source migration. From the `server` directory, with the private environment loaded, use `npm run public:gateway`. `GUEST_HOST` defaults to loopback and `GUEST_PORT` to 3002; verify that port before later deployment. A reverse proxy must provide HTTPS, overwrite forwarding headers, and route `/api/` to this separate service. The service supports only health and public content reads; no arbitrary query, proxy URL, registration, login, or mutation endpoint exists.

It caches/coalesces public source reads for 30 seconds to limit load on the current database. The app refreshes at launch, manual refresh, foreground/reconnection, and every five visible minutes. A failed partial source read returns an error; the app retains its last complete offline copy. Request cookies and user tokens are never forwarded upstream.

## Later source: VPS

1. Migrate and reconcile the public records and media to the VPS. Until then, the Mini App's current database remains the live source. No automatic Supabase-to-VPS sync is added here.
2. Verify the new VPS's `/api/public/content`, real images/videos, dates, and row counts. Its upstream hostname must differ from the gateway hostname to avoid a proxy loop.
3. Change **only the gateway environment**, then restart that gateway service:

   ```dotenv
   PUBLIC_CONTENT_SOURCE=vps
   GUEST_VPS_ORIGIN=https://YOUR_VPS_UPSTREAM_DOMAIN
   ```

4. Keep the stable HTTPS gateway domain, path, JSON contract, CORS origins, and mobile configuration unchanged. Check the installed app's refresh against migrated data. Remove the old Supabase key from the gateway environment after a successful cutover.
5. If migration verification fails, restore `PUBLIC_CONTENT_SOURCE=supabase` and restart the gateway while the old source remains available. Retiring Supabase or changing the original Mini App requires a separate approved cutover.

No store binary change is needed for this server-side source switch as designed. Keep the full guest functionality available to reviewers and users, retain the same declared purpose, and keep privacy disclosures accurate for the eventual hosting. A hosting migration does not grant approval or permit hidden features to be activated afterward. See [Apple App Review Guidelines, 2.3 and 2.5.19](https://developer.apple.com/app-store/review/guidelines/) and [Google Play Behavior Transparency](https://support.google.com/googleplay/android-developer/answer/17006354?hl=en).

## Local evidence

`npm run test:gateway --prefix server` covers six source/gateway cases: read-only Supabase fields, private-field exclusion, concurrent request caching and new announcements, the same endpoint using VPS data, excluded auth/write routes and origins, complete-read failures, key validation, and loop prevention. External upstreams are mocked in these tests.

A separate anonymous, read-only request through the local gateway handler against the current published Supabase source returned HTTP 200 with 7 programs, 4 news posts, 12 gallery entries, and 5 venue/date fields on 2026-10-26. No listener or deployment was started and no source data changed. Native device connectivity and production gateway hosting remain unverified.
