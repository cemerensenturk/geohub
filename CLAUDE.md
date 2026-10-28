# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

GeoHub: a static portal (`index.html` + `css/portal.css`) linking ten independent browser geography games: `satelcity/`, `flagquiz/`, `georank/`, `borderline/`, `coatofarms/`, `compass/`, `mercator/`, `furthernorth/`, `neighbours/`, `pinthecity/`. Plain HTML/CSS/JS. There is no package.json, no build step, no linter and no test suite. Everything in the UI, code comments and commit messages is English-only.

## Commands

```bash
python3 -m http.server 8080        # serve the repo root, then open http://localhost:8080
```

To verify a change, load the affected game in a browser and check the console. Each game has its own page at `/<game>/`.

Regenerate `data/countries.js` after editing `data/countries.json` (the two must stay identical):

```bash
node -e "const fs=require('fs');fs.writeFileSync('data/countries.js','window.GEO_COUNTRIES = '+JSON.stringify(JSON.parse(fs.readFileSync('data/countries.json','utf8')))+';\n')"
```

`coatofarms/data/arms.js` (`window.COAT_OF_ARMS_DATA`) mirrors `coatofarms/data/arms.json` in the same way.

`scripts/build_outlines.js` redraws BorderLine's `svgPath` outlines (400×400 box, 35px padding, Mercator) from Natural Earth 1:50m. It needs `countries-50m.json` (world-atlas@2.0.2) and `codes.json` (i18n-iso-countries@7.11.0) downloaded first; usage is in its header. It keeps the main landmass plus nearby islands and drops far-flung territories (contiguous US only).

`scripts/build_worldmap.js` generates `data/worldmap.js` (Mercator land path, 1000×679, plus `project(lat, lng)`) from the same `countries-50m.json`. Don't edit worldmap.js by hand.

`scripts/build_neighbours.js` generates `neighbours/js/data.js` (every country's path in worldmap.js units, its main-landmass box and land neighbours from shared topology arcs; Hong Kong and Macau are drawn but not counted as neighbours). It also needs `codes.json` and `data/countries.json` for names. Don't edit data.js by hand.

`scripts/build_cities.js` regenerates `satelcity/js/cities.js`. It must run from `satelcity/` (`cd satelcity && node ../scripts/build_cities.js`). It reads `js/cities.js` and needs `/tmp/cities15000.txt`, `/tmp/countryInfo.txt` (GeoNames) and `/tmp/ne_50m_coastline.geojson` (Natural Earth) to be present.

## Architecture

**Each game is self-contained.** A game folder has its own `index.html`, CSS and JS and shares nothing with the other games except `data/`, `css/atlas.css`, `favicons/`, `og/` and shared ES modules: Compass, Further North and Pin the City import the city list from `satelcity/js/cities.js`; Compass and Pin the City import the map from `data/worldmap.js` (modules need http, not `file://`). Pages link back to the portal with `../`. All paths are relative because the site is deployed under a subpath (`cemeren.dev/geohub/`, games at `cemeren.dev/geohub/<game>/`). Never use root-absolute asset paths, except as the last fetch fallback described below.

**Data loading pattern (FlagQuiz, GeoRank, BorderLine, Coat of Arms):** the page first loads a `<script>` that assigns the dataset to a `window` global (`window.GEO_COUNTRIES` from `../data/countries.js`, or `window.COAT_OF_ARMS_DATA` from `data/arms.js`). This works over `file://` too. The game's JS uses the global if it is present, otherwise it `fetch`es the JSON (relative path first, then `/data/...`). The three country games read **only** the shared `data/` folder. Do not add per-game copies of the dataset again; they were removed on purpose.

**Country records** use the REST Countries shape: `name` is usually `{common, official}`, but GeoRank also accepts a plain string and normalises it. `flags.png`/`flags.svg` point to flagcdn.com. BorderLine only uses the 174 of the 250 countries that have an `svgPath`.

**SatelCity is different:** it uses ES modules (`<script type="module" src="js/app.js">`) and Leaflet 1.9.4 from unpkg, with ESRI World Imagery tiles. `app.js` controls the round lifecycle and loads one of two mode classes from `js/modes/` (`multipleChoice.js`, `textGuess.js`). `map.js` locks the camera (north-up, no pan or free zoom). `stats.js` is a singleton holding per-mode stats. `i18n.js` holds the UI strings. `cities.js` is generated (500 cities, `difficulty` easy/hard) and should not be hand-edited for bulk changes. The anti-cheat logic stores a pending round in `localStorage` and counts it as wrong on `beforeunload`/`pagehide`.

**The other games** have one `js/app.js` (or `flagquiz/js/quiz.js`). FlagQuiz, GeoRank, BorderLine, Coat of Arms and Mercator's Lie are classic scripts; Compass, Further North, Neighbours and Pin the City are ES modules. Mercator's Lie redraws outlines at a common scale using each country's `svgScale` (pixels per Mercator degree) and `svgLat` (middle latitude).

**Persistence:** `localStorage` only, with versioned keys (`satelcity_stats_v2_<mode>`, `geohub_borderline_stats_v1`, `geohub_coatofarms_stats_v1`). Bump the version suffix if the stored shape changes.

**Cache busting:** CSS/JS links in the game pages carry `?v=N` (e.g. `js/app.js?v=7`). Increment N when you change that file so deployed browsers pick up the new version.

**Design system (Atlas):** every page loads `css/atlas.css` before its own stylesheet, plus the Newsreader / Public Sans / IBM Plex Mono Google Fonts link (URL in the atlas.css header). It holds the colour and type tokens and the shared components (`atlas-page`, `atlas-topbar`, `atlas-stats`, `atlas-btn`, `atlas-option`, `atlas-input`, `atlas-segmented`, `atlas-feedback`, `atlas-modal`, `atlas-chip`, `.icon`). Each game picks its single accent colour with `<body data-game="…">` (SatelCity sea, Flag Quiz brick, GeoRank ochre, BorderLine plum, Coat of Arms heraldic blue, Compass raspberry, Mercator's Lie rust, Further North indigo, Neighbours olive, Pin the City cerulean). The look is a light paper atlas: no dark themes, glows, gradients or glassmorphism, and no emoji in the UI. Icons are inline stroke SVGs (`<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">`). Change shared styling in atlas.css, not by copying rules into game stylesheets.

**Installable app (PWA):** `manifest.webmanifest` and `sw.js` at the root make the whole site one home-screen app ("GeoHub", standalone, starts at the portal). `sw.js` deliberately caches nothing (the host is a friend's server). Every page carries the PWA head tags (manifest link, `theme-color`, `apple-mobile-web-app-*`, `viewport-fit=cover`, apple-touch-icon = `favicons/geohub-180.png`) and the guarded `navigator.serviceWorker.register` snippet before `</body>`; `css/atlas.css` pads `body` and modal backdrops with `env(safe-area-inset-*)`. The "Install app" button lives only on the portal. `node scripts/check_pwa.js` verifies all of this.

**Coat of Arms images** live in `coatofarms/img/` (43 PNG/SVG files, already compressed with pngquant/oxipng and svgo). Compress any image you add in the same way. The answer list for autocomplete is limited to the 43 entries in `arms.json`.

## Conventions

- Commit messages: Conventional Commits with the game as scope, e.g. `fix(coatofarms): ...`, `feat: ...`, `perf(coatofarms): ...`.
- Deployment is a plain FTP upload (FileZilla) of the folders listed in README's "Production Deployment" section into `geohub/` on cemeren.dev.
- Git remote: `origin` = https://github.com/cemerensenturk/geohub (public), default branch `main`.

## Adding a game

1. New folder with `index.html`, `css/style.css`, `js/app.js`; copy the `<head>` pattern from an existing game (fonts, favicons, PWA tags, `../css/atlas.css` first, OG/Twitter tags) and the service-worker snippet before `</body>`, add the game to `GAMES` in `scripts/check_pwa.js`, and run it.
2. Add an accent colour token and a `body[data-game="…"]` rule in `css/atlas.css`.
3. Add a favicon (`favicons/<game>.svg` + `<game>-180.png`), a 1200×630 `og/<game>.png`, and a row in the portal `index.html` (update the game count in the hero text and meta description).
4. OG/Twitter image URLs are absolute: `https://cemeren.dev/geohub/og/<game>.png`, and `og:url` is `https://cemeren.dev/geohub/<game>/`.
5. Update README.md (games table and the game's section).

