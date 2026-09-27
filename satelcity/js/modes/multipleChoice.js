/**
 * SatelCity - Multiple Choice Mode (4 Options)
 */

import i18n from '../i18n.js';

export class MultipleChoiceMode {
  constructor(allCities, onAnswered) {
    this.allCities = allCities;
    this.onAnswered = onAnswered;
    this.currentCity = null;
    this.container = null;
    this.isAnswered = false;
  }

  mount(container) {
    this.container = container;
  }

  startRound(targetCity) {
    this.currentCity = targetCity;
    this.isAnswered = false;
    this.render();
  }

  /**
   * Selects 3 intelligent distractors alongside the correct city.
   * Rule 1: Distractors must strictly come from the same difficulty tier.
   * Rule 2: Geographic character (coastal vs inland) is prioritized for believable options.
   */
  generateOptions() {
    // 1. STRICT RULE: Only cities from the exact same difficulty tier are eligible
    const tierPool = this.allCities.filter(c => 
      c.id !== this.currentCity.id && 
      c.difficulty === this.currentCity.difficulty
    );

    // 2. Geographic similarity (coastal with coastal, inland with inland)
    const sameGeo = tierPool.filter(c => c.geo && c.geo === this.currentCity.geo);

    // 3. Priority order:
    //    A) If at least 3 same-tier cities share the geographic type, use them
    //    B) Otherwise fall back to the general same-tier pool
    let candidates = [];
    if (sameGeo.length >= 3) {
      candidates = sameGeo;
    } else {
      candidates = tierPool;
    }

    const shuffled = [...candidates].sort(() => 0.5 - Math.random());
    const selectedDistractors = shuffled.slice(0, 3);

    // Shuffle the 4 final options
    const options = [this.currentCity, ...selectedDistractors].sort(() => 0.5 - Math.random());
    return options;
  }

  render() {
    if (!this.container) return;

    const options = this.generateOptions();

    this.container.innerHTML = `
      <div class="mc-container">
        <div class="mc-prompt">${i18n.t('mcPrompt')}</div>
        <div class="mc-options-grid">
          ${options.map((opt, idx) => `
            <button class="mc-btn" data-city-id="${opt.id}" data-index="${idx}">
              <span class="mc-letter">${['A', 'B', 'C', 'D'][idx]}</span>
              <span class="mc-name">${i18n.getCityName(opt)}</span>
            </button>
          `).join('')}
        </div>
      </div>
    `;

    // Event listeners
    const buttons = this.container.querySelectorAll('.mc-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.isAnswered) return;
        const selectedId = btn.getAttribute('data-city-id');
        this.handleSelection(selectedId, buttons);
      });
    });

    // Keyboard shortcuts (1-4 or A-D)
    if (this.keyHandler) {
      window.removeEventListener('keydown', this.keyHandler);
    }

    this.keyHandler = (e) => {
      if (this.isAnswered) return;
      // Do nothing if an input/textarea has focus
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      const key = e.key.toLowerCase();
      const map = { '1': 0, 'a': 0, '2': 1, 'b': 1, '3': 2, 'c': 2, '4': 3, 'd': 3 };
      if (map[key] !== undefined && buttons[map[key]]) {
        buttons[map[key]].click();
      }
    };
    window.addEventListener('keydown', this.keyHandler);
  }

  handleSelection(selectedId, buttons) {
    if (this.keyHandler) {
      window.removeEventListener('keydown', this.keyHandler);
    }
    this.isAnswered = true;
    const isCorrect = selectedId === this.currentCity.id;

    buttons.forEach(btn => {
      btn.disabled = true;
      const btnCityId = btn.getAttribute('data-city-id');
      
      if (btnCityId === this.currentCity.id) {
        btn.classList.add('correct');
      } else if (btnCityId === selectedId && !isCorrect) {
        btn.classList.add('wrong');
      }
    });

    if (this.onAnswered) {
      this.onAnswered({
        isCorrect,
        targetCity: this.currentCity
      });
    }
  }
}

export default MultipleChoiceMode;
