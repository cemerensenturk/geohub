/**
 * SatelCity - Ana Uygulama Kontrolcüsü (v2.1)
 * Otomatik ipucu açma, menüden çıkışta cevapsız soruyu yanlış sayma,
 * 6 dilli sistem ve oyun sırasında dil seçicisini gizleme.
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
    this.currentDifficulty = 'easy'; // 'easy' | 'medium' | 'hard'
    this.activeMode = null; // 'mc' | 'text'
    this.currentCity = null;
    this.isRoundFinished = true; // Tur bitiş bayrağı
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
          // Sayfa yenilendiğinde veya kapatıldığında cevaplanmamış soru YANLIŞ sayılır
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
      diffPillMedium: document.getElementById('diff-pill-medium'),
      diffPillHard: document.getElementById('diff-pill-hard'),

      // Mod Butonları
      btnStartMC: document.getElementById('btn-mode-mc'),
      btnStartText: document.getElementById('btn-mode-text'),
      btnResetMC: document.getElementById('btn-reset-mc-stats'),
      btnResetText: document.getElementById('btn-reset-text-stats'),
      btnResetGame: document.getElementById('btn-reset-stats-game'),
      btnHome: document.getElementById('btn-game-home'),

      // Ana Menü İstatistikleri
      homeMCStatAccuracy: document.getElementById('home-mc-stat-accuracy'),
      homeMCStatRatio: document.getElementById('home-mc-stat-ratio'),
      homeTextStatAccuracy: document.getElementById('home-text-stat-accuracy'),
      homeTextStatRatio: document.getElementById('home-text-stat-ratio'),

      // Oyun HUD
      gameModeBadge: document.getElementById('game-mode-badge'),
      gameDiffBadge: document.getElementById('game-diff-badge'),
      gameStatAccuracy: document.getElementById('game-stat-accuracy'),
      gameStatRatio: document.getElementById('game-stat-ratio'),

      // Oyun & Harita Alanı
      modeContentArea: document.getElementById('mode-content-area'),
      mapContainer: document.getElementById('satellite-map-container'),
      
      // İpuçları
      btnHintContinent: document.getElementById('btn-hint-continent'),
      btnHintCountry: document.getElementById('btn-hint-country'),
      btnHintDetail: document.getElementById('btn-hint-detail'),
      hintValContinent: document.getElementById('hint-val-continent'),
      hintValCountry: document.getElementById('hint-val-country'),
      hintValDetail: document.getElementById('hint-val-detail'),

      // Sonuç Kartı
      resultCard: document.getElementById('result-overlay-card'),
      resultTitle: document.getElementById('result-title'),
      resultCityName: document.getElementById('result-city-name'),
      resultCityCountry: document.getElementById('result-city-country'),
      resultCityDetail: document.getElementById('result-city-detail'),
      resultAccuracyBadge: document.getElementById('result-accuracy-badge'),
      btnNextCity: document.getElementById('btn-next-city'),
      btnShareResult: document.getElementById('btn-share-result'),
      txtBtnShare: document.getElementById('txt-btn-share'),
      appToast: document.getElementById('app-toast'),

      // Seviye Tamamlama Kartı
      completedCard: document.getElementById('completed-card'),
      btnReplayTier: document.getElementById('btn-replay-tier'),
      btnChangeDiff: document.getElementById('btn-change-diff'),

      // Fotoğraf Büyütme Modal
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
      { el: this.elements.diffPillMedium, diff: 'medium' },
      { el: this.elements.diffPillHard, diff: 'hard' }
    ];

    diffPills.forEach(({ el, diff }) => {
      el.addEventListener('click', () => {
        diffPills.forEach(p => p.el.classList.remove('active'));
        el.classList.add('active');
        this.currentDifficulty = diff;
      });
    });

    // Mod Başlatma
    this.elements.btnStartMC.addEventListener('click', (e) => {
      if (e.target.id === 'btn-reset-mc-stats') return;
      this.startGame('mc');
    });

    this.elements.btnStartText.addEventListener('click', (e) => {
      if (e.target.id === 'btn-reset-text-stats') return;
      this.startGame('text');
    });

    // İstatistik Sıfırlama Butonları
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

    // Ana Menüye Dön: Eğer soru henüz cevaplanmadıysa YANLIŞ say!
    this.elements.btnHome.addEventListener('click', () => {
      if (!this.isRoundFinished && this.currentCity) {
        statsManager.recordResult(this.activeMode, this.currentCity.id, false);
        try { localStorage.removeItem('satelcity_pending_round'); } catch (e) {}
        this.isRoundFinished = true;
      }
      this.showScreen('screen-home');
      this.updateStatsUI();
    });

    // Sayfa Yenilendiğinde (F5 / Cmd+R) veya Sekme Kapatıldığında cevapsız soruyu YANLIŞ say!
    const handleUnloadPenalty = () => {
      if (!this.isRoundFinished && this.currentCity) {
        statsManager.recordResult(this.activeMode, this.currentCity.id, false);
        try { localStorage.removeItem('satelcity_pending_round'); } catch (e) {}
        this.isRoundFinished = true;
      }
    };
    window.addEventListener('beforeunload', handleUnloadPenalty);
    window.addEventListener('pagehide', handleUnloadPenalty);

    // Sonraki Soru
    this.elements.btnNextCity.addEventListener('click', () => {
      this.elements.resultCard.classList.remove('active');
      this.nextRound();
    });

    // Skoru Paylaş
    if (this.elements.btnShareResult) {
      this.elements.btnShareResult.addEventListener('click', () => {
        this.shareResult();
      });
    }

    // Seviye Tamamlama Butonları
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

    // İpucu Butonları
    this.elements.btnHintContinent.addEventListener('click', () => this.revealHint('continent'));
    this.elements.btnHintCountry.addEventListener('click', () => this.revealHint('country'));
    this.elements.btnHintDetail.addEventListener('click', () => this.revealHint('detail'));

    // Fotoğrafı Büyütme Modalı (SABİT & KİLİTLİ)
    this.elements.btnExpandPhoto.addEventListener('click', () => this.openPhotoModal());
    this.elements.btnClosePhotoModal.addEventListener('click', () => this.closePhotoModal());

    // Genel Klavye Kısayolları (Esc ile modalı kapat, Enter ile sonraki soruya geç)
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
    document.getElementById('txt-diff-medium').textContent = i18n.t('diffMedium');
    document.getElementById('txt-diff-medium-desc').textContent = i18n.t('diffMediumDesc');
    document.getElementById('txt-diff-hard').textContent = i18n.t('diffHard');
    document.getElementById('txt-diff-hard-desc').textContent = i18n.t('diffHardDesc');

    // Mod Kartları
    document.getElementById('txt-mode-mc-title').textContent = i18n.t('modeMC');
    document.getElementById('txt-mode-mc-desc').textContent = i18n.t('modeMCDesc');
    document.getElementById('txt-btn-play-mc').textContent = i18n.t('btnPlay');
    document.getElementById('btn-reset-mc-stats').textContent = i18n.t('btnResetStats');

    document.getElementById('txt-mode-text-title').textContent = i18n.t('modeText');
    document.getElementById('txt-mode-text-desc').textContent = i18n.t('modeTextDesc');
    document.getElementById('txt-btn-play-text').textContent = i18n.t('btnPlay');
    document.getElementById('btn-reset-text-stats').textContent = i18n.t('btnResetStats');

    // Oyun HUD & Fotoğraf
    document.getElementById('txt-btn-menu').textContent = i18n.t('btnMenu');
    document.getElementById('txt-compass-north').textContent = i18n.t('compassNorth');
    document.getElementById('txt-btn-expand').textContent = i18n.t('btnExpand');
    document.getElementById('btn-reset-stats-game').textContent = i18n.t('btnResetStats');
    this.elements.btnClosePhotoModal.textContent = i18n.t('btnCloseModal');

    // İpuçları
    document.getElementById('txt-hints-header').textContent = i18n.t('hintsHeader');
    document.getElementById('txt-hint-continent-lbl').textContent = i18n.t('hintContinent');
    document.getElementById('txt-hint-country-lbl').textContent = i18n.t('hintCountry');
    document.getElementById('txt-hint-detail-lbl').textContent = i18n.t('hintDetail');

    // Sonuç & Tamamlama
    document.getElementById('txt-btn-next-city').textContent = i18n.t('btnNextCity');
    if (this.elements.txtBtnShare) {
      this.elements.txtBtnShare.textContent = i18n.t('btnShare');
    }
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
    
    // Ana Menü MC Stats
    this.elements.homeMCStatAccuracy.textContent = i18n.formatPercentage(mcStats.accuracy);
    this.elements.homeMCStatRatio.textContent = `${mcStats.correct} / ${mcStats.played} ${i18n.t('statCorrectRatio')}`;

    // Ana Menü Text Stats
    this.elements.homeTextStatAccuracy.textContent = i18n.formatPercentage(textStats.accuracy);
    this.elements.homeTextStatRatio.textContent = `${textStats.correct} / ${textStats.played} ${i18n.t('statCorrectRatio')}`;

    // Aktif Oyun HUD Stats
    if (this.activeMode) {
      const activeStats = statsManager.getModeStats(this.activeMode);
      this.elements.gameStatAccuracy.textContent = i18n.formatPercentage(activeStats.accuracy);
      this.elements.gameStatRatio.textContent = `${i18n.t('statAccuracy')}: ${activeStats.formattedText}`;
    }
  }

  updateHudBadges() {
    this.elements.gameModeBadge.textContent = this.activeMode === 'mc' ? i18n.t('modeMC') : i18n.t('modeText');
    const diffKey = this.currentDifficulty === 'easy' ? 'diffEasy' : (this.currentDifficulty === 'medium' ? 'diffMedium' : 'diffHard');
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

    this.isRoundFinished = false; // Yeni soru başladı
    this.elements.completedCard.classList.remove('active');

    const randIdx = Math.floor(Math.random() * available.length);
    this.currentCity = available[randIdx];

    // Sayfa yenileme/kapatma kaçış koruması için bekleyen soruyu kaydet
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

  refreshHintsUI() {
    if (!this.currentCity) return;
    if (this.unlockedHints.continent) {
      this.elements.hintValContinent.textContent = i18n.getContinentName(this.currentCity);
    }
    if (this.unlockedHints.country) {
      this.elements.hintValCountry.textContent = `${this.currentCity.flag} ${i18n.getCountryName(this.currentCity)}`;
    }
    if (this.unlockedHints.detail) {
      this.elements.hintValDetail.textContent = `${i18n.getCityHint(this.currentCity)} (${i18n.t('populationLabel')} ${i18n.formatPopulation(this.currentCity)})`;
    }
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
      this.elements.hintValCountry.textContent = `${this.currentCity.flag} ${i18n.getCountryName(this.currentCity)}`;
    } else if (type === 'detail') {
      this.unlockedHints.detail = true;
      this.elements.btnHintDetail.classList.add('unlocked');
      this.elements.hintValDetail.textContent = `${i18n.getCityHint(this.currentCity)} (${i18n.t('populationLabel')} ${i18n.formatPopulation(this.currentCity)})`;
    }
  }

  handleRoundEnd({ isCorrect, targetCity }) {
    this.isRoundFinished = true; // Soru cevaplandı
    try { localStorage.removeItem('satelcity_pending_round'); } catch (e) {}

    // İpucu sistemi: Cevap verildiğinde tüm ipuçlarını otomatik aç!
    this.revealAllHints();

    // İstatistik ve görülen şehir kaydı
    const stats = statsManager.recordResult(this.activeMode, targetCity.id, isCorrect);
    this.updateStatsUI();

    // Sonuç kartı
    this.elements.resultTitle.className = isCorrect ? 'result-title correct' : 'result-title wrong';
    this.elements.resultTitle.textContent = isCorrect ? i18n.t('resultCorrect') : i18n.t('resultWrong');
    
    this.elements.resultCityName.textContent = `${targetCity.flag} ${i18n.getCityName(targetCity)}`;
    this.elements.resultCityCountry.textContent = `${i18n.getCountryName(targetCity)} • ${i18n.getContinentName(targetCity)}`;
    this.elements.resultCityDetail.textContent = `${i18n.getCityHint(targetCity)} — ${i18n.t('populationLabel')} ${i18n.formatPopulation(targetCity)}`;
    
    const pctText = i18n.formatPercentage(stats.accuracy);
    this.elements.resultAccuracyBadge.textContent = `${i18n.t('resultAccuracy')} ${stats.formattedText} (${pctText})`;

    setTimeout(() => {
      this.elements.resultCard.classList.add('active');
    }, 350);
  }

  shareResult() {
    if (!this.currentCity) return;
    const modeName = this.activeMode === 'mc' ? i18n.t('modeMC') : i18n.t('modeText');
    const diffKey = this.currentDifficulty === 'easy' ? 'diffEasy' : (this.currentDifficulty === 'medium' ? 'diffMedium' : 'diffHard');
    const diffName = i18n.t(diffKey);
    const stats = statsManager.getModeStats(this.activeMode);
    const cityName = i18n.getCityName(this.currentCity);
    const pct = i18n.formatPercentage(stats.accuracy);

    const shareText = `🛰️ SatelCity (${diffName} • ${modeName})\n🎯 ${cityName}: ${stats.formattedText} (${pct})\n🌐 https://cemeren.dev/satelcity`;

    if (navigator.share) {
      navigator.share({
        title: 'SatelCity',
        text: shareText,
        url: 'https://cemeren.dev/satelcity'
      }).catch(() => {
        this.copyToClipboard(shareText);
      });
    } else {
      this.copyToClipboard(shareText);
    }
  }

  copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        this.showToast(i18n.t('shareCopied'));
      }).catch(() => {
        this.showToast(i18n.t('shareCopied'));
      });
    } else {
      this.showToast(i18n.t('shareCopied'));
    }
  }

  showToast(msg) {
    if (!this.elements.appToast) return;
    this.elements.appToast.textContent = msg;
    this.elements.appToast.classList.add('active');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      if (this.elements.appToast) {
        this.elements.appToast.classList.remove('active');
      }
    }, 2800);
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
