# Next Android release: R8 mapping, actual logo and future VPS

The publisher reported submitting version code 1 for Google Play review on 27 October 2026. Its console screenshot shows the warning that no deobfuscation file is associated with that bundle. Version 1 was built with `minifyEnabled false`, so it has no R8 name mapping. A mapping from another build must not be attached to it. This local work does not change that submission, its artifact files, the live Mini App, Supabase data or the VPS.

## Prepared next version

`store/google-play/next-release.json` selects `uz.teamnova.yashiluyim`, version `1.0.1`, version code `2`. It uses the actual blue/green globe-house logo supplied by the publisher in `assets/mobile/logo.jpg`, not the earlier eco-tree illustration.

Release builds enable R8 obfuscation and code/resource shrinking, preserve JavaScript-interface methods and line-number metadata, and consume the keep rules supplied by pinned Capacitor 8.5.3. The existing `proguard-android.txt` is retained deliberately: it disables optimization passes while still permitting shrinking/obfuscation. Capacitor's newer optimization-specific changes are not silently introduced into this update. No package-wide “keep everything” rule or blanket missing-class suppression was added.

The build requires the original upload key and refuses to create a replacement key. Its exported public certificate must match version 1. The same build's `mapping.txt` is archived alongside its AAB/APK. Verification checks that `BUNDLE-METADATA/com.android.tools.build.obfuscation/proguard.map` exists inside the AAB and is identical to that mapping sidecar. Bundle structure/signatures, package/version/permissions and App/Browser-only native plugins are checked too.

Version 1's `releases/google-play-1.0.0/` and its ZIPs stay frozen. New native build output may replace the generated ignored `android/app/build/` files, but it cannot overwrite the preserved submitted package through this pipeline.

## Local QA only

```powershell
npm run android:qa
```

This uses the current public Supabase source solely to test the new R8 build and logo. All output goes to `.local/next-release-qa-1.0.1/`; `PROFILE.json` labels it local QA, not the future VPS store release. Its public web bundle is staged in `.local/dist-public-next/`, so the earlier `dist-public/` is not rebuilt. No upload or deployment occurs. Do not upload this QA bundle as the planned VPS update.

## Build later, after deployment

Once the approved public VPS endpoint and migrated media are working:

```powershell
$env:YASHILUYIM_VPS_API_URL='https://THE_REAL_DEPLOYED_API_ORIGIN'
npm run android:release
```

The command requires a real HTTPS origin, fetches `/api/public/content` without credentials and checks its public contract before building. Without that address, it stops before making build changes. The new binary then compiles with source `api`, clears the direct Supabase URL/key from build-time variables, keeps the same guest-only screens and writes to `releases/google-play-1.0.1/`. No endpoint, domain, database migration or privacy hosting is invented here.

Keep the current review in place. Later upload the new higher-version AAB using the usual Play review process. The matching mapping is already embedded in its AAB; retain the sidecar for diagnostics. Never use a mapping file from a different AAB, even if its version name looks similar. The final VPS build, actual VPS connectivity, physical-device/internal-track tests and Play upload remain later work.

## Verification on 27 October 2026

- The local QA pipeline built signed `1.0.1 (2)` artifacts with R8 8.13.6. The AAB contains the mapping metadata, and its embedded mapping matches the archived `mapping.txt` exactly. Bundle structure, both signatures, original upload certificate, guest JavaScript, native plugins, SDK and permissions passed verification.
- QA AAB size: 3,262,920 bytes. These artifacts stay in `.local/next-release-qa-1.0.1/`, explicitly marked Supabase/local QA, not a VPS release.
- The signed minified APK opened the guest UI on the dedicated emulator. Program and venue navigation worked, and the Browser plugin launched Chrome without accepting Chrome's first-run terms. During cold boot the emulator displayed a **System UI** ANR while the app was already rendered behind it; dismissing that system dialog allowed the smoke checks to proceed. Performance on a real device is not established by this test.
- The missing-VPS-address guard test, scoped ESLint and Capacitor TypeScript check passed. A missing address refuses the store build before modifying existing source settings or the submitted bundle.
- All 30 archived version-1 files and all 88 original Mini App baseline files remained byte-for-byte unchanged. No Play Console, webhook, production database, server or live deployment was modified.

## References checked 27 October 2026

- [Android: mapping is bundled automatically and must be preserved for each release](https://developer.android.com/topic/performance/app-optimization/troubleshoot-the-optimization)
- [Android APK Analyzer: mappings must come from the same build](https://developer.android.com/studio/debug/apk-analyzer)
- [Capacitor: shipped ProGuard keep rules and release-build testing](https://capacitorjs.com/docs/android/troubleshooting)
