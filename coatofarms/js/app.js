/**
 * Coat of Arms - Imperial & State Heraldry Quiz
 * Identifies historic empires and modern sovereign nations from heraldic crests.
 */

const STORAGE_KEY = "geohub_coatofarms_stats_v1";

class CoatOfArmsGame {
  constructor() {
    this.arms = [];
    this.currentArm = null;
    this.options = [];
    this.isAnswered = false;
    this.clueRevealed = false;
    this.deck = [];

    // Session-specific tracking
    this.sessionTotal = 0;
    this.sessionIndex = 0;
    this.sessionCorrect = 0;
    this.sessionCurrentStreak = 0;
    this.sessionBestStreak = 0;

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

      // Controls
      optionsGrid: document.getElementById('options-grid'),
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
    this.elements.btnResetStats.addEventListener('click', () => {
      if (confirm("Are you sure you want to reset your Coat of Arms stats?")) {
        this.stats = { played: 0, correct: 0, streak: 0, bestStreak: 0 };
        this.saveStats();
        this.updateStatsUI();
      }
    });

    this.elements.btnToggleClue.addEventListener('click', () => this.toggleClue());
    this.elements.btnNextArm.addEventListener('click', () => this.nextRound());
    if (this.elements.btnPlayAgain) {
      this.elements.btnPlayAgain.addEventListener('click', () => this.startNewSession());
    }

    // Keyboard navigation (1-4, A-D, Enter)
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const key = e.key.toLowerCase();
      if (!this.isAnswered) {
        const keyMap = { '1': 0, 'a': 0, '2': 1, 'b': 1, '3': 2, 'c': 2, '4': 3, 'd': 3 };
        if (keyMap[key] !== undefined) {
          const btn = this.elements.optionsGrid.children[keyMap[key]];
          if (btn) btn.click();
        }
      } else {
        if (key === 'enter') {
          if (this.elements.modalVictory && this.elements.modalVictory.style.display === 'flex') {
            this.startNewSession();
          } else {
            this.nextRound();
          }
        }
      }
    });
  }

  async loadData() {
    // 1. Direct window dataset (instant, 100% offline & file:// compatible)
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
    if (!this.arms || this.arms.length === 0) {
      this.elements.optionsGrid.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: #f87171;">
          <p style="margin-bottom: 1rem; font-weight: 700;">Could not load Coat of Arms dataset.</p>
          <button class="btn-next-action" style="display:inline-flex;" onclick="window.location.reload()">Reload Game</button>
        </div>
      `;
      return;
    }

    // Check if session completed
    if (!this.deck || this.deck.length === 0) {
      this.showVictoryModal();
      return;
    }

    this.isAnswered = false;
    this.clueRevealed = false;
    this.elements.btnNextArm.style.display = 'none';
    this.elements.resultDossier.style.display = 'none';
    this.elements.clueRevealBox.style.display = 'none';
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

    // Generate Smart Distractors (Strictly same type: historical with historical, modern with modern)
    this.generateOptions();
    this.renderOptions();
  }

  generateOptions() {
    const sameType = this.arms.filter(a => 
      a.id !== this.currentArm.id && 
      a.type === this.currentArm.type
    );

    let candidatePool = sameType.length >= 3 
      ? sameType 
      : this.arms.filter(a => a.id !== this.currentArm.id);

    const shuffled = [...candidatePool].sort(() => 0.5 - Math.random());
    const distractors = shuffled.slice(0, 3);

    this.options = [this.currentArm, ...distractors].sort(() => 0.5 - Math.random());
  }

  renderOptions() {
    this.elements.optionsGrid.innerHTML = '';

    const letters = ['A', 'B', 'C', 'D'];
    this.options.forEach((opt, idx) => {
      const btn = document.createElement('button');
      btn.className = 'opt-btn';
      btn.innerHTML = `
        <span class="opt-letter">${letters[idx]}</span>
        <span class="opt-name">${opt.name}</span>
      `;

      btn.addEventListener('click', () => {
        if (this.isAnswered) return;
        this.handleAnswer(opt.id, btn);
      });

      this.elements.optionsGrid.appendChild(btn);
    });
  }

  handleAnswer(chosenId, chosenBtn) {
    this.isAnswered = true;
    const isCorrect = chosenId === this.currentArm.id;

    // Update session stats
    if (isCorrect) {
      this.sessionCorrect += 1;
      this.sessionCurrentStreak += 1;
      if (this.sessionCurrentStreak > this.sessionBestStreak) {
        this.sessionBestStreak = this.sessionCurrentStreak;
      }
    } else {
      this.sessionCurrentStreak = 0;
    }

    // Update overall stats
    this.stats.played += 1;
    if (isCorrect) {
      this.stats.correct += 1;
      this.stats.streak += 1;
      if (this.stats.streak > this.stats.bestStreak) {
        this.stats.bestStreak = this.stats.streak;
      }
    } else {
      this.stats.streak = 0;
    }
    this.saveStats();
    this.updateStatsUI();

    // Option Button Highlights
    const buttons = this.elements.optionsGrid.querySelectorAll('.opt-btn');
    buttons.forEach((btn, idx) => {
      btn.disabled = true;
      const optId = this.options[idx].id;
      if (optId === this.currentArm.id) {
        btn.classList.add('correct');
      } else if (btn === chosenBtn && !isCorrect) {
        btn.classList.add('wrong');
      }
    });

    // Reveal Heraldic Dossier
    this.elements.dossierThumb.src = this.currentArm.image;
    this.elements.dossierName.textContent = this.currentArm.name;
    this.elements.dossierMeta.textContent = `${this.currentArm.period} • ${this.currentArm.region}`;
    this.elements.dossierDesc.textContent = this.currentArm.description;
    this.elements.resultDossier.style.display = 'block';

    // Show Next Button
    this.elements.btnNextArm.style.display = 'inline-flex';
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
