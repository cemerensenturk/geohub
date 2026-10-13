/**
 * Neighbours: name every land neighbour of a highlighted country.
 */
import { COUNTRIES } from './data.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const ROUNDS = 6;
const MAX_MISTAKES = 3;
const STORAGE_KEY = 'geohub_neighbours_stats_v1';
const MAP_W = 1000;
const MAP_H = 679;

const byId = new Map(COUNTRIES.map(c => [c.id, c]));

// Disputed or partly recognised territories make poor "easy" targets
const NOT_EASY = new Set(['EH', 'PS', 'XK']);
const boxArea = c => (c.box[2] - c.box[0]) * (c.box[3] - c.box[1]);
const POOLS = {
  easy: COUNTRIES.filter(c => c.neighbours.length >= 3 && c.neighbours.length <= 8 && boxArea(c) > 40 && !NOT_EASY.has(c.id)),
  hard: COUNTRIES.filter(c => c.neighbours.length >= 2)
};

// Borders that only exist through an overseas territory
const OVERSEAS = {
  'FR-BR': 'French Guiana',
  'FR-SR': 'French Guiana'
};

// ---------- Name matching ----------

const normalize = s => s
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const ALIASES = {
  'usa': 'US', 'us': 'US', 'america': 'US', 'united states of america': 'US',
  'uk': 'GB', 'britain': 'GB', 'great britain': 'GB', 'england': 'GB',
  'drc': 'CD', 'congo kinshasa': 'CD', 'democratic republic of the congo': 'CD',
  'congo brazzaville': 'CG', 'republic of the congo': 'CG',
  'turkey': 'TR', 'turkiye': 'TR',
  'czech republic': 'CZ',
  'burma': 'MM',
  'swaziland': 'SZ',
  'macedonia': 'MK',
  'cote d ivoire': 'CI',
  'east timor': 'TL',
  'holland': 'NL',
  'vatican': 'VA', 'holy see': 'VA',
  'bosnia': 'BA',
  'uae': 'AE',
  'russian federation': 'RU',
  'cabo verde': 'CV',
  'korea south': 'KR', 'republic of korea': 'KR',
  'korea north': 'KP', 'dprk': 'KP'
};

const index = new Map();
for (const c of COUNTRIES) index.set(normalize(c.name), c.id);
for (const [alias, id] of Object.entries(ALIASES)) if (byId.has(id) && !index.has(alias)) index.set(alias, id);
const searchable = [...index.entries()].map(([key, id]) => ({ key, id }));

function suggest(query) {
  const q = normalize(query);
  if (!q) return [];
  const seen = new Set();
  const prefix = [];
  const inner = [];
  for (const { key, id } of searchable) {
    if (seen.has(id)) continue;
    if (key.startsWith(q) || key.split(' ').some(w => w.startsWith(q))) { prefix.push({ key, id }); seen.add(id); }
  }
  for (const { key, id } of searchable) {
    if (seen.has(id)) continue;
    if (key.includes(q)) { inner.push({ key, id }); seen.add(id); }
  }
  const byStart = (a, b) => Number(!a.key.startsWith(q)) - Number(!b.key.startsWith(q)) || byId.get(a.id).name.localeCompare(byId.get(b.id).name);
  return prefix.sort(byStart).concat(inner).slice(0, 6).map(({ key, id }) => ({
    id,
    viaAlias: key !== normalize(byId.get(id).name) ? key : null
  }));
}

// ---------- Persistence ----------

function loadStats() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (data && typeof data === 'object') return { best: data.best || {}, sessions: data.sessions || 0 };
  } catch (e) { /* storage unavailable */ }
  return { best: {}, sessions: 0 };
}

function saveStats(stats) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(stats)); } catch (e) { /* storage unavailable */ }
}

// ---------- DOM ----------

const $ = id => document.getElementById(id);
const el = {
  map: $('map'),
  land: $('map-land'),
  labels: $('map-labels'),
  statRound: $('stat-round'),
  statFound: $('stat-found'),
  statScore: $('stat-score'),
  statBest: $('stat-best'),
  roundLabel: $('round-label'),
  targetName: $('target-name'),
  progress: $('progress-count'),
  mistakes: $('mistakes-left'),
  form: $('guess-form'),
  input: $('guess-input'),
  suggestions: $('suggestions'),
  btnGiveUp: $('btn-giveup'),
  btnNext: $('btn-next'),
  btnRestart: $('btn-restart'),
  feedback: $('feedback'),
  fact: $('fun-fact'),
  found: $('found-list'),
  summary: $('summary'),
  summaryScore: $('summary-score'),
  summaryBest: $('summary-best'),
  summaryList: $('summary-list'),
  btnAgain: $('btn-again'),
  levelButtons: document.querySelectorAll('.atlas-segmented button')
};

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// ---------- State ----------

const state = {
  level: 'easy',
  queue: [],
  round: 0,
  target: null,
  found: new Set(),
  mistakes: 0,
  over: false,
  score: 0,
  possible: 0,
  history: [],
  viewBox: [0, 0, MAP_W, MAP_H],
  active: -1,
  options: []
};
const stats = loadStats();

// ---------- Map ----------

const shapes = new Map();

function buildMap() {
  const frag = document.createDocumentFragment();
  for (const c of COUNTRIES) {
    const p = document.createElementNS(SVG_NS, 'path');
    p.setAttribute('d', c.path);
    p.setAttribute('class', 'nb-country');
    frag.appendChild(p);
    shapes.set(c.id, p);
  }
  el.land.appendChild(frag);
}

// Neighbours reached across an ocean (France and Brazil via French Guiana) stay out of the zoom
function boxGap(a, b) {
  const dx = Math.max(0, a[0] - b[2], b[0] - a[2]);
  const dy = Math.max(0, a[1] - b[3], b[1] - a[3]);
  return Math.hypot(dx, dy);
}

function zoomIds(target) {
  const near = target.neighbours.filter(id => boxGap(byId.get(id).box, target.box) <= 60);
  return [target.id, ...near];
}

function fitBox(ids) {
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const id of ids) {
    const b = byId.get(id).box;
    x0 = Math.min(x0, b[0]); y0 = Math.min(y0, b[1]);
    x1 = Math.max(x1, b[2]); y1 = Math.max(y1, b[3]);
  }
  let w = Math.max(x1 - x0, 24);
  let h = Math.max(y1 - y0, 16);
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  w *= 1.35;
  h *= 1.35;
  const rect = el.map.getBoundingClientRect();
  const aspect = rect.width && rect.height ? rect.width / rect.height : 4 / 3;
  if (w / h > aspect) h = w / aspect; else w = h * aspect;
  return [cx - w / 2, cy - h / 2, w, h];
}

let anim = null;
function setViewBox(target) {
  if (anim) cancelAnimationFrame(anim);
  const from = state.viewBox.slice();
  const apply = vb => {
    state.viewBox = vb;
    el.map.setAttribute('viewBox', vb.map(n => n.toFixed(2)).join(' '));
    placeLabels();
  };
  if (reduceMotion.matches) { apply(target); return; }
  let start = null;
  const step = now => {
    if (start === null) start = now;
    const t = Math.max(0, Math.min(1, (now - start) / 550));
    const e = 1 - Math.pow(1 - t, 3);
    apply(from.map((v, i) => v + (target[i] - v) * e));
    if (t < 1) anim = requestAnimationFrame(step);
  };
  anim = requestAnimationFrame(step);
}

// Labels live in a pixel-sized overlay so text stays a normal size at any zoom;
// their map positions are projected through the current viewBox ("meet" fit)
function placeLabels() {
  const rect = el.map.getBoundingClientRect();
  const w = rect.width || 600;
  const h = rect.height || 450;
  const [vx, vy, vw, vh] = state.viewBox;
  const scale = Math.min(w / vw, h / vh);
  const ox = (w - vw * scale) / 2;
  const oy = (h - vh * scale) / 2;
  el.labels.setAttribute('viewBox', `0 0 ${w} ${h}`);
  // Target first, then the rest; each label is kept inside the frame and nudged
  // up or down until it no longer overlaps a label placed before it
  const placed = [];
  const overlaps = r => placed.some(p => r.x < p.x + p.width + 2 && p.x < r.x + r.width + 2 && r.y < p.y + p.height && p.y < r.y + r.height);
  const order = [...el.labels.children].sort((a, b) => Number(b.classList.contains('is-target')) - Number(a.classList.contains('is-target')));
  for (const t of order) {
    const x = (Number(t.dataset.x) - vx) * scale + ox;
    const y = (Number(t.dataset.y) - vy) * scale + oy;
    t.setAttribute('x', x.toFixed(1));
    t.setAttribute('y', y.toFixed(1));
    const box = t.getBBox();
    const half = box.width / 2;
    t.setAttribute('x', Math.min(Math.max(x, half + 4), w - half - 4).toFixed(1));
    let r = t.getBBox();
    for (let i = 1; i <= 6 && overlaps(r); i++) {
      const dy = Math.ceil(i / 2) * (box.height + 2) * (i % 2 ? 1 : -1);
      t.setAttribute('y', Math.min(Math.max(y + dy, box.height), h - box.height / 2).toFixed(1));
      r = t.getBBox();
    }
    placed.push(r);
  }
}

function addLabel(id, kind) {
  const c = byId.get(id);
  const t = document.createElementNS(SVG_NS, 'text');
  t.dataset.x = (c.box[0] + c.box[2]) / 2;
  t.dataset.y = (c.box[1] + c.box[3]) / 2;
  t.setAttribute('class', `nb-label is-${kind}`);
  t.setAttribute('text-anchor', 'middle');
  t.setAttribute('dominant-baseline', 'middle');
  t.textContent = c.name;
  el.labels.appendChild(t);
}

function resetMap() {
  for (const p of shapes.values()) p.setAttribute('class', 'nb-country');
  el.labels.textContent = '';
}

// ---------- Session flow ----------

function shuffle(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function startSession() {
  state.queue = shuffle(POOLS[state.level]).slice(0, ROUNDS);
  state.round = 0;
  state.score = 0;
  state.possible = 0;
  state.history = [];
  el.summary.hidden = true;
  startRound();
}

function startRound() {
  state.target = state.queue[state.round];
  state.found = new Set();
  state.mistakes = 0;
  state.over = false;

  resetMap();
  shapes.get(state.target.id).setAttribute('class', 'nb-country is-target');
  addLabel(state.target.id, 'target');
  setViewBox(fitBox(zoomIds(state.target)));

  el.targetName.textContent = state.target.name;
  el.found.textContent = '';
  el.feedback.hidden = true;
  el.fact.hidden = true;
  el.btnNext.hidden = true;
  el.form.hidden = false;
  el.input.value = '';
  closeSuggestions();
  updateCounters();
  if (window.matchMedia('(hover: hover)').matches) el.input.focus();
}

function updateCounters() {
  const total = state.target.neighbours.length;
  const left = MAX_MISTAKES - state.mistakes;
  el.roundLabel.textContent = `Round ${state.round + 1} of ${ROUNDS}`;
  el.statRound.textContent = `${state.round + 1} / ${ROUNDS}`;
  el.statFound.textContent = `${state.found.size} / ${total}`;
  el.statScore.textContent = String(state.score + (state.over ? 0 : state.found.size));
  const best = stats.best[state.level];
  el.statBest.textContent = best === undefined ? '–' : String(best);
  el.progress.textContent = `${state.found.size} / ${total}`;
  el.mistakes.textContent = left === 1 ? '1 mistake left' : `${left} mistakes left`;
}

function showFeedback(text, tone) {
  el.feedback.className = `atlas-feedback nb-feedback${tone ? ` is-${tone}` : ''}`;
  el.feedback.textContent = text;
  el.feedback.hidden = false;
}

function addFoundChip(id) {
  const li = document.createElement('li');
  li.className = 'atlas-chip atlas-chip--accent';
  li.innerHTML = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  li.append(byId.get(id).name);
  el.found.appendChild(li);
}

function submitGuess(id) {
  if (state.over) return;
  const guess = byId.get(id);
  const target = state.target;
  el.input.value = '';
  closeSuggestions();

  if (id === target.id) {
    showFeedback(`That is ${target.name} itself. Name the countries around it.`);
    return;
  }
  if (state.found.has(id)) {
    showFeedback(`${guess.name} is already on the map.`);
    return;
  }
  if (target.neighbours.includes(id)) {
    state.found.add(id);
    shapes.get(id).setAttribute('class', 'nb-country is-found');
    addLabel(id, 'found');
    placeLabels();
    addFoundChip(id);
    const left = target.neighbours.length - state.found.size;
    showFeedback(left ? `${guess.name} borders ${target.name}.` : `All ${target.neighbours.length} found.`, 'correct');
    updateCounters();
    if (!left) endRound();
    return;
  }
  state.mistakes += 1;
  showFeedback(`${guess.name} does not border ${target.name}.`, 'wrong');
  updateCounters();
  if (state.mistakes >= MAX_MISTAKES) endRound();
}

function endRound() {
  if (state.over) return;
  state.over = true;
  const target = state.target;
  const total = target.neighbours.length;
  const missed = target.neighbours.filter(id => !state.found.has(id));

  for (const id of missed) {
    shapes.get(id).setAttribute('class', 'nb-country is-missed');
    addLabel(id, 'missed');
  }
  placeLabels();

  state.score += state.found.size;
  state.possible += total;
  state.history.push({ name: target.name, found: state.found.size, total });

  if (!missed.length) {
    showFeedback(`Perfect: you named all ${total} neighbours of ${target.name}.`, 'correct');
  } else {
    const names = missed.map(id => byId.get(id).name);
    const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names[0];
    showFeedback(`${state.found.size} of ${total}. Missed: ${list}.`, state.found.size ? null : 'wrong');
  }

  // Group overseas borders by territory: "France borders Brazil and Suriname through French Guiana."
  const viaTerritory = new Map();
  for (const id of target.neighbours) {
    const territory = OVERSEAS[`${target.id}-${id}`] || OVERSEAS[`${id}-${target.id}`];
    if (territory) viaTerritory.set(territory, (viaTerritory.get(territory) || []).concat(byId.get(id).name));
  }
  if (viaTerritory.size) {
    const facts = [...viaTerritory].map(([territory, names]) => `${target.name} borders ${names.join(' and ')} through ${territory}.`);
    el.fact.textContent = `Did you know? ${facts.join(' ')}`;
    el.fact.hidden = false;
  }

  el.form.hidden = true;
  closeSuggestions();
  el.btnNext.hidden = false;
  el.btnNext.innerHTML = state.round + 1 >= ROUNDS
    ? 'See results <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'
    : 'Next country <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  updateCounters();
  el.statScore.textContent = String(state.score);
  el.btnNext.focus();
}

function nextRound() {
  if (!state.over) return;
  state.round += 1;
  if (state.round >= ROUNDS) finishSession();
  else startRound();
}

function finishSession() {
  const prev = stats.best[state.level];
  const isBest = prev === undefined || state.score > prev;
  if (isBest) stats.best[state.level] = state.score;
  stats.sessions += 1;
  saveStats(stats);

  el.summaryScore.textContent = `${state.score} / ${state.possible}`;
  el.summaryBest.textContent = isBest
    ? `New best on ${state.level === 'easy' ? 'Easy' : 'Hard'}.`
    : `Best on ${state.level === 'easy' ? 'Easy' : 'Hard'}: ${prev}.`;
  el.summaryList.textContent = '';
  for (const h of state.history) {
    const li = document.createElement('li');
    const name = document.createElement('span');
    name.textContent = h.name;
    const score = document.createElement('span');
    score.className = 'mono';
    score.textContent = `${h.found} / ${h.total}`;
    li.append(name, score);
    el.summaryList.appendChild(li);
  }
  el.statBest.textContent = String(stats.best[state.level]);
  el.summary.hidden = false;
  el.btnAgain.focus();
}

// ---------- Autocomplete ----------

function renderSuggestions() {
  state.options = suggest(el.input.value);
  state.active = state.options.length ? 0 : -1;
  el.suggestions.textContent = '';
  if (!state.options.length) { closeSuggestions(); return; }
  state.options.forEach((opt, i) => {
    const li = document.createElement('li');
    li.id = `sugg-${i}`;
    li.setAttribute('role', 'option');
    li.className = 'nb-suggestion';
    const name = document.createElement('span');
    name.textContent = byId.get(opt.id).name;
    li.appendChild(name);
    if (opt.viaAlias) {
      const alias = document.createElement('span');
      alias.className = 'nb-suggestion-alias mono';
      alias.textContent = opt.viaAlias;
      li.appendChild(alias);
    }
    li.addEventListener('mousedown', e => {
      e.preventDefault();
      submitGuess(opt.id);
    });
    el.suggestions.appendChild(li);
  });
  el.suggestions.hidden = false;
  el.input.setAttribute('aria-expanded', 'true');
  highlight();
}

function highlight() {
  [...el.suggestions.children].forEach((li, i) => {
    li.classList.toggle('is-active', i === state.active);
    li.setAttribute('aria-selected', String(i === state.active));
  });
  if (state.active >= 0) el.input.setAttribute('aria-activedescendant', `sugg-${state.active}`);
  else el.input.removeAttribute('aria-activedescendant');
}

function closeSuggestions() {
  el.suggestions.hidden = true;
  el.suggestions.textContent = '';
  state.options = [];
  state.active = -1;
  el.input.setAttribute('aria-expanded', 'false');
  el.input.removeAttribute('aria-activedescendant');
}

function resolveInput() {
  const exact = index.get(normalize(el.input.value));
  if (exact) return exact;
  if (state.active >= 0 && state.options[state.active]) return state.options[state.active].id;
  return null;
}

// ---------- Events ----------

el.input.addEventListener('input', renderSuggestions);

el.input.addEventListener('keydown', e => {
  if (e.key === 'ArrowDown' && state.options.length) {
    e.preventDefault();
    state.active = (state.active + 1) % state.options.length;
    highlight();
  } else if (e.key === 'ArrowUp' && state.options.length) {
    e.preventDefault();
    state.active = (state.active - 1 + state.options.length) % state.options.length;
    highlight();
  } else if (e.key === 'Escape') {
    closeSuggestions();
  }
});

el.input.addEventListener('blur', () => setTimeout(closeSuggestions, 120));

el.form.addEventListener('submit', e => {
  e.preventDefault();
  if (state.over) return;
  if (!el.input.value.trim()) return;
  const id = resolveInput();
  if (id) submitGuess(id);
  else showFeedback('Pick a country from the list.');
});

el.btnGiveUp.addEventListener('click', endRound);
el.btnNext.addEventListener('click', nextRound);
el.btnRestart.addEventListener('click', startSession);
el.btnAgain.addEventListener('click', startSession);

for (const btn of el.levelButtons) {
  btn.addEventListener('click', () => {
    if (btn.dataset.level === state.level) return;
    state.level = btn.dataset.level;
    for (const b of el.levelButtons) b.setAttribute('aria-pressed', String(b === btn));
    startSession();
  });
}

window.addEventListener('keydown', e => {
  if (e.key !== 'Enter' || !state.over) return;
  // A focused button already turns Enter into a click
  if (e.target instanceof Element && e.target.closest('button')) return;
  if (!el.summary.hidden) startSession();
  else nextRound();
});

window.addEventListener('resize', () => {
  if (state.target) setViewBox(fitBox(zoomIds(state.target)));
});

buildMap();
startSession();
