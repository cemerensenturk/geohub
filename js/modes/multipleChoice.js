/**
 * SatelCity - 4 Seçenekli Mod (Multiple Choice)
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
   * Doğru şehre ek olarak mantıklı 3 çeldirici şık seçer.
   * Kural 1: Şıklar İSTİSNASIZ SADECE aynı zorluk seviyesinden seçilir!
   * Kural 2: Coğrafi karakter (kıyı ise kıyı, kara/dağ ise kara/dağ) önceliklendirilir.
   */
  generateOptions() {
    // 1. KATI KURAL: Sadece aynı zorluk seviyesindeki şehirler aday olabilir
    const tierPool = this.allCities.filter(c => 
      c.id !== this.currentCity.id && 
      c.difficulty === this.currentCity.difficulty
    );

    // 2. Coğrafi benzerlik (kıyı ise diğer kıyı şehirleri, kara ise diğer kara şehirleri)
    const sameGeo = tierPool.filter(c => c.geo && c.geo === this.currentCity.geo);

    // 3. Öncelik sırası:
    //    A) Aynı zorlukta ve aynı coğrafi tipte en az 3 şehir varsa onları kullan
    //    B) Yoksa aynı zorluk havuzundan tamamla
    let candidates = [];
    if (sameGeo.length >= 3) {
      candidates = sameGeo;
    } else {
      candidates = tierPool;
    }

    const shuffled = [...candidates].sort(() => 0.5 - Math.random());
    const selectedDistractors = shuffled.slice(0, 3);

    // 4 şıkkı karıştır
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

    // Event listener'lar
    const buttons = this.container.querySelectorAll('.mc-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.isAnswered) return;
        const selectedId = btn.getAttribute('data-city-id');
        this.handleSelection(selectedId, buttons);
      });
    });

    // Klavye kısayolları (1-4 veya A-D)
    if (this.keyHandler) {
      window.removeEventListener('keydown', this.keyHandler);
    }

    this.keyHandler = (e) => {
      if (this.isAnswered) return;
      // Eğer input odaklıysa işlem yapma
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
