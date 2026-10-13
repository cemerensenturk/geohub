/**
 * Mercator's Lie
 * Two countries drawn at one common Mercator scale: which is really larger?
 *
 * Outline data (data/countries.js): svgPath is drawn in a 400x400 box,
 * svgScale = path units per Mercator degree for that outline, svgLat = its middle latitude.
 * Mercator stretches lengths by sec(lat), so true linear size = Mercator size x cos(lat).
 */

const STORAGE_KEY = 'geohub_mercator_stats_v1';
const ROUNDS = 10;
const MIN_AREA = 30000;
const TRICKY_SHARE = 0.7;
const BOX = 400;
const FIT = 330; // the larger shape spans this many units of the 400 box

const CHECK_ICON = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const X_ICON = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';

const numberFmt = new Intl.NumberFormat('en-US');

function cosLat(c) {
  return Math.cos(c.svgLat * Math.PI / 180);
}

// How many times bigger the country looks on a Mercator map than it really is
function inflation(c) {
  return 1 / (cosLat(c) ** 2);
}

function apparentArea(c) {
  return c.area * inflation(c);
}

function pathBBox(d) {
  const nums = d.match(/-?\d+(?:\.\d+)?/g).map(Number);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i + 1 < nums.length; i += 2) {
    x0 = Math.min(x0, nums[i]); x1 = Math.max(x1, nums[i]);
    y0 = Math.min(y0, nums[i + 1]); y1 = Math.max(y1, nums[i + 1]);
  }
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}

function shuffle(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function formatFactor(f) {
  return f >= 10 ? f.toFixed(0) : f.toFixed(1);
}

class MercatorGame {
  constructor() {
    this.pool = [];
    this.stats = this.loadStats();
    this.el = {
      round: document.getElementById('stat-round'),
      score: document.getElementById('stat-score'),
      streak: document.getElementById('stat-streak'),
      best: document.getElementById('stat-best'),
      question: document.getElementById('question'),
      caption: document.getElementById('view-caption'),
      toggle: document.getElementById('view-toggle'),
      countries: [0, 1].map(i => document.getElementById(`country-${i}`)),
      answers: Array.from(document.querySelectorAll('#answers .atlas-option')),
      shapeBtns: Array.from(document.querySelectorAll('.mc-shape-btn')),
      reveal: document.getElementById('reveal'),
      feedback: document.getElementById('feedback'),
      explain: document.getElementById('explain'),
      next: document.getElementById('btn-next'),
      nextLabel: document.getElementById('btn-next-label'),
      summary: document.getElementById('summary'),
      summaryScore: document.getElementById('summary-score'),
      summaryBest: document.getElementById('summary-best'),
      summaryList: document.getElementById('summary-list'),
      again: document.getElementById('btn-again')
    };
    this.bindEvents();
  }

  // ---------- Persistence ----------

  loadStats() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        return { best: Number(s.best) || 0, sessions: Number(s.sessions) || 0 };
      }
    } catch (e) {
      // storage unavailable: play without saving
    }
    return { best: 0, sessions: 0 };
  }

  saveStats() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.stats));
    } catch (e) {
      // ignore
    }
  }

  // ---------- Data ----------

  async loadData() {
    let data = null;
    if (Array.isArray(window.GEO_COUNTRIES)) {
      data = window.GEO_COUNTRIES;
    } else {
      for (const p of ['../data/countries.json', '/data/countries.json']) {
        try {
          const res = await fetch(p);
          if (res.ok) { data = await res.json(); break; }
        } catch (e) {
          // try the next path
        }
      }
    }
    if (!Array.isArray(data)) {
      this.el.question.textContent = 'Could not load the country data.';
      return false;
    }
    this.pool = data.filter(c =>
      c.svgPath && c.svgScale && typeof c.svgLat === 'number' && c.area >= MIN_AREA
    );
    return this.pool.length >= 2;
  }

  // ---------- Session ----------

  startSession() {
    this.round = 0;
    this.score = 0;
    this.streak = 0;
    this.used = new Set();
    this.history = [];
    this.el.summary.hidden = true;
    this.nextRound();
  }

  pickPair() {
    const fresh = shuffle(this.pool.filter(c => !this.used.has(c.name.common)));
    const wantTricky = Math.random() < TRICKY_SHARE;
    let fallback = null;
    for (const a of fresh) {
      const partners = shuffle(fresh.filter(b => {
        if (b === a) return false;
        const ratio = Math.max(a.area, b.area) / Math.min(a.area, b.area);
        return ratio >= 1.1 && ratio <= 3;
      }));
      for (const b of partners) {
        const tricky = (apparentArea(a) > apparentArea(b)) !== (a.area > b.area);
        if (tricky === wantTricky) return [a, b];
        if (!fallback) fallback = [a, b];
      }
    }
    return fallback;
  }

  nextRound() {
    if (this.round >= ROUNDS) {
      this.finishSession();
      return;
    }
    const pair = this.pickPair();
    if (!pair) {
      this.used.clear();
      return this.nextRound();
    }
    this.round += 1;
    this.pair = Math.random() < 0.5 ? pair : [pair[1], pair[0]];
    this.pair.forEach(c => this.used.add(c.name.common));
    this.answered = false;
    this.renderPair();
    this.updateStats();
  }

  renderPair() {
    this.boxes = this.pair.map(c => pathBBox(c.svgPath));

    this.pair.forEach((c, i) => {
      const fig = this.el.countries[i];
      fig.classList.remove('is-correct', 'is-wrong');
      fig.querySelector('.mc-path').setAttribute('d', c.svgPath);
      const flag = fig.querySelector('.mc-flag');
      flag.src = c.flags && c.flags.png ? c.flags.png : '';
      flag.hidden = !flag.src;
      fig.querySelector('.mc-name').textContent = c.name.common;
      const area = fig.querySelector('.mc-area');
      area.hidden = true;
      area.innerHTML = '';
      this.el.shapeBtns[i].disabled = false;
      this.el.shapeBtns[i].setAttribute('aria-label', `${c.name.common} is larger`);
    });

    this.el.answers.forEach((btn, i) => {
      btn.disabled = false;
      btn.classList.remove('is-correct', 'is-wrong', 'is-dimmed');
      btn.querySelector('.mc-answer-label').textContent = `${this.pair[i].name.common} is larger`;
      const icon = btn.querySelector('.mc-answer-icon');
      if (icon) icon.remove();
    });

    this.el.question.textContent = 'Which country is really larger?';
    this.el.caption.textContent = 'Both shapes are drawn at the same scale, as they appear on a Mercator map.';
    this.el.toggle.hidden = true;
    this.el.reveal.hidden = true;
    this.setView('mercator', false);
  }

  // Scale each outline to one common map scale and centre it in its box
  setView(view, animate = true) {
    const factors = this.pair.map(c => (view === 'true' ? cosLat(c) : 1) / c.svgScale);
    const extent = Math.max(...this.pair.map((c, i) => Math.max(this.boxes[i].w, this.boxes[i].h) * factors[i]));
    const k = FIT / extent;

    this.pair.forEach((c, i) => {
      const g = this.el.countries[i].querySelector('.mc-shape');
      const m = k * factors[i];
      const box = this.boxes[i];
      const tx = BOX / 2 - m * box.cx;
      const ty = BOX / 2 - m * box.cy;
      g.style.transition = animate ? '' : 'none';
      g.style.transform = `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${m.toFixed(4)})`;
      if (!animate) {
        // Force the jump to apply before transitions come back on
        g.getBoundingClientRect();
        g.style.transition = '';
      }
    });

    this.view = view;
    this.el.toggle.querySelectorAll('button').forEach(btn => {
      const on = btn.dataset.view === view;
      btn.setAttribute('aria-pressed', String(on));
      btn.classList.toggle('is-active', on);
    });
    if (this.answered) {
      this.el.caption.textContent = view === 'true'
        ? 'True size: both shapes corrected for Mercator stretching.'
        : 'Mercator view: how the two countries appear on most world maps.';
    }
  }

  // ---------- Answer ----------

  answer(side) {
    if (this.answered) return;
    this.answered = true;
    const [a, b] = this.pair;
    const larger = a.area >= b.area ? 0 : 1;
    const correct = side === larger;
    const big = this.pair[larger];

    if (correct) {
      this.score += 1;
      this.streak += 1;
    } else {
      this.streak = 0;
    }

    this.el.countries.forEach((fig, i) => {
      fig.classList.toggle('is-correct', i === larger);
      fig.classList.toggle('is-wrong', !correct && i === side);
      const area = fig.querySelector('.mc-area');
      area.innerHTML = `<span>${numberFmt.format(Math.round(this.pair[i].area))} km²</span><span>Mercator ×${formatFactor(inflation(this.pair[i]))}</span>`;
      area.hidden = false;
      this.el.shapeBtns[i].disabled = true;
    });

    this.el.answers.forEach((btn, i) => {
      btn.disabled = true;
      if (i === larger) {
        btn.classList.add('is-correct');
        btn.insertAdjacentHTML('beforeend', CHECK_ICON.replace('class="icon"', 'class="icon mc-answer-icon"'));
      } else if (i === side) {
        btn.classList.add('is-wrong');
        btn.insertAdjacentHTML('beforeend', X_ICON.replace('class="icon"', 'class="icon mc-answer-icon"'));
      } else {
        btn.classList.add('is-dimmed');
      }
    });

    const ratio = Math.max(a.area, b.area) / Math.min(a.area, b.area);
    this.el.feedback.className = `atlas-feedback ${correct ? 'is-correct' : 'is-wrong'}`;
    this.el.feedback.innerHTML = `${correct ? CHECK_ICON : X_ICON}<span>${correct ? 'Correct' : 'Not quite'} — ${big.name.common} is ${ratio.toFixed(1)}× larger.</span>`;

    const byInflation = this.pair.slice().sort((p, q) => inflation(q) - inflation(p));
    const [more, less] = byInflation;
    this.el.explain.innerHTML =
      `On a Mercator map, <strong>${more.name.common}</strong> looks ${formatFactor(inflation(more))}× bigger than it really is; ` +
      `<strong>${less.name.common}</strong> only ${formatFactor(inflation(less))}×.`;

    this.history.push({
      pair: this.pair.map(c => c.name.common),
      larger: big.name.common,
      factors: this.pair.map(c => formatFactor(inflation(c))),
      correct
    });

    this.el.nextLabel.textContent = this.round >= ROUNDS ? 'See results' : 'Next pair';
    this.el.reveal.hidden = false;
    this.el.toggle.hidden = false;
    this.el.question.textContent = correct ? 'Well spotted.' : 'The map fooled you.';
    this.updateStats();
    this.setView('true');
    this.el.next.focus({ preventScroll: true });
  }

  // ---------- Summary ----------

  finishSession() {
    const isBest = this.score > this.stats.best;
    this.stats.best = Math.max(this.stats.best, this.score);
    this.stats.sessions += 1;
    this.saveStats();
    this.updateStats();

    this.el.summaryScore.textContent = `${this.score} / ${ROUNDS}`;
    this.el.summaryBest.textContent = isBest
      ? `New best score · ${this.stats.sessions} session${this.stats.sessions === 1 ? '' : 's'} played`
      : `Best ${this.stats.best} / ${ROUNDS} · ${this.stats.sessions} sessions played`;
    this.el.summaryList.innerHTML = this.history.map(h => `
      <li>
        <span class="${h.correct ? 'is-correct' : 'is-wrong'}">${h.correct ? CHECK_ICON : X_ICON}<span class="visually-hidden">${h.correct ? 'Correct' : 'Wrong'}</span></span>
        <span>${h.pair[0]} vs ${h.pair[1]} — <strong>${h.larger}</strong> is larger
          <span class="mc-summary-meta">Mercator inflation ×${h.factors[0]} / ×${h.factors[1]}</span>
        </span>
      </li>`).join('');
    this.el.summary.hidden = false;
    this.el.again.focus({ preventScroll: true });
  }

  updateStats() {
    this.el.round.textContent = `${Math.min(this.round, ROUNDS)} / ${ROUNDS}`;
    this.el.score.textContent = String(this.score);
    this.el.streak.textContent = String(this.streak);
    this.el.best.textContent = this.stats.best > 0 ? `${this.stats.best} / ${ROUNDS}` : '–';
  }

  // ---------- Events ----------

  bindEvents() {
    this.el.answers.forEach(btn => btn.addEventListener('click', () => this.answer(Number(btn.dataset.side))));
    this.el.shapeBtns.forEach(btn => btn.addEventListener('click', () => this.answer(Number(btn.dataset.side))));
    this.el.next.addEventListener('click', () => this.nextRound());
    this.el.again.addEventListener('click', () => this.startSession());
    this.el.toggle.querySelectorAll('button').forEach(btn =>
      btn.addEventListener('click', () => this.setView(btn.dataset.view))
    );

    document.addEventListener('keydown', e => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (!this.el.summary.hidden) return;
      const key = e.key.toLowerCase();
      if (!this.answered) {
        if (key === 'a' || key === '1' || key === 'arrowleft') { e.preventDefault(); this.answer(0); }
        else if (key === 'b' || key === '2' || key === 'arrowright') { e.preventDefault(); this.answer(1); }
      } else if (key === 'enter') {
        // A focused button already turns Enter into a click
        if (e.target instanceof Element && e.target.closest('button')) return;
        e.preventDefault();
        this.nextRound();
      }
    });
  }
}

(async () => {
  const game = new MercatorGame();
  if (await game.loadData()) game.startSession();
})();
