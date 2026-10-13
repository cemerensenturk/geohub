/**
 * SatelCity - Main Application Controller
 * Handles round transitions, hints auto-reveal, abandonment penalty on unload/exit,
 * locked satellite imagery modal, and stats updates.
 */

import CITIES from './cities.js';
import SatelliteMap from './map.js';
import MultipleChoiceMode from './modes/multipleChoice.js';
import TextGuessMode from './modes/textGuess.js';
import statsManager from './stats.js';
import i18n from './i18n.js';

class App {
  constructor() {
    this.cities = [...CITIES];
    this.currentDifficulty = 'easy'; // 'easy' | 'hard'
    this.activeMode = null; // 'mc' | 'text'
    this.currentCity = null;
    this.isRoundFinished = true; // Round completion flag
    this.satelliteMap = null;
    this.modalMap = null;

    this.unlockedHints = {
      continent: false,
      country: false,
      detail: false
    };

    this.mcMode = null;
    this.textMode = null;

    this.init();
  }

  init() {
    this.checkPendingRoundPenalty();
    this.initElements();
    this.initMap();
    this.initModes();
    this.bindEvents();
    this.applyTranslations();
    this.updateStatsUI();
    this.showScreen('screen-home');
  }

  checkPendingRoundPenalty() {
    try {
      const pendingStr = localStorage.getItem('satelcity_pending_round');
      if (pendingStr) {
        const pending = JSON.parse(pendingStr);
        if (pending && pending.mode && pending.cityId) {
          // Unanswered round when refreshing or closing tab is counted as incorrect
          statsManager.recordResult(pending.mode, pending.cityId, false);
        }
        localStorage.removeItem('satelcity_pending_round');
      }
    } catch (e) {
      console.warn("Pending penalty check error", e);
    }
  }

  initElements() {
    this.elements = {
      // Screens
      screenHome: document.getElementById('screen-home'),
      screenGame: document.getElementById('screen-game'),

      // Difficulty Pills
      diffPillEasy: document.getElementById('diff-pill-easy'),
      diffPillHard: document.getElementById('diff-pill-hard'),

      // Mode Buttons
      btnStartMC: document.getElementById('btn-mode-mc'),
      btnStartText: document.getElementById('btn-mode-text'),
      btnResetMC: document.getElementById('btn-reset-mc-stats'),
      btnResetText: document.getElementById('btn-reset-text-stats'),
      btnResetGame: document.getElementById('btn-reset-stats-game'),
      btnHome: document.getElementById('btn-game-home'),

      // Home Menu Stats
      homeMCStatAccuracy: document.getElementById('home-mc-stat-accuracy'),
      homeMCStatRatio: document.getElementById('home-mc-stat-ratio'),
      homeTextStatAccuracy: document.getElementById('home-text-stat-accuracy'),
      homeTextStatRatio: document.getElementById('home-text-stat-ratio'),

      // Game HUD
      gameModeBadge: document.getElementById('game-mode-badge'),
      gameDiffBadge: document.getElementById('game-diff-badge'),
      gameStatAccuracy: document.getElementById('game-stat-accuracy'),
      gameStatRatio: document.getElementById('game-stat-ratio'),

      // Game & Map Containers
      modeContentArea: document.getElementById('mode-content-area'),
      mapContainer: document.getElementById('satellite-map-container'),
      
      // Hints
      btnHintContinent: document.getElementById('btn-hint-continent'),
      btnHintCountry: document.getElementById('btn-hint-country'),
      btnHintDetail: document.getElementById('btn-hint-detail'),
      hintValContinent: document.getElementById('hint-val-continent'),
      hintValCountry: document.getElementById('hint-val-country'),
      hintValDetail: document.getElementById('hint-val-detail'),

      // Result Card
      resultCard: document.getElementById('result-overlay-card'),
      resultTitle: document.getElementById('result-title'),
      resultCityName: document.getElementById('result-city-name'),
      resultCityCountry: document.getElementById('result-city-country'),
      resultCityDetail: document.getElementById('result-city-detail'),
      resultAccuracyBadge: document.getElementById('result-accuracy-badge'),
      btnNextCity: document.getElementById('btn-next-city'),

      // Tier Completed Card
      completedCard: document.getElementById('completed-card'),
      btnReplayTier: document.getElementById('btn-replay-tier'),
      btnChangeDiff: document.getElementById('btn-change-diff'),

      // Photo Modal
      btnExpandPhoto: document.getElementById('btn-expand-photo'),
      photoModal: document.getElementById('photo-modal'),
      btnClosePhotoModal: document.getElementById('btn-close-photo-modal'),
      modalMapContainer: document.getElementById('modal-map-container')
    };
  }

  initMap() {
    this.satelliteMap = new SatelliteMap('satellite-map-container');
  }

  initModes() {
    this.mcMode = new MultipleChoiceMode(this.cities, (result) => this.handleRoundEnd(result));
    this.textMode = new TextGuessMode(this.cities, (result) => this.handleRoundEnd(result));
  }

  bindEvents() {
    // Difficulty Selection
    const diffPills = [
      { el: this.elements.diffPillEasy, diff: 'easy' },
      { el: this.elements.diffPillHard, diff: 'hard' }
    ];

    diffPills.forEach(({ el, diff }) => {
      el.addEventListener('click', () => {
        diffPills.forEach(p => p.el.classList.remove('active'));
        el.classList.add('active');
        this.currentDifficulty = diff;
      });
    });

    // Start Mode
    this.elements.btnStartMC.addEventListener('click', (e) => {
      if (e.target.id === 'btn-reset-mc-stats') return;
      this.startGame('mc');
    });

    this.elements.btnStartText.addEventListener('click', (e) => {
      if (e.target.id === 'btn-reset-text-stats') return;
      this.startGame('text');
    });

    // Reset Stats Buttons
    this.elements.btnResetMC.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm(i18n.t('resetConfirm'))) {
        statsManager.resetMode('mc');
        this.updateStatsUI();
      }
    });

    this.elements.btnResetText.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm(i18n.t('resetConfirm'))) {
        statsManager.resetMode('text');
        this.updateStatsUI();
      }
    });

    this.elements.btnResetGame.addEventListener('click', () => {
      if (confirm(i18n.t('resetConfirm'))) {
        statsManager.resetMode(this.activeMode);
        this.updateStatsUI();
        this.nextRound();
      }
    });

    // Return to Menu: If current question was unanswered, record as incorrect
    this.elements.btnHome.addEventListener('click', () => {
      if (!this.isRoundFinished && this.currentCity) {
        statsManager.recordResult(this.activeMode, this.currentCity.id, false);
        try { localStorage.removeItem('satelcity_pending_round'); } catch (e) {}
        this.isRoundFinished = true;
      }
      this.showScreen('screen-home');
      this.updateStatsUI();
    });

    // Abandonment penalty: Count as incorrect if user refreshes or closes the page during an active round
    const handleUnloadPenalty = () => {
      if (!this.isRoundFinished && this.currentCity) {
        statsManager.recordResult(this.activeMode, this.currentCity.id, false);
        try { localStorage.removeItem('satelcity_pending_round'); } catch (e) {}
        this.isRoundFinished = true;
      }
    };
    window.addEventListener('beforeunload', handleUnloadPenalty);
    window.addEventListener('pagehide', handleUnloadPenalty);

    // Next Question
    this.elements.btnNextCity.addEventListener('click', () => {
      this.elements.resultCard.classList.remove('active');
      this.nextRound();
    });

    // Tier Completed Actions
    this.elements.btnReplayTier.addEventListener('click', () => {
      statsManager.resetMode(this.activeMode);
      this.updateStatsUI();
      this.elements.completedCard.classList.remove('active');
      this.nextRound();
    });

    this.elements.btnChangeDiff.addEventListener('click', () => {
      this.elements.completedCard.classList.remove('active');
      this.showScreen('screen-home');
    });

    // Hint Buttons
    this.elements.btnHintContinent.addEventListener('click', () => this.revealHint('continent'));
    this.elements.btnHintCountry.addEventListener('click', () => this.revealHint('country'));
    this.elements.btnHintDetail.addEventListener('click', () => this.revealHint('detail'));

    // Locked Satellite Photo Modal
    this.elements.btnExpandPhoto.addEventListener('click', () => this.openPhotoModal());
    this.elements.btnClosePhotoModal.addEventListener('click', () => this.closePhotoModal());

    // Keyboard Shortcuts (Esc closes modal, Enter advances to next round)
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closePhotoModal();
      } else if (e.key === 'Enter') {
        if (this.elements.resultCard.classList.contains('active')) {
          this.elements.resultCard.classList.remove('active');
          this.nextRound();
        }
      }
    });
  }

  applyTranslations() {
    // Main Menu Strings
    document.getElementById('txt-hero-pill').textContent = i18n.t('heroPill');
    document.getElementById('txt-hero-subtitle').textContent = i18n.t('appSubtitle');
    document.getElementById('txt-diff-label').textContent = i18n.t('difficultyLabel');
    document.getElementById('txt-diff-easy').textContent = i18n.t('diffEasy');
    document.getElementById('txt-diff-easy-desc').textContent = i18n.t('diffEasyDesc');
    document.getElementById('txt-diff-hard').textContent = i18n.t('diffHard');
    document.getElementById('txt-diff-hard-desc').textContent = i18n.t('diffHardDesc');

    // Mode Cards
    document.getElementById('txt-mode-mc-title').textContent = i18n.t('modeMC');
    document.getElementById('txt-mode-mc-desc').textContent = i18n.t('modeMCDesc');
    document.getElementById('txt-btn-play-mc').textContent = i18n.t('btnPlay');
    document.getElementById('btn-reset-mc-stats').textContent = i18n.t('btnResetStats');

    document.getElementById('txt-mode-text-title').textContent = i18n.t('modeText');
    document.getElementById('txt-mode-text-desc').textContent = i18n.t('modeTextDesc');
    document.getElementById('txt-btn-play-text').textContent = i18n.t('btnPlay');
    document.getElementById('btn-reset-text-stats').textContent = i18n.t('btnResetStats');

    // Game HUD & Photo
    document.getElementById('txt-btn-menu').textContent = i18n.t('btnMenu');
    document.getElementById('txt-compass-north').textContent = i18n.t('compassNorth');
    document.getElementById('txt-btn-expand').textContent = i18n.t('btnExpand');
    document.getElementById('btn-reset-stats-game').textContent = i18n.t('btnResetStats');
    this.elements.btnClosePhotoModal.textContent = i18n.t('btnCloseModal');

    // Hints
    document.getElementById('txt-hints-header').textContent = i18n.t('hintsHeader');
    document.getElementById('txt-hint-continent-lbl').textContent = i18n.t('hintContinent');
    document.getElementById('txt-hint-country-lbl').textContent = i18n.t('hintCountry');
    document.getElementById('txt-hint-detail-lbl').textContent = i18n.t('hintDetail');

    // Result & Completion
    document.getElementById('txt-btn-next-city').textContent = i18n.t('btnNextCity');
    document.getElementById('txt-completed-title').textContent = i18n.t('completedTitle');
    document.getElementById('txt-completed-desc').textContent = i18n.t('completedDesc');
    document.getElementById('txt-btn-replay').textContent = i18n.t('btnPlayAgain');
    document.getElementById('txt-btn-diff-change').textContent = i18n.t('btnChangeDiff');

    if (this.activeMode) {
      this.updateHudBadges();
    }
  }

  showScreen(screenId) {
    if (screenId === 'screen-home') {
      this.elements.screenHome.classList.add('active');
      this.elements.screenGame.classList.remove('active');
    } else {
      this.elements.screenHome.classList.remove('active');
      this.elements.screenGame.classList.add('active');
      setTimeout(() => this.satelliteMap.invalidate(), 200);
    }
  }

  updateStatsUI() {
    const mcStats = statsManager.getModeStats('mc');
    const textStats = statsManager.getModeStats('text');
    
    // Home Menu MC Stats
    this.elements.homeMCStatAccuracy.textContent = i18n.formatPercentage(mcStats.accuracy);
    this.elements.homeMCStatRatio.textContent = `${mcStats.correct} / ${mcStats.played} ${i18n.t('statCorrectRatio')}`;

    // Home Menu Text Stats
    this.elements.homeTextStatAccuracy.textContent = i18n.formatPercentage(textStats.accuracy);
    this.elements.homeTextStatRatio.textContent = `${textStats.correct} / ${textStats.played} ${i18n.t('statCorrectRatio')}`;

    // Active Game HUD Stats
    if (this.activeMode) {
      const activeStats = statsManager.getModeStats(this.activeMode);
      this.elements.gameStatAccuracy.textContent = i18n.formatPercentage(activeStats.accuracy);
      this.elements.gameStatRatio.textContent = `${i18n.t('statAccuracy')}: ${activeStats.formattedText}`;
    }
  }

  updateHudBadges() {
    this.elements.gameModeBadge.textContent = this.activeMode === 'mc' ? i18n.t('modeMC') : i18n.t('modeText');
    const diffKey = this.currentDifficulty === 'easy' ? 'diffEasy' : 'diffHard';
    this.elements.gameDiffBadge.textContent = i18n.t(diffKey);
  }

  startGame(mode) {
    this.activeMode = mode;
    this.updateHudBadges();
    this.updateStatsUI();
    this.showScreen('screen-game');
    this.nextRound();
  }

  nextRound() {
    const available = statsManager.getAvailableCities(this.activeMode, this.currentDifficulty, this.cities);

    if (available.length === 0) {
      this.isRoundFinished = true;
      this.elements.modeContentArea.innerHTML = '';
      this.elements.resultCard.classList.remove('active');
      this.elements.completedCard.classList.add('active');
      return;
    }

    this.isRoundFinished = false; // New round started
    this.elements.completedCard.classList.remove('active');

    const randIdx = Math.floor(Math.random() * available.length);
    this.currentCity = available[randIdx];

    // Persist pending round for refresh/leave penalty protection
    try {
      localStorage.setItem('satelcity_pending_round', JSON.stringify({
        mode: this.activeMode,
        cityId: this.currentCity.id
      }));
    } catch (e) {}

    this.resetHints();
    this.satelliteMap.setCity(this.currentCity);
    this.elements.resultCard.classList.remove('active');

    if (this.activeMode === 'mc') {
      this.mcMode.mount(this.elements.modeContentArea);
      this.mcMode.startRound(this.currentCity);
    } else {
      this.textMode.mount(this.elements.modeContentArea);
      this.textMode.startRound(this.currentCity);
    }
  }

  resetHints() {
    this.unlockedHints = { continent: false, country: false, detail: false };

    this.elements.btnHintContinent.classList.remove('unlocked');
    this.elements.btnHintCountry.classList.remove('unlocked');
    this.elements.btnHintDetail.classList.remove('unlocked');

    this.elements.hintValContinent.textContent = i18n.t('hintClickToReveal');
    this.elements.hintValCountry.textContent = i18n.t('hintClickToReveal');
    this.elements.hintValDetail.textContent = i18n.t('hintClickToReveal');
  }

  revealAllHints() {
    if (!this.currentCity) return;
    this.revealHint('continent');
    this.revealHint('country');
    this.revealHint('detail');
  }

  revealHint(type) {
    if (!this.currentCity) return;

    if (type === 'continent') {
      this.unlockedHints.continent = true;
      this.elements.btnHintContinent.classList.add('unlocked');
      this.elements.hintValContinent.textContent = i18n.getContinentName(this.currentCity);
    } else if (type === 'country') {
      this.unlockedHints.country = true;
      this.elements.btnHintCountry.classList.add('unlocked');
      this.elements.hintValCountry.textContent = i18n.getCountryName(this.currentCity);
    } else if (type === 'detail') {
      this.unlockedHints.detail = true;
      this.elements.btnHintDetail.classList.add('unlocked');
      this.elements.hintValDetail.textContent = `${i18n.getCityHint(this.currentCity)} (${i18n.t('populationLabel')} ${i18n.formatPopulation(this.currentCity)})`;
    }
  }

  handleRoundEnd({ isCorrect, targetCity }) {
    this.isRoundFinished = true; // Round ended
    try { localStorage.removeItem('satelcity_pending_round'); } catch (e) {}

    // Auto-reveal all hints upon round completion
    this.revealAllHints();

    // Record stats and seen city
    const stats = statsManager.recordResult(this.activeMode, targetCity.id, isCorrect);
    this.updateStatsUI();

    // Result card display
    this.elements.resultTitle.className = isCorrect ? 'result-title correct' : 'result-title wrong';
    this.elements.resultTitle.textContent = isCorrect ? i18n.t('resultCorrect') : i18n.t('resultWrong');
    
    this.elements.resultCityName.textContent = i18n.getCityName(targetCity);
    this.elements.resultCityCountry.textContent = `${i18n.getCountryName(targetCity)} • ${i18n.getContinentName(targetCity)}`;
    this.elements.resultCityDetail.textContent = `${i18n.getCityHint(targetCity)} — ${i18n.t('populationLabel')} ${i18n.formatPopulation(targetCity)}`;
    
    const pctText = i18n.formatPercentage(stats.accuracy);
    this.elements.resultAccuracyBadge.textContent = `${i18n.t('resultAccuracy')} ${stats.formattedText} (${pctText})`;

    setTimeout(() => {
      this.elements.resultCard.classList.add('active');
    }, 350);
  }

  openPhotoModal() {
    if (!this.currentCity) return;
    this.elements.photoModal.classList.add('active');
    
    if (!this.modalMap) {
      this.modalMap = L.map('modal-map-container', {
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        touchZoom: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false
      });

      L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
        maxZoom: 18,
        minZoom: 3,
        attribution: "Tiles &copy; Esri"
      }).addTo(this.modalMap);
    }

    setTimeout(() => {
      this.modalMap.invalidateSize();
      this.modalMap.setView([this.currentCity.lat, this.currentCity.lng], this.currentCity.zoom);
    }, 150);
  }

  closePhotoModal() {
    this.elements.photoModal.classList.remove('active');
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
