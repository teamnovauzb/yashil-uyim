# App Store Connect fields

This is a preparation worksheet, not a record of an upload or approved answers.

| Field | Value |
| --- | --- |
| Platform | iOS |
| Name | Yashil Uyim |
| Bundle ID | uz.teamnova.yashiluyim |
| SKU | yashiluyim-ios (internal suggestion; choose an unused SKU) |
| Initial version / build | 1.0.0 / 1 |
| Devices | iPhone, iOS 15+; no iPad-specific target in this first package |
| Primary language | English (U.K.) / en-GB |
| Interface / content | Primarily Uzbek; stated in description and reviewer notes |
| Primary category | Lifestyle (suggestion; confirm in Connect) |
| Price | Free |
| Sign-in required | No |
| In-app purchases | None |
| Ads / tracking SDK | None in this guest build |
| App icon | graphics/app-icon-1024.png; identical source to installed icon |
| Copyright | Fill in the legal content/app owner's name and year |
| Review contact | Fill in the real name, email and phone of the person Apple may contact |
| Privacy policy URL | Paste the actual published public HTTPS Google Docs or other policy URL; no login required |
| Support URL | Publish a page with app support/contact details and paste its HTTPS URL |
| Public support email | Fill in the real address on the support page and policy |
| Apple Developer Team | Choose your actual team in Xcode, or use IOS_TEAM_ID for the archive script |

Uzbek is not currently a dedicated App Store metadata localization in Apple's published list. The en-GB listing is accurate English and explicitly discloses Uzbek UI. The Uzbek reference copy is supplied separately; do not assume an `uz` localization can be uploaded to App Store Connect. Native app content remains Uzbek.

## Privacy and age rating

The app contains no account identifiers, contact forms, analytics, advertising, purchases, uploads or access to camera, microphone, location, contacts or photos. Bookmarks and cached public text remain in WKWebView local storage. The app privacy manifest declares no tracking or app-owned required-reason API access. Capacitor's own SDK privacy manifests must remain in the resolved archive.

Public data/media requests expose ordinary network information, including IP addresses, to Supabase/CDN hosts. External map/support pages have their own practices. Before completing App Privacy, confirm the providers' actual retained logs and uses. Do not automatically select “Data Not Collected” based only on the lack of accounts or this app manifest. Review Xcode's aggregate privacy report and the hosted privacy policy together. No ATT prompt is implemented because no tracking is implemented.

Complete Apple's current age-rating questionnaire for the curated festival content. This version has no user uploads/comments, messaging, gambling, purchases or age-restricted app features. Check all published images, videos and announcements before answering; do not invent a final age rating or rights ownership. Confirm the organiser has rights to the logo and published media.

For export compliance, the prepared Info.plist declares `ITSAppUsesNonExemptEncryption = false`: this guest app uses system HTTPS and contains no custom encryption implementation. Review Apple's questions and the final dependency/privacy report before confirming.

## Required screenshots

Capture genuine screenshots on the built iOS app in a large-display iPhone Simulator or physical iPhone. Current accepted large Dynamic Island portrait sizes include 1260×2736, 1290×2796 and 1320×2868. Confirm the current size shown in Connect when uploading. At least one screenshot is needed; prepare Home, Program, Saved, News, Gallery and Venue. Use the provided simulator capture helper after navigating each screen. Do not upload Android screenshots or resized browser previews as iOS screenshots.

The package intentionally has no fabricated iOS screenshots. Actual simulator capture, signed IPA and TestFlight/device checks require the Mac stage. No iPad screenshots are needed for the configured iPhone-only target; if iPad support is added, test it and supply its required images.

## Submit after the Mac stage

1. Register the explicit bundle ID under your team and create the iOS App Store Connect record.
2. Open the included Xcode project. Select your team in Signing & Capabilities. Resolve the pinned SwiftPM packages.
3. Build/run the actual iOS app, inspect icons, safe areas, keyboard, all five tabs, search, saved items, offline text, external map and privacy screens. Capture real screenshots.
4. Archive/export the signed release using the included script or Xcode Organizer. Upload through Organizer/Transporter; neither included helper uploads anything.
5. Complete the policy/support URLs, review contact, content rights, age rating, privacy and export-compliance answers. Use the matching app name and logo everywhere.
6. Once Apple has processed the build, select it on version 1.0.0, attach real screenshots, use the included reviewer notes with “Sign-in required” unchecked, and submit for review.

Apple reviews utility as well as policy details. Describe the existing search, on-device saved schedule and offline public text accurately. A simple festival app is not guaranteed approval under guideline 4.2. No additional functionality is claimed or hidden for reviewers.

## Sources checked 29 October 2026

- [Upload builds and supported Xcode versions](https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds/)
- [Screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/)
- [Supported App Store localizations](https://developer.apple.com/help/app-store-connect/reference/app-information/app-store-localizations/)
- [App privacy](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy/)
- [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Capacitor iOS requirements](https://capacitorjs.com/docs/ios)
- [Capacitor privacy manifests](https://capacitorjs.com/docs/ios/privacy-manifest)
