/**
 * BorderLine - Country Outline Silhouette Guesser
 * Identifies sovereign nations strictly from their vector boundary silhouette.
 */

const STORAGE_KEY = "geohub_borderline_stats_v1";

class BorderLineGame {
  constructor() {
    this.countries = [];
    this.currentCountry = null;
    this.options = [];
    this.isAnswered = false;
    this.clueRevealed = false;

    this.stats = this.loadStats();

    this.init();
  }

  async init() {
    this.initElements();
    this.bindEvents();
    await this.loadData();
    this.updateStatsUI();
    this.nextRound();
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
      console.warn("Stats load error:", e);
    }
    return { played: 0, correct: 0, streak: 0, bestStreak: 0 };
  }

  saveStats() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.stats));
    } catch (e) {
      console.warn("Stats save error:", e);
    }
  }

  initElements() {
    this.elements = {
      hudStreak: document.getElementById('hud-streak'),
      hudScore: document.getElementById('hud-score'),
      btnResetStats: document.getElementById('btn-reset-stats'),

      // Silhouette Stage
      silhouettePath: document.getElementById('silhouette-path'),
      btnToggleClue: document.getElementById('btn-toggle-clue'),
      cluePreview: document.getElementById('clue-preview'),
      clueRevealBox: document.getElementById('clue-reveal-box'),

      // Controls
      optionsGrid: document.getElementById('options-grid'),
      btnNextCountry: document.getElementById('btn-next-country'),

      // Dossier
      resultDossier: document.getElementById('result-dossier'),
      dossierFlag: document.getElementById('dossier-flag'),
      dossierName: document.getElementById('dossier-name'),
      dossierMeta: document.getElementById('dossier-meta')
    };
  }

  bindEvents() {
    this.elements.btnResetStats.addEventListener('click', () => {
      if (confirm("Are you sure you want to reset your BorderLine stats?")) {
        this.stats = { played: 0, correct: 0, streak: 0, bestStreak: 0 };
        this.saveStats();
        this.updateStatsUI();
      }
    });

    this.elements.btnToggleClue.addEventListener('click', () => this.toggleClue());
    this.elements.btnNextCountry.addEventListener('click', () => this.nextRound());

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
          this.nextRound();
        }
      }
    });
  }

  async loadData() {
    // 1. Direct window dataset (instant, 100% offline & file:// protocol compatible)
    if (typeof window !== 'undefined' && window.BORDERLINE_DATA && Array.isArray(window.BORDERLINE_DATA) && window.BORDERLINE_DATA.length > 0) {
      this.countries = window.BORDERLINE_DATA;
      return;
    }

    // 2. Relative fetch
    try {
      const res = await fetch('data/countries_silhouette.json');
      if (res.ok) {
        this.countries = await res.json();
        return;
      }
    } catch (e) {
      console.warn("Relative fetch failed, trying fallback:", e);
    }

    // 3. Fallback path
    try {
      const res = await fetch('./data/countries_silhouette.json');
      if (res.ok) {
        this.countries = await res.json();
        return;
      }
    } catch (e) {
      console.error("All dataset loading attempts failed:", e);
    }
  }

  updateStatsUI() {
    this.elements.hudStreak.textContent = `🔥 ${this.stats.streak}`;
    const pct = this.stats.played > 0 ? Math.round((this.stats.correct / this.stats.played) * 100) : 0;
    this.elements.hudScore.textContent = `${this.stats.correct} / ${this.stats.played} (${pct}%)`;
  }

  nextRound() {
    if (!this.countries || this.countries.length === 0) {
      this.elements.optionsGrid.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: #f87171;">
          <p style="margin-bottom: 1rem; font-weight: 700;">Could not load country silhouettes dataset.</p>
          <button class="btn-next-action" style="display:inline-flex;" onclick="window.location.reload()">Reload Game</button>
        </div>
      `;
      return;
    }

    this.isAnswered = false;
    this.clueRevealed = false;
    this.elements.btnNextCountry.style.display = 'none';
    this.elements.resultDossier.style.display = 'none';
    this.elements.clueRevealBox.style.display = 'none';
    this.elements.cluePreview.textContent = 'Continent';

    // Deck management to avoid repeating countries in the same session
    if (!this.deck || this.deck.length === 0) {
      this.deck = [...this.countries].sort(() => 0.5 - Math.random());
    }

    // Pick next country from shuffled deck
    this.currentCountry = this.deck.pop();

    // Render Silhouette
    this.elements.silhouettePath.className = 'silhouette-path';
    this.elements.silhouettePath.setAttribute('d', this.currentCountry.svgPath || '');

    // Generate Smart Distractors (Strictly Same Continent)
    this.generateOptions();
    this.renderOptions();
  }

  generateOptions() {
    const sameContinent = this.countries.filter(c => 
      c.id !== this.currentCountry.id && 
      c.continent === this.currentCountry.continent
    );

    let candidatePool = sameContinent.length >= 3 
      ? sameContinent 
      : this.countries.filter(c => c.id !== this.currentCountry.id);

    const shuffled = [...candidatePool].sort(() => 0.5 - Math.random());
    const distractors = shuffled.slice(0, 3);

    this.options = [this.currentCountry, ...distractors].sort(() => 0.5 - Math.random());
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
    const isCorrect = chosenId === this.currentCountry.id;

    // Update stats
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

    // Visual feedback
    this.elements.silhouettePath.classList.add(isCorrect ? 'answered-correct' : 'answered-wrong');

    const buttons = this.elements.optionsGrid.querySelectorAll('.opt-btn');
    buttons.forEach((btn, idx) => {
      btn.disabled = true;
      const optId = this.options[idx].id;
      if (optId === this.currentCountry.id) {
        btn.classList.add('correct');
      } else if (btn === chosenBtn && !isCorrect) {
        btn.classList.add('wrong');
      }
    });

    // Reveal Dossier
    this.elements.dossierFlag.src = this.currentCountry.flag || '';
    this.elements.dossierName.textContent = this.currentCountry.name;
    this.elements.dossierMeta.textContent = `${this.currentCountry.continent} • Capital: ${this.currentCountry.capital}`;
    this.elements.resultDossier.style.display = 'block';

    // Show Next Button
    this.elements.btnNextCountry.style.display = 'inline-flex';
  }

  toggleClue() {
    if (!this.currentCountry) return;
    this.clueRevealed = !this.clueRevealed;

    if (this.clueRevealed) {
      this.elements.clueRevealBox.innerHTML = `
        <strong>Region:</strong> ${this.currentCountry.continent} &nbsp;|&nbsp; 
        <strong>Capital:</strong> ${this.currentCountry.capital}
      `;
      this.elements.clueRevealBox.style.display = 'block';
      this.elements.cluePreview.textContent = 'Hide';
    } else {
      this.elements.clueRevealBox.style.display = 'none';
      this.elements.cluePreview.textContent = 'Continent';
    }
  }
}

function startBorderLineApp() {
  if (!window.borderLine) {
    try {
      window.borderLine = new BorderLineGame();
    } catch (err) {
      console.error("Error starting BorderLine game:", err);
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startBorderLineApp);
} else {
  startBorderLineApp();
}

