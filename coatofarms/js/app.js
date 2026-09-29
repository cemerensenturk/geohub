/**
 * Coat of Arms - Imperial & State Heraldry Quiz
 * Open-ended text guess mode with smart autocomplete strictly from the 43 heraldic crests.
 */

const STORAGE_KEY = "geohub_coatofarms_stats_v1";

function normalizeText(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]/g, '');
}

function checkArmMatch(userInput, targetArm) {
  if (!userInput || !targetArm) return false;
  const cleanInput = normalizeText(userInput);
  const cleanTargetName = normalizeText(targetArm.name);
  const cleanTargetId = normalizeText(targetArm.id);

  if (cleanInput === cleanTargetName || cleanInput === cleanTargetId) return true;

  // Specific alias mappings
  const aliases = {
    'ussr': ['ussr', 'sovietunion', 'soviet', 'sscb'],
    'united_states': ['usa', 'us', 'unitedstates', 'unitedstatesofamerica', 'america'],
    'united_kingdom': ['uk', 'britain', 'greatbritain', 'unitedkingdom', 'england'],
    'german_empire': ['germanempire', 'kaiserreich', 'deutscheskaiserreich'],
    'kingdom_of_prussia': ['prussia', 'kingdomofprussia', 'preussen'],
    'yugoslavia': ['yugoslavia', 'sfryugoslavia', 'yugoslavya'],
    'byzantine_empire': ['byzantine', 'byzantineempire', 'byzantium', 'easternromanempire'],
    'holy_roman_empire': ['holyromanempire', 'hre', 'kutsalromagermen'],
    'polish_lithuanian_commonwealth': ['polishlithuaniancommonwealth', 'polandlithuania', 'commonwealth'],
    'empire_of_brazil': ['empireofbrazil', 'brazilianempire'],
    'kingdom_of_italy': ['kingdomofitaly', 'italykingdom'],
    'south_korea': ['southkorea', 'korea', 'republicofkorea'],
    'saudi_arabia': ['saudiarabia', 'saudi'],
    'austro_hungarian_empire': ['austrohungarianempire', 'austriahungary', 'austrohungary'],
    'russian_empire': ['russianempire', 'imperialrussia'],
    'ottoman_empire': ['ottomanempire', 'ottoman', 'osmanli']
  };

  const list = aliases[targetArm.id];
  if (list && list.includes(cleanInput)) return true;

  return false;
}

class CoatOfArmsGame {
  constructor() {
    this.arms = [];
    this.currentArm = null;
    this.isAnswered = false;
    this.clueRevealed = false;
    this.deck = [];

    // Session-specific tracking
    this.sessionTotal = 0;
    this.sessionIndex = 0;
    this.sessionCorrect = 0;
    this.sessionCurrentStreak = 0;
    this.sessionBestStreak = 0;

    // Autocomplete state
    this.dropdownMatches = [];
    this.selectedDropdownIdx = -1;

    this.stats = this.loadStats();

    this.init();
  }

  async init() {
    this.initElements();
    this.bindEvents();
    await this.loadData();
    this.updateStatsUI();
    this.startNewSession();
  }

  loadStats() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        return {
          played: Number(parsed.played) || 0,
          correct: Number(parsed.correct) || 0,
          streak: Number(parsed.streak) || 0,
          bestStreak: Number(parsed.bestStreak) || 0
        };
      }
    } catch (e) {
      console.warn("Coat of Arms stats load error:", e);
    }
    return { played: 0, correct: 0, streak: 0, bestStreak: 0 };
  }

  saveStats() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.stats));
    } catch (e) {
      console.warn("Coat of Arms stats save error:", e);
    }
  }

  initElements() {
    this.elements = {
      hudProgress: document.getElementById('hud-progress'),
      hudStreak: document.getElementById('hud-streak'),
      hudScore: document.getElementById('hud-score'),
      btnResetStats: document.getElementById('btn-reset-stats'),

      // Heraldry Stage
      badgeEra: document.getElementById('badge-era'),
      heraldryImg: document.getElementById('heraldry-img'),
      btnToggleClue: document.getElementById('btn-toggle-clue'),
      cluePreview: document.getElementById('clue-preview'),
      clueRevealBox: document.getElementById('clue-reveal-box'),

      // Input Controls
      searchInput: document.getElementById('arm-search-input'),
      autocompleteList: document.getElementById('arm-autocomplete-list'),
      btnSubmitGuess: document.getElementById('btn-submit-guess'),
      btnSkipArm: document.getElementById('btn-skip-arm'),
      feedbackBanner: document.getElementById('guess-feedback-banner'),
      btnNextArm: document.getElementById('btn-next-arm'),

      // Dossier
      resultDossier: document.getElementById('result-dossier'),
      dossierThumb: document.getElementById('dossier-thumb'),
      dossierName: document.getElementById('dossier-name'),
      dossierMeta: document.getElementById('dossier-meta'),
      dossierDesc: document.getElementById('dossier-desc'),

      // Victory Modal
      modalVictory: document.getElementById('modal-victory'),
      victoryScore: document.getElementById('victory-score'),
      victoryAccuracy: document.getElementById('victory-accuracy'),
      victoryStreak: document.getElementById('victory-streak'),
      btnPlayAgain: document.getElementById('btn-play-again')
    };
  }

  bindEvents() {
    // Reset stats
    this.elements.btnResetStats.addEventListener('click', () => {
      if (confirm("Are you sure you want to reset your Coat of Arms stats?")) {
        this.stats = { played: 0, correct: 0, streak: 0, bestStreak: 0 };
        this.saveStats();
        this.updateStatsUI();
      }
    });

    // Clue toggle
    this.elements.btnToggleClue.addEventListener('click', () => this.toggleClue());

    // Submit guess
    this.elements.btnSubmitGuess.addEventListener('click', () => {
      if (this.isAnswered) return;
      this.handleGuessSubmit();
    });

    // Skip
    this.elements.btnSkipArm.addEventListener('click', () => {
      if (this.isAnswered) return;
      this.handleSkip();
    });

    // Next round
    this.elements.btnNextArm.addEventListener('click', () => this.nextRound());

    // Play again
    if (this.elements.btnPlayAgain) {
      this.elements.btnPlayAgain.addEventListener('click', () => this.startNewSession());
    }

    // Search input typing & autocomplete
    this.elements.searchInput.addEventListener('input', () => this.handleSearchInput());

    // Keyboard navigation in search input
    this.elements.searchInput.addEventListener('keydown', (e) => {
      if (this.isAnswered) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.navigateDropdown(1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.navigateDropdown(-1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (this.selectedDropdownIdx >= 0 && this.dropdownMatches[this.selectedDropdownIdx]) {
          this.selectDropdownItem(this.dropdownMatches[this.selectedDropdownIdx]);
        } else {
          this.handleGuessSubmit();
        }
      } else if (e.key === 'Escape') {
        this.closeDropdown();
      }
    });

    // Global Enter key to advance round when answered
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && this.isAnswered) {
        if (this.elements.modalVictory && this.elements.modalVictory.style.display === 'flex') {
          this.startNewSession();
        } else {
          this.nextRound();
        }
      }
    });

    // Close autocomplete on click outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.input-autocomplete-box')) {
        this.closeDropdown();
      }
    });
  }

  async loadData() {
    // 1. Direct window dataset
    if (typeof window !== 'undefined' && window.COAT_OF_ARMS_DATA && Array.isArray(window.COAT_OF_ARMS_DATA)) {
      this.arms = window.COAT_OF_ARMS_DATA;
      return;
    }

    // 2. Fetch fallbacks
    const paths = [
      'data/arms.json',
      './data/arms.json',
      '/coatofarms/data/arms.json'
    ];

    for (const p of paths) {
      try {
        const res = await fetch(p);
        if (res.ok) {
          this.arms = await res.json();
          return;
        }
      } catch (e) {
        // try next
      }
    }

    console.error("All data loading attempts failed in Coat of Arms.");
  }

  updateStatsUI() {
    this.elements.hudStreak.textContent = `🔥 ${this.stats.streak}`;
    const pct = this.stats.played > 0 ? Math.round((this.stats.correct / this.stats.played) * 100) : 0;
    this.elements.hudScore.textContent = `${this.stats.correct} / ${this.stats.played} (${pct}%)`;
  }

  startNewSession() {
    if (!this.arms || this.arms.length === 0) return;
    this.deck = [...this.arms].sort(() => 0.5 - Math.random());
    this.sessionTotal = this.arms.length;
    this.sessionIndex = 0;
    this.sessionCorrect = 0;
    this.sessionCurrentStreak = 0;
    this.sessionBestStreak = 0;

    if (this.elements.modalVictory) {
      this.elements.modalVictory.style.display = 'none';
    }

    this.nextRound();
  }

  showVictoryModal() {
    const pct = this.sessionTotal > 0 ? Math.round((this.sessionCorrect / this.sessionTotal) * 100) : 0;
    if (this.elements.victoryScore) {
      this.elements.victoryScore.textContent = `${this.sessionCorrect} / ${this.sessionTotal}`;
    }
    if (this.elements.victoryAccuracy) {
      this.elements.victoryAccuracy.textContent = `${pct}%`;
    }
    if (this.elements.victoryStreak) {
      this.elements.victoryStreak.textContent = `🔥 ${this.sessionBestStreak}`;
    }
    if (this.elements.modalVictory) {
      this.elements.modalVictory.style.display = 'flex';
    }
  }

  nextRound() {
    if (!this.arms || this.arms.length === 0) return;

    // Check if session completed
    if (!this.deck || this.deck.length === 0) {
      this.showVictoryModal();
      return;
    }

    this.isAnswered = false;
    this.clueRevealed = false;
    this.closeDropdown();

    // Reset controls & feedback
    this.elements.searchInput.value = '';
    this.elements.searchInput.disabled = false;
    this.elements.searchInput.classList.remove('input-shake');
    this.elements.btnSubmitGuess.disabled = false;
    this.elements.btnSkipArm.disabled = false;
    this.elements.btnNextArm.style.display = 'none';
    this.elements.resultDossier.style.display = 'none';
    this.elements.clueRevealBox.style.display = 'none';
    this.elements.feedbackBanner.style.display = 'none';
    this.elements.cluePreview.textContent = 'Era & Region';

    // Pick next coat of arms from non-repeating session deck
    this.currentArm = this.deck.pop();
    this.sessionIndex++;

    if (this.elements.hudProgress) {
      this.elements.hudProgress.textContent = `${this.sessionIndex} / ${this.sessionTotal}`;
    }

    // Render Heraldic Image
    this.elements.heraldryImg.src = this.currentArm.image;
    this.elements.heraldryImg.alt = `Coat of Arms of ${this.currentArm.name}`;

    // Update Stage Badge
    if (this.currentArm.type === 'historical') {
      this.elements.badgeEra.textContent = '👑 Historical Empire / State';
    } else {
      this.elements.badgeEra.textContent = '🏛️ Sovereign Nation';
    }

    // Focus input for seamless keyboard typing
    setTimeout(() => {
      this.elements.searchInput.focus();
    }, 50);
  }

  handleSearchInput() {
    const query = this.elements.searchInput.value.trim();
    const cleanQuery = normalizeText(query);

    if (cleanQuery.length === 0) {
      this.closeDropdown();
      return;
    }

    // Search strictly within our 43 arms
    this.dropdownMatches = this.arms.filter(arm => {
      const nameNorm = normalizeText(arm.name);
      const idNorm = normalizeText(arm.id);
      return nameNorm.includes(cleanQuery) || idNorm.includes(cleanQuery);
    }).slice(0, 8); // Top 8 suggestions

    this.selectedDropdownIdx = -1;
    this.renderDropdown();
  }

  renderDropdown() {
    if (this.dropdownMatches.length === 0) {
      this.closeDropdown();
      return;
    }

    this.elements.autocompleteList.innerHTML = this.dropdownMatches.map((arm, idx) => {
      const isHist = arm.type === 'historical';
      const badgeText = isHist ? '👑 Historical' : '🏛️ Sovereign';
      const badgeClass = isHist ? 'badge-hist' : 'badge-mod';
      const isSelected = idx === this.selectedDropdownIdx ? 'selected' : '';

      return `
        <div class="arm-autocomplete-item ${isSelected}" data-idx="${idx}">
          <div class="arm-item-left">
            <img src="${arm.image}" class="arm-item-thumb" alt="${arm.name}">
            <span class="arm-item-name">${arm.name}</span>
          </div>
          <span class="arm-item-badge ${badgeClass}">${badgeText}</span>
        </div>
      `;
    }).join('');

    // Attach click handlers
    const items = this.elements.autocompleteList.querySelectorAll('.arm-autocomplete-item');
    items.forEach(item => {
      item.addEventListener('click', () => {
        const idx = parseInt(item.dataset.idx, 10);
        if (this.dropdownMatches[idx]) {
          this.selectDropdownItem(this.dropdownMatches[idx]);
        }
      });
    });

    this.elements.autocompleteList.classList.add('active');
  }

  navigateDropdown(direction) {
    if (!this.elements.autocompleteList.classList.contains('active') || this.dropdownMatches.length === 0) {
      return;
    }

    this.selectedDropdownIdx += direction;
    if (this.selectedDropdownIdx >= this.dropdownMatches.length) {
      this.selectedDropdownIdx = 0;
    } else if (this.selectedDropdownIdx < 0) {
      this.selectedDropdownIdx = this.dropdownMatches.length - 1;
    }

    this.renderDropdown();
  }

  selectDropdownItem(arm) {
    this.elements.searchInput.value = arm.name;
    this.closeDropdown();
    this.handleGuessSubmit();
  }

  closeDropdown() {
    this.elements.autocompleteList.innerHTML = '';
    this.elements.autocompleteList.classList.remove('active');
    this.dropdownMatches = [];
    this.selectedDropdownIdx = -1;
  }

  handleGuessSubmit() {
    const rawInput = this.elements.searchInput.value.trim();
    if (!rawInput) {
      this.elements.searchInput.focus();
      return;
    }

    this.closeDropdown();
    const isCorrect = checkArmMatch(rawInput, this.currentArm);
    this.finishRound(isCorrect, false);
  }

  handleSkip() {
    this.closeDropdown();
    this.finishRound(false, true);
  }

  finishRound(isCorrect, isSkipped) {
    this.isAnswered = true;

    // Disable input controls
    this.elements.searchInput.disabled = true;
    this.elements.btnSubmitGuess.disabled = true;
    this.elements.btnSkipArm.disabled = true;

    // Update stats
    if (isCorrect) {
      this.sessionCorrect += 1;
      this.sessionCurrentStreak += 1;
      if (this.sessionCurrentStreak > this.sessionBestStreak) {
        this.sessionBestStreak = this.sessionCurrentStreak;
      }
      this.stats.correct += 1;
      this.stats.streak += 1;
      if (this.stats.streak > this.stats.bestStreak) {
        this.stats.bestStreak = this.stats.streak;
      }
    } else {
      this.sessionCurrentStreak = 0;
      this.stats.streak = 0;
    }

    this.stats.played += 1;
    this.saveStats();
    this.updateStatsUI();

    // Feedback banner presentation
    if (isCorrect) {
      this.elements.feedbackBanner.className = 'guess-feedback-banner correct';
      this.elements.feedbackBanner.innerHTML = `🎉 <strong>Correct!</strong> It is the Coat of Arms of <strong>${this.currentArm.name}</strong>.`;
    } else if (isSkipped) {
      this.elements.feedbackBanner.className = 'guess-feedback-banner skipped';
      this.elements.feedbackBanner.innerHTML = `⏭️ <strong>Skipped.</strong> This was the Coat of Arms of <strong>${this.currentArm.name}</strong>.`;
    } else {
      this.elements.searchInput.classList.add('input-shake');
      this.elements.feedbackBanner.className = 'guess-feedback-banner wrong';
      this.elements.feedbackBanner.innerHTML = `❌ <strong>Incorrect!</strong> This was the Coat of Arms of <strong>${this.currentArm.name}</strong>.`;
    }
    this.elements.feedbackBanner.style.display = 'block';

    // Reveal Heraldic Dossier
    this.elements.dossierThumb.src = this.currentArm.image;
    this.elements.dossierName.textContent = this.currentArm.name;
    this.elements.dossierMeta.textContent = `${this.currentArm.period} • ${this.currentArm.region}`;
    this.elements.dossierDesc.textContent = this.currentArm.description;
    this.elements.resultDossier.style.display = 'block';

    // Show Next Button
    this.elements.btnNextArm.style.display = 'inline-flex';
    this.elements.btnNextArm.focus();
  }

  toggleClue() {
    if (!this.currentArm) return;
    this.clueRevealed = !this.clueRevealed;

    if (this.clueRevealed) {
      this.elements.clueRevealBox.innerHTML = `
        <strong>Era:</strong> ${this.currentArm.period} &nbsp;|&nbsp; 
        <strong>Region:</strong> ${this.currentArm.region}
      `;
      this.elements.clueRevealBox.style.display = 'block';
      this.elements.cluePreview.textContent = 'Hide';
    } else {
      this.elements.clueRevealBox.style.display = 'none';
      this.elements.cluePreview.textContent = 'Era & Region';
    }
  }
}

function startCoatOfArmsApp() {
  if (!window.coatOfArms) {
    try {
      window.coatOfArms = new CoatOfArmsGame();
    } catch (err) {
      console.error("Error starting Coat of Arms game:", err);
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startCoatOfArmsApp);
} else {
  startCoatOfArmsApp();
}
