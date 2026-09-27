/**
 * SatelCity - 500 Şehirli Hibrit Veri Üretim Motoru (v2 - Tamamen Benzersiz Şehirler)
 * GeoNames cities15000 + Natural Earth 50m Coastlines + Hybrid Fame Index
 */

import fs from 'fs';
import readline from 'readline';

// 1. Ülke Bilgisi ve Türkçe Çeviri Sözlüğü
const COUNTRY_TR = {
  TR: "Türkiye", US: "Amerika Birleşik Devletleri", GB: "Birleşik Krallık", FR: "Fransa",
  DE: "Almanya", IT: "İtalya", ES: "İspanya", JP: "Japonya", CN: "Çin", RU: "Rusya",
  CA: "Kanada", AU: "Avustralya", BR: "Brezilya", IN: "Hindistan", MX: "Meksika",
  NL: "Hollanda", BE: "Belçika", CH: "İsviçre", AT: "Avusturya", SE: "İsveç",
  NO: "Norveç", DK: "Danimarka", FI: "Finlandiya", PL: "Polonya", PT: "Portekiz",
  GR: "Yunanistan", IE: "İrlanda", CZ: "Çekya", HU: "Macaristan", RO: "Romanya",
  UA: "Ukrayna", EG: "Mısır", ZA: "Güney Afrika", AR: "Arjantin", CL: "Şili",
  CO: "Kolombiya", PE: "Peru", KR: "Güney Kore", TH: "Tayland", VN: "Vietnam",
  ID: "Endonezya", MY: "Malezya", PH: "Filipinler", SA: "Suudi Arabistan", AE: "Birleşik Arap Emirlikleri",
  QA: "Katar", IL: "İsrail", IR: "İran", IQ: "Irak", MA: "Fas", DZ: "Cezayir",
  TN: "Tunus", KE: "Kenya", NG: "Nijerya", ET: "Etiyopya", GH: "Gana", TZ: "Tanzanya",
  NZ: "Yeni Zelanda", IS: "İzlanda", HR: "Hırvatistan", RS: "Sırbistan", BA: "Bosna-Hersek",
  ME: "Karadağ", MK: "Kuzey Makedonya", AL: "Arnavutluk", BG: "Bulgaristan", SK: "Slovakya",
  SI: "Slovenya", EE: "Estonya", LV: "Letonya", LT: "Litvanya", BY: "Belarus",
  GE: "Gürcistan", AZ: "Azerbaycan", AM: "Ermenistan", KZ: "Kazakistan", UZ: "Özbekistan",
  PK: "Pakistan", BD: "Bangladeş", LK: "Sri Lanka", NP: "Nepal", SG: "Singapur",
  CU: "Küba", JM: "Jamaika", PA: "Panama", CR: "Kosta Rika", UY: "Uruguay",
  PY: "Paraguay", BO: "Bolivya", EC: "Ekvador", VE: "Venezuela", MC: "Monako",
  VA: "Vatikan", SM: "San Marino", AD: "Andorra", LI: "Lihtenştayn", LU: "Lüksemburg",
  MT: "Malta", CY: "Kıbrıs", MD: "Moldova", JO: "Ürdün", LB: "Lübnan",
  OM: "Umman", KW: "Kuveyt", BH: "Bahreyn", MN: "Moğolistan", KH: "Kamboçya",
  LA: "Laos", MM: "Myanmar", SN: "Senegal", CI: "Fildişi Sahili", CM: "Kamerun",
  UG: "Uganda", RW: "Ruanda", ZW: "Zimbabve", NA: "Namibya", BW: "Botsvana",
  MU: "Mauritius", TW: "Tayvan"
};

const CONTINENT_MAP = {
  EU: { tr: "Avrupa", en: "Europe" },
  AS: { tr: "Asya", en: "Asia" },
  AF: { tr: "Afrika", en: "Africa" },
  NA: { tr: "Kuzey Amerika", en: "North America" },
  SA: { tr: "Güney Amerika", en: "South America" },
  OC: { tr: "Okyanusya", en: "Oceania" },
  AN: { tr: "Antarktika", en: "Antarctica" }
};

// Şehirlerin yaygın Türkçe isimleri
const CITY_TR_EXONYMS = {
  "Rome": "Roma", "Athens": "Atina", "Vienna": "Viyana", "Cairo": "Kahire",
  "Moscow": "Moskova", "Munich": "Münih", "Prague": "Prag", "Warsaw": "Varşova",
  "Copenhagen": "Kopenhag", "Brussels": "Brüksel", "London": "Londra", "Paris": "Paris",
  "Lisbon": "Lizbon", "Venice": "Venedik", "Geneva": "Cenevre", "Bucharest": "Bükreş",
  "Belgrade": "Belgrad", "Budapest": "Budapeşte", "Florence": "Floransa",
  "Naples": "Napoli", "Cologne": "Köln", "Aleppo": "Halep", "Damascus": "Şam",
  "Baghdad": "Bağdat", "Jerusalem": "Kudüs", "Beirut": "Beyrut", "Tehran": "Tahran",
  "Algiers": "Cezayir", "Tunis": "Tunus", "Tripoli": "Trablus", "Kiev": "Kiev",
  "Tbilisi": "Tiflis", "Baku": "Bakü", "Yerevan": "Erivan", "Ashgabat": "Aşkabat",
  "Tashkent": "Taşkent", "Nicosia": "Lefkoşa", "Zurich": "Zürih", "Thessaloniki": "Selanik",
  "Skopje": "Üsküp", "Sarajevo": "Saraybosna", "Podgorica": "Podgoritsa", "Pristina": "Priştine",
  "Milan": "Milano", "Turin": "Torino", "Genoa": "Cenova", "Seville": "Sevilla",
  "Dubrovnik": "Dubrovnik", "Monaco": "Monako", "Vatican City": "Vatikan"
};

function getFlagEmoji(countryCode) {
  if (!countryCode || countryCode.length !== 2) return "🌐";
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map(char => 127397 + char.charCodeAt());
  return String.fromCodePoint(...codePoints);
}

// 2. Natural Earth 50m Coastline Yükleme
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

// 3. Ülke Bilgilerini Yükleme
console.log("Loading country metadata...");
const countryLines = fs.readFileSync("/tmp/countryInfo.txt", "utf-8").split("\n");
const countryMap = {};
for (const line of countryLines) {
  if (!line || line.startsWith("#")) continue;
  const p = line.split("\t");
  countryMap[p[0]] = { name: p[4], capital: p[5], continent: p[8] };
}

// Kültürel & Dünya Çapında Ünlü Yerler
const ICONIC_FAME_SET = new Set([
  "New York City", "New York", "Los Angeles", "Chicago", "San Francisco", "Miami", "Las Vegas",
  "Venice", "Milan", "Florence", "Naples", "Barcelona", "Seville", "Valencia", "Dubrovnik",
  "Cannes", "Nice", "Marseille", "Geneva", "Zurich", "Salzburg", "Innsbruck", "Oxford",
  "Cambridge", "Edinburgh", "Bruges", "Antwerp", "Krakow", "Saint Petersburg", "Cusco",
  "Rio de Janeiro", "Sao Paulo", "Sydney", "Melbourne", "Auckland", "Vancouver", "Montreal",
  "Dubai", "Abu Dhabi", "Kyoto", "Osaka", "Mumbai", "Shanghai", "Hong Kong", "Macao",
  "Phuket", "Marrakesh", "Casablanca", "Cape Town", "Johannesburg", "Antalya", "Izmir",
  "Toronto", "Munich", "Frankfurt", "Hamburg", "Rotterdam", "Monaco", "Reykjavík", "Reykjavik",
  "Valletta", "Vatican City", "San Marino", "Bora Bora", "Honolulu", "New Orleans", "Boston"
]);

// 4. Mevcut 61 Küratörlü Şehri Temel Olarak Yükle
console.log("Loading original 61 curated cities...");
const existingCode = fs.readFileSync("js/cities.js", "utf-8");
const existingMatch = existingCode.match(/export const CITIES = (\[[\s\S]*?\]);/);
const originalCities = existingMatch ? eval(existingMatch[1]) : [];
console.log(`Loaded ${originalCities.length} original curated cities.`);

const selectedCities = [];
const seenCityNames = new Set();
const seenIds = new Set();
const countryCounts = {};

// Orijinal şehirleri ilk sıraya ekle
for (const c of originalCities) {
  selectedCities.push({ ...c, isOriginal: true });
  seenCityNames.add(c.nameEn.toLowerCase());
  seenCityNames.add(c.name.toLowerCase());
  seenIds.add(c.id);
  // Ülke kodu tespiti
  const cEntry = Object.entries(countryMap).find(([code, val]) => val.name === c.countryEn);
  const code = cEntry ? cEntry[0] : "XX";
  countryCounts[code] = (countryCounts[code] || 0) + 1;
}

// 5. GeoNames Verilerini Oku ve Puanla
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
  if (isCapital) score += 20000;
  if (isIconic) score += 25000;
  score += alt.length * 80;
  if (pop > 0) score += Math.log10(pop) * 1000;

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

  // 1. Tur: Kalan Başkentler ve İkonik Yerler
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

  // 2. Tur: Kalan Kontenjanı En Yüksek Ünlü Metropollerle Doldur
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

  // Şehirleri puanına ve orijinal durumuna göre sırala
  selectedCities.sort((a, b) => (b.score || 99999) - (a.score || 99999));

  // Son formatlama & Benzersiz ID ve Alanları Oluştur
  const finalCities = [];
  const finalSeenIds = new Set();

  for (let index = 0; index < selectedCities.length; index++) {
    const c = selectedCities[index];

    // Zorluk Seviyesi Dağılımı:
    // İlk 100: Kolay
    // 101 - 300: Orta
    // 301 - 500: Zor
    let difficulty = 'hard';
    if (index < 100) difficulty = 'easy';
    else if (index < 300) difficulty = 'medium';

    if (c.isOriginal) {
      // Orijinal küratörlü şehrin verilerini aynen koru
      let finalId = c.id;
      if (finalSeenIds.has(finalId)) {
        finalId = `${c.id}_orig`;
      }
      finalSeenIds.add(finalId);

      finalCities.push({
        id: finalId,
        difficulty,
        geo: c.geo,
        name: c.name,
        nameEn: c.nameEn,
        country: c.country,
        countryEn: c.countryEn,
        flag: c.flag,
        continent: c.continent,
        continentEn: c.continentEn,
        lat: c.lat,
        lng: c.lng,
        zoom: c.zoom,
        population: c.population,
        hint: c.hint,
        hintEn: c.hintEn
      });
      continue;
    }

    // Yeni Eklenen GeoNames Şehri
    // Kıyı / Kara Tespiti (50m Coastline)
    const distToCoast = getDistanceToCoastKm(c.lat, c.lng);
    const geo = distToCoast < 35 ? 'coastal' : 'inland';

    // Zoom Seviyesi
    let zoom = 12;
    if (c.pop >= 6000000) zoom = 11;
    else if (c.pop >= 1500000) zoom = 12;
    else if (c.pop >= 300000) zoom = 13;
    else zoom = 14;

    const nameEn = c.nameUtf8 || c.name;
    const nameTr = CITY_TR_EXONYMS[nameEn] || CITY_TR_EXONYMS[c.name] || nameEn;
    const countryTr = COUNTRY_TR[c.countryCode] || c.countryEn;
    const countryEn = c.countryEn;
    const flag = getFlagEmoji(c.countryCode);
    const contInfo = CONTINENT_MAP[c.continentCode] || { tr: "Dünya", en: "World" };

    let popText = "";
    if (c.pop >= 1000000) {
      popText = `~${(c.pop / 1000000).toFixed(1).replace('.0', '')} Milyon`;
    } else if (c.pop >= 1000) {
      popText = `~${Math.round(c.pop / 1000)} Bin`;
    } else if (c.pop > 0) {
      popText = `~${c.pop}`;
    } else {
      popText = "~100 Bin";
    }

    let hint = c.isCapital ? `${countryTr} ülkesinin başkenti.` : `${countryTr} ülkesinin önemli bir şehri.`;
    let hintEn = c.isCapital ? `Capital city of ${countryEn}.` : `Major city in ${countryEn}.`;

    // Benzersiz ID oluşturucu
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
      name: nameTr,
      nameEn,
      country: countryTr,
      countryEn,
      flag,
      continent: contInfo.tr,
      continentEn: contInfo.en,
      lat: Math.round(c.lat * 10000) / 10000,
      lng: Math.round(c.lng * 10000) / 10000,
      zoom,
      population: popText,
      hint,
      hintEn
    });
  }

  // İstatistik Raporu
  const tierStats = {
    easy: { coastal: 0, inland: 0 },
    medium: { coastal: 0, inland: 0 },
    hard: { coastal: 0, inland: 0 }
  };
  for (const fc of finalCities) {
    tierStats[fc.difficulty][fc.geo]++;
  }

  console.log("Tier Statistics:", tierStats);

  const header = `/**
 * SatelCity - 500 Şehirli Hibrit Veri Tabanı
 * Küresel Ün İndeksi + Başkent Garantisi + Doğal Kıyı Şeridi Geometrisi
 * Kolay (100 Şehir), Orta (200 Şehir), Zor (200 Şehir)
 */

export const CITIES = ${JSON.stringify(finalCities, null, 2)};

export default CITIES;
`;

  fs.writeFileSync("js/cities.js", header, "utf-8");
  console.log(`SUCCESS! Generated js/cities.js with ${finalCities.length} unique cities.`);
});
