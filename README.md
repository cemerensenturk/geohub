# GeoHub 🌍

> **Explore the world through play: ten browser-based geography games in one portal.**

[![Live Demo](https://img.shields.io/badge/Demo-cemeren.dev%2Fgeohub-22c55e?style=for-the-badge&logo=googlechrome&logoColor=white)](https://cemeren.dev/geohub)
[![License: MIT](https://img.shields.io/badge/License-MIT-amber.svg?style=for-the-badge)](LICENSE)
[![Vanilla JS](https://img.shields.io/badge/Vanilla-JS_ES6+-yellow.svg?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Zero Dependency](https://img.shields.io/badge/Zero-Build_Steps-brightgreen.svg?style=for-the-badge)](https://leafletjs.com/)

**GeoHub** is a collection of geography games built with plain HTML, CSS and JavaScript. It needs no API keys, no package installs and no build step: serve the folder and play.

---

## 🎮 Games

| Game | Folder | How it plays |
|---|---|---|
| 🛰️ **SatelCity** | `satelcity/` | Identify world cities from label-free satellite imagery |
| 🚩 **FlagQuiz** | `flagquiz/` | Name the country from its flag |
| 📊 **GeoRank** | `georank/` | Drag 10 countries into order by land area or population |
| 🗺️ **BorderLine** | `borderline/` | Recognise a country from its border silhouette, 4 choices, streak tracking |
| 🛡️ **Coat of Arms** | `coatofarms/` | Name the state or empire behind a coat of arms |
| 🧭 **Compass** | `compass/` | Point the needle from one city to another (initial great-circle bearing) |
| 🗺️ **Mercator's Lie** | `mercator/` | Two countries at Mercator scale: which one is really larger? |
| ⬆️ **Further North** | `furthernorth/` | Which of two cities is further north? Keep the streak going |
| 🧩 **Neighbours** | `neighbours/` | Name every country that shares a land border with the highlighted one |
| 📍 **Pin the City** | `pinthecity/` | Drop a pin on a blank world map; points fall off with every kilometre |

### 🛰️ SatelCity
- **Label-free ESRI World Imagery** through Leaflet, locked north-up with pan and free zoom disabled. An **🔍 Expand Photo** view shows the same crop larger.
- **500 cities in 2 tiers:** 100 Easy (Paris, Tokyo, Istanbul, Rio de Janeiro…) and 400 Hard (Kigali, Ulaanbaatar, Tbilisi, Ushuaia…), generated from GeoNames, Natural Earth and a hybrid fame index.
- **Multiple Choice mode:** 4 options with distractors from the same tier and similar geography (coastal vs inland). Answer with `1–4` or `A–D`, continue with `Enter`.
- **Type & Guess mode:** diacritic-insensitive autocomplete and 5 attempts. Each wrong guess shows the great-circle distance (Haversine) and an 8-point compass arrow toward the target.
- **Anti-cheat:** leaving, refreshing or closing the tab mid-round counts as a wrong answer.

### 🚩 FlagQuiz
- Flags and country trivia from the shared country dataset (250 countries, originally from the REST Countries API).

### 📊 GeoRank
- Rank 10 random countries from largest to smallest, by **area** or **population**. Aim for a perfect 10/10.

### 🗺️ BorderLine
- Guess the country from its SVG outline (174 countries with border paths), with 4 choices, a streak counter and session progress.
- Outlines are drawn from [Natural Earth](https://www.naturalearthdata.com/) 1:50m (public domain) by `scripts/build_outlines.js`.

### 🧭 Compass
- Two cities from the SatelCity list: rotate the needle to the initial great-circle bearing from the first to the second. The reveal also shows the flat-map (rhumb line) bearing, which is often far off. 10 rounds, up to 100 points each.

### 🗺️ Mercator's Lie
- Two country outlines drawn at the same Mercator scale. Pick the one that is really larger, then watch both shrink to their true relative size. Uses the `svgScale` / `svgLat` fields written by `scripts/build_outlines.js`.

### ⬆️ Further North
- Streak game: which city is further north? A latitude ruler reveals the answer; pairs get closer in latitude as the streak grows.

### 🧩 Neighbours
- A country is highlighted on the map; type its land neighbours. Neighbours are derived from Natural Earth topology (shared border arcs) by `scripts/build_neighbours.js`, so overseas borders count too (France borders Brazil).

### 📍 Pin the City
- Find a city from the SatelCity list on a label-free world map (pan and zoom), then see how many kilometres off you were. Uses the shared map in `data/worldmap.js`.

### 🛡️ Coat of Arms
- 43 coats of arms, both historical empires (Ottoman Empire, USSR, Kingdom of Prussia…) and modern sovereign states.
- Open-ended text guess with autocomplete limited to the 43 answers, a feedback banner after each guess and a victory modal at the end of a session.
- All images are stored locally in `coatofarms/img/`.

---

## 📁 Project Structure

```
satellite/
├── index.html              # GeoHub portal (game cards)
├── css/
│   ├── atlas.css           # Shared "Atlas" design system: tokens + components for every page
│   └── portal.css          # Portal-only styles
├── js/install.js           # Portal "Install app" button (home-screen install)
├── manifest.webmanifest    # Makes the site installable as a home-screen app
├── sw.js                   # No-op service worker (nothing is cached on purpose)
├── og/                     # 1200×630 social preview images, one per page
├── data/
│   ├── countries.json      # Shared country dataset (FlagQuiz, GeoRank, BorderLine, Mercator's Lie)
│   ├── worldmap.js         # Mercator world map + project/unproject (Compass, Pin the City)
│   └── countries.js        # Same data as window.GEO_COUNTRIES, works over file:// too
├── scripts/
│   ├── build_cities.js     # Node pipeline that generates satelcity/js/cities.js
│   ├── build_outlines.js   # Redraws BorderLine outlines from Natural Earth 1:50m
│   ├── build_worldmap.js   # Generates data/worldmap.js (Mercator world map)
│   └── build_neighbours.js # Generates neighbours/js/data.js (country shapes + land neighbours)
├── favicons/               # SVG favicons + 180px touch icons, one per page
├── compass/  mercator/  furthernorth/  neighbours/  pinthecity/   # index.html, css/style.css, js/app.js each
├── satelcity/
│   ├── index.html
│   ├── css/style.css
│   └── js/
│       ├── app.js          # Round lifecycle and keyboard shortcuts
│       ├── cities.js       # 500 curated cities (generated)
│       ├── i18n.js         # English strings and number formatters
│       ├── map.js          # Leaflet + ESRI locked camera
│       ├── stats.js        # Per-mode stats and seen-city tracking
│       └── modes/
│           ├── multipleChoice.js
│           └── textGuess.js
├── flagquiz/               # index.html, styles.css, js/quiz.js, img/
├── georank/                # index.html, css/style.css, js/app.js
├── borderline/             # index.html, css/style.css, js/app.js
└── coatofarms/
    ├── index.html
    ├── css/style.css
    ├── js/app.js
    ├── data/arms.json      # 43 coats of arms
    ├── data/arms.js        # Same data as window.COAT_OF_ARMS_DATA
    └── img/                # Local PNG/SVG artwork
```

### Shared data
FlagQuiz, GeoRank and BorderLine all read **one** dataset in `data/`. Each game first loads `../data/countries.js`, which sets `window.GEO_COUNTRIES` (this also works when the page is opened straight from disk). If that fails, it fetches `../data/countries.json`, then `/data/countries.json`. To change country data, edit `data/countries.json` and regenerate `data/countries.js` so the two stay identical.

---

## 🚀 Running Locally

Any static HTTP server works:

```bash
python3 -m http.server 8080
# or
npx serve .
```

Then open **`http://localhost:8080`**.

To regenerate the SatelCity city list, first download these source files into `/tmp/`: `cities15000.txt` and `countryInfo.txt` (GeoNames) and `ne_50m_coastline.geojson` (Natural Earth). Then run the script from the `satelcity/` folder, because it reads and rewrites `js/cities.js`:

```bash
cd satelcity && node ../scripts/build_cities.js
```

---

## 🌐 Production Deployment

The site is plain static files, deployed at **`cemeren.dev/geohub/`** with each game in its own subfolder (`cemeren.dev/geohub/satelcity/`, `cemeren.dev/geohub/compass/`, …). All internal links are relative, so the folder can live anywhere; only the absolute `og:url` / `og:image` tags in each page assume `https://cemeren.dev/geohub/`.

### Upload with FTP (e.g. FileZilla)
Create a `geohub/` folder in the web root and upload into it:

- `index.html`, `manifest.webmanifest`, `sw.js`, `css/`, `js/`, `data/`, `favicons/`, `og/`
- every game folder: `satelcity/`, `flagquiz/`, `georank/`, `borderline/`, `coatofarms/`, `compass/`, `mercator/`, `furthernorth/`, `neighbours/`, `pinthecity/`

Not needed on the server: `.git/`, `.DS_Store`, `scripts/`, `README.md`, `CLAUDE.md`, `LICENSE`.

When you re-upload a changed CSS or JS file, bump its `?v=` number in the HTML that links it so visitors don't get the old cached copy.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
Feel free to fork, expand and build your own geography games!
