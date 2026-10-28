# GeoHub Install-to-Home-Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make GeoHub installable to the phone home screen (full screen, no offline), with an "Install app" button on the portal only.

**Architecture:** A root `manifest.webmanifest` and a no-op root `sw.js` make the whole `/geohub/` scope one installable app; every page links the manifest, registers the worker and respects iOS safe areas. The portal gets a small classic script, `js/install.js`, that shows the button: native prompt on Android/Chromium, an Atlas instructions sheet on iOS, hidden when already installed or when nothing can be offered.

**Tech Stack:** Plain HTML/CSS/JS (no build, no test runner). Verification: a Node check script plus Playwright (MCP browser tools) against `python3 -m http.server` at the repo root.

**Spec:** `docs/superpowers/specs/2026-10-28-pwa-install-design.md`

## Global Constraints

- No offline mode, no precaching, no Cache Storage use: `sw.js` must not call `caches` or `cache.addAll`, and its fetch handler must not call `respondWith`.
- Relative paths only (site lives at `cemeren.dev/geohub/`); `start_url` and `scope` are `"./"`.
- name / short_name: `"GeoHub"`; `display: "standalone"`; `theme_color` and `background_color`: `"#F3EEE3"`.
- iOS: `apple-mobile-web-app-capable` = `yes`, `apple-mobile-web-app-status-bar-style` = `default`, `apple-mobile-web-app-title` = `GeoHub`.
- Viewport on every page: `width=device-width, initial-scale=1.0, viewport-fit=cover`.
- Install button on the portal (`index.html`) only — never on game pages.
- Atlas look, English UI, no emoji, inline stroke SVG icons; touch targets ≥44px.
- Bump `?v=` on every CSS/JS link that changes (`css/atlas.css` → `?v=2` everywhere it is linked).

## Review Focus

1. Chrome on iPhone (`CriOS` in UA, no `beforeinstallprompt`): must get the iOS instructions, not a dead button. → Task 2 check `ios-chrome`.
2. Already installed (`display-mode: standalone` or iOS `navigator.standalone === true`): button must never show. → Task 2 check `standalone-hidden`.
3. Desktop Firefox/Safari (no prompt, not iOS): button hidden, no errors. → Task 2 check `desktop-no-prompt`.
4. Prompt is single-use: after the user accepts or dismisses, the button hides (Chrome will not re-prompt in that page load); `appinstalled` also hides it. → Task 2 check `prompt-once`.
5. Service worker registration failing (opened via `file://`, or `serviceWorker` missing) must not throw or break any game. → Task 1 check `sw-guarded`.

---

### Task 1: Installable app shell on every page

**Files:**
- Create: `manifest.webmanifest`, `sw.js`, `favicons/geohub-192.png`, `favicons/geohub-512.png`, `favicons/geohub-maskable-512.png`, `scripts/check_pwa.js`
- Modify: `<head>` of `index.html` and the 10 `*/index.html` game pages; `css/atlas.css` (safe areas); `README.md` (upload list); `CLAUDE.md` (PWA note)

**Interfaces:**
- Produces: `manifest.webmanifest` at the site root; `sw.js` at the site root, registered with scope `./` (portal) / `../` (games) — i.e. always the `/geohub/` scope; `css/atlas.css?v=2` with safe-area padding.

- [ ] **Step 1: Write the failing check `scripts/check_pwa.js`** (Node, no deps; exits non-zero on any failure, prints each failed assertion)

Asserts:
- `manifest.webmanifest` parses as JSON; `name === "GeoHub"`, `short_name === "GeoHub"`, `start_url === "./"`, `scope === "./"`, `display === "standalone"`, `theme_color === background_color === "#F3EEE3"`; `icons` contains a 192×192 PNG, a 512×512 PNG and a 512×512 PNG with `purpose: "maskable"`, and every icon `src` file exists.
- PNG dimensions read from the IHDR bytes match the declared sizes.
- `sw.js` exists, contains `addEventListener('fetch'`, and contains none of `caches`, `respondWith`, `addAll`.
- For each of the 11 pages: links `rel="manifest"` to the root manifest (`manifest.webmanifest` / `../manifest.webmanifest`); has the three `apple-mobile-web-app-*` metas with the exact values above; has `<meta name="theme-color" content="#F3EEE3">`; viewport contains `viewport-fit=cover`; contains `navigator.serviceWorker` registration guarded by `'serviceWorker' in navigator` and `location.protocol` starting with `http` (check `sw-guarded`); links `atlas.css?v=2`.
- Only `index.html` contains `id="install-btn"` (game pages must not).

- [ ] **Step 2: Run it to see it fail**

Run: `node scripts/check_pwa.js`
Expected: FAIL (manifest missing, and so on).

- [ ] **Step 3: Generate the icons** from `favicons/geohub.svg` with headless Chrome screenshots, like the existing `-180.png` icons: 192 and 512 at full bleed (`rx="0"`); maskable 512 with the glyph scaled to fit the central 80% safe zone on the solid `#1E2933` background.

- [ ] **Step 4: Create `manifest.webmanifest`** with the Global Constraints values, `lang: "en"`, a one-line `description` taken from the portal meta description, and the three icons.

- [ ] **Step 5: Create `sw.js`**: an `install` handler calling `self.skipWaiting()`, an `activate` handler calling `self.clients.claim()`, and an empty `fetch` listener (comment: exists only so Chromium treats the site as installable; no caching on purpose — the host is a friend's server).

- [ ] **Step 6: Update all 11 page heads**: viewport `viewport-fit=cover`; manifest link; `theme-color`; the three `apple-mobile-web-app-*` metas; `atlas.css?v=2`; and an inline registration just before `</body>`:

```html
<script>
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('<root>sw.js').catch(() => {});
  }
</script>
```
(`<root>` = `` on the portal, `../` on games.)

- [ ] **Step 7: Safe areas in `css/atlas.css`**: on `body`, `padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);` and on `.atlas-modal-backdrop`, padding of `max(16px, env(safe-area-inset-*))` per side. Check no game stylesheet sets `body { padding }` that would override it (grep; if one does, fold the env() values into that rule).

- [ ] **Step 8: Docs**: README "Upload with FTP" list gains `manifest.webmanifest`, `sw.js`; CLAUDE.md gains one paragraph: the app is installable (manifest + no-op `sw.js`, no caching by design), every new page must copy the PWA head tags and the registration snippet, and the install button lives only on the portal.

- [ ] **Step 9: Run the check and a browser check**

Run: `node scripts/check_pwa.js` → Expected: `PWA check: all passed`.
Then with `python3 -m http.server 8091` running, use Playwright to open `http://localhost:8091/` and each game page: zero console errors; `navigator.serviceWorker.controller` or `getRegistration()` resolves on the portal; via a CDP session `Page.getInstallabilityErrors` returns an empty list. Screenshot the portal and two games at 390×844 to confirm layouts are unchanged.

- [ ] **Step 10: Commit**

```bash
git add manifest.webmanifest sw.js favicons/geohub-192.png favicons/geohub-512.png favicons/geohub-maskable-512.png scripts/check_pwa.js index.html */index.html css/atlas.css README.md CLAUDE.md
git commit -m "feat: make GeoHub installable as a home-screen app"
```

---

### Task 2: Install button and iPhone instructions on the portal

**Files:**
- Create: `js/install.js` (classic script)
- Modify: `index.html` (button in `.portal-header` next to `.portal-creator`, the instructions modal markup, `<script src="js/install.js?v=1">`), `css/portal.css` (`?v=3`; button and sheet styles), `scripts/check_pwa.js` (assert `js/install.js` is linked only from `index.html`)

**Interfaces:**
- Consumes: Task 1's manifest/sw (needed for `beforeinstallprompt` to fire in Chromium).
- Produces: `#install-btn` (`atlas-btn atlas-btn--sm`, download icon + "Install app", `hidden` by default); `#install-sheet` (an `atlas-modal-backdrop` > `atlas-modal`, `role="dialog"`, `aria-modal="true"`, `aria-labelledby="install-sheet-title"`, `hidden` by default) with title "Install GeoHub", two numbered steps — "Tap the Share button" (inline Share icon: `<path d="M12 3v12M8 7l4-4 4 4"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>`) and "Choose Add to Home Screen" — and a "Got it" close button.

`js/install.js` behaviour (decided):
- `isStandalone()`: `matchMedia('(display-mode: standalone)').matches || navigator.standalone === true` → if true, do nothing (button stays hidden).
- `isIOS()`: iPhone/iPad/iPod in UA, or `MacIntel` platform with `maxTouchPoints > 1` (iPadOS) — covers Safari, Chrome (`CriOS`) and Firefox (`FxiOS`) on iOS.
- iOS → show button; click opens `#install-sheet`, focus moves to "Got it"; Esc, backdrop click and "Got it" close it and return focus to the button.
- Otherwise listen for `beforeinstallprompt`: `preventDefault()`, keep the event, show the button; click → `event.prompt()`, await `userChoice`, then hide the button and drop the event (single use).
- `appinstalled` → hide the button.
- No prompt and not iOS → button stays hidden.

- [ ] **Step 1: Write the failing browser checks** (Playwright against the local server; record each as pass/fail in the task report):
  - `android-prompt`: on `http://localhost:8091/`, dispatch a synthetic `beforeinstallprompt` (an `Event` with stub `prompt()` and `userChoice` resolving `{outcome:'dismissed'}`) → `#install-btn` becomes visible; clicking it calls `prompt` once.
  - `prompt-once`: after that click resolves → `#install-btn` is hidden; dispatching `appinstalled` on a fresh load with the button shown also hides it.
  - `ios-safari`: new context with an iPhone Safari UA, 390×844 → button visible; click → `#install-sheet` visible, focus on "Got it"; Esc closes it, focus back on the button.
  - `ios-chrome`: same with a UA containing `CriOS` → same behaviour as `ios-safari`.
  - `standalone-hidden`: iPhone UA with `navigator.standalone` overridden to `true` (init script) → button hidden.
  - `desktop-no-prompt`: default desktop context, no synthetic event → button hidden, no console errors.
  - `games-no-button`: every game page has no `#install-btn`.

- [ ] **Step 2: Run them to see them fail** — Expected: `#install-btn` not found.

- [ ] **Step 3: Implement** the markup, `css/portal.css` styles (button fits the header on 390px without wrapping the brand or `cemeren.dev ↗`; on ≤640px the coords are already hidden, so keep `.portal-creator` and the button on one row), and `js/install.js` as decided above. Sheet uses existing `atlas-modal` classes; numbered steps in IBM Plex Mono; Share icon inline.

- [ ] **Step 4: Run the checks** — Expected: all seven pass; `node scripts/check_pwa.js` still passes. Screenshot the portal header at 390×844 (iPhone UA, button visible) and the open sheet in portrait and in landscape (844×390) to confirm it clears the safe areas.

- [ ] **Step 5: Commit**

```bash
git add js/install.js index.html css/portal.css scripts/check_pwa.js
git commit -m "feat(portal): add Install app button with iPhone instructions"
```
