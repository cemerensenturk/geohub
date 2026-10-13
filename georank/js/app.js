/**
 * GeoRank - 10 Country Drag & Drop Ranking Game
 * Evaluates geographic spatial intuition and demographic knowledge.
 */

const ICONS = {
  grip: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6h.01M9 12h.01M9 18h.01M15 6h.01M15 12h.01M15 18h.01"/></svg>',
  up: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 15 6-6 6 6"/></svg>',
  down: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
  check: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  cross: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  close: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg>'
};

class GeoRankGame {
  constructor() {
    this.allCountries = [];
    this.currentMetric = 'area'; // 'area' | 'population'
    this.currentDeck = []; // 10 country objects currently in play
    this.isSubmitted = false;
    this.draggedIndex = null;

    this.init();
  }

  async init() {
    this.initElements();
    this.bindEvents();
    await this.loadData();
    this.startNewRound();
  }

  initElements() {
    this.elements = {
      btnModeArea: document.getElementById('btn-mode-area'),
      btnModePop: document.getElementById('btn-mode-pop'),
      instructionsText: document.getElementById('instructions-text'),
      rankList: document.getElementById('rank-list'),
      btnSubmit: document.getElementById('btn-submit'),
      btnShuffle: document.getElementById('btn-shuffle'),
      btnNewRound: document.getElementById('btn-new-round'),
      
      // Modal Elements
      resultModal: document.getElementById('result-modal'),
      resultBadgeScore: document.getElementById('result-badge-score'),
      resultTitle: document.getElementById('result-title'),
      resultSummary: document.getElementById('result-summary'),
      resultsBreakdownList: document.getElementById('results-breakdown-list'),
      btnModalNext: document.getElementById('btn-modal-next'),
      btnModalClose: document.getElementById('btn-modal-close')
    };
  }

  bindEvents() {
    // Metric switch
    this.elements.btnModeArea.addEventListener('click', () => this.setMetric('area'));
    this.elements.btnModePop.addEventListener('click', () => this.setMetric('population'));

    // Actions
    this.elements.btnSubmit.addEventListener('click', () => this.handleSubmit());
    this.elements.btnShuffle.addEventListener('click', () => this.shuffleCurrentDeck());
    this.elements.btnNewRound.addEventListener('click', () => this.startNewRound());

    // Modal
    this.elements.btnModalNext.addEventListener('click', () => {
      this.closeModal();
      this.startNewRound();
    });
    this.elements.btnModalClose.addEventListener('click', () => this.closeModal());
  }

  async loadData() {
    let data = null;

    if (typeof window !== 'undefined' && window.GEO_COUNTRIES && Array.isArray(window.GEO_COUNTRIES)) {
      data = window.GEO_COUNTRIES;
    } else {
      try {
        const response = await fetch('../data/countries.json');
        if (response.ok) {
          data = await response.json();
        }
      } catch (e) {
        console.warn('Relative data fetch failed, trying root fallback:', e);
      }

      if (!data) {
        try {
          const response = await fetch('/data/countries.json');
          if (response.ok) {
            data = await response.json();
          }
        } catch (e) {
          console.error('All data sources failed in GeoRank:', e);
        }
      }
    }

    if (Array.isArray(data)) {
      // Filter countries to ensure viable comparative gameplay
      this.allCountries = data.filter(c => 
        c.population && c.population > 50000 && 
        c.area && c.area > 500 &&
        (typeof c.name === 'string' ? c.name.length > 0 : (c.name && c.name.common))
      ).map(c => ({
        ...c,
        name: typeof c.name === 'object' ? c.name : { common: c.name, official: c.name },
        flags: c.flags || { png: c.flag }
      }));
    }
  }

  setMetric(metric) {
    if (this.currentMetric === metric) return;
    this.currentMetric = metric;

    if (metric === 'area') {
      this.elements.btnModeArea.classList.add('is-active');
      this.elements.btnModePop.classList.remove('is-active');
      this.elements.btnModeArea.setAttribute('aria-pressed', 'true');
      this.elements.btnModePop.setAttribute('aria-pressed', 'false');
      this.elements.instructionsText.innerHTML = 
        'Drag &amp; drop or use the arrow buttons to order these 10 countries by <strong>Land Area</strong> from <strong>1st (Largest)</strong> to <strong>10th (Smallest)</strong>.';
    } else {
      this.elements.btnModePop.classList.add('is-active');
      this.elements.btnModeArea.classList.remove('is-active');
      this.elements.btnModePop.setAttribute('aria-pressed', 'true');
      this.elements.btnModeArea.setAttribute('aria-pressed', 'false');
      this.elements.instructionsText.innerHTML = 
        'Drag &amp; drop or use the arrow buttons to order these 10 countries by <strong>Population</strong> from <strong>1st (Most Populous)</strong> to <strong>10th (Least Populous)</strong>.';
    }

    this.startNewRound();
  }

  startNewRound() {
    if (this.allCountries.length < 10) return;

    this.isSubmitted = false;
    this.elements.btnSubmit.disabled = false;
    this.closeModal();

    // Pick 10 unique random countries
    const shuffled = [...this.allCountries].sort(() => 0.5 - Math.random());
    this.currentDeck = shuffled.slice(0, 10);

    this.renderCards();
  }

  shuffleCurrentDeck() {
    if (this.isSubmitted) return;
    this.currentDeck.sort(() => 0.5 - Math.random());
    this.renderCards();
  }

  renderCards() {
    this.elements.rankList.innerHTML = '';

    // Calculate true sorted order for reveal comparisons
    const trueSorted = [...this.currentDeck].sort((a, b) => {
      const valA = a[this.currentMetric] || 0;
      const valB = b[this.currentMetric] || 0;
      return valB - valA; // Descending
    });

    this.currentDeck.forEach((country, index) => {
      const card = document.createElement('div');
      card.className = 'rank-card';
      card.setAttribute('draggable', !this.isSubmitted);
      card.dataset.index = index;

      const flagUrl = country.flags?.png || '';
      const countryName = country.name.common;
      const metricVal = country[this.currentMetric] || 0;
      const formattedVal = this.currentMetric === 'area'
        ? `${metricVal.toLocaleString('en-US')} km²`
        : `${metricVal.toLocaleString('en-US')} people`;

      // Status check if submitted
      let statusClass = '';
      let statusHtml = '';
      if (this.isSubmitted) {
        const trueRank = trueSorted.findIndex(c => c.name.common === country.name.common) + 1;
        const diff = Math.abs((index + 1) - trueRank);
        if (diff === 0) {
          statusClass = 'status-correct';
          statusHtml = `${ICONS.check}<span>Correct</span>`;
        } else if (diff === 1) {
          statusClass = 'status-close';
          statusHtml = `${ICONS.close}<span>Close · true #${trueRank}</span>`;
        } else {
          statusClass = 'status-wrong';
          statusHtml = `${ICONS.cross}<span>True #${trueRank}</span>`;
        }
        card.classList.add(statusClass);
      }

      card.innerHTML = `
        <div class="rank-slot-number">${index + 1}</div>
        <div class="rank-drag-handle" title="Drag to reorder">${this.isSubmitted ? '' : ICONS.grip}</div>
        <img class="rank-flag" src="${flagUrl}" alt="${countryName} flag" loading="lazy">
        <div class="rank-info">
          <span class="rank-name">${countryName}</span>
          ${this.isSubmitted ? `<span class="rank-metrics-tag">${formattedVal}</span>` : ''}
        </div>
        ${this.isSubmitted ? `<span class="rank-status">${statusHtml}</span>` : `
          <div class="rank-controls">
            <button class="btn-shift btn-shift-up" title="Move up" aria-label="Move ${countryName} up" ${index === 0 ? 'disabled' : ''}>${ICONS.up}</button>
            <button class="btn-shift btn-shift-down" title="Move down" aria-label="Move ${countryName} down" ${index === 9 ? 'disabled' : ''}>${ICONS.down}</button>
          </div>
        `}
      `;

      // Accessible Shift Buttons
      if (!this.isSubmitted) {
        const btnUp = card.querySelector('.btn-shift-up');
        const btnDown = card.querySelector('.btn-shift-down');
        if (btnUp) {
          btnUp.addEventListener('click', (e) => {
            e.stopPropagation();
            this.swapItems(index, index - 1);
          });
        }
        if (btnDown) {
          btnDown.addEventListener('click', (e) => {
            e.stopPropagation();
            this.swapItems(index, index + 1);
          });
        }

        // HTML5 Drag and Drop Events
        card.addEventListener('dragstart', (e) => this.handleDragStart(e, index));
        card.addEventListener('dragover', (e) => this.handleDragOver(e, card));
        card.addEventListener('dragleave', () => card.classList.remove('drag-over'));
        card.addEventListener('drop', (e) => this.handleDrop(e, index));
        card.addEventListener('dragend', () => this.handleDragEnd());
      }

      this.elements.rankList.appendChild(card);
    });
  }

  // Swap utility for both button clicks and drop events
  swapItems(fromIdx, toIdx) {
    if (toIdx < 0 || toIdx >= this.currentDeck.length) return;
    const temp = this.currentDeck[fromIdx];
    this.currentDeck[fromIdx] = this.currentDeck[toIdx];
    this.currentDeck[toIdx] = temp;
    this.renderCards();
  }

  handleDragStart(e, index) {
    if (this.isSubmitted) return;
    this.draggedIndex = index;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index);
    setTimeout(() => {
      const card = this.elements.rankList.children[index];
      if (card) card.classList.add('dragging');
    }, 0);
  }

  handleDragOver(e, card) {
    if (this.isSubmitted) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    card.classList.add('drag-over');
  }

  handleDrop(e, targetIndex) {
    if (this.isSubmitted) return;
    e.preventDefault();
    if (this.draggedIndex === null || this.draggedIndex === targetIndex) return;

    // Move dragged item to target position
    const item = this.currentDeck.splice(this.draggedIndex, 1)[0];
    this.currentDeck.splice(targetIndex, 0, item);
    this.renderCards();
  }

  handleDragEnd() {
    this.draggedIndex = null;
    document.querySelectorAll('.rank-card').forEach(c => {
      c.classList.remove('dragging', 'drag-over');
    });
  }

  handleSubmit() {
    if (this.isSubmitted) return;
    this.isSubmitted = true;
    this.elements.btnSubmit.disabled = true;

    // Calculate True Order
    const trueSorted = [...this.currentDeck].sort((a, b) => {
      const valA = a[this.currentMetric] || 0;
      const valB = b[this.currentMetric] || 0;
      return valB - valA;
    });

    let correctCount = 0;
    const breakdown = this.currentDeck.map((country, userIdx) => {
      const userRank = userIdx + 1;
      const trueRank = trueSorted.findIndex(c => c.name.common === country.name.common) + 1;
      const isExact = userRank === trueRank;
      if (isExact) correctCount++;

      return {
        country,
        userRank,
        trueRank,
        isExact,
        value: country[this.currentMetric] || 0
      };
    });

    this.renderCards();
    this.showResultsModal(correctCount, breakdown);
  }

  showResultsModal(correctCount, breakdown) {
    this.elements.resultBadgeScore.textContent = `${correctCount} / 10 Correct`;

    if (correctCount >= 8) {
      this.elements.resultTitle.textContent = 'Master Geographer!';
      this.elements.resultSummary.textContent = 'Incredible spatial perception and global knowledge!';
    } else if (correctCount >= 5) {
      this.elements.resultTitle.textContent = 'Good Effort!';
      this.elements.resultSummary.textContent = 'You got more than half right. With a little more practice, you will master it!';
    } else {
      this.elements.resultTitle.textContent = 'Keep Exploring!';
      this.elements.resultSummary.textContent = 'Some countries are deceivingly big or dense. Review the actual values below!';
    }

    this.elements.resultsBreakdownList.innerHTML = breakdown.map(item => {
      const metricLabel = this.currentMetric === 'area'
        ? `${item.value.toLocaleString('en-US')} km²`
        : `${item.value.toLocaleString('en-US')} people`;

      return `
        <div class="breakdown-row ${item.isExact ? 'correct' : 'wrong'}">
          <span class="breakdown-rank">${item.isExact ? ICONS.check : ICONS.cross}<span>#${item.userRank}</span><span class="visually-hidden">${item.isExact ? 'correct' : 'wrong'}</span></span>
          <span class="breakdown-name">${item.country.flags?.png ? `<img src="${item.country.flags.png}" alt="">` : ''}<span>${item.country.name.common}</span></span>
          <span class="breakdown-val"><span>${metricLabel}</span><span class="breakdown-true">True #${item.trueRank}</span></span>
        </div>
      `;
    }).join('');

    setTimeout(() => {
      this.elements.resultModal.classList.add('active');
    }, 350);
  }

  closeModal() {
    this.elements.resultModal.classList.remove('active');
  }
}

function startGeoRankApp() {
  if (!window.geoRank) {
    try {
      window.geoRank = new GeoRankGame();
    } catch (err) {
      console.error("Error starting GeoRank game:", err);
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startGeoRankApp);
} else {
  startGeoRankApp();
}

