/**
 * Compass - point the needle the way you'd draw the line on a world map.
 * Scored against the flat-map (rhumb line) bearing; the great-circle route is a bonus fact.
 */

import CITIES from '../../satelcity/js/cities.js';
import { MAP_WIDTH, MAP_HEIGHT, LAND_PATH, project } from './worldmap.js';
import {
  greatCircleBearing, rhumbBearing, distanceKm, angularError,
  formatBearing, pointName, roundPoints, normalize
} from './geo.js';

const ROUNDS = 10;
const MIN_DISTANCE_KM = 1500;
const BONUS_GAP_DEG = 10;
const STORAGE_KEY = 'geohub_compass_stats_v1';
const SVG_NS = 'http://www.w3.org/2000/svg';

const $ = id => document.getElementById(id);

const el = {
  statRound: $('stat-round'),
  statScore: $('stat-score'),
  statBest: $('stat-best'),
  roundLabel: $('round-label'),
  fromName: $('from-name'),
  fromCountry: $('from-country'),
  toName: $('to-name'),
  toCountry: $('to-country'),
  aimActions: $('aim-actions'),
  result: $('result'),
  resError: $('res-error'),
  resPoints: $('res-points'),
  resDistance: $('res-distance'),
  resFeedback: $('res-feedback'),
  resExplain: $('res-explain'),
  legendPlayer: $('legend-player'),
  legendMap: $('legend-map'),
  legendGlobe: $('legend-globe'),
  dial: $('dial'),
  ticks: $('ticks'),
  needlePlayer: $('needle-player'),
  needleMap: $('needle-map'),
  needleGlobe: $('needle-globe'),
  readout: $('readout'),
  mapCard: $('map-card'),
  map: $('map'),
  mapLand: $('map-land'),
  mapRoutes: $('map-routes'),
  mapCities: $('map-cities'),
  btnLock: $('btn-lock'),
  btnNext: $('btn-next'),
  btnRestart: $('btn-restart'),
  btnAgain: $('btn-again'),
  summary: $('summary'),
  summaryTotal: $('summary-total'),
  summaryBest: $('summary-best'),
  summaryList: $('summary-list'),
  difficultyButtons: document.querySelectorAll('[data-difficulty]')
};

const state = {
  difficulty: 'easy',
  pairs: [],
  round: 0,
  score: 0,
  heading: 0,
  revealed: false,
  results: [],
  stats: loadStats()
};

/* ---------- Persistence ---------- */

function loadStats() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : null;
    if (data && typeof data.best === 'number') return { best: data.best, sessions: data.sessions || 0 };
  } catch (e) {
    // Storage unavailable: play without saving
  }
  return { best: null, sessions: 0 };
}

function saveStats() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.stats));
  } catch (e) {
    // Storage unavailable: ignore
  }
}

/* ---------- Pair selection ---------- */

function shuffle(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function describePair(from, to) {
  const map = rhumbBearing(from.lat, from.lng, to.lat, to.lng);
  const globe = greatCircleBearing(from.lat, from.lng, to.lat, to.lng);
  return {
    from,
    to,
    map,
    globe,
    km: distanceKm(from.lat, from.lng, to.lat, to.lng),
    gap: angularError(map, globe)
  };
}

// About a third of the rounds get a route where the globe and the map clearly disagree
function buildSession(difficulty) {
  const pool = CITIES.filter(c => difficulty === 'hard' || c.difficulty === 'easy');
  const bonusTarget = Math.ceil(ROUNDS / 3);
  const bonus = [];
  const plain = [];
  const usedPairs = new Set();
  const cityUse = new Map();

  for (let attempt = 0; attempt < 5000 && bonus.length + plain.length < ROUNDS; attempt++) {
    const from = pool[Math.floor(Math.random() * pool.length)];
    const to = pool[Math.floor(Math.random() * pool.length)];
    if (from === to || from.country === to.country) continue;
    const key = [from.id, to.id].sort().join('|');
    if (usedPairs.has(key)) continue;
    // Spread the session over many cities
    if ((cityUse.get(from.id) || 0) >= 2 || (cityUse.get(to.id) || 0) >= 2) continue;

    const pair = describePair(from, to);
    if (pair.km < MIN_DISTANCE_KM) continue;

    if (pair.gap >= BONUS_GAP_DEG) {
      bonus.push(pair);
    } else if (plain.length < ROUNDS - bonusTarget) {
      plain.push(pair);
    } else {
      continue;
    }
    usedPairs.add(key);
    cityUse.set(from.id, (cityUse.get(from.id) || 0) + 1);
    cityUse.set(to.id, (cityUse.get(to.id) || 0) + 1);
  }

  return shuffle(bonus.concat(plain)).slice(0, ROUNDS);
}

/* ---------- Dial ---------- */

function drawTicks() {
  const parts = [];
  for (let deg = 0; deg < 360; deg += 10) {
    const major = deg % 90 === 0;
    const mid = deg % 30 === 0;
    const outer = 142;
    const inner = major ? 124 : mid ? 128 : 134;
    const rad = (deg - 90) * Math.PI / 180;
    const x1 = 150 + outer * Math.cos(rad);
    const y1 = 150 + outer * Math.sin(rad);
    const x2 = 150 + inner * Math.cos(rad);
    const y2 = 150 + inner * Math.sin(rad);
    const cls = major ? 'cp-tick cp-tick--major' : mid ? 'cp-tick cp-tick--mid' : 'cp-tick';
    parts.push(`<line class="${cls}" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`);
  }
  el.ticks.innerHTML = parts.join('');
}

function setNeedle(needle, deg) {
  needle.style.transform = `rotate(${deg}deg)`;
}

function setHeading(deg) {
  state.heading = Math.round(normalize(deg)) % 360;
  setNeedle(el.needlePlayer, state.heading);
  el.readout.textContent = formatBearing(state.heading);
  el.dial.setAttribute('aria-valuenow', String(state.heading));
  el.dial.setAttribute('aria-valuetext', `${String(state.heading).padStart(3, '0')} degrees, ${pointName(state.heading)}`);
}

function headingFromPointer(event) {
  const rect = el.dial.getBoundingClientRect();
  const dx = event.clientX - (rect.left + rect.width / 2);
  const dy = event.clientY - (rect.top + rect.height / 2);
  return Math.atan2(dx, -dy) * 180 / Math.PI;
}

function bindDial() {
  let dragging = false;

  el.dial.addEventListener('pointerdown', event => {
    if (state.revealed) return;
    dragging = true;
    el.dial.setPointerCapture(event.pointerId);
    el.dial.classList.add('is-dragging');
    setHeading(headingFromPointer(event));
    event.preventDefault();
  });

  el.dial.addEventListener('pointermove', event => {
    if (!dragging) return;
    setHeading(headingFromPointer(event));
  });

  const stop = event => {
    if (!dragging) return;
    dragging = false;
    el.dial.classList.remove('is-dragging');
    if (el.dial.hasPointerCapture(event.pointerId)) el.dial.releasePointerCapture(event.pointerId);
  };
  el.dial.addEventListener('pointerup', stop);
  el.dial.addEventListener('pointercancel', stop);

  el.dial.addEventListener('keydown', event => {
    if (state.revealed) return;
    const step = event.shiftKey ? 10 : 1;
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      setHeading(state.heading + step);
      event.preventDefault();
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      setHeading(state.heading - step);
      event.preventDefault();
    } else if (event.key === 'Home') {
      setHeading(0);
      event.preventDefault();
    } else if (event.key === 'Enter') {
      lockIn();
      event.preventDefault();
    }
  });
}

/* ---------- Route map ---------- */

function svg(tag, attrs, text) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  if (text !== undefined) node.textContent = text;
  return node;
}

const toVec = (lat, lng) => {
  const p = lat * Math.PI / 180;
  const l = lng * Math.PI / 180;
  return [Math.cos(p) * Math.cos(l), Math.cos(p) * Math.sin(l), Math.sin(p)];
};

// Points along the great circle, as projected map polylines split at the antimeridian
function greatCircleLines(a, b, samples = 64) {
  const v1 = toVec(a.lat, a.lng);
  const v2 = toVec(b.lat, b.lng);
  const dot = Math.min(1, Math.max(-1, v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2]));
  const omega = Math.acos(dot);
  const lines = [[]];
  let prevX = null;
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const s1 = Math.sin((1 - t) * omega) / Math.sin(omega);
    const s2 = Math.sin(t * omega) / Math.sin(omega);
    const x = s1 * v1[0] + s2 * v2[0];
    const y = s1 * v1[1] + s2 * v2[1];
    const z = s1 * v1[2] + s2 * v2[2];
    const lat = Math.atan2(z, Math.hypot(x, y)) * 180 / Math.PI;
    const lng = Math.atan2(y, x) * 180 / Math.PI;
    const pt = project(lat, lng);
    if (prevX !== null && Math.abs(pt[0] - prevX) > MAP_WIDTH / 2) lines.push([]);
    lines.at(-1).push(pt);
    prevX = pt[0];
  }
  return lines.filter(line => line.length > 1);
}

// The rhumb line is straight on Mercator; when it crosses ±180 draw it twice, shifted by a map width
function rhumbSegments(a, b) {
  const pa = project(a.lat, a.lng);
  const pb = project(b.lat, b.lng);
  const raw = b.lng - a.lng;
  if (Math.abs(raw) <= 180) return { wraps: false, segments: [[pa, pb]] };
  const shift = raw > 0 ? -MAP_WIDTH : MAP_WIDTH;
  return {
    wraps: true,
    segments: [
      [pa, [pb[0] + shift, pb[1]]],
      [[pa[0] - shift, pa[1]], pb]
    ]
  };
}

// Crop around the route with padding, keeping the map's aspect ratio
function routeViewBox(points) {
  const aspect = MAP_WIDTH / MAP_HEIGHT;
  const xs = points.map(p => p[0]);
  const ys = points.map(p => p[1]);
  const pad = 60;
  let x0 = Math.min(...xs) - pad;
  let x1 = Math.max(...xs) + pad;
  let y0 = Math.min(...ys) - pad;
  let y1 = Math.max(...ys) + pad;
  let w = Math.max(x1 - x0, 360);
  let h = y1 - y0;
  if (w / h > aspect) h = w / aspect; else w = h * aspect;
  if (w >= MAP_WIDTH || h >= MAP_HEIGHT) return [0, 0, MAP_WIDTH, MAP_HEIGHT];
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  x0 = Math.min(Math.max(cx - w / 2, 0), MAP_WIDTH - w);
  y0 = Math.min(Math.max(cy - h / 2, 0), MAP_HEIGHT - h);
  return [x0, y0, w, h];
}

function drawMap(pair) {
  const { from, to } = pair;
  const rhumb = rhumbSegments(from, to);
  const globe = greatCircleLines(from, to);
  const pa = project(from.lat, from.lng);
  const pb = project(to.lat, to.lng);

  const wraps = rhumb.wraps || globe.length > 1;
  const box = wraps ? [0, 0, MAP_WIDTH, MAP_HEIGHT] : routeViewBox([pa, pb, ...globe.flat()]);
  el.map.setAttribute('viewBox', box.map(n => n.toFixed(1)).join(' '));

  // Map units per screen pixel, so markers and labels keep one size at any zoom or screen width
  const u = box[2] / (el.map.getBoundingClientRect().width || 640);

  el.mapRoutes.replaceChildren();
  for (const line of globe) {
    el.mapRoutes.append(svg('polyline', {
      class: 'cp-map-globe',
      points: line.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
    }));
  }
  for (const [p, q] of rhumb.segments) {
    el.mapRoutes.append(svg('line', {
      class: 'cp-map-rhumb',
      x1: p[0].toFixed(1), y1: p[1].toFixed(1), x2: q[0].toFixed(1), y2: q[1].toFixed(1)
    }));
  }

  el.mapCities.replaceChildren();
  // Labels sit outside the route: the western city's name on its left, the eastern one's on its right,
  // flipped when the name would run past the edge of the visible map
  const fits = (p, name, left) => {
    const width = name.length * 7.5 * u;
    return left ? p[0] - 10 * u - width > box[0] : p[0] + 10 * u + width < box[0] + box[2];
  };
  for (const [city, p, other, cls] of [[from, pa, pb, 'is-from'], [to, pb, pa, 'is-to']]) {
    let left = p[0] < other[0];
    if (!fits(p, city.name, left)) left = !left;
    el.mapCities.append(
      svg('circle', { class: `cp-map-city ${cls}`, cx: p[0], cy: p[1], r: (5 * u).toFixed(2), 'stroke-width': (2 * u).toFixed(2) }),
      svg('text', {
        class: 'cp-map-label',
        x: (p[0] + (left ? -10 : 10) * u).toFixed(1),
        y: (p[1] + 5 * u).toFixed(1),
        'font-size': (14 * u).toFixed(2),
        'stroke-width': (4 * u).toFixed(2),
        'text-anchor': left ? 'end' : 'start'
      }, city.name)
    );
  }

  el.map.setAttribute('aria-label', `Map of the route from ${from.name} to ${to.name}`);
}

/* ---------- Rounds ---------- */

function updateStats() {
  const shown = Math.min(state.round + 1, ROUNDS);
  el.statRound.textContent = `${shown} / ${ROUNDS}`;
  el.statScore.textContent = String(state.score);
  el.statBest.textContent = state.stats.best === null ? '—' : String(state.stats.best);
  el.roundLabel.textContent = `Round ${shown} of ${ROUNDS}`;
}

function startSession() {
  state.pairs = buildSession(state.difficulty);
  state.round = 0;
  state.score = 0;
  state.results = [];
  el.summary.hidden = true;
  showRound();
}

function showRound() {
  const pair = state.pairs[state.round];
  state.revealed = false;

  el.fromName.textContent = pair.from.name;
  el.fromCountry.textContent = pair.from.country;
  el.toName.textContent = pair.to.name;
  el.toCountry.textContent = pair.to.country;

  el.result.hidden = true;
  el.mapCard.hidden = true;
  el.aimActions.hidden = false;
  // SVG elements have no .hidden property: toggle the attribute
  el.needleMap.toggleAttribute('hidden', true);
  el.needleGlobe.toggleAttribute('hidden', true);
  el.dial.classList.remove('is-locked');
  el.dial.setAttribute('aria-disabled', 'false');

  setHeading(0);
  updateStats();
}

function smoothScroll() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}

function lockIn() {
  if (state.revealed) return;
  state.revealed = true;

  const pair = state.pairs[state.round];
  const err = angularError(state.heading, pair.map);
  const points = roundPoints(err);
  state.score += points;
  state.results.push({ pair, heading: state.heading, err, points });

  // The scored map needle sweeps from the player's heading along the shortest turn
  const signed = ((pair.map - state.heading + 540) % 360) - 180;
  el.needleMap.classList.add('no-anim');
  setNeedle(el.needleMap, state.heading);
  el.needleMap.toggleAttribute('hidden', false);
  setNeedle(el.needleGlobe, pair.globe);
  el.needleGlobe.toggleAttribute('hidden', false);
  // Force the start position before animating
  void el.needleMap.getBoundingClientRect();
  el.needleMap.classList.remove('no-anim');
  setNeedle(el.needleMap, state.heading + signed);

  el.dial.classList.add('is-locked');
  el.dial.setAttribute('aria-disabled', 'true');

  el.resError.textContent = `${Math.round(err)}°`;
  el.resPoints.textContent = `+${points}`;
  el.resDistance.textContent = Math.round(pair.km).toLocaleString('en-US');

  el.resFeedback.className = 'atlas-feedback ' + (err <= 15 ? 'is-correct' : err >= 45 ? 'is-wrong' : '');
  el.resFeedback.textContent = err <= 5 ? 'Spot on.' : err <= 15 ? 'Close — a good map reader.' : err <= 45 ? 'In the right quarter.' : 'Way off course.';

  const mapText = formatBearing(pair.map);
  const globeText = formatBearing(pair.globe);
  el.resExplain.textContent = pair.gap >= BONUS_GAP_DEG
    ? `Planes actually set off at ${globeText}: on a round Earth the shortest path curves toward the pole.`
    : `Here the map and the globe almost agree: planes set off at ${globeText}.`;

  el.legendPlayer.textContent = formatBearing(state.heading);
  el.legendMap.textContent = mapText;
  el.legendGlobe.textContent = globeText;

  el.btnNext.innerHTML = state.round + 1 >= ROUNDS
    ? 'See results <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/></svg>'
    : 'Next round <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

  el.aimActions.hidden = true;
  el.result.hidden = false;
  // Show the map first: drawMap measures its rendered width
  el.mapCard.hidden = false;
  drawMap(pair);
  updateStats();
  el.result.scrollIntoView({ block: 'nearest', behavior: smoothScroll() });
  el.btnNext.focus({ preventScroll: true });
}

function nextRound() {
  if (!state.revealed) return;
  state.round += 1;
  if (state.round >= ROUNDS) {
    finishSession();
    return;
  }
  showRound();
  if (window.matchMedia('(max-width: 820px)').matches) {
    document.querySelector('.cp-layout').scrollIntoView({ block: 'start', behavior: smoothScroll() });
  }
  el.dial.focus({ preventScroll: true });
}

function finishSession() {
  const isBest = state.stats.best === null || state.score > state.stats.best;
  if (isBest) state.stats.best = state.score;
  state.stats.sessions += 1;
  saveStats();

  el.summaryTotal.textContent = String(state.score);
  el.summaryBest.textContent = isBest
    ? `New personal best. Sessions played: ${state.stats.sessions}.`
    : `Personal best: ${state.stats.best}. Sessions played: ${state.stats.sessions}.`;
  el.summaryList.replaceChildren();
  for (const r of state.results) {
    const li = document.createElement('li');
    const route = document.createElement('span');
    route.className = 'cp-summary-route';
    route.textContent = `${r.pair.from.name} → ${r.pair.to.name}`;
    const detail = document.createElement('span');
    detail.className = 'cp-summary-detail mono';
    detail.textContent = `${Math.round(r.err)}° off · ${r.points}`;
    li.append(route, detail);
    el.summaryList.append(li);
  }
  state.round = ROUNDS - 1;
  updateStats();
  el.summary.hidden = false;
  el.btnAgain.focus();
}

/* ---------- Wiring ---------- */

function setDifficulty(level) {
  if (level === state.difficulty) return;
  state.difficulty = level;
  el.difficultyButtons.forEach(b => {
    const on = b.dataset.difficulty === level;
    b.setAttribute('aria-pressed', String(on));
    b.classList.toggle('is-active', on);
  });
  startSession();
}

function init() {
  drawTicks();
  bindDial();
  el.mapLand.setAttribute('d', LAND_PATH);

  el.btnLock.addEventListener('click', lockIn);
  el.btnNext.addEventListener('click', nextRound);
  el.btnRestart.addEventListener('click', startSession);
  el.btnAgain.addEventListener('click', startSession);
  el.difficultyButtons.forEach(b => {
    b.classList.toggle('is-active', b.dataset.difficulty === state.difficulty);
    b.addEventListener('click', () => setDifficulty(b.dataset.difficulty));
  });

  // Enter advances after a reveal; a focused button already handles Enter itself
  window.addEventListener('keydown', event => {
    if (event.key !== 'Enter' || !state.revealed) return;
    if (event.target instanceof Element && event.target.closest('button, [role="slider"]')) return;
    if (!el.summary.hidden) return;
    nextRound();
  });

  startSession();
}

init();
