# Yashil Uyim

React/Vite festival website and Telegram Mini App. The existing deployment continues using Supabase and the Vercel `api/` handlers by default.

An opt-in PostgreSQL/VPS backend and Capacitor mobile preparation are documented in [docs/VPS_PREPARATION.md](docs/VPS_PREPARATION.md). This is isolated local source work; there is no automatic deployment or bot/webhook registration. The existing Mini App must remain on its current deployment through the upcoming event.

For the guest mobile app to read the current published Supabase data first and switch to the VPS later through the same permanent API address, see [docs/PUBLIC_DATA_SWITCH.md](docs/PUBLIC_DATA_SWITCH.md).

Useful local checks: `npm run lint:vps`, `npm run server:test`, `npm run test:postgres`, `npm run test:e2e`, and `npm run test:legacy`. No application build is required for those checks.

The [guest mobile app](docs/PUBLIC_GUEST_APP.md) is available with `npm run dev:public` and `npm run test:public`. It has no login and reads real festival content from the configurable VPS public endpoint; wiring that URL is deferred until deployment. Its local content copy is only an offline fallback. It is separate from the existing Telegram app.

The VPS server has its own package and lockfile in server/. The shared server's [Nginx/systemd/PostgreSQL 18 profile](deploy/hetzner/README.md) keeps the existing services in place; the standalone Docker/Caddy example is separate. Local checks are available through `npm run test:postgres -- 18` and `npm run check:hetzner`. The default frontend mode retains the existing integration; VPS mode and its separate output directory are opt-in.
