/**
 * SatelCity - Çoklu Dil (i18n) Sistemi
 * Türkçe (TR), İngilizce (EN), İspanyolca (ES), Fransızca (FR), Almanca (DE), İtalyanca (IT)
 */

const STORAGE_LANG_KEY = "satelcity_selected_lang";

export const translations = {
  tr: {
    appTitle: "SatelCity",
    appSubtitle: "Dünyanın şehirlerini uzaydan çekilmiş etiketsiz fotoğraflarla tanıyabilir misiniz?",
    heroPill: "Gerçek ESRI Uydu Fotoğrafları",
    
    // Zorluk Seviyeleri
    difficultyLabel: "Zorluk Seviyesi:",
    diffEasy: "Kolay",
    diffMedium: "Orta",
    diffHard: "Zor",
    diffEasyDesc: "İkonik Metropoller",
    diffMediumDesc: "Büyük Başkentler",
    diffHardDesc: "Niş & Zorlu Şehirler",

    // Modlar
    modeMC: "4 Seçenekli Mod",
    modeMCDesc: "4 akıllı seçenek arasından doğru şehri bulun.",
    modeText: "Yazarak Tahmin Modu",
    modeTextDesc: "Şehir adını yazın; mesafe (km) ve yön oku ipuçlarıyla tahmin edin.",
    btnPlay: "Oyuna Başla",
    btnMenu: "Menü",

    // İstatistikler
    statAccuracy: "İsabet Oranı",
    statCorrectRatio: "Doğru",
    btnResetStats: "Sıfırla",
    resetConfirm: "Bu modun isabet oranını ve görülen şehir geçmişini sıfırlamak istiyor musunuz?",

    // HUD & Fotoğraf
    compassNorth: "KUZEY YUKARI",
    btnExpand: "Büyüt",
    btnCloseModal: "Kapat (✕)",
    
    // İpuçları
    hintsHeader: "İpuçları",
    hintContinent: "🌍 Kıta",
    hintCountry: "🚩 Ülke & Bayrak",
    hintDetail: "ℹ️ Bilgi",
    hintClickToReveal: "Görmek için tıkla",

    // 4 Seçenekli Mod
    mcPrompt: "Bu uydu fotoğrafı hangi şehre ait?",

    // Yazarak Tahmin Modu
    tgPrompt: "Şehir adını yazıp tahmin et:",
    tgRemaining: "Kalan Hak:",
    tgInputPlaceholder: "Bir şehir yazın (Örn: Tokyo, Paris, İstanbul...)",
    tgSubmit: "Tahmin Et",
    tgEmptyHint: "Her tahmininizde hedefe olan kuş uçuşu mesafe ve yön ipucu verilecektir.",
    tgAlreadyGuessed: "Bu şehri zaten tahmin ettiniz!",
    tgNotFound: "Lütfen listeden geçerli bir şehir adı giriniz.",
    tgSurrender: "Cevabı Gör (Pes Et)",
    tgExact: "DOĞRU!",

    // Yönler (Pusula)
    dirNorth: "Kuzey",
    dirNortheast: "Kuzeydoğu",
    dirEast: "Doğu",
    dirSoutheast: "Güneydoğu",
    dirSouth: "Güney",
    dirSouthwest: "Güneybatı",
    dirWest: "Batı",
    dirNorthwest: "Kuzeybatı",

    // Sonuç Ekranı
    resultCorrect: "🎉 Tebrikler, Doğru Bildiniz!",
    resultWrong: "❌ Maalesef Yanlış!",
    resultAccuracy: "Güncel İsabet:",
    btnNextCity: "Sonraki Şehir",
    populationLabel: "Nüfus:",
    thousand: "Bin",
    million: "Milyon",

    // Seviye Tamamlama
    completedTitle: "🏆 Tebrikler, Seviyeyi Tamamladınız!",
    completedDesc: "Bu zorluk seviyesindeki tüm şehirleri gördünüz.",
    btnPlayAgain: "Sıfırla ve Baştan Oyna",
    btnChangeDiff: "Farklı Zorluk Seç",
    btnShare: "Skoru Paylaş",
    shareCopied: "Skor kopyalandı! Arkadaşlarına gönder 🚀"
  },

  en: {
    appTitle: "SatelCity",
    appSubtitle: "Can you identify world cities from high-resolution, label-free satellite imagery?",
    heroPill: "Real ESRI Satellite Imagery",

    difficultyLabel: "Difficulty Level:",
    diffEasy: "Easy",
    diffMedium: "Medium",
    diffHard: "Hard",
    diffEasyDesc: "Iconic Metropolises",
    diffMediumDesc: "Major Capitals",
    diffHardDesc: "Niche & Challenging Cities",

    modeMC: "Multiple Choice",
    modeMCDesc: "Identify the correct city among 4 smart options.",
    modeText: "Search & Guess",
    modeTextDesc: "Type city name; get distance (km) and compass direction clues.",
    btnPlay: "Play Mode",
    btnMenu: "Menu",

    statAccuracy: "Accuracy",
    statCorrectRatio: "Correct",
    btnResetStats: "Reset",
    resetConfirm: "Do you want to reset accuracy stats and played cities for this mode?",

    compassNorth: "NORTH UP",
    btnExpand: "Expand",
    btnCloseModal: "Close (✕)",

    hintsHeader: "Hints",
    hintContinent: "🌍 Continent",
    hintCountry: "🚩 Country & Flag",
    hintDetail: "ℹ️ Info",
    hintClickToReveal: "Click to reveal",

    mcPrompt: "Which city is shown in this satellite photo?",

    tgPrompt: "Type a city name to guess:",
    tgRemaining: "Attempts Left:",
    tgInputPlaceholder: "Type a city (e.g. Tokyo, Paris, Rome...)",
    tgSubmit: "Guess",
    tgEmptyHint: "With each guess, you will receive crow-flight distance (km) and direction clues.",
    tgAlreadyGuessed: "You already guessed this city!",
    tgNotFound: "Please select a valid city from the list.",
    tgSurrender: "Give Up (Reveal)",
    tgExact: "CORRECT!",

    dirNorth: "North",
    dirNortheast: "Northeast",
    dirEast: "East",
    dirSoutheast: "Southeast",
    dirSouth: "South",
    dirSouthwest: "Southwest",
    dirWest: "West",
    dirNorthwest: "Northwest",

    resultCorrect: "🎉 Correct Guess!",
    resultWrong: "❌ Incorrect!",
    resultAccuracy: "Current Accuracy:",
    btnNextCity: "Next City",
    populationLabel: "Population:",
    thousand: "Thousand",
    million: "Million",

    completedTitle: "🏆 Congratulations, Level Completed!",
    completedDesc: "You have completed all cities in this difficulty level.",
    btnPlayAgain: "Reset and Replay",
    btnChangeDiff: "Choose Another Difficulty",
    btnShare: "Share Score",
    shareCopied: "Score copied! Share with friends 🚀"
  },

  es: {
    appTitle: "SatelCity",
    appSubtitle: "¿Puedes identificar las ciudades del mundo a partir de imágenes satelitales sin etiquetas?",
    heroPill: "Imágenes Satelitales ESRI Reales",

    difficultyLabel: "Nivel de Dificultad:",
    diffEasy: "Fácil",
    diffMedium: "Medio",
    diffHard: "Difícil",
    diffEasyDesc: "Metrópolis Icónicas",
    diffMediumDesc: "Grandes Capitales",
    diffHardDesc: "Ciudades Desafiantes",

    modeMC: "Opción Múltiple",
    modeMCDesc: "Encuentra la ciudad correcta entre 4 opciones.",
    modeText: "Escribir y Adivinar",
    modeTextDesc: "Escribe el nombre; obtén pistas de distancia (km) y brújula.",
    btnPlay: "Jugar",
    btnMenu: "Menú",

    statAccuracy: "Precisión",
    statCorrectRatio: "Correctas",
    btnResetStats: "Reiniciar",
    resetConfirm: "¿Deseas reiniciar las estadísticas y las ciudades jugadas en este modo?",

    compassNorth: "NORTE ARRIBA",
    btnExpand: "Ampliar",
    btnCloseModal: "Cerrar (✕)",

    hintsHeader: "Pistas",
    hintContinent: "🌍 Continente",
    hintCountry: "🚩 País y Bandera",
    hintDetail: "ℹ️ Info",
    hintClickToReveal: "Haz clic para ver",

    mcPrompt: "¿Qué ciudad aparece en esta foto de satélite?",

    tgPrompt: "Escribe el nombre de la ciudad:",
    tgRemaining: "Intentos:",
    tgInputPlaceholder: "Escribe una ciudad (ej. Tokio, París, Madrid...)",
    tgSubmit: "Adivinar",
    tgEmptyHint: "En cada intento recibirás la distancia (km) y la dirección.",
    tgAlreadyGuessed: "¡Ya adivinaste esta ciudad!",
    tgNotFound: "Por favor selecciona una ciudad válida.",
    tgSurrender: "Ver Respuesta (Rendirse)",
    tgExact: "¡CORRECTO!",

    dirNorth: "Norte",
    dirNortheast: "Noreste",
    dirEast: "Este",
    dirSoutheast: "Sureste",
    dirSouth: "Sur",
    dirSouthwest: "Suroeste",
    dirWest: "Oeste",
    dirNorthwest: "Noroeste",

    resultCorrect: "🎉 ¡Correcto, muy bien!",
    resultWrong: "❌ ¡Incorrecto!",
    resultAccuracy: "Precisión Actual:",
    btnNextCity: "Siguiente Ciudad",
    populationLabel: "Población:",
    thousand: "Mil",
    million: "Millones",

    completedTitle: "🏆 ¡Felicidades, Nivel Completado!",
    completedDesc: "Has visto todas las ciudades de esta dificultad.",
    btnPlayAgain: "Reiniciar y Jugar de Nuevo",
    btnChangeDiff: "Elegir Otra Dificultad",
    btnShare: "Compartir",
    shareCopied: "¡Puntuación copiada! Comparte con amigos 🚀"
  },

  fr: {
    appTitle: "SatelCity",
    appSubtitle: "Pouvez-vous identifier les villes du monde à partir d'images satellites sans étiquette ?",
    heroPill: "Véritables Images Satellites ESRI",

    difficultyLabel: "Niveau de Difficulté :",
    diffEasy: "Facile",
    diffMedium: "Moyen",
    diffHard: "Difficile",
    diffEasyDesc: "Métropoles Emblématiques",
    diffMediumDesc: "Grandes Capitales",
    diffHardDesc: "Villes Rares et Complexes",

    modeMC: "Choix Multiple",
    modeMCDesc: "Trouvez la bonne ville parmi 4 choix intelligents.",
    modeText: "Recherche & Devinette",
    modeTextDesc: "Tapez le nom de la ville ; obtenez distance (km) et boussole.",
    btnPlay: "Jouer",
    btnMenu: "Menu",

    statAccuracy: "Précision",
    statCorrectRatio: "Correctes",
    btnResetStats: "Réinitialiser",
    resetConfirm: "Voulez-vous réinitialiser les statistiques de ce mode ?",

    compassNorth: "NORD EN HAUT",
    btnExpand: "Agrandir",
    btnCloseModal: "Fermer (✕)",

    hintsHeader: "Indices",
    hintContinent: "🌍 Continent",
    hintCountry: "🚩 Pays et Drapeau",
    hintDetail: "ℹ️ Info",
    hintClickToReveal: "Cliquer pour révéler",

    mcPrompt: "Quelle ville est visible sur cette photo satellite ?",

    tgPrompt: "Tapez le nom d'une ville :",
    tgRemaining: "Essais restants :",
    tgInputPlaceholder: "Tapez une ville (ex. Tokyo, Paris, Rome...)",
    tgSubmit: "Deviner",
    tgEmptyHint: "À chaque essai, obtenez la distance (km) et la direction.",
    tgAlreadyGuessed: "Vous avez déjà proposé cette ville !",
    tgNotFound: "Veuillez choisir une ville valide dans la liste.",
    tgSurrender: "Abandonner (Voir réponse)",
    tgExact: "EXACT !",

    dirNorth: "Nord",
    dirNortheast: "Nord-Est",
    dirEast: "Est",
    dirSoutheast: "Sud-Est",
    dirSouth: "Sud",
    dirSouthwest: "Sud-Ouest",
    dirWest: "Ouest",
    dirNorthwest: "Nord-Ouest",

    resultCorrect: "🎉 Bravo, bonne réponse !",
    resultWrong: "❌ Mauvaise réponse !",
    resultAccuracy: "Précision actuelle :",
    btnNextCity: "Ville Suivante",
    populationLabel: "Population :",
    thousand: "Mille",
    million: "Millions",

    completedTitle: "🏆 Félicitations, Niveau Terminé !",
    completedDesc: "Vous avez découvert toutes les villes de ce niveau.",
    btnPlayAgain: "Recommencer ce niveau",
    btnChangeDiff: "Changer de Difficulté",
    btnShare: "Partager",
    shareCopied: "Score copié ! Partage avec tes amis 🚀"
  },

  de: {
    appTitle: "SatelCity",
    appSubtitle: "Erkennen Sie Weltstädte anhand von unbeschrifteten Satellitenbildern?",
    heroPill: "Echte ESRI-Satellitenbilder",

    difficultyLabel: "Schwierigkeitsgrad:",
    diffEasy: "Einfach",
    diffMedium: "Mittel",
    diffHard: "Schwer",
    diffEasyDesc: "Ikonische Metropolen",
    diffMediumDesc: "Große Hauptstädte",
    diffHardDesc: "Nischen- & Anspruchsvolle Städte",

    modeMC: "Multiple Choice",
    modeMCDesc: "Finden Sie die richtige Stadt aus 4 Optionen.",
    modeText: "Such- & Ratemodus",
    modeTextDesc: "Stadt eingeben; Entfernung (km) und Kompass-Hinweise erhalten.",
    btnPlay: "Spielen",
    btnMenu: "Menü",

    statAccuracy: "Genauigkeit",
    statCorrectRatio: "Richtig",
    btnResetStats: "Zurücksetzen",
    resetConfirm: "Möchten Sie die Statistiken für diesen Modus zurücksetzen?",

    compassNorth: "NORDEN OBEN",
    btnExpand: "Vergrößern",
    btnCloseModal: "Schließen (✕)",

    hintsHeader: "Hinweise",
    hintContinent: "🌍 Kontinent",
    hintCountry: "🚩 Land & Flagge",
    hintDetail: "ℹ️ Info",
    hintClickToReveal: "Klicken zum Aufdecken",

    mcPrompt: "Welche Stadt ist auf diesem Satellitenbild zu sehen?",

    tgPrompt: "Stadtname eingeben und raten:",
    tgRemaining: "Versuche übrig:",
    tgInputPlaceholder: "Stadt eingeben (z. B. Tokio, Paris, Berlin...)",
    tgSubmit: "Raten",
    tgEmptyHint: "Bei jedem Versuch erhalten Sie Distanz (km) und Himmelsrichtung.",
    tgAlreadyGuessed: "Diese Stadt haben Sie bereits geraten!",
    tgNotFound: "Bitte wählen Sie eine gültige Stadt aus der Liste.",
    tgSurrender: "Aufgeben (Antwort zeigen)",
    tgExact: "RICHTIG!",

    dirNorth: "Norden",
    dirNortheast: "Nordosten",
    dirEast: "Osten",
    dirSoutheast: "Südosten",
    dirSouth: "Süden",
    dirSouthwest: "Südwesten",
    dirWest: "Westen",
    dirNorthwest: "Nordwesten",

    resultCorrect: "🎉 Richtig geraten!",
    resultWrong: "❌ Leider falsch!",
    resultAccuracy: "Aktuelle Genauigkeit:",
    btnNextCity: "Nächste Stadt",
    populationLabel: "Einwohner:",
    thousand: "Tsd.",
    million: "Millionen",

    completedTitle: "🏆 Glückwunsch, Level abgeschlossen!",
    completedDesc: "Sie haben alle Städte dieses Schwierigkeitsgrades gesehen.",
    btnPlayAgain: "Zurücksetzen und neu spielen",
    btnChangeDiff: "Anderen Schwierigkeitsgrad wählen",
    btnShare: "Teilen",
    shareCopied: "Ergebnis kopiert! Teile mit Freunden 🚀"
  },

  it: {
    appTitle: "SatelCity",
    appSubtitle: "Riesci a riconoscere le città del mondo dalle foto satellitari senza etichette?",
    heroPill: "Vere Immagini Satellitari ESRI",

    difficultyLabel: "Livello di Difficoltà:",
    diffEasy: "Facile",
    diffMedium: "Medio",
    diffHard: "Difficile",
    diffEasyDesc: "Metropoli Iconiche",
    diffMediumDesc: "Grandi Capitali",
    diffHardDesc: "Città Impegnative",

    modeMC: "Scelta Multipla",
    modeMCDesc: "Trova la città corretta tra 4 opzioni intelligenti.",
    modeText: "Scrivi e Indovina",
    modeTextDesc: "Digita la città; ricevi indizi su distanza (km) e direzione.",
    btnPlay: "Gioca",
    btnMenu: "Menu",

    statAccuracy: "Precisione",
    statCorrectRatio: "Corrette",
    btnResetStats: "Azzera",
    resetConfirm: "Vuoi azzerare le statistiche di questa modalità?",

    compassNorth: "NORD IN ALTO",
    btnExpand: "Ingrandisci",
    btnCloseModal: "Chiudi (✕)",

    hintsHeader: "Indizi",
    hintContinent: "🌍 Continente",
    hintCountry: "🚩 Paese e Bandiera",
    hintDetail: "ℹ️ Info",
    hintClickToReveal: "Clicca per mostrare",

    mcPrompt: "Quale città è mostrata in questa foto satellitare?",

    tgPrompt: "Digita il nome della città:",
    tgRemaining: "Tentativi rimasti:",
    tgInputPlaceholder: "Digita una città (es. Tokyo, Parigi, Roma...)",
    tgSubmit: "Indovina",
    tgEmptyHint: "A ogni tentativo riceverai la distanza (km) e la direzione della bussola.",
    tgAlreadyGuessed: "Hai già provato questa città!",
    tgNotFound: "Seleziona una città valida dall'elenco.",
    tgSurrender: "Renditi (Vedi risposta)",
    tgExact: "ESATTO!",

    dirNorth: "Nord",
    dirNortheast: "Nord-Est",
    dirEast: "Est",
    dirSoutheast: "Sud-Est",
    dirSouth: "Sud",
    dirSouthwest: "Sud-Ovest",
    dirWest: "Ovest",
    dirNorthwest: "Nord-Ovest",

    resultCorrect: "🎉 Complimenti, risposta corretta!",
    resultWrong: "❌ Risposta sbagliata!",
    resultAccuracy: "Precisione attuale:",
    btnNextCity: "Prossima Città",
    populationLabel: "Popolazione:",
    thousand: "Mila",
    million: "Milioni",

    completedTitle: "🏆 Congratulazioni, Livello Completato!",
    completedDesc: "Hai completato tutte le città di questa difficoltà.",
    btnPlayAgain: "Azzera e Gioca di Nuovo",
    btnChangeDiff: "Scegli un'Altra Difficoltà",
    btnShare: "Condividi",
    shareCopied: "Punteggio copiato! Condividi con gli amici 🚀"
  }
};

class I18nManager {
  constructor() {
    this.currentLang = this.loadLang();
    this.listeners = [];
  }

  loadLang() {
    try {
      const saved = localStorage.getItem(STORAGE_LANG_KEY);
      if (saved && translations[saved]) {
        return saved;
      }
    } catch (e) {
      console.warn("i18n load error", e);
    }
    return 'tr';
  }

  setLang(lang) {
    if (!translations[lang]) return;
    this.currentLang = lang;
    try {
      localStorage.setItem(STORAGE_LANG_KEY, lang);
    } catch (e) {
      console.warn("i18n save error", e);
    }
    this.notify();
  }

  getLang() {
    return this.currentLang;
  }

  t(key) {
    const dict = translations[this.currentLang] || translations.tr;
    return dict[key] || translations.tr[key] || key;
  }

  getCityName(city) {
    if (!city) return '';
    return this.currentLang === 'tr' ? city.name : (city.nameEn || city.name);
  }

  getCountryName(city) {
    if (!city) return '';
    return this.currentLang === 'tr' ? city.country : (city.countryEn || city.country);
  }

  getContinentName(city) {
    if (!city) return '';
    return this.currentLang === 'tr' ? city.continent : (city.continentEn || city.continent);
  }

  getCityHint(city) {
    if (!city) return '';
    return this.currentLang === 'tr' ? city.hint : (city.hintEn || city.hint);
  }

  /**
   * Nüfus metnindeki "Bin" / "Milyon" ifadelerini seçili dile göre çevirir
   */
  formatPopulation(city) {
    if (!city || !city.population) return '';
    const pop = String(city.population);
    const thousandWord = this.t('thousand');
    const millionWord = this.t('million');
    return pop
      .replace(/\b(Milyon|Million|Millones|Millions|Millionen|Milioni)\b/gi, millionWord)
      .replace(/\b(Bin|Thousand|Mil|Mille|Tsd\.|Tausend|Mila)\b/gi, thousandWord);
  }

  formatPercentage(accuracy) {
    const acc = Math.round(Number(accuracy) || 0);
    return this.currentLang === 'tr' ? `%${acc}` : `${acc}%`;
  }

  subscribe(listener) {
    this.listeners.push(listener);
  }

  notify() {
    this.listeners.forEach(fn => fn(this.currentLang));
  }
}

export const i18n = new I18nManager();
export default i18n;
