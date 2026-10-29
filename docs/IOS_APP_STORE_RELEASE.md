# iOS guest release

**Current state, 29 October 2026:** the publisher subsequently authorised the POLOMAX helper/EAS cloud route. The signed store IPA and native iPhone Simulator builds have now completed successfully. Apple record `6828467813` exists with primary locale **en-US**. See `docs/PROJECT_HANDOFF.md` and `store/release-status.json` for the actual build/upload/processing states; the Windows-only handoff described below is the earlier preparation stage. Initial screenshots and initial App Review remain publisher actions. Never infer upload completion from a scheduled EAS submission.

The first iOS release is prepared separately in `D:\Projects\teamnovauzb\yashiluyim-vps-ready` on `codex/vps-ready`. It retains the guest-only program/search/local bookmarks, announcements, gallery, venue, offline text and privacy screens. It uses the existing public Supabase REST source, with no accounts, registration, payments or private Mini App routes. No server or original Mini App rebuild/deployment is needed. Existing submitted Android artifacts stay frozen.

## Prepared identity and platform

`store/app-store/release.json` selects bundle ID `uz.teamnova.yashiluyim`, display name `Yashil Uyim`, version `1.0.0`, build `1`, iOS 15+, iPhone-only. This is an independent iOS first release; Android version code 2 is unchanged. The actual supplied globe-house JPEG is exported as an opaque 1024px RGB icon and used in the native asset catalog, launch screen and App Store handoff. No iOS icon/listing mismatch is intended.

The project is assembled from the locally installed official Capacitor 8.5.3 SwiftPM template. App 8.1.2 and Browser 8.0.5 are the only plugin sources included. The SPM dependency pins `capacitor-swift-pm` exactly to 8.5.3; plugin sources resolve from the two included local package directories. No CocoaPods, Secure Storage, Telegram SDK, camera or authentication plugin is in this guest project. The main document is bundled locally; no remote server URL or live-update loader is used.

The existing guest CSS handles top/bottom safe-area insets, 48px controls, system fonts, visible focus, light/dark modes and reduced motion. No visual redesign or React Native migration is part of this preparation. The iOS launch screen intentionally uses the supplied logo on white. Final WKWebView safe areas, keyboard, VoiceOver, dark mode and external Browser behaviour require Xcode/device validation; desktop WebKit tests are a separate evidence layer.

The app privacy manifest is explicitly included in Copy Bundle Resources. Its empty required-reason list reflects the guest app's own code: it does not use native UserDefaults/filesystem APIs, analytics or tracking. WKWebView owns the web local-storage implementation. Preserve and inspect the SDK manifests inside the actual resolved archive; the preparation does not substitute for Xcode's aggregate privacy report or App Store privacy answers.

## Windows preparation

```powershell
npm run ios:prepare
npm run test:ios-web
npm run ios:package
```

Preparation first validates the public anon/publishable key and makes GET-only requests for the public content contract. It builds only `.local/dist-public-ios`, generates the ignored `ios/` source project, copies only the public entry and generates assets. It refuses an unrelated existing iOS project. Original `dist`, `dist-public`, Android bundles and production services are not changed.

The portable handoff is `releases/app-store-1.0.0/mac-project/` and a ZIP alongside it. It includes the generated Xcode project, bundled guest assets, exact local App/Browser Swift package sources, Apple icon, metadata, policy/support templates, Mac build/capture scripts and readiness reports. It contains no signing certificate, provisioning profile, Android key/password, dotenv file, database dump or service-role key. A Supabase public key in compiled web assets is intentional and is validated as publishable/anon.

## On the Mac

Extract the handoff ZIP preserving its directory structure. The package already contains compiled web assets and native plugin source; `npm install` and server credentials are unnecessary for the Xcode build. Use macOS with Xcode 26+ and an installed iOS 26+ SDK (or newer). Sign in to the paid Apple Developer team locally in Xcode. Node 22+ is needed only for the optional helpers; Xcode Organizer can also perform the build/export without Node.

Open `ios/App/App.xcodeproj`, allow SwiftPM resolution, select the App scheme and your signing team. For an unsigned simulator build, boot one iPhone Simulator and run:

```sh
node scripts/ios-simulator.mjs build
```

If multiple simulators are booted, set `IOS_SIMULATOR_UDID` explicitly. Navigate real app screens and capture each:

```sh
node scripts/ios-simulator.mjs capture 01-home
node scripts/ios-simulator.mjs capture 02-program
# Navigate to Saved, News, Gallery and Venue before each further capture.
```

Use a large-display iPhone with dimensions accepted by App Store Connect; the submission worksheet links the current Apple specifications. Captures come from that actual simulator, not a browser or Android. Inspect every image before uploading.

The helper retains the raw PNG as evidence and uses macOS `sips` to produce an opaque, full-resolution JPEG for upload. It records device, dimensions and provenance beside each capture, and reports whether the dimensions match one of the checked large-display sizes.

To export a signed IPA without uploading:

```sh
export IOS_TEAM_ID='YOUR_10_CHARACTER_TEAM_ID'
node scripts/ios-archive.mjs
```

This validates Xcode/SDK, resolves packages, archives the App scheme, checks bundle identity and archive signature, then exports using `method=app-store-connect` and `destination=export`. The original team signs the build; the script does not invent a team or certificates. It can download/create the signing assets through Xcode's normal automatic provisioning once authorised by the account holder. It never uploads. Exported IPA and a hash/report go to `build-output/ios-1.0.0-1/`. Alternatively use Product → Archive → Distribute App in Xcode. Review the archive's generated privacy report and TestFlight/device behaviour before submitting.

## Submission boundaries

Source preparation on Windows does not compile Swift, run Interface Builder/asset compilation, resolve the Apple binaries, sign an IPA or test an iPhone. `PREPARATION.json` preserves these as false until actual Mac work is performed. Do not describe the ZIP as a signed iOS app. The external privacy/support URLs, copyright owner, review contact, Apple team, real iOS screenshots and processed uploaded build must be completed in App Store Connect. The publisher can reuse the already published accurate policy URL.

The actual Apple record uses English (U.S.); use `listing.en-US.json`. Its description explicitly states that the interface is primarily Uzbek. The earlier en-GB copy is historical; Uzbek reference copy does not claim an unsupported Connect localization.

For a later VPS migration, first deploy and verify the public content/media endpoint, then build a new higher iOS build/version against it and update privacy answers if practices change. The current package intentionally preserves Supabase to match the Android release. See `store/app-store/APP-STORE-FIELDS.md` for supported fields, review notes and official links. App Review approval is not established by local preparation.
