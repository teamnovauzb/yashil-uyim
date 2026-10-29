# Yashil Uyim mobile/store handoff

Updated 29 October 2026, Asia/Tashkent. Read `AGENTS.md` and `docs/STORE_RELEASE_WORKFLOW.md` first. This is the app-specific continuation record; `APP_RELEASE_GUIDE.md` in Kids is a reusable infrastructure reference, not this app's identity.

## Implemented app and protected original

The original React/Vite Telegram Mini App is `D:\Projects\teamnovauzb\yashiluyim` on `main`. Its Supabase/Vercel deployment must remain working for the upcoming event. The isolated checkout `D:\Projects\teamnovauzb\yashiluyim-vps-ready`, `codex/vps-ready`, contains opt-in VPS/PostgreSQL 18 work and Capacitor guest mobile releases. Do not rebuild/deploy the original to make a mobile release.

The guest app uses actual public Supabase REST data (programs, news, gallery, five festival settings), without Telegram SDK/auth, accounts, registration, tickets, payments, admin/private routes or writes. It includes search, local saved activities, cached/offline public text, media gallery, venue/map and in-app privacy. Latest public source preflight returned 7 program, 4 news and 12 gallery items; these counts are dated, not invariants. A later VPS migration requires a higher-version mobile update. Hetzner application-backend deployment is still deferred.

## Identities and signing

| Item | Yashil Uyim value |
| --- | --- |
| Name / installed name | Yashil Uyim |
| Android package / iOS bundle | `uz.teamnova.yashiluyim` |
| Expo project | `@polomax/yashil-uyim` |
| Expo project ID | `8b5efc38-b70d-498b-860e-d420f8b3ff55` |
| Apple team | `HB4NQBS6LM`, POLOMAX HOLDING |
| App Store Connect Apple ID | `6828467813` |
| Apple SKU / actual primary locale | `yashiluyim-ios` / `en-US` |
| iOS initial version/build | `1.0.0 (1)`; iPhone-only, iOS 15+ |
| Distribution certificate | Reused existing valid certificate, serial `6867A71E6EAEA6F75A9B971854C38D25`, expires 21 September 2027 |
| Bundle provisioning profile | Separate active profile `6B8XYD5NFC`; team and bundle identity checked in the IPA |
| Android upload material | `.local/signing/yashiluyim-upload.jks` and Windows DPAPI password; original key retained, never replaced with Kids credentials |
| Logo source | `assets/mobile/logo.jpg`, actual supplied globe-house; keep all installed/listing icons consistent |

The App Store record was created by the publisher after browser automation stopped, then verified using the Apple API. It was created with English (U.S.); use `listing.en-US.json`. Earlier en-GB preparation is historical and does not override the actual record.

## Android evidence and review boundaries

Version `1.0.0 (1)` was reported submitted. Its installed eco-tree icon differed from the later globe-house listing, and the publisher supplied Google's 28 October rejection evidence. The deobfuscation warning was separate: version 1 was not minified and has no mapping to upload.

Correction `1.0.1 (2)` was built with the correct logo, R8 and matching embedded/sidecar mapping using current Supabase data. It retains the original upload certificate. Its AAB SHA-256 is `f91056c43191b8654d8f68b654b18cf26fdd69f998776fcc712f23a8d4a83030`. Files are in `releases/google-play-1.0.1/`; source tooling commit `091a0c1`. No subsequent Google upload/review state has been independently verified; do not upload code 2 again without checking Console/API state. Never create a duplicate Play app for this package.

Preservation checks before cloud work verified 30 original-release archive files, 31 Android correction files and 88 original Mini App baseline files unchanged. Native/source/physical-device/store claims remain distinct.

## Signed iOS cloud build

- Production EAS build: `950ba344-a3d9-4b5b-a1ee-fde6e918ccf1`, `FINISHED`, store distribution, version/build `1.0.0 (1)`.
- Local IPA: `releases/app-store-1.0.0/yashil-uyim-1.0.0-1.ipa`, 4,162,086 bytes, SHA-256 `f8462473d4e833674593b9ddd99b6fe928b5d0dc6b88b0413ff3430033af6710`.
- Built with iOS SDK 27.1. Bundle name/ID/version/build/device family, profile team/expiry, app/plugin privacy manifests, absent sensitive permission descriptions, guest JavaScript source equality and sealed resource hashes were checked. Profile CMS signature was checked without Apple trust-chain validation. A full local macOS `codesign` verification is not claimed from Windows. Physical-device acceptance is not yet recorded.
- EAS binary upload used this exact production build ID: submission `0ed9397e-3c31-4d5b-9ba4-9fc2d510b06d`, now `FINISHED`. Apple processed build `fef3b6b1-b0c9-48e1-b097-e6805c0d706c`, version/build `1.0.0 (1)`, as `VALID`. It was attached to the draft and read back at `2026-10-29T15:17:50.310Z`; App Review remains `PREPARE_FOR_SUBMISSION`, release policy `AFTER_APPROVAL`. A PATCH timed out after applying the build relationship; fresh GET read-back established success, so do not blindly retry that mutation or upload the binary again.
- The first native Simulator/screens job `c1aa3be4-5967-4c1c-a1c1-78144a2396b9` finished successfully on an actual iPhone 18 Pro Max, Xcode 27.1. Program, saving and five-tab navigation worked. Initial screenshots were inspected; transient saved-item toasts appeared on later screens, so capture was retried with animation/toast waits. Do not use uninspected/replaced captures as final assets.
- Screenshot refresh job: `2c018744-3299-458a-93a1-9f7634164c4e`, `FINISHED`. Its six screenshots were inspected after animation/toast waits. The ZIP was regenerated from those captures; all pixels were opaque and alpha removal preserved decoded RGB exactly. The simulator's guest JavaScript was compared to the signed IPA and matched. No duplicate Apple upload was requested for screenshot-only fixes.

The custom EAS native workflow uses pinned Capacitor 8.5.3 SwiftPM, App 8.1.2 and Browser 8.0.5 vendor sources. It does not invoke Expo prebuild or convert the UI. Linux helper workspace is isolated at `/root/app-releases/yashiluyim-ios-20261029`; no business service or application backend was changed.

## Store metadata and unresolved first-release items

The app is free. The publisher confirmed permission to distribute festival media and requested a general audience, without Apple's Kids category. Apple returned `FOUR_PLUS`; the Kids age band remains null. Free pricing was saved and read back. The publisher chose **all countries**; all 175 Apple territories were enabled/read back without changing the public-release policy. The publisher explicitly selected copyright **2026 Teamnova**. Google target-age declarations remain separate. The publisher uploads first-release images and submits initial App Review manually.

Published policy supplied by publisher: `https://docs.google.com/document/d/e/2PACX-1vSpUxrCIKaAJ5hoTh2KTKz_Htuyar1uazKz2Twt7ClZzqGBdZQZUx9eNbdBPj4zmV4BK2BCPET0mx-m/pub`. A public HTTP read succeeded without authentication. Its contact email is `teamnovauzb@gmail.com`. Ordinary Supabase/media IP/request logging is disclosed; lack of accounts is not by itself proof of “Data Not Collected”.

Saved/read back in the Apple draft: en-US listing, subtitle, keywords, promotional text, policy/support URL, copyright, Lifestyle category, media-rights declaration, age rating and reviewer notes. The complete authorised publisher review contact was reused, with no demo account required; Kids-specific instructions were not copied. The draft version was aligned from `1.0` to `1.0.0` to match the binary. The publisher chose the existing public policy/contact page for **both** Privacy Policy and Support URL; do not ask them to publish another document. App Privacy answers based on retained provider logs remain unresolved and require the supported console workflow. Preserve the current `AFTER_APPROVAL` release policy.

The current screenshot package is `releases/yashil-uyim-native-store-screenshots-20261029.zip`, with inspected refresh iPhone 1320×2868 and Android 1080×1920 folders and hashes. No iPad target is included. Console labels could not be read after the browser stop; use exact accepted dimensions in App Previews and Screenshots, not Header Assets. The support-page template is optional reference; the publisher explicitly reuses the already published combined policy/contact page.

## Next chat

1. Read standing rules/status and inspect Git; preserve original/live source and frozen artifacts.
2. Read back the current Apple state for `6828467813`; the exact first build is already uploaded, processed `VALID` and attached. Do not create a second upload or reattach a different build. Stop before changing any active user-started review.
3. Complete final screenshot inspection/ZIP and safe metadata, with remaining genuine questions only for unresolved facts. Do not submit initial App Review or upload its first images; the publisher owns those actions.
4. Once the initial release is established, implement the tag-only future update workflow described in `STORE_RELEASE_WORKFLOW.md`, including separate actual review submission and read-back. No current CI/review automation is enabled, and there were no existing GitHub Actions workflows when inspected.
5. Update this handoff and machine-readable status with actual results and commit local source/docs. Push/deploy only when separately authorised; never overwrite the original Mini App or other server apps.
