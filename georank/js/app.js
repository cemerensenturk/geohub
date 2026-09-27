/**
 * GeoRank - 10 Country Drag & Drop Ranking Game
 * Evaluates geographic spatial intuition and demographic knowledge.
 */

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
    try {
      const response = await fetch('../flagquiz/data/countries.json');
      if (!response.ok) throw new Error('Failed to fetch country dataset');
      const data = await response.json();

      // Filter countries to ensure viable comparative gameplay
      this.allCountries = data.filter(c => 
        c.population && c.population > 50000 && 
        c.area && c.area > 500 &&
        c.name && c.name.common
      );
    } catch (e) {
      console.error('Data loading error:', e);
    }
  }

  setMetric(metric) {
    if (this.currentMetric === metric) return;
    this.currentMetric = metric;

    if (metric === 'area') {
      this.elements.btnModeArea.classList.add('active');
      this.elements.btnModePop.classList.remove('active');
      this.elements.instructionsText.innerHTML = 
        'Drag & drop or use arrow buttons to order these 10 countries by <strong>Land Area</strong> from <strong>1st (Largest)</strong> to <strong>10th (Smallest)</strong>.';
    } else {
      this.elements.btnModePop.classList.add('active');
      this.elements.btnModeArea.classList.remove('active');
      this.elements.instructionsText.innerHTML = 
        'Drag & drop or use arrow buttons to order these 10 countries by <strong>Population</strong> from <strong>1st (Most Populous)</strong> to <strong>10th (Least Populous)</strong>.';
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
      let rankText = `#${index + 1}`;
      if (this.isSubmitted) {
        const trueRank = trueSorted.findIndex(c => c.name.common === country.name.common) + 1;
        const diff = Math.abs((index + 1) - trueRank);
        if (diff === 0) {
          statusClass = 'status-correct';
          rankText = `✓ #${index + 1}`;
        } else if (diff === 1) {
          statusClass = 'status-close';
          rankText = `~ #${index + 1} (True #${trueRank})`;
        } else {
          statusClass = 'status-wrong';
          rankText = `✗ #${index + 1} (True #${trueRank})`;
        }
        card.classList.add(statusClass);
      }

      card.innerHTML = `
        <div class="rank-slot-number">${index + 1}</div>
        <div class="rank-drag-handle" title="Drag to reorder">⋮⋮</div>
        <img class="rank-flag" src="${flagUrl}" alt="${countryName} Flag" loading="lazy">
        <span class="rank-name">${countryName}</span>
        <span class="rank-metrics-tag" style="display: ${this.isSubmitted ? 'inline-block' : 'none'};">${formattedVal}</span>
        ${!this.isSubmitted ? `
          <div class="rank-controls">
            <button class="btn-shift btn-shift-up" title="Move Up" ${index === 0 ? 'disabled' : ''}>▲</button>
            <button class="btn-shift btn-shift-down" title="Move Down" ${index === 9 ? 'disabled' : ''}>▼</button>
          </div>
        ` : ''}
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
      this.elements.resultTitle.textContent = '🌟 Master Geographer!';
      this.elements.resultSummary.textContent = 'Incredible spatial perception and global knowledge!';
    } else if (correctCount >= 5) {
      this.elements.resultTitle.textContent = '👍 Good Effort!';
      this.elements.resultSummary.textContent = 'You got more than half right. With a little more practice, you will master it!';
    } else {
      this.elements.resultTitle.textContent = '📚 Keep Exploring!';
      this.elements.resultSummary.textContent = 'Some countries are deceivingly big or dense. Review the actual values below!';
    }

    this.elements.resultsBreakdownList.innerHTML = breakdown.map(item => {
      const metricLabel = this.currentMetric === 'area'
        ? `${item.value.toLocaleString('en-US')} km²`
        : `${item.value.toLocaleString('en-US')} people`;

      return `
        <div class="breakdown-row ${item.isExact ? 'correct' : 'wrong'}">
          <span class="breakdown-rank">${item.isExact ? '✓' : '✗'} #${item.userRank}</span>
          <span class="breakdown-name">${item.country.flags?.png ? `<img src="${item.country.flags.png}" style="width:20px; vertical-align:middle; margin-right:6px; border-radius:2px;">` : ''} ${item.country.name.common}</span>
          <span class="breakdown-val">${metricLabel} (True #${item.trueRank})</span>
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

window.addEventListener('DOMContentLoaded', () => {
  window.geoRank = new GeoRankGame();
});
