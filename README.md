# SatelCity 🛰️🌲

> **Can you identify world cities from high-resolution, label-free satellite imagery?**  

[![Live Demo](https://img.shields.io/badge/Demo-cemeren.dev%2Fsatelcity-22c55e?style=for-the-badge&logo=googlechrome&logoColor=white)](https://cemeren.dev/satelcity)
[![License: MIT](https://img.shields.io/badge/License-MIT-amber.svg?style=for-the-badge)](LICENSE)
[![Vanilla JS](https://img.shields.io/badge/Vanilla-JS_ES6+-yellow.svg?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Zero Dependency](https://img.shields.io/badge/Zero-Build_Steps-brightgreen.svg?style=for-the-badge)](https://leafletjs.com/)

**SatelCity** is a geography guessing game where players identify cities around the globe using authentic, label-free satellite imagery. Developed with modern vanilla web standards, it requires zero API keys and zero build steps.

---

## ✨ Features

### 🛰️ 1. Authentic Satellite Photography (ESRI World Imagery)
- **Label-Free (No Labels):** No street names, borders, or text overlays; only pure aerial satellite photography is shown.
- **Strict Geographic Orientation (North-Up):** Standard Web Mercator locked with North pointing straight up. A corner `🧭 NORTH UP` badge reminds the player of the geographic frame.
- **Locked Frame Experience & Anti-Cheat Protection:** Map dragging (pan) and free zooming are strictly locked. The **🔍 Expand Photo** modal opens the exact high-definition crop in a larger theater view.

### 🎮 2. Two Distinct Game Modes
- **🔠 Multiple Choice Mode (4 Options):**
  - Smart distractor algorithm: Distractors are chosen strictly from the same difficulty tier and prioritize similar geographic character (coastal vs inland).
  - Keyboard shortcuts: Instant answering with `1, 2, 3, 4` or `A, B, C, D`; advance to next question with `Enter`.
- **✍️ Type & Guess Mode (Search & Distance Clues):**
  - Diacritic-insensitive intelligent autocomplete search.
  - 5 guess attempts: each incorrect attempt provides the great-circle **distance (km)** via the Haversine formula and an **8-point compass arrow (⬆️, ↗️, ➡️, ↘️, etc.)** directing you toward the target city.

### 🎯 3. 500 Unique World Cities Across 2 Disjoint Tiers
- Generated using **GeoNames + Natural Earth + Hybrid Global Fame Index**:
- **🟢 Easy (100 Cities):** Globally recognized iconic superstars *(Paris, London, Tokyo, New York, Rome, Istanbul, Venice, Monaco, Dubai, Sydney, Rio de Janeiro, Los Angeles, Singapore...)*
- **🔴 Hard (400 Cities):** National capitals, historic trading ports, and distinctive world cities *(Kigali, Ulaanbaatar, Tbilisi, Baku, Reykjavik, Bern, Sarajevo, Valletta, Ushuaia, Tromsø...)*

### 🛡️ 4. Anti-Cheat Escape Protection
- Leaving to the main menu, refreshing the browser (F5 / Cmd+R), or closing the tab during an active round automatically records an incorrect answer, preserving genuine stats.

### 🌲 5. Deep Forest Explorer Aesthetics
- Deep pine forest palette (`#060a07`), vibrant sage (`#86efac`), warm amber/earth accents, and glassmorphic panels.
- Handcrafted vector SVG mode icons with responsive typography powered by Google Fonts (Plus Jakarta Sans).

---

## 📁 Project Architecture

```
satelcity/
├── index.html              # Semantic HTML5, meta tags, and SVG mode icons
├── satelcity.jpeg          # Brand logo, favicon, and social media banner
├── LICENSE                 # MIT Open Source License
├── .gitignore              # Git ignore rules
├── README.md               # Project documentation
├── css/
│   └── style.css           # Deep Forest Explorer glassmorphism design system
└── js/
    ├── app.js              # Core application controller, round lifecycle, keyboard shortcuts
    ├── cities.js           # 500 curated world cities (coords, zoom, continent, difficulty, geo type)
    ├── i18n.js             # English string dictionary and number/population formatters
    ├── map.js              # Leaflet + ESRI World Imagery locked camera engine
    ├── stats.js            # Independent mode statistics and seen city tracker
    └── modes/
        ├── multipleChoice.js # 4-option smart distractor mode
        └── textGuess.js      # Autocomplete, Haversine distance, and bearing calculation
```

---

## 🚀 Running Locally

No Node.js, Webpack, or Vite build steps are required. As pure modern ES modules, it runs instantly with any static HTTP server:

### Using Python 3:
```bash
python3 -m http.server 8080
```
Open in your browser: **`http://localhost:8080`**

### Using Node / npx:
```bash
npx serve .
```

---

## 🌐 Production Deployment (Subpath & Root Friendly)

All asset links and scripts use relative paths (`./`), ensuring zero-configuration deployment to either a root domain (`example.com`) or a subfolder (`cemeren.dev/satelcity/`).

### Nginx Subdirectory Configuration Example:
```nginx
location /satelcity/ {
    alias /var/www/satelcity/;
    index index.html;
    try_files $uri $uri/ /satelcity/index.html;
}
```

### Direct Server Upload (rsync / scp):
```bash
rsync -avz --exclude '.git' ./ user@cemeren.dev:/var/www/satelcity/
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
Feel free to fork, expand, and create your own geography games!
