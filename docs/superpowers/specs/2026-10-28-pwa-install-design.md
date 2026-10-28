# GeoHub: install to home screen (PWA) — design

## Intent
Let people put GeoHub on their phone's home screen and open it full screen like an app, via an "Install app" button on the portal. Offline play is not wanted.

## Goals
- Installable on Android (Chrome) and iPhone (Safari), opening the portal full screen with the GeoHub icon and name.
- An "Install app" button on the portal: on Android it opens the system install prompt; on iPhone it shows short "Share → Add to Home Screen" instructions.
- Every game page belongs to the same app, so adding to home screen from a game page still installs GeoHub.

## Non-goals / anti-goals
- No offline mode and no precaching: installing must not download the game files ahead of time (the server is a friend's; keep load to what a normal visit costs).
- No per-game apps.
- No change to how the games play.

## Constraints
- Static files under `cemeren.dev/geohub/`, uploaded by FTP; relative paths only.
- Atlas design system for the button and the instructions sheet; English UI; no emoji.
- Apple does not let sites open the install prompt; iPhone can only be guided.

## Approaches
- **A. Manifest + no-op service worker, button on the portal (chosen).** Reliable install prompt on Android, same result on iPhone, no extra server load.
- B. Manifest only. Simpler, but the Android button may not get an install prompt in every browser.
- C. One app per game. Ten icons; not what was asked.

## How it works (decided)
- `manifest.webmanifest` at the site root: name/short_name "GeoHub", `start_url` and `scope` "./", `display: standalone`.
- `sw.js` at the site root, registered from every page: no caching, every request goes to the network as usual.
- Every page links the manifest. The portal gets the button.

- The button appears only on the portal (GeoHub home page), never on game pages (confirmed by the user).

## Notch / Dynamic Island (user asked; will be checked on an iPhone 17)
- iOS status bar style "default": the system keeps its own bar above the page, so the clock and battery stay dark on light and never overlap the content. ("black-translucent" would draw white status text over the light paper, unreadable.)
- Every page sets `viewport-fit=cover`, and `css/atlas.css` pads the page with `env(safe-area-inset-*)` on all four sides, so nothing sits under the Dynamic Island, the rounded corners or the home indicator, in portrait and in landscape (where the island is on the side).
- Fixed overlays (`atlas-modal-backdrop`, the iPhone instructions sheet) also respect the safe areas.
- Builder can only simulate this; final check is the user's iPhone 17.

## Left to the builder (my calls, open to change)
- Colours: `theme_color` and `background_color` = Atlas paper `#F3EEE3`; iOS status bar style "default".
- Icons: 192 and 512 px PNGs (plus a maskable 512 with safe padding) generated from `favicons/geohub.svg`, stored in `favicons/`.
- Button placement: in the portal header next to `cemeren.dev ↗`, as a small Atlas button with a download icon; hidden when already running as an installed app, and on desktop unless the browser offers an install prompt.
- iPhone instructions: an Atlas modal with the two steps and the Share icon drawn as an inline SVG.
- Cache-busting `?v=` bumps on changed pages; README "Production Deployment" upload list gains `manifest.webmanifest` and `sw.js`; CLAUDE.md notes the PWA files.
