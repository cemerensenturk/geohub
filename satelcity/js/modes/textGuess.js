/**
 * SatelCity - Text Guess Mode
 * Search, autocomplete, Haversine distance and compass bearing calculation
 */

import i18n from '../i18n.js';

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
    .replace(/ç/g, 'c');
}

export class TextGuessMode {
  constructor(allCities, onAnswered) {
    this.allCities = allCities;
    this.onAnswered = onAnswered;
    this.currentCity = null;
    this.container = null;
    this.maxAttempts = 5;
    this.guesses = [];
    this.isFinished = false;
  }

  mount(container) {
    this.container = container;
  }

  startRound(targetCity) {
    this.currentCity = targetCity;
    this.guesses = [];
    this.isFinished = false;
    this.render();
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's mean radius in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  }

  deg2rad(deg) {
    return deg * (Math.PI / 180);
  }

  calculateBearing(lat1, lon1, lat2, lon2) {
    const y = Math.sin(this.deg2rad(lon2 - lon1)) * Math.cos(this.deg2rad(lat2));
    const x =
      Math.cos(this.deg2rad(lat1)) * Math.sin(this.deg2rad(lat2)) -
      Math.sin(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * Math.cos(this.deg2rad(lon2 - lon1));
    let brng = (Math.atan2(y, x) * 180) / Math.PI;
    brng = (brng + 360) % 360;

    const directions = [
      { key: "dirNorth", deg: 0, min: 337.5, max: 360 },
      { key: "dirNorth", deg: 0, min: 0, max: 22.5 },
      { key: "dirNortheast", deg: 45, min: 22.5, max: 67.5 },
      { key: "dirEast", deg: 90, min: 67.5, max: 112.5 },
      { key: "dirSoutheast", deg: 135, min: 112.5, max: 157.5 },
      { key: "dirSouth", deg: 180, min: 157.5, max: 202.5 },
      { key: "dirSouthwest", deg: 225, min: 202.5, max: 247.5 },
      { key: "dirWest", deg: 270, min: 247.5, max: 292.5 },
      { key: "dirNorthwest", deg: 315, min: 292.5, max: 337.5 }
    ];

    const match = directions.find(d => brng >= d.min && brng < d.max) || { key: "dirNorth", deg: 0 };
    // Arrow icon rotated to the 8-point compass direction (0deg = north/up)
    const arrow = `<svg class="icon tg-bearing-arrow" viewBox="0 0 24 24" aria-hidden="true" style="transform: rotate(${match.deg}deg)"><path d="M12 19V5M5 12l7-7 7 7"/></svg>`;
    return {
      arrow,
      label: i18n.t(match.key)
    };
  }

  getProximityClass(distance) {
    if (distance === 0) return "prox-exact";
    if (distance < 600) return "prox-very-close";
    if (distance < 1800) return "prox-close";
    if (distance < 4000) return "prox-medium";
    return "prox-far";
  }

  render() {
    if (!this.container) return;

    const remaining = this.maxAttempts - this.guesses.length;

    this.container.innerHTML = `
      <div class="tg-container">
        <div class="tg-header">
          <span class="tg-prompt">${i18n.t('tgPrompt')}</span>
          <span class="tg-remaining">${i18n.t('tgRemaining')} <strong>${remaining}/${this.maxAttempts}</strong></span>
        </div>

        <div class="tg-search-wrapper">
          <div class="tg-input-group">
            <input 
              type="text" 
              id="tg-search-input" 
              class="atlas-input tg-input" 
              placeholder="${i18n.t('tgInputPlaceholder')}" 
              autocomplete="off"
              ${this.isFinished ? "disabled" : ""}
            />
            <button type="button" id="tg-submit-btn" class="atlas-btn atlas-btn--primary tg-btn-submit" ${this.isFinished ? "disabled" : ""}>
              ${i18n.t('tgSubmit')}
            </button>
          </div>
          <div id="tg-autocomplete-list" class="tg-autocomplete-dropdown"></div>
        </div>

        <div class="tg-guesses-list" id="tg-guesses-list">
          ${this.renderGuessesList()}
        </div>

        ${!this.isFinished ? `
          <div class="tg-actions">
            <button type="button" id="tg-surrender-btn" class="atlas-btn atlas-btn--ghost tg-btn-surrender">${i18n.t('tgSurrender')}</button>
          </div>
        ` : ''}
      </div>
    `;

    this.bindEvents();
  }

  renderGuessesList() {
    if (this.guesses.length === 0) {
      return `<div class="tg-empty-hint">${i18n.t('tgEmptyHint')}</div>`;
    }

    return this.guesses.map((g, idx) => `
      <div class="tg-guess-row ${g.proxClass} animate-fade-in">
        <span class="tg-row-num">${idx + 1}.</span>
        <span class="tg-row-name">${i18n.getCityName(g.city)} <small class="tg-row-country">${i18n.getCountryName(g.city)}</small></span>
        <span class="tg-row-metric">
          ${g.distance === 0 ? `
            <strong class="tg-exact-badge"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg> ${i18n.t('tgExact')}</strong>
          ` : `
            <span class="tg-distance mono">${g.distance.toLocaleString('en-US')} km</span>
            <span class="tg-direction">${g.bearing.arrow} ${g.bearing.label}</span>
          `}
        </span>
      </div>
    `).join('');
  }

  bindEvents() {
    const input = this.container.querySelector('#tg-search-input');
    const submitBtn = this.container.querySelector('#tg-submit-btn');
    const dropdown = this.container.querySelector('#tg-autocomplete-list');
    const surrenderBtn = this.container.querySelector('#tg-surrender-btn');

    if (!input || this.isFinished) return;

    // Search input
    input.addEventListener('input', () => {
      const val = normalizeText(input.value.trim());
      if (val.length < 1) {
        dropdown.innerHTML = '';
        dropdown.classList.remove('active');
        return;
      }

      const matches = this.allCities.filter(c => 
        normalizeText(c.name).includes(val) || 
        normalizeText(c.nameEn).includes(val) ||
        normalizeText(c.country).includes(val) ||
        normalizeText(c.countryEn).includes(val)
      ).slice(0, 7);

      if (matches.length > 0) {
        dropdown.innerHTML = matches.map(m => `
          <div class="tg-dropdown-item" data-id="${m.id}">
            <span class="tg-item-name">${i18n.getCityName(m)}</span>
            <span class="tg-item-country">${i18n.getCountryName(m)}</span>
          </div>
        `).join('');
        dropdown.classList.add('active');

        dropdown.querySelectorAll('.tg-dropdown-item').forEach(item => {
          item.addEventListener('click', () => {
            const cityId = item.getAttribute('data-id');
            const selected = this.allCities.find(c => c.id === cityId);
            if (selected) {
              input.value = i18n.getCityName(selected);
              dropdown.innerHTML = '';
              dropdown.classList.remove('active');
              this.submitGuess(selected);
            }
          });
        });
      } else {
        dropdown.innerHTML = `<div class="tg-dropdown-empty">${i18n.t('tgNotFound')}</div>`;
        dropdown.classList.add('active');
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.handleManualSubmit(input.value.trim());
      }
    });

    if (submitBtn) {
      submitBtn.addEventListener('click', () => {
        this.handleManualSubmit(input.value.trim());
      });
    }

    if (surrenderBtn) {
      surrenderBtn.addEventListener('click', () => {
        this.surrender();
      });
    }

    if (this.outsideClickHandler) {
      document.removeEventListener('click', this.outsideClickHandler);
    }
    this.outsideClickHandler = (e) => {
      if (!this.container.contains(e.target)) {
        dropdown.classList.remove('active');
      }
    };
    document.addEventListener('click', this.outsideClickHandler);
  }

  showWarning(msg) {
    if (!this.container) return;
    let warnEl = this.container.querySelector('.tg-warning-msg');
    if (!warnEl) {
      warnEl = document.createElement('div');
      warnEl.className = 'tg-warning-msg animate-fade-in';
      const searchWrap = this.container.querySelector('.tg-search-wrapper');
      if (searchWrap && searchWrap.parentNode) {
        searchWrap.parentNode.insertBefore(warnEl, searchWrap);
      }
    }
    warnEl.textContent = msg;
    warnEl.style.display = 'block';
    clearTimeout(this.warnTimer);
    this.warnTimer = setTimeout(() => {
      if (warnEl) warnEl.style.display = 'none';
    }, 2800);
  }

  handleManualSubmit(text) {
    if (!text || this.isFinished) return;
    const cleanText = normalizeText(text);

    const matched = this.allCities.find(c => 
      normalizeText(c.name) === cleanText || 
      normalizeText(c.nameEn) === cleanText
    );

    if (matched) {
      this.submitGuess(matched);
    } else {
      const partial = this.allCities.find(c => 
        normalizeText(c.name).includes(cleanText) || 
        normalizeText(c.nameEn).includes(cleanText)
      );
      if (partial) {
        this.submitGuess(partial);
      } else {
        this.showWarning(i18n.t('tgNotFound'));
      }
    }
  }

  submitGuess(guessCity) {
    if (this.isFinished) return;

    if (this.guesses.some(g => g.city.id === guessCity.id)) {
      this.showWarning(i18n.t('tgAlreadyGuessed'));
      return;
    }

    const distance = this.calculateDistance(
      guessCity.lat, guessCity.lng,
      this.currentCity.lat, this.currentCity.lng
    );

    const bearing = this.calculateBearing(
      guessCity.lat, guessCity.lng,
      this.currentCity.lat, this.currentCity.lng
    );

    const isCorrect = distance === 0 || guessCity.id === this.currentCity.id;
    const proxClass = this.getProximityClass(distance);

    this.guesses.unshift({
      city: guessCity,
      distance: isCorrect ? 0 : distance,
      bearing,
      proxClass
    });

    if (isCorrect) {
      this.isFinished = true;
      this.render();
      if (this.onAnswered) {
        this.onAnswered({
          isCorrect: true,
          targetCity: this.currentCity,
          attempts: this.guesses.length
        });
      }
    } else if (this.guesses.length >= this.maxAttempts) {
      this.isFinished = true;
      this.render();
      if (this.onAnswered) {
        this.onAnswered({
          isCorrect: false,
          targetCity: this.currentCity,
          attempts: this.guesses.length
        });
      }
    } else {
      this.render();
      setTimeout(() => {
        const input = this.container.querySelector('#tg-search-input');
        if (input) input.focus();
      }, 50);
    }
  }

  surrender() {
    if (this.isFinished) return;
    this.isFinished = true;
    this.render();
    if (this.onAnswered) {
      this.onAnswered({
        isCorrect: false,
        targetCity: this.currentCity,
        surrendered: true,
        attempts: this.guesses.length
      });
    }
  }
}

export default TextGuessMode;
