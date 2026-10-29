# Yashil Uyim agent entry point

Read this file and the release documentation before app, backend or store work.

## Choose the correct checkout

- The original working Telegram Mini App is `D:\Projects\teamnovauzb\yashiluyim`, normally on `main`. Preserve its source, built assets, Supabase data and current deployment. Do not build, push or deploy it merely to release mobile apps.
- Mobile/VPS preparation is isolated in `D:\Projects\teamnovauzb\yashiluyim-vps-ready`, branch `codex/vps-ready`. Use that directory explicitly. In the original checkout these release docs may exist only in the isolated checkout: read the absolute paths there.
- Read `docs/PROJECT_HANDOFF.md`, `docs/STORE_RELEASE_WORKFLOW.md`, `docs/IOS_APP_STORE_RELEASE.md`, `docs/NEXT_ANDROID_RELEASE.md` and `store/release-status.json` in the isolated checkout. Then inspect Git state and actual store state; the recorded results are dated evidence.
- The reusable server/account guide is `D:\Projects\teamnovauzb\polomax\kids\APP_RELEASE_GUIDE.md`. It is an infrastructure reference. Yashil Uyim remains Capacitor; do not convert it to Expo/React Native or copy Kids app IDs, store declarations, artwork or Android keys.

## Product and infrastructure boundaries

- Guest mobile app: program/search, local bookmarks, announcements, gallery, venue/external map and privacy. No accounts, Telegram login, registration, payments, ticket checkout, admin screens, uploads, ads or analytics.
- Current mobile releases use current public Supabase REST data. A later VPS move needs a new release with a higher unused build number/versionCode. The Hetzner application backend at `37.27.5.14` is still not authorised for deployment; PostgreSQL 18/deployment preparation is separate.
- The user authorised the POLOMAX helper server only for an isolated Yashil Uyim EAS workspace, using existing authorised account credentials. Do not change other apps, databases, PM2/systemd/nginx services or global runtimes.
- Actual logo: `assets/mobile/logo.jpg`, the supplied blue/green globe-house. Match installed/store icons and names in every locale/custom listing. Preserve frozen Android bundles and their exact mapping files.
- The app is free and a general-audience festival app. Do not enrol it in Apple's Kids category. Do not invent store target ages, territory selections, privacy declarations, contact details, rights ownership or legal agreements.

## First release and later updates

- For the initial release, prepare truthful metadata and genuine native screenshots, build/validate, upload the exact verified binary, wait for processing and read back the result. **The publisher uploads first-release images and submits the initial version for review. Do not perform that review submission automatically.**
- Ask only for missing information that cannot be verified from the project or existing authorised records. Never claim approval or review submission based only on EAS Submit.
- After the initial release is established, the user wants automation triggered by an explicit release tag: required checks, intended source revision, unused build numbers, exact artifact upload, processing verification, truthful release notes/build attachment, valid screenshots and actual App Review/Play-track submission. EAS Submit is only the binary upload step; a separate Apple review-submission step and read-back are required.
- Keep that future automation gated until initial release and store access/metadata are verified. Do not activate it prematurely, submit duplicate builds, cancel a pending review or change the existing public-release policy automatically.
- Stop with an actionable blocker if checks fail, required images/metadata are missing, owner agreement acceptance is needed or declarations require new information. Continue independent authorised preparation and record what remains.
- Update this project's handoff/status with source revision, build/submission IDs, artifact hashes, upload/processing results and actual review states. Never put key contents, passwords, OTPs, tokens or production database data into docs/Git. Do not update Codex memory unless the user separately asks for a memory update.
