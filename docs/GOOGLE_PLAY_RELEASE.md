# Google Play guest release — 1.0.0 (1)

**Version 1 is now reported submitted for review.** Preserve this package as an archive. The build commands below record the original preparation; use [NEXT_ANDROID_RELEASE.md](NEXT_ANDROID_RELEASE.md) for the next R8-enabled version, actual supplied logo and later VPS configuration. The current `android:release` command intentionally targets the next VPS version and requires its deployed API address.

Prepared locally on 26–27 October 2026 in `D:/Projects/teamnovauzb/yashiluyim/.worktrees/mobile-vps`, branch `codex/vps-ready`. This work follows the user's later authorization to build the guest AAB. The original Telegram checkout, existing `dist/`, deployment, bot and production database remain unchanged.

## Selected release behavior

The user explicitly selected **current Supabase directly now; a later VPS switch needs an app update**. The ignored `.env.public.local` therefore selects `VITE_PUBLIC_CONTENT_SOURCE=supabase`, the existing HTTPS Supabase origin, and its public anonymous key. This is not a login, secret/service-role credential or Supabase Auth session. The release uses raw anonymous REST GET requests for only whitelisted program/news/gallery columns and the five venue/date settings; no customer/account/ticket/admin data or writes are requested. The SDK is not imported.

The public projection and Supabase reader are shared under `shared/` by the mobile client, export tool and optional gateway. The alternative stable-gateway design in [PUBLIC_DATA_SWITCH.md](PUBLIC_DATA_SWITCH.md) remains available for future builds, but is **not** the path selected for this release. Editing an environment file later does not change an installed binary. The future VPS migration requires a new higher-version store build under the same package ID and upload key.

App identity: `uz.teamnova.yashiluyim`, version name `1.0.0`, version code `1`, minimum API 24, target/compile API 36. Capacitor includes only App and Browser plugins. The release is not debuggable. Its permissions are INTERNET and AndroidX's app-scoped signature-only dynamic-receiver permission; no camera, location, microphone, contacts, media library, notification or advertising-ID permission is present. Backups are disabled for local app data. No `.so` library is bundled, so no app-supplied native binary needs a 16 KB page-size fix.

## Store materials

Everything shareable is generated in `releases/google-play-1.0.0/` (ignored by Git):

- Signed AAB for Play and signed APK for direct device testing.
- The user-selected **existing green eco-tree** from `public/landing.png`, resized for launcher/store sizes with its artwork/colors preserved. The original source file is unchanged. Cream background layers and adaptive-icon safe insets are packaging only. No invented replacement logo is used.
- 512×512 app icon (RGBA) and 1024×500 feature graphic (RGB).
- Six phone screenshots, 1080×1920 RGB, captured from the signed APK on the separate Android emulator. `CAPTURE-INFO.txt` identifies the actual capture method. All source QA captures are kept separately in `.local/android-native-qa/`; no splash/blank test capture is included as a store screenshot.
- Copy-ready Uzbek and optional English listing text, release notes, privacy text for Google Docs, console fields, publisher-only declarations still needing verification, public upload certificate, SHA-256 checksums and a build-verification report.

The first Play upload still needs a working publisher support email, a published privacy-policy URL, and the publisher's actual Data Safety/target-audience declarations. The privacy template explicitly marks its email placeholder; it must be replaced before publication. This binary includes an offline Uzbek privacy policy at `/maxfiylik`, accessible through the information screen, with the existing official festival Instagram contact. No public policy URL was invented.

## Reproduce locally

Install root/server dependencies with their lockfiles and retain the existing private signing files. Configure `.env.public.local` as described in the env example, then:

```powershell
npm run build:public
npm run check:public-bundle
npm run mobile:init -- android public # First generation only
npm run mobile:sync -- public
npm run store:assets
npm run android:release
node scripts/verify-android-release.mjs
pwsh -File scripts/verify-native-assets.ps1
node scripts/capture-store-browser.mjs
node scripts/store-package.mjs
```

The Android helper uses the local Android Studio JDK 21 and Android SDK, generates a first-upload RSA key only when no key exists, and refuses to replace an existing key whose password cannot be restored. It rebuilds only `dist-public`/`android` when explicitly invoked; there is no push, upload or deployment step. The generated Gradle wrapper uses 8.14.3 and Android Gradle Plugin 8.13.0.

Private signing files are `.local/signing/yashiluyim-upload.jks` and `.local/signing/upload-password.dpapi.txt`. The password is encrypted with Windows DPAPI, and plaintext is passed only in child-process memory/environment for signing. These files are excluded from Git and the shareable release ZIP. Back them up securely; DPAPI recovery requires the same Windows user/machine, so export the password securely to the publisher's password manager before changing computers. The public `upload-certificate.pem` contains no private key. Play App Signing and the first account enrollment remain publisher actions.

The public-build HTML transform runs **before** Vite resolves the entry. `check:public-bundle` verifies that the compiled assets contain the guest UI/privacy/REST reader and exclude legacy login/admin/ticket entry points. This checks the actual production bundle, not only the development-server route.

## Evidence and limits

The release's AAB structure was validated with Google's bundletool 1.18.3. Its JAR signature and the APK's Android signature were verified. Package/version/SDK/permissions were read from the built APK. Build hashes are in `BUILD-VERIFICATION.json` and the package manifest, not inferred from source.

The actual guest JavaScript inside the AAB, APK and checked `dist-public` output was compared, and the AAB's plugin JSON was checked for App/Browser only. Thus the native UI evidence refers to the same guest entry that is packaged in the AAB.

The production UI fetched live current Supabase content for six browser screenshots without page errors or data-write requests. Focus handling was corrected so page headings stay below the sticky header after navigation. Browser journeys cover both API mode and direct Supabase mode, offline recovery, updates, search/bookmarks, privacy access, small screens and dark mode. The PostgreSQL 18.6 suite was rerun after the shared projection extraction: 20 passed. Gateway tests remain separate: 6 passed. Default Mini App compatibility tests: 2 passed.

Android testing uses a separate fresh local emulator (`YashilUyim_QA`, API 37, port 5556); it does not use another project's active emulator. The signed APK opened its guest home, program, announcements, gallery, venue and app information through real Android accessibility controls. Initial direct emulator networking timed out while the same public source worked from the host. A temporary loopback TLS CONNECT tunnel then allowed the emulator to reach the real public Supabase/media endpoints; HTTPS was neither terminated nor decrypted, no requests were mocked and no key/header/payload was logged. The proxy setting is only in the disposable QA emulator, never in the release binary. Network error messages are localized and transient status messages dismiss after seven seconds. Native evidence, including the loaded gallery, is stored with the local QA captures.

These checks are not physical-device testing, a Google Play pre-launch report, upload, approval or rollout. Normal device-network behavior still needs the publisher's physical-device/internal-track check. No iOS build or store action was performed.
