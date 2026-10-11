# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

GeoHub: a static portal (`index.html` + `css/portal.css`) linking five independent browser geography games: `satelcity/`, `flagquiz/`, `georank/`, `borderline/`, `coatofarms/`. Plain HTML/CSS/JS. There is no package.json, no build step, no linter and no test suite. Everything in the UI, code comments and commit messages is English-only.

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

`scripts/build_cities.js` regenerates `satelcity/js/cities.js`. It must run from `satelcity/` (`cd satelcity && node ../scripts/build_cities.js`). It reads `js/cities.js` and needs `/tmp/cities15000.txt`, `/tmp/countryInfo.txt` (GeoNames) and `/tmp/ne_50m_coastline.geojson` (Natural Earth) to be present.

## Architecture

**Each game is self-contained.** A game folder has its own `index.html`, CSS and JS and shares nothing with the other games except `data/` and the root `satelcity.jpeg` (used for social previews). Pages link back to the portal with `../`. All paths are relative because the site is deployed under a subpath (`cemeren.dev/satelcity/`). Never use root-absolute asset paths, except as the last fetch fallback described below.

**Data loading pattern (FlagQuiz, GeoRank, BorderLine, Coat of Arms):** the page first loads a `<script>` that assigns the dataset to a `window` global (`window.GEO_COUNTRIES` from `../data/countries.js`, or `window.COAT_OF_ARMS_DATA` from `data/arms.js`). This works over `file://` too. The game's JS uses the global if it is present, otherwise it `fetch`es the JSON (relative path first, then `/data/...`). The three country games read **only** the shared `data/` folder. Do not add per-game copies of the dataset again; they were removed on purpose.

**Country records** use the REST Countries shape: `name` is usually `{common, official}`, but GeoRank also accepts a plain string and normalises it. `flags.png`/`flags.svg` point to flagcdn.com. BorderLine only uses the 174 of the 250 countries that have an `svgPath`.

**SatelCity is different:** it uses ES modules (`<script type="module" src="js/app.js">`) and Leaflet 1.9.4 from unpkg, with ESRI World Imagery tiles. `app.js` controls the round lifecycle and loads one of two mode classes from `js/modes/` (`multipleChoice.js`, `textGuess.js`). `map.js` locks the camera (north-up, no pan or free zoom). `stats.js` is a singleton holding per-mode stats. `i18n.js` holds the UI strings. `cities.js` is generated (500 cities, `difficulty` easy/hard) and should not be hand-edited for bulk changes. The anti-cheat logic stores a pending round in `localStorage` and counts it as wrong on `beforeunload`/`pagehide`.

**The other four games** are classic scripts: one `js/app.js` (or `flagquiz/js/quiz.js`), mostly a single game class.

**Persistence:** `localStorage` only, with versioned keys (`satelcity_stats_v2_<mode>`, `geohub_borderline_stats_v1`, `geohub_coatofarms_stats_v1`). Bump the version suffix if the stored shape changes.

**Cache busting:** CSS/JS links in the game pages carry `?v=N` (e.g. `js/app.js?v=7`). Increment N when you change that file so deployed browsers pick up the new version.

**Coat of Arms images** live in `coatofarms/img/` (43 PNG/SVG files, already compressed with pngquant/oxipng and svgo). Compress any image you add in the same way. The answer list for autocomplete is limited to the 43 entries in `arms.json`.

## Conventions

- Commit messages: Conventional Commits with the game as scope, e.g. `fix(coatofarms): ...`, `feat: ...`, `perf(coatofarms): ...`.
- Deployment is a plain file upload (README shows nginx and `rsync`). There is no git remote configured.
