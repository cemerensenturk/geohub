/**
 * Further North - Which of two cities lies further north?
 * Streak game: one miss ends the run.
 */

import CITIES from '../../satelcity/js/cities.js';
import { pickPair } from './pairs.js';

const STORAGE_KEY = 'geohub_furthernorth_stats_v1';
const KM_PER_DEGREE = 111.2;

// Reference parallels drawn on the ruler
const PARALLELS = [
  { lat: 66.56, label: 'Arctic Circle' },
  { lat: 23.44, label: 'Tropic of Cancer' },
  { lat: 0, label: 'Equator' },
  { lat: -23.44, label: 'Tropic of Capricorn' },
  { lat: -66.56, label: 'Antarctic Circle' }
];

// Ruler geometry (SVG user units, viewBox 0 0 260 440)
const R = { top: 24, bottom: 416, axis: 150 };

const $ = id => document.getElementById(id);
const el = {
  streak: $('stat-streak'),
  best: $('stat-best'),
  answered: $('stat-answered'),
  round: $('round-number'),
  cards: [$('city-a'), $('city-b')],
  names: [$('city-a-name'), $('city-b-name')],
  countries: [$('city-a-country'), $('city-b-country')],
  lats: [$('city-a-lat'), $('city-b-lat')],
  feedback: $('feedback'),
  next: $('btn-next'),
  restart: $('btn-restart'),
  ruler: $('ruler'),
  rulerCaption: $('ruler-caption'),
  modal: $('modal-over'),
  overSub: $('over-sub'),
  overStreak: $('over-streak'),
  overBest: $('over-best'),
  overPair: $('over-pair'),
  closeOver: $('btn-close-over'),
  playAgain: $('btn-play-again')
};

const ICON_CHECK = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const ICON_X = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';

const state = {
  pair: null,
  answered: false,
  gameOver: false,
  streak: 0,
  count: 0,
  used: new Set(),
  best: 0,
  runs: 0
};

/* ---------- Persistence ---------- */

function loadStats() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    state.best = Number(saved.best) || 0;
    state.runs = Number(saved.runs) || 0;
  } catch (e) {
    // Storage unavailable: play without saving
  }
}

function saveStats() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ best: state.best, runs: state.runs }));
  } catch (e) {
    // Ignore
  }
}

/* ---------- Formatting ---------- */

function formatLat(lat) {
  return `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? 'N' : 'S'}`;
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function gapText(north, south) {
  const gap = north.lat - south.lat;
  const km = Math.round(gap * KM_PER_DEGREE / 10) * 10;
  return `<strong>${escapeHtml(north.name)}</strong> is ${gap.toFixed(1)}° (≈ ${km.toLocaleString('en-US')} km) further north than ${escapeHtml(south.name)}.`;
}

/* ---------- Ruler ---------- */

const SVG_NS = 'http://www.w3.org/2000/svg';

function svg(tag, attrs, text) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (text !== undefined) node.textContent = text;
  return node;
}

function tickStep(span) {
  if (span <= 6) return 1;
  if (span <= 14) return 2;
  if (span <= 30) return 5;
  if (span <= 70) return 10;
  return 15;
}

/**
 * Draws the ruler between latTop and latBottom.
 * markers: [{ city, north: bool }] placed at their latitudes.
 */
function drawRuler(latTop, latBottom, markers = []) {
  const ruler = el.ruler;
  ruler.replaceChildren();
  const y = lat => R.top + (latTop - lat) / (latTop - latBottom) * (R.bottom - R.top);
  const span = latTop - latBottom;

  // Parallels (behind everything)
  for (const p of PARALLELS) {
    if (p.lat > latTop || p.lat < latBottom) continue;
    const py = y(p.lat);
    ruler.append(
      svg('line', { x1: 0, x2: 260, y1: py, y2: py, class: p.lat === 0 ? 'fn-parallel fn-equator' : 'fn-parallel' }),
      svg('text', { x: 8, y: py - 5, class: 'fn-parallel-label' }, p.label)
    );
  }

  // Axis and ticks
  ruler.append(svg('line', { x1: R.axis, x2: R.axis, y1: R.top, y2: R.bottom, class: 'fn-axis' }));
  const step = tickStep(span);
  for (let lat = Math.ceil(latBottom / step) * step; lat <= latTop + 1e-9; lat += step) {
    const ty = y(lat);
    const label = lat === 0 ? '0°' : `${Math.abs(lat)}° ${lat > 0 ? 'N' : 'S'}`;
    ruler.append(
      svg('line', { x1: R.axis - 5, x2: R.axis + 5, y1: ty, y2: ty, class: 'fn-tick' }),
      svg('text', { x: R.axis + 10, y: ty + 4, class: 'fn-tick-label' }, label)
    );
  }

  // City markers
  for (const m of markers) {
    const my = y(m.city.lat);
    const g = svg('g', { class: m.north ? 'fn-marker is-north' : 'fn-marker' });
    g.append(
      svg('line', { x1: 8, x2: R.axis, y1: my, y2: my, class: 'fn-marker-line' }),
      svg('circle', { cx: R.axis, cy: my, r: 5.5, class: 'fn-marker-dot' }),
      svg('text', { x: 8, y: my - 8, class: 'fn-marker-name' }, m.city.name),
      svg('text', { x: 8, y: my + 17, class: 'fn-marker-lat' }, formatLat(m.city.lat))
    );
    ruler.append(g);
  }
}

function drawWorldRuler() {
  drawRuler(75, -60);
  el.ruler.setAttribute('aria-label', 'Latitude ruler from 75° N to 60° S; markers appear after you answer');
  el.rulerCaption.textContent = 'Latitudes are revealed after you answer.';
}

function drawPairRuler(north, south) {
  const gap = north.lat - south.lat;
  const margin = Math.max(gap * 0.7, 1.5);
  const top = Math.min(90, north.lat + margin);
  const bottom = Math.max(-90, south.lat - margin);
  drawRuler(top, bottom, [{ city: north, north: true }, { city: south, north: false }]);
  el.ruler.setAttribute('aria-label', `${north.name} at ${formatLat(north.lat)}, ${south.name} at ${formatLat(south.lat)}`);
  el.rulerCaption.textContent = `Zoomed to ${formatLat(top)} – ${formatLat(bottom)}.`;
}

/* ---------- Rounds ---------- */

function renderStats() {
  el.streak.textContent = state.streak;
  el.best.textContent = state.best;
  el.answered.textContent = state.count;
  el.round.textContent = state.count + 1;
}

function newRound() {
  state.pair = pickPair(CITIES, state.streak, state.used);
  state.pair.forEach(c => state.used.add(c.id));
  state.answered = false;

  state.pair.forEach((city, i) => {
    el.names[i].textContent = city.name;
    el.countries[i].textContent = city.country;
    el.lats[i].hidden = true;
    el.lats[i].textContent = '';
    const card = el.cards[i];
    card.disabled = false;
    card.classList.remove('is-correct', 'is-wrong', 'is-dimmed');
    card.setAttribute('aria-label', `${city.name}, ${city.country}`);
  });

  el.feedback.hidden = true;
  el.feedback.className = 'atlas-feedback fn-feedback';
  el.next.hidden = true;
  el.restart.hidden = true;
  renderStats();
  drawWorldRuler();
}

function answer(side) {
  if (state.answered || state.gameOver || !state.pair) return;
  state.answered = true;
  state.count += 1;

  const [a, b] = state.pair;
  const northSide = a.lat > b.lat ? 0 : 1;
  const north = state.pair[northSide];
  const south = state.pair[1 - northSide];
  const correct = side === northSide;

  state.pair.forEach((city, i) => {
    el.cards[i].disabled = true;
    el.lats[i].textContent = formatLat(city.lat);
    el.lats[i].hidden = false;
  });
  el.cards[northSide].classList.add('is-correct');
  if (!correct) el.cards[side].classList.add('is-wrong');

  el.feedback.hidden = false;
  el.feedback.classList.add(correct ? 'is-correct' : 'is-wrong');
  el.feedback.innerHTML = `${correct ? ICON_CHECK : ICON_X}<span>${correct ? 'Correct.' : 'Not quite.'} ${gapText(north, south)}</span>`;

  drawPairRuler(north, south);

  if (correct) {
    state.streak += 1;
    if (state.streak > state.best) state.best = state.streak;
    saveStats();
    renderStats();
    el.round.textContent = state.count;
    el.next.hidden = false;
    el.next.focus();
  } else {
    endRun(north, south);
  }
}

function endRun(north, south) {
  state.gameOver = true;
  state.runs += 1;
  const isBest = state.streak > 0 && state.streak >= state.best;
  saveStats();
  renderStats();
  el.round.textContent = state.count;

  el.overStreak.textContent = state.streak;
  el.overBest.textContent = state.best;
  el.overSub.textContent = isBest ? 'New best streak.' : state.streak === 0 ? 'Missed the first one. Try again.' : 'The streak ends here.';
  const place = c => `${escapeHtml(c.name)}, ${escapeHtml(c.country)} <span class="mono">${formatLat(c.lat)}</span>`;
  el.overPair.innerHTML = `${place(north)} is north of ${place(south)}.`;
  el.modal.hidden = false;
  el.restart.hidden = false;
  el.playAgain.focus();
}

function restart() {
  el.modal.hidden = true;
  state.gameOver = false;
  state.streak = 0;
  state.count = 0;
  state.used.clear();
  newRound();
  el.cards[0].focus();
}

/* ---------- Input ---------- */

el.cards.forEach((card, i) => card.addEventListener('click', () => answer(i)));
el.next.addEventListener('click', newRound);
el.restart.addEventListener('click', restart);
el.playAgain.addEventListener('click', restart);
el.closeOver.addEventListener('click', () => {
  el.modal.hidden = true;
  el.restart.focus();
});

document.addEventListener('keydown', event => {
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  const key = event.key;

  if (key === 'Escape' && !el.modal.hidden) {
    el.modal.hidden = true;
    return;
  }

  if (key === 'Enter') {
    // A focused button already turns Enter into a click
    if (event.target instanceof Element && event.target.closest('button')) return;
    if (state.gameOver) restart();
    else if (state.answered) newRound();
    return;
  }

  if (state.answered || state.gameOver) return;
  if (key === 'ArrowLeft' || key === '1' || key.toLowerCase() === 'a') answer(0);
  else if (key === 'ArrowRight' || key === '2' || key.toLowerCase() === 'b') answer(1);
});

/* ---------- Start ---------- */

loadStats();
newRound();
