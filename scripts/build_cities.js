/**
 * SatelCity - 500 Unique Cities Data Pipeline (English-Only)
 * Sources: GeoNames cities15000 + Natural Earth 50m Coastlines + Hybrid Fame Index
 */

import fs from 'fs';
import readline from 'readline';

// 1. Continent Name Mapping (English)
const CONTINENT_MAP = {
  EU: "Europe",
  AS: "Asia",
  AF: "Africa",
  NA: "North America",
  SA: "South America",
  OC: "Oceania",
  AN: "Antarctica"
};

// Unicode Flag Emoji Generator (ISO-2 Alpha Code -> Flag)
function getFlagEmoji(countryCode) {
  if (!countryCode || countryCode.length !== 2) return "🌐";
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map(char => 127397 + char.charCodeAt());
  return String.fromCodePoint(...codePoints);
}

// 2. Load Natural Earth 50m Coastline Geometry
console.log("Loading 50m coastline geometry...");
const coastData = JSON.parse(fs.readFileSync("/tmp/ne_50m_coastline.geojson", "utf-8"));
const coastLines = [];
for (const f of coastData.features) {
  if (f.geometry.type === "LineString") {
    coastLines.push(f.geometry.coordinates);
  } else if (f.geometry.type === "MultiLineString") {
    for (const part of f.geometry.coordinates) coastLines.push(part);
  }
}

function pointToSegmentDistanceKm(pLat, pLng, aLat, aLng, bLat, bLng) {
  const R = 6371;
  const x = (pLng - aLng) * Math.cos((pLat + aLat) * Math.PI / 360) * Math.PI / 180 * R;
  const y = (pLat - aLat) * Math.PI / 180 * R;
  const dx = (bLng - aLng) * Math.cos((aLat + bLat) * Math.PI / 360) * Math.PI / 180 * R;
  const dy = (bLat - aLat) * Math.PI / 180 * R;

  const segLenSq = dx * dx + dy * dy;
  if (segLenSq === 0) return Math.sqrt(x * x + y * y);

  let t = (x * dx + y * dy) / segLenSq;
  t = Math.max(0, Math.min(1, t));

  const projX = t * dx;
  const projY = t * dy;
  return Math.sqrt((x - projX) * (x - projX) + (y - projY) * (y - projY));
}

function getDistanceToCoastKm(lat, lng) {
  let minDist = Infinity;
  for (const line of coastLines) {
    for (let i = 0; i < line.length - 1; i++) {
      const aLng = line[i][0];
      const aLat = line[i][1];
      const bLng = line[i+1][0];
      const bLat = line[i+1][1];

      if (Math.abs(lat - aLat) > 2 && Math.abs(lat - bLat) > 2) continue;
      if (Math.abs(lng - aLng) > 3 && Math.abs(lng - bLng) > 3) continue;

      const d = pointToSegmentDistanceKm(lat, lng, aLat, aLng, bLat, bLng);
      if (d < minDist) minDist = d;
    }
  }
  return minDist;
}

// 3. Load Country Metadata
console.log("Loading country metadata...");
const countryLines = fs.readFileSync("/tmp/countryInfo.txt", "utf-8").split("\n");
const countryMap = {};
for (const line of countryLines) {
  if (!line || line.startsWith("#")) continue;
  const p = line.split("\t");
  countryMap[p[0]] = { name: p[4], capital: p[5], continent: p[8] };
}

// Cultural & Globally Renowned Megastars
const ICONIC_FAME_SET = new Set([
  // North & South America
  "New York City", "New York", "Los Angeles", "Chicago", "San Francisco", "Miami", "Las Vegas",
  "Washington", "Boston", "Toronto", "Vancouver", "Montreal", "Mexico City", "Havana",
  "Rio de Janeiro", "Sao Paulo", "Buenos Aires", "Santiago", "Lima", "Bogota", "Cusco",
  // Europe
  "London", "Paris", "Rome", "Berlin", "Madrid", "Barcelona", "Amsterdam", "Venice", "Florence",
  "Milan", "Vienna", "Prague", "Budapest", "Dublin", "Lisbon", "Edinburgh", "Athens", "Istanbul",
  "Moscow", "Saint Petersburg", "Warsaw", "Brussels", "Stockholm", "Oslo", "Copenhagen", "Helsinki",
  "Reykjavik", "Reykjavík", "Zurich", "Geneva", "Munich", "Frankfurt", "Hamburg", "Monaco", "Vatican City",
  "Dubrovnik", "Salzburg", "Krakow", "Nice", "Marseille", "Seville", "Valencia", "Antwerp", "Bruges",
  // Asia & Middle East
  "Tokyo", "Kyoto", "Osaka", "Seoul", "Beijing", "Shanghai", "Hong Kong", "Singapore", "Bangkok",
  "Taipei", "Kuala Lumpur", "Jakarta", "Manila", "Hanoi", "Mumbai", "Delhi", "New Delhi",
  "Dubai", "Abu Dhabi", "Doha", "Riyadh", "Jerusalem", "Tel Aviv", "Beirut", "Baku", "Tbilisi", "Macao", "Phuket",
  // Africa & Oceania
  "Cairo", "Cape Town", "Johannesburg", "Marrakesh", "Casablanca", "Nairobi",
  "Sydney", "Melbourne", "Auckland", "Honolulu"
]);

// 4. Load Original Curated Cities
console.log("Loading original curated cities...");
const existingCode = fs.readFileSync("js/cities.js", "utf-8");
const existingMatch = existingCode.match(/export const CITIES = (\[[\s\S]*?\]);/);
const originalCities = existingMatch ? eval(existingMatch[1]) : [];
console.log(`Loaded ${originalCities.length} original curated cities.`);

const selectedCities = [];
const seenCityNames = new Set();
const seenIds = new Set();
const countryCounts = {};

// Register original cities
for (const c of originalCities) {
  selectedCities.push({ ...c, isOriginal: true });
  seenCityNames.add((c.nameEn || c.name).toLowerCase());
  seenIds.add(c.id);
  const cEntry = Object.entries(countryMap).find(([code, val]) => val.name === (c.countryEn || c.country));
  const code = cEntry ? cEntry[0] : "XX";
  countryCounts[code] = (countryCounts[code] || 0) + 1;
}

// 5. Parse and Score GeoNames Candidates
console.log("Parsing GeoNames candidates...");
const stream = fs.createReadStream("/tmp/cities15000.txt");
const rl = readline.createInterface({ input: stream });
const candidates = [];

rl.on("line", line => {
  const parts = line.split("\t");
  const geonameId = parts[0];
  const nameUtf8 = parts[1];
  const asciiname = parts[2];
  const alt = parts[3] ? parts[3].split(",") : [];
  const lat = parseFloat(parts[4]);
  const lng = parseFloat(parts[5]);
  const fcode = parts[7];
  const countryCode = parts[8];
  const pop = parseInt(parts[14], 10) || 0;

  const cInfo = countryMap[countryCode] || { name: countryCode, capital: "", continent: "EU" };
  const isCapital = fcode === "PPLC" || (cInfo.capital && (cInfo.capital.toLowerCase() === nameUtf8.toLowerCase() || cInfo.capital.toLowerCase() === asciiname.toLowerCase()));
  const isIconic = ICONIC_FAME_SET.has(nameUtf8) || ICONIC_FAME_SET.has(asciiname);

  let score = 0;
  if (isIconic) score += 60000;
  if (isCapital && (pop > 250000 || isIconic)) score += 20000;
  else if (isCapital) score += 2000;
  score += alt.length * 100;
  if (pop > 0) score += Math.log10(pop) * 1500;

  if (!isCapital && !isIconic && pop < 90000) return;

  candidates.push({
    geonameId,
    name: asciiname,
    nameUtf8,
    countryCode,
    countryEn: cInfo.name,
    continentCode: cInfo.continent,
    lat,
    lng,
    pop,
    isCapital,
    isIconic,
    altCount: alt.length,
    score
  });
});

rl.on("close", () => {
  console.log(`Total qualified candidates: ${candidates.length}`);
  candidates.sort((a, b) => b.score - a.score);

  // Round 1: Capitals & Iconic gems
  for (const c of candidates) {
    if (selectedCities.length >= 500) break;
    const nameKey = c.name.toLowerCase();
    const nameUtf8Key = c.nameUtf8.toLowerCase();

    if (seenCityNames.has(nameKey) || seenCityNames.has(nameUtf8Key)) continue;

    if (c.isCapital || c.isIconic) {
      seenCityNames.add(nameKey);
      seenCityNames.add(nameUtf8Key);
      countryCounts[c.countryCode] = (countryCounts[c.countryCode] || 0) + 1;
      selectedCities.push(c);
    }
  }

  console.log(`Selected count after capitals/iconic: ${selectedCities.length}`);

  // Round 2: Fill remaining quota with highest fame global metropolises
  for (const c of candidates) {
    if (selectedCities.length >= 500) break;
    const nameKey = c.name.toLowerCase();
    const nameUtf8Key = c.nameUtf8.toLowerCase();

    if (seenCityNames.has(nameKey) || seenCityNames.has(nameUtf8Key)) continue;

    const count = countryCounts[c.countryCode] || 0;
    const maxPerCountry = (c.countryCode === "US" || c.countryCode === "CN") ? 20 : 10;
    if (count >= maxPerCountry) continue;

    seenCityNames.add(nameKey);
    seenCityNames.add(nameUtf8Key);
    countryCounts[c.countryCode] = count + 1;
    selectedCities.push(c);
  }

  console.log(`Total final selected cities: ${selectedCities.length}`);

  // Define the exact Top 100 World Superstars for Easy Tier
  const TOP_100_EASY_MEGASTARS = new Set([
    "New York City", "Los Angeles", "Chicago", "San Francisco", "Miami", "Las Vegas",
    "Washington", "Boston", "Seattle", "New Orleans", "Honolulu", "Toronto", "Vancouver",
    "Montreal", "Montréal", "Mexico City", "Havana", "Rio de Janeiro", "São Paulo",
    "Buenos Aires", "Santiago", "Lima", "Bogota", "London", "Paris", "Rome", "Berlin",
    "Madrid", "Barcelona", "Amsterdam", "Venice", "Florence", "Milan", "Vienna", "Prague",
    "Budapest", "Dublin", "Lisbon", "Edinburgh", "Athens", "Monaco", "Dubrovnik", "Salzburg",
    "Nice", "Marseille", "Seville", "Valencia", "Naples", "Brussels", "Antwerp", "Rotterdam",
    "Stockholm", "Copenhagen", "Oslo", "Helsinki", "Reykjavik", "Reykjavík", "Zurich", "Geneva",
    "Munich", "Frankfurt", "Hamburg", "Warsaw", "Kraków", "Moscow", "Saint Petersburg", "Kyiv",
    "Istanbul", "Ankara", "Izmir", "İzmir", "Antalya", "Dubai", "Abu Dhabi", "Doha", "Riyadh",
    "Jerusalem", "Tel Aviv", "Cairo", "Alexandria", "Casablanca", "Marrakech", "Beirut",
    "Tokyo", "Kyoto", "Osaka", "Seoul", "Beijing", "Shanghai", "Hong Kong", "Singapore",
    "Bangkok", "Taipei", "Kuala Lumpur", "Jakarta", "Manila", "Hanoi", "Macao", "Mumbai",
    "Delhi", "New Delhi", "Cape Town", "Johannesburg", "Sydney", "Melbourne", "Auckland"
  ]);

  selectedCities.sort((a, b) => {
    const aName = a.nameEn || a.name || a.nameUtf8;
    const bName = b.nameEn || b.name || b.nameUtf8;
    const aMegastar = TOP_100_EASY_MEGASTARS.has(aName);
    const bMegastar = TOP_100_EASY_MEGASTARS.has(bName);

    if (aMegastar && !bMegastar) return -1;
    if (!aMegastar && bMegastar) return 1;
    return (b.score || 99999) - (a.score || 99999);
  });

  // Final Assembly & Unique IDs
  const finalCities = [];
  const finalSeenIds = new Set();

  for (let index = 0; index < selectedCities.length; index++) {
    const c = selectedCities[index];

    // Difficulty assignment: Top 100 -> Easy, Remaining 400 -> Hard
    const difficulty = index < 100 ? 'easy' : 'hard';

    if (c.isOriginal) {
      let finalId = c.id;
      if (finalSeenIds.has(finalId)) {
        finalId = `${c.id}_orig`;
      }
      finalSeenIds.add(finalId);

      const englishName = c.nameEn || c.name;
      const englishCountry = c.countryEn || c.country;
      const englishContinent = c.continentEn || c.continent;
      const englishPop = String(c.population).replace('Milyon', 'Million').replace('Bin', 'Thousand');
      const englishHint = c.hintEn || c.hint;

      finalCities.push({
        id: finalId,
        difficulty,
        geo: c.geo,
        name: englishName,
        nameEn: englishName,
        country: englishCountry,
        countryEn: englishCountry,
        flag: c.flag,
        continent: englishContinent,
        continentEn: englishContinent,
        lat: c.lat,
        lng: c.lng,
        zoom: c.zoom,
        population: englishPop,
        hint: englishHint,
        hintEn: englishHint
      });
      continue;
    }

    // Newly added GeoNames City
    const distToCoast = getDistanceToCoastKm(c.lat, c.lng);
    const geo = distToCoast < 35 ? 'coastal' : 'inland';

    let zoom = 12;
    if (c.pop >= 6000000) zoom = 11;
    else if (c.pop >= 1500000) zoom = 12;
    else if (c.pop >= 300000) zoom = 13;
    else zoom = 14;

    const nameEn = c.nameUtf8 || c.name;
    const countryEn = c.countryEn;
    const flag = getFlagEmoji(c.countryCode);
    const continentEn = CONTINENT_MAP[c.continentCode] || "World";

    let popText = "";
    if (c.pop >= 1000000) {
      popText = `~${(c.pop / 1000000).toFixed(1).replace('.0', '')} Million`;
    } else if (c.pop >= 1000) {
      popText = `~${Math.round(c.pop / 1000)} Thousand`;
    } else if (c.pop > 0) {
      popText = `~${c.pop}`;
    } else {
      popText = "~100 Thousand";
    }

    const hintEn = c.isCapital ? `Capital city of ${countryEn}.` : `Major city in ${countryEn}.`;

    let baseId = (c.name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + c.countryCode.toLowerCase()).replace(/_+/g, '_');
    let finalId = baseId;
    let suffix = 1;
    while (finalSeenIds.has(finalId)) {
      finalId = `${baseId}_${suffix++}`;
    }
    finalSeenIds.add(finalId);

    finalCities.push({
      id: finalId,
      difficulty,
      geo,
      name: nameEn,
      nameEn: nameEn,
      country: countryEn,
      countryEn: countryEn,
      flag,
      continent: continentEn,
      continentEn: continentEn,
      lat: Math.round(c.lat * 10000) / 10000,
      lng: Math.round(c.lng * 10000) / 10000,
      zoom,
      population: popText,
      hint: hintEn,
      hintEn: hintEn
    });
  }

  // Tier Statistics Report
  const tierStats = {
    easy: { coastal: 0, inland: 0 },
    hard: { coastal: 0, inland: 0 }
  };
  for (const fc of finalCities) {
    tierStats[fc.difficulty][fc.geo]++;
  }

  console.log("Tier Statistics:", tierStats);

  const header = `/**
 * SatelCity - 500 Unique Cities Dataset (English Standard)
 * Hybrid Fame Index + National Capital Guarantee + 50m Coastline Geometry
 * 100 Easy (Global Superstars) + 400 Hard (World Capitals & Metropolises)
 */

export const CITIES = ${JSON.stringify(finalCities, null, 2)};

export default CITIES;
`;

  fs.writeFileSync("js/cities.js", header, "utf-8");
  console.log(`SUCCESS! Generated js/cities.js with ${finalCities.length} unique cities in pure English.`);
});
