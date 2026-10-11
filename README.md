# GeoHub 🌍

> **Explore the world through play: five browser-based geography games in one portal.**

[![Live Demo](https://img.shields.io/badge/Demo-cemeren.dev%2Fsatelcity-22c55e?style=for-the-badge&logo=googlechrome&logoColor=white)](https://cemeren.dev/satelcity)
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

### 🛡️ Coat of Arms
- 43 coats of arms, both historical empires (Ottoman Empire, USSR, Kingdom of Prussia…) and modern sovereign states.
- Open-ended text guess with autocomplete limited to the 43 answers, a feedback banner after each guess and a victory modal at the end of a session.
- All images are stored locally in `coatofarms/img/`.

---

## 📁 Project Structure

```
satellite/
├── index.html              # GeoHub portal (game cards)
├── css/portal.css          # Portal styles
├── satelcity.jpeg          # Brand logo and social preview image
├── data/
│   ├── countries.json      # Shared country dataset (FlagQuiz, GeoRank, BorderLine)
│   └── countries.js        # Same data as window.GEO_COUNTRIES, works over file:// too
├── scripts/
│   └── build_cities.js     # Node pipeline that generates satelcity/js/cities.js
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

All asset links use relative paths, so the site works on a root domain (`example.com`) or in a subfolder (`cemeren.dev/satelcity/`).

### Nginx subdirectory example
```nginx
location /satelcity/ {
    alias /var/www/satelcity/;
    index index.html;
    try_files $uri $uri/ /satelcity/index.html;
}
```

### Direct upload (rsync)
```bash
rsync -avz --exclude '.git' ./ user@cemeren.dev:/var/www/satelcity/
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
Feel free to fork, expand and build your own geography games!
