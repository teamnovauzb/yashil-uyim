# Store release agreement and repeatable workflow

These are the publisher's standing instructions from 29 October 2026. They apply alongside the earlier Mini App protection and mobile/VPS decisions. Read `AGENTS.md`, the current handoff and this workflow before a release.

## Initial release

1. Inspect the actual app and source revision. Use `codex/vps-ready`, not the original live Mini App checkout. Confirm all advertised functionality is implemented.
2. Verify owner/team, bundle/package ID, EAS project, versions, existing signing material and current store state. Create independent store records only where needed. Reuse POLOMAX Apple credentials only for the same authorised Apple team. Never copy Kids identifiers or its Android upload key.
3. Build and validate production artifacts. Select the exact intended EAS build ID, preserve hashes and use that ID for upload; never use `--latest` blindly. A simulator build is separate from the signed store IPA. Preserve Yashil Uyim's enrolled Android upload key.
4. Upload the verified binary and wait for store processing. EAS Submit success means upload, not App Review submission. Verify the processed build in the intended app/version before attaching it.
5. Fill name, subtitle, descriptions, keywords, categories, age/audience, privacy/support URLs, data practices, content rights, price/countries and reviewer access/contact from actual implementation and verified publisher information. Do not invent missing legal or contact declarations. Confirmed: free app, all countries, general audience without Apple's Kids category, permission to use festival media. Apple returned `FOUR_PLUS`; Google target-age bands are a separate declaration and must not be invented.
6. Capture actual native screens at the required dimensions for supported devices. This iOS binary targets iPhone only; no iPad screenshot claim is made. Android phone screenshots are 1080×1920. Retain capture provenance. If removing alpha, prove source pixels are opaque and decoded RGB values are unchanged. Inspect each screenshot for transient messages, missing media, layout issues and stale content. Do not fabricate iOS screenshots by resizing Android/browser images.
7. Use the current console display names and accepted dimensions. Portrait screenshots belong under **App Previews and Screenshots**, never Header Assets. If browser access is unavailable, distinguish Apple-published accepted sizes from a console label that has not actually been read.
8. Supply named upload folders and a ZIP. **The publisher uploads the first-release images and submits the initial version for review manually.** Do not cancel or resubmit their current review, and do not change the version's public-release policy.

## Authorised build infrastructure

The reusable guide is `D:\Projects\teamnovauzb\polomax\kids\APP_RELEASE_GUIDE.md`. The helper is `root@138.199.230.47`, Windows SSH key reference `C:\Users\pydev\.ssh\polomax_friend_key`, Expo owner `polomax`, Apple team `HB4NQBS6LM`. An isolated workspace was created at `/root/app-releases/yashiluyim-ios-20261029`. No backend was deployed there. EAS macOS workers compile the app; Linux only starts the jobs. Global Node/services were not changed.

Existing Apple API-key reference: `/var/www/keys/AuthKey_LB3ZYSJ6AS.p8`, key ID `LB3ZYSJ6AS`, issuer `322d1613-6f53-4df8-8c4d-e49fb345b2eb`. These are references, not key contents. The key stays on the server. Use an environment variable/reference for automation; never copy it into Git, a source archive, a screenshot ZIP or local logs. Reuse the valid distribution certificate; the new bundle's provisioning profile is independent. Do not revoke another app's certificate/profile.

Native EAS preparation uses `npm run ios:eas:prepare`. The ignored snapshot has the Capacitor Xcode project flattened into EAS's normal `ios/App.xcodeproj` location, pinned SwiftPM runtime and vendor App/Browser sources. `app.json` only supplies EAS account/project metadata; it is not a framework conversion. The custom build skips Expo prebuild and React Native bundling.

The first source archive SHA-256 was `8f188ea4327ca2567a03fed505c2ed689bcef7c2000287f7dc6f21460f00e2f6`. Its web/native app source came from commit `78c1447`; cloud configuration was added in the isolated snapshot and the dependency-free npm lockfile was then generated on the helper. The final cloud preparation/records are committed separately. Do not describe the initial archive as an unmodified full Git checkout of a later documentation commit.

## Future releases after the initial release is established

The publisher authorised a future automated pipeline, conditional on completing the initial release. `store/release-status.json` must truthfully identify whether that condition is met. As of the latest preparation, it is false. No active automatic review workflow is installed.

Git remote is `https://github.com/teamnovauzb/yashil-uyim.git`. A read-only GitHub API query on 29 October returned no Actions workflows; there is no existing store CI to claim reused. Preserve Vercel/live Mini App hosting. Once the initial release is established, inspect the current repository CI again and implement a dedicated tag-only store workflow using its current supported system (GitHub Actions if no other system exists). Do not release on every ordinary source push or alter hosting triggers.

The eventual workflow must:

1. Resolve an explicit release tag to one source revision; validate version metadata and clean, intentional build context.
2. Query actual Apple/Google state and used versions. Refuse reused build numbers/versionCodes, mismatched app/project/team/key, active conflicting reviews or uncertain prior uploads.
3. Run the required source, guest-bundle, release guard, native/SDK/privacy, signing, source-parity and platform checks. Fail closed when they fail.
4. Build production with that unused version identity; record build IDs, source/tag and hashes. Preserve exact signing identities and map each Android AAB to its own R8 mapping.
5. Upload that exact artifact. Poll Apple/Google processing with bounded waits, then verify app ID/version/build/state. Do not treat a scheduled EAS submission as a processed build.
6. Attach the correct processed build and truthful release notes. Reuse screenshots only if they still accurately show the release UI. Require regenerated/inspected images if UI or supported device requirements changed.
7. Validate metadata, reviewer access, URL reachability, legal declarations and account agreements. Do not guess new declarations or accept owner-only agreements. Preserve existing pricing/territories and public-release policy unless the user specifically changes them.
8. Perform the separate App Store Connect App Review submission and/or Google Play release-track review commit. Verify the resulting review state from the store API, rather than inferring it from a CLI exit code. Initial review remains manual; this step is authorised for later updates after the initial-release gate.
9. Persist an idempotent release record so reruns inspect/recover existing uploads/submissions instead of creating duplicates or cancelling reviews. Report approval/publication separately from review submission.

Provision CI credentials through the supported secret/OIDC mechanism with app-specific permissions. Do not export the Windows DPAPI Android password into a repository. Google Play API access is a separate prerequisite; the Apple key cannot upload AABs. No Google service-account key or Play API authorisation has been verified for Yashil Uyim yet.

## Current access limitation

Windows Computer Use stopped after it could not determine the active Chrome URL confidently enough to enforce its policy. No further browser actions are permitted in that stopped session. The publisher created the Apple record manually and provided `6828467813`; the Apple API then verified the correct bundle ID. Continue supported server/API work; do not bypass a browser safety stop or claim a console field was read when it was not.
