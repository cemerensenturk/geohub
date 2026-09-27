/**
 * SatelCity - Global English Localization Engine
 * Standardized for international players and clean, minimal UI.
 */

export const translations = {
  appTitle: "SatelCity",
  appSubtitle: "Can you identify world cities from high-resolution, label-free satellite imagery?",
  heroPill: "Real ESRI Satellite Imagery",

  // Difficulty Levels
  difficultyLabel: "Difficulty Level:",
  diffEasy: "Easy",
  diffHard: "Hard",
  diffEasyDesc: "Top 100 Famous Cities",
  diffHardDesc: "All World Cities & Capitals",

  // Modes
  modeMC: "Multiple Choice",
  modeMCDesc: "Identify the city from 4 smart options.",
  modeText: "Type & Guess",
  modeTextDesc: "Type the city; get distance (km) and compass direction clues.",
  btnPlay: "Play",
  btnMenu: "Menu",

  // Stats
  statAccuracy: "Accuracy",
  statCorrectRatio: "Correct",
  btnResetStats: "Reset",
  resetConfirm: "Do you want to reset your accuracy and history for this mode?",

  // HUD & Imagery
  compassNorth: "NORTH UP",
  btnExpand: "Expand Photo",
  btnCloseModal: "Close (✕)",

  // Clues
  hintsHeader: "Clues",
  hintContinent: "🌍 Continent",
  hintCountry: "🚩 Country & Flag",
  hintDetail: "ℹ️ Info",
  hintClickToReveal: "Click to reveal",

  // Multiple Choice Mode
  mcPrompt: "Which city is shown in this satellite photo?",

  // Type & Guess Mode
  tgPrompt: "Type the city name to guess:",
  tgRemaining: "Attempts left:",
  tgInputPlaceholder: "Type a city (e.g. Tokyo, Paris, Rome...)",
  tgSubmit: "Guess",
  tgEmptyHint: "With each guess you will get distance (km) and compass direction.",
  tgAlreadyGuessed: "You already guessed this city!",
  tgNotFound: "Please select a valid city from the list.",
  tgSurrender: "Surrender (Reveal Answer)",
  tgExact: "CORRECT!",

  // Compass Bearings
  dirNorth: "North",
  dirNortheast: "Northeast",
  dirEast: "East",
  dirSoutheast: "Southeast",
  dirSouth: "South",
  dirSouthwest: "Southwest",
  dirWest: "West",
  dirNorthwest: "Northwest",

  // Result Overlay
  resultCorrect: "🎉 Congratulations, Correct Guess!",
  resultWrong: "❌ Incorrect!",
  resultAccuracy: "Current Accuracy:",
  btnNextCity: "Next City",
  populationLabel: "Population:",
  thousand: "Thousand",
  million: "Million",

  // Level Completed
  completedTitle: "🏆 Congratulations, Level Completed!",
  completedDesc: "You have completed all cities in this difficulty level.",
  btnPlayAgain: "Reset and Replay",
  btnChangeDiff: "Choose Another Difficulty"
};

class I18nManager {
  t(key) {
    return translations[key] || key;
  }

  getCityName(city) {
    if (!city) return '';
    return city.nameEn || city.name;
  }

  getCountryName(city) {
    if (!city) return '';
    return city.countryEn || city.country;
  }

  getContinentName(city) {
    if (!city) return '';
    return city.continentEn || city.continent;
  }

  getCityHint(city) {
    if (!city) return '';
    return city.hintEn || city.hint;
  }

  formatPopulation(city) {
    if (!city || !city.population) return '';
    return String(city.population)
      .replace(/\b(Milyon|Millones|Millions|Millionen|Milioni)\b/gi, 'Million')
      .replace(/\b(Bin|Mil|Mille|Tsd\.|Tausend|Mila)\b/gi, 'Thousand');
  }

  formatPercentage(accuracy) {
    const acc = Math.round(Number(accuracy) || 0);
    return `${acc}%`;
  }

  subscribe() {}
  notify() {}
}

export const i18n = new I18nManager();
export default i18n;
