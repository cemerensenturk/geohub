/**
 * Pin the City
 * A city name and a blank world map: drop a pin where the city is.
 * Points fall off with distance: round(100 * exp(-km / 1500)).
 */

import CITIES from '../../satelcity/js/cities.js';
import { MAP_WIDTH, MAP_HEIGHT, LAND_PATH, project, unproject } from '../../data/worldmap.js';

const ROUNDS = 10;
const MIN_ZOOM = 1;
const MAX_ZOOM = 12;
const TAP_SLOP = 6; // px a pointer may move and still count as a tap
const STORAGE_KEY = 'geohub_pinthecity_stats_v1';
const SVG_NS = 'http://www.w3.org/2000/svg';
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// ---------- Geometry ----------

export function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(a)));
}

export const pointsFor = km => Math.round(100 * Math.exp(-km / 1500));

const fmt = n => Math.round(n).toLocaleString('en-US');

function shuffle(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------- Persistence ----------

function loadStats() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : null;
    return { bestEasy: 0, bestHard: 0, sessions: 0, ...(data || {}) };
  } catch (e) {
    return { bestEasy: 0, bestHard: 0, sessions: 0 };
  }
}

function saveStats(stats) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch (e) {
    // Storage unavailable (private mode): keep playing without saving
  }
}

// ---------- Map view (viewBox camera) ----------

class MapView {
  constructor(container, svg, onChange) {
    this.container = container;
    this.svg = svg;
    this.onChange = onChange;
    this.cx = MAP_WIDTH / 2;
    this.cy = MAP_HEIGHT / 2;
    this.zoom = 1;
    this.anim = null;
  }

  size() {
    const r = this.container.getBoundingClientRect();
    return { cw: Math.max(1, r.width), ch: Math.max(1, r.height), left: r.left, top: r.top };
  }

  // Width/height of the view at zoom 1: the whole world, matching the container's aspect
  fullSize() {
    const { cw, ch } = this.size();
    const aspect = cw / ch;
    return aspect > MAP_WIDTH / MAP_HEIGHT
      ? { w: MAP_HEIGHT * aspect, h: MAP_HEIGHT }
      : { w: MAP_WIDTH, h: MAP_WIDTH / aspect };
  }

  box() {
    const full = this.fullSize();
    const w = full.w / this.zoom;
    const h = full.h / this.zoom;
    const clampAxis = (c, span, max) => (span >= max ? max / 2 : Math.min(max - span / 2, Math.max(span / 2, c)));
    this.cx = clampAxis(this.cx, w, MAP_WIDTH);
    this.cy = clampAxis(this.cy, h, MAP_HEIGHT);
    return { x: this.cx - w / 2, y: this.cy - h / 2, w, h };
  }

  render() {
    const b = this.box();
    this.svg.setAttribute('viewBox', `${b.x} ${b.y} ${b.w} ${b.h}`);
    this.onChange(b);
  }

  // Map units per screen pixel
  unitsPerPx() {
    const { cw } = this.size();
    return this.box().w / cw;
  }

  clientToMap(clientX, clientY) {
    const { cw, left, top } = this.size();
    const b = this.box();
    const k = b.w / cw;
    return [b.x + (clientX - left) * k, b.y + (clientY - top) * k];
  }

  zoomAt(factor, mx, my) {
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, this.zoom * factor));
    const ratio = this.zoom / next;
    this.cx = mx + (this.cx - mx) * ratio;
    this.cy = my + (this.cy - my) * ratio;
    this.zoom = next;
    this.render();
  }

  zoomBy(factor) {
    const b = this.box();
    this.zoomAt(factor, b.x + b.w / 2, b.y + b.h / 2);
  }

  panPx(dx, dy) {
    const k = this.unitsPerPx();
    this.cx -= dx * k;
    this.cy -= dy * k;
    this.render();
  }

  stopAnimation() {
    if (this.anim) cancelAnimationFrame(this.anim);
    this.anim = null;
  }

  // Animate to a target centre and zoom
  flyTo(cx, cy, zoom) {
    this.stopAnimation();
    zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
    if (reducedMotion.matches) {
      Object.assign(this, { cx, cy, zoom });
      this.render();
      return;
    }
    const from = { cx: this.cx, cy: this.cy, zoom: this.zoom };
    const start = performance.now();
    const duration = 650;
    const step = now => {
      const t = Math.min(1, (now - start) / duration);
      const e = 1 - Math.pow(1 - t, 3);
      this.cx = from.cx + (cx - from.cx) * e;
      this.cy = from.cy + (cy - from.cy) * e;
      this.zoom = Math.exp(Math.log(from.zoom) + (Math.log(zoom) - Math.log(from.zoom)) * e);
      this.render();
      this.anim = t < 1 ? requestAnimationFrame(step) : null;
    };
    this.anim = requestAnimationFrame(step);
  }

  // Zoom so a map-unit box fits with padding
  fit(x0, y0, x1, y1) {
    const full = this.fullSize();
    const pad = 1.6;
    const w = Math.max(80, (x1 - x0) * pad);
    const h = Math.max(80 * full.h / full.w, (y1 - y0) * pad);
    const zoom = Math.min(full.w / w, full.h / h);
    this.flyTo((x0 + x1) / 2, (y0 + y1) / 2, zoom);
  }

  // Starting zoom: the whole world on wide screens; on tall (phone) screens fill the
  // height instead of showing a thin strip, and let the player pan sideways
  homeZoom() {
    const { cw, ch } = this.size();
    return Math.min(MAX_ZOOM, Math.max(1, (MAP_WIDTH / MAP_HEIGHT) / (cw / ch)));
  }

  reset(instant = false) {
    if (instant) {
      this.stopAnimation();
      Object.assign(this, { cx: MAP_WIDTH / 2, cy: MAP_HEIGHT / 2, zoom: this.homeZoom() });
      this.render();
      return;
    }
    this.flyTo(MAP_WIDTH / 2, MAP_HEIGHT / 2, this.homeZoom());
  }
}

// ---------- Game ----------

class PinTheCity {
  constructor() {
    this.el = {
      round: document.getElementById('stat-round'),
      score: document.getElementById('stat-score'),
      best: document.getElementById('stat-best'),
      difficultyButtons: [...document.querySelectorAll('[data-difficulty]')],
      city: document.getElementById('prompt-city'),
      country: document.getElementById('prompt-country'),
      map: document.getElementById('map'),
      svg: document.getElementById('map-svg'),
      sea: document.getElementById('map-sea'),
      graticule: document.getElementById('map-graticule'),
      land: document.getElementById('map-land'),
      line: document.getElementById('map-line'),
      pin: document.getElementById('map-pin'),
      target: document.getElementById('map-target'),
      targetLabel: document.getElementById('map-target-label'),
      targetText: document.getElementById('map-target-text'),
      zoomIn: document.getElementById('zoom-in'),
      zoomOut: document.getElementById('zoom-out'),
      zoomReset: document.getElementById('zoom-reset'),
      sideQuestion: document.getElementById('side-question'),
      sideResult: document.getElementById('side-result'),
      confirm: document.getElementById('btn-confirm'),
      next: document.getElementById('btn-next'),
      nextLabel: document.getElementById('btn-next-label'),
      km: document.getElementById('result-km'),
      points: document.getElementById('result-points'),
      feedback: document.getElementById('result-feedback'),
      summary: document.getElementById('summary'),
      summaryTotal: document.getElementById('summary-total'),
      summaryBest: document.getElementById('summary-best'),
      summaryList: document.getElementById('summary-list'),
      again: document.getElementById('btn-again'),
    };

    this.stats = loadStats();
    this.difficulty = 'easy';
    this.pin = null;
    this.phase = 'question';

    this.view = new MapView(this.el.map, this.el.svg, box => this.onViewChange(box));
    this.drawStaticMap();
    this.bindEvents();
    this.startSession();

    new ResizeObserver(() => this.view.render()).observe(this.el.map);
  }

  // ----- Static map layers -----

  drawStaticMap() {
    this.el.land.setAttribute('d', LAND_PATH);
    // Sea reaches far past the world so letterboxed views never show a gap
    Object.entries({ x: -MAP_WIDTH, y: -MAP_HEIGHT, width: MAP_WIDTH * 3, height: MAP_HEIGHT * 3 })
      .forEach(([k, v]) => this.el.sea.setAttribute(k, v));

    const [, yTop] = project(84, 0);
    const [, yBottom] = project(-60, 0);
    const lines = [];
    for (let lng = -180; lng <= 180; lng += 30) {
      const [x] = project(0, lng);
      lines.push({ x1: x, y1: yTop, x2: x, y2: yBottom, equator: false });
    }
    for (const lat of [-60, -30, 0, 30, 60]) {
      const [, y] = project(lat, 0);
      lines.push({ x1: 0, y1: y, x2: MAP_WIDTH, y2: y, equator: lat === 0 });
    }
    for (const l of lines) {
      const line = document.createElementNS(SVG_NS, 'line');
      ['x1', 'y1', 'x2', 'y2'].forEach(k => line.setAttribute(k, l[k]));
      if (l.equator) line.setAttribute('class', 'is-equator');
      this.el.graticule.appendChild(line);
    }
  }

  // Keep markers a constant on-screen size whatever the zoom
  onViewChange() {
    const k = this.view.unitsPerPx();
    const place = (node, x, y) => node.setAttribute('transform', `translate(${x} ${y}) scale(${k})`);
    if (this.pin) place(this.el.pin, this.pin[0], this.pin[1]);
    if (this.targetXY) {
      place(this.el.target, this.targetXY[0], this.targetXY[1]);
      place(this.el.targetLabel, this.targetXY[0], this.targetXY[1]);
    }
  }

  // ----- Events -----

  bindEvents() {
    this.el.difficultyButtons.forEach(btn => btn.addEventListener('click', () => {
      if (btn.dataset.difficulty === this.difficulty) return;
      this.difficulty = btn.dataset.difficulty;
      this.el.difficultyButtons.forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
      this.startSession();
    }));

    this.el.zoomIn.addEventListener('click', () => this.view.zoomBy(1.6));
    this.el.zoomOut.addEventListener('click', () => this.view.zoomBy(1 / 1.6));
    this.el.zoomReset.addEventListener('click', () => this.view.reset());
    this.el.confirm.addEventListener('click', () => this.confirm());
    this.el.next.addEventListener('click', () => this.next());
    this.el.again.addEventListener('click', () => this.startSession());

    this.bindPointer();

    this.el.map.addEventListener('wheel', e => {
      e.preventDefault();
      this.view.stopAnimation();
      const [mx, my] = this.view.clientToMap(e.clientX, e.clientY);
      this.view.zoomAt(Math.exp(-e.deltaY * 0.0015), mx, my);
    }, { passive: false });

    this.el.map.addEventListener('keydown', e => {
      const step = 60;
      const moves = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
      if (moves[e.key]) {
        e.preventDefault();
        this.view.stopAnimation();
        this.view.panPx(...moves[e.key]);
      }
    });

    window.addEventListener('keydown', e => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (!this.el.summary.hidden) {
        if (e.key === 'Enter' && !(e.target instanceof Element && e.target.closest('button'))) this.startSession();
        return;
      }
      if (e.key === '+' || e.key === '=') { this.view.zoomBy(1.6); return; }
      if (e.key === '-' || e.key === '_') { this.view.zoomBy(1 / 1.6); return; }
      if (e.key !== 'Enter') return;
      // A focused button already turns Enter into a click
      if (e.target instanceof Element && e.target.closest('button')) return;
      if (this.phase === 'question' && this.pin) this.confirm();
      else if (this.phase === 'revealed') this.next();
    });
  }

  bindPointer() {
    const map = this.el.map;
    const pointers = new Map();
    let gesture = null;

    const start = () => {
      const pts = [...pointers.values()];
      gesture = {
        moved: gesture ? gesture.moved : false,
        multi: (gesture && gesture.multi) || pts.length > 1,
        startX: pts[0].x,
        startY: pts[0].y,
        lastX: pts[0].x,
        lastY: pts[0].y,
        lastDist: pts.length > 1 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : 0,
      };
    };

    map.addEventListener('pointerdown', e => {
      if (e.target.closest('.pc-zoom')) return;
      if (e.button !== undefined && e.button > 0) return;
      try { map.setPointerCapture(e.pointerId); } catch (err) { /* pointer already gone */ }
      this.view.stopAnimation();
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1) gesture = null;
      start();
    });

    map.addEventListener('pointermove', e => {
      if (!pointers.has(e.pointerId) || !gesture) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const pts = [...pointers.values()];

      if (pts.length > 1) {
        const midX = (pts[0].x + pts[1].x) / 2;
        const midY = (pts[0].y + pts[1].y) / 2;
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        if (gesture.lastDist > 0) {
          const [mx, my] = this.view.clientToMap(midX, midY);
          this.view.zoomAt(dist / gesture.lastDist, mx, my);
        }
        this.view.panPx(midX - gesture.lastX, midY - gesture.lastY);
        gesture.lastDist = dist;
        gesture.lastX = midX;
        gesture.lastY = midY;
        gesture.moved = true;
        return;
      }

      const p = pts[0];
      if (Math.hypot(p.x - gesture.startX, p.y - gesture.startY) > TAP_SLOP) gesture.moved = true;
      if (gesture.moved) {
        this.view.panPx(p.x - gesture.lastX, p.y - gesture.lastY);
        map.classList.add('is-dragging');
      }
      gesture.lastX = p.x;
      gesture.lastY = p.y;
    });

    const end = e => {
      if (!pointers.has(e.pointerId)) return;
      pointers.delete(e.pointerId);
      map.classList.remove('is-dragging');
      if (pointers.size > 0) {
        // One finger left after a pinch: continue as a pan from here
        start();
        return;
      }
      const wasTap = gesture && !gesture.moved && !gesture.multi && e.type === 'pointerup';
      gesture = null;
      if (wasTap) this.placePin(e.clientX, e.clientY);
    };
    map.addEventListener('pointerup', end);
    map.addEventListener('pointercancel', end);
  }

  // ----- Session flow -----

  startSession() {
    const pool = this.difficulty === 'easy' ? CITIES.filter(c => c.difficulty === 'easy') : CITIES;
    this.cities = shuffle(pool).slice(0, ROUNDS);
    this.index = 0;
    this.score = 0;
    this.results = [];
    this.el.summary.hidden = true;
    this.showRound();
  }

  showRound() {
    const city = this.cities[this.index];
    this.phase = 'question';
    this.pin = null;
    this.targetXY = null;

    this.el.city.textContent = city.name;
    if (this.difficulty === 'easy') {
      this.el.country.textContent = city.country;
      this.el.country.hidden = false;
    } else {
      this.el.country.hidden = true;
    }

    this.el.pin.toggleAttribute('hidden', true);
    this.el.target.toggleAttribute('hidden', true);
    this.el.targetLabel.toggleAttribute('hidden', true);
    this.el.line.toggleAttribute('hidden', true);
    this.el.map.classList.remove('is-revealed');

    this.el.sideQuestion.hidden = false;
    this.el.sideResult.hidden = true;
    this.el.confirm.disabled = true;

    this.updateStats();
    this.view.reset(this.index === 0);
  }

  placePin(clientX, clientY) {
    if (this.phase !== 'question') return;
    const [x, y] = this.view.clientToMap(clientX, clientY);
    // Only inside the mapped world
    if (x < 0 || x > MAP_WIDTH || y < 0 || y > MAP_HEIGHT) return;
    this.pin = [x, y];
    this.el.pin.toggleAttribute('hidden', false);
    this.el.confirm.disabled = false;
    this.onViewChange();
  }

  confirm() {
    if (this.phase !== 'question' || !this.pin) return;
    const city = this.cities[this.index];
    const [pinLat, pinLng] = unproject(this.pin[0], this.pin[1]);
    const km = haversineKm(pinLat, pinLng, city.lat, city.lng);
    const points = pointsFor(km);
    this.score += points;
    this.results.push({ city, km, points });
    this.phase = 'revealed';

    const [tx, ty] = project(city.lat, city.lng);
    this.targetXY = [tx, ty];
    this.el.targetText.textContent = city.name;
    // Label goes on the side with more room
    const textAnchor = tx > MAP_WIDTH * 0.75 ? 'end' : 'start';
    this.el.targetText.setAttribute('text-anchor', textAnchor);
    this.el.targetText.setAttribute('x', textAnchor === 'end' ? -18 : 18);
    this.el.targetText.setAttribute('y', 5);

    const line = this.el.line;
    line.setAttribute('x1', this.pin[0]);
    line.setAttribute('y1', this.pin[1]);
    line.setAttribute('x2', tx);
    line.setAttribute('y2', ty);
    line.toggleAttribute('hidden', false);
    this.el.target.toggleAttribute('hidden', false);
    this.el.targetLabel.toggleAttribute('hidden', false);
    this.el.map.classList.add('is-revealed');

    // Results panel
    this.el.km.textContent = `${fmt(km)} km`;
    this.el.points.textContent = `+${points}`;
    const where = `${city.name}, ${city.country}`;
    let message;
    let tone = '';
    if (km < 150) { message = `Spot on: ${where}.`; tone = 'is-correct'; }
    else if (points >= 60) { message = `Close! ${where}.`; tone = 'is-correct'; }
    else if (points >= 20) { message = `Not bad. ${where}.`; }
    else { message = `Far away. ${where}.`; tone = 'is-wrong'; }
    this.el.feedback.textContent = message;
    this.el.feedback.className = `atlas-feedback ${tone}`.trim();

    this.el.sideQuestion.hidden = true;
    this.el.sideResult.hidden = false;
    this.el.nextLabel.textContent = this.index === ROUNDS - 1 ? 'See results' : 'Next city';
    this.updateStats();
    this.onViewChange();

    // Frame both points (zooming out as far as the whole world when they are far apart)
    const x0 = Math.min(this.pin[0], tx), x1 = Math.max(this.pin[0], tx);
    const y0 = Math.min(this.pin[1], ty), y1 = Math.max(this.pin[1], ty);
    this.view.fit(x0, y0, x1, y1);
    this.el.next.focus({ preventScroll: true });
  }

  next() {
    if (this.phase !== 'revealed') return;
    if (this.index < ROUNDS - 1) {
      this.index += 1;
      this.showRound();
    } else {
      this.finish();
    }
  }

  finish() {
    const bestKey = this.difficulty === 'easy' ? 'bestEasy' : 'bestHard';
    const isBest = this.score > this.stats[bestKey];
    if (isBest) this.stats[bestKey] = this.score;
    this.stats.sessions += 1;
    saveStats(this.stats);
    this.phase = 'done';

    this.el.summaryTotal.textContent = fmt(this.score);
    this.el.summaryBest.textContent = isBest
      ? `New best on ${this.difficulty === 'easy' ? 'Easy' : 'Hard'}!`
      : `Best on ${this.difficulty === 'easy' ? 'Easy' : 'Hard'}: ${fmt(this.stats[bestKey])}`;
    this.el.summaryList.replaceChildren(...this.results.map(r => {
      const li = document.createElement('li');
      const name = document.createElement('span');
      name.className = 'pc-summary-city';
      name.textContent = r.city.name;
      const km = document.createElement('span');
      km.className = 'mono pc-summary-km';
      km.textContent = `${fmt(r.km)} km`;
      const pts = document.createElement('span');
      pts.className = 'mono pc-summary-pts';
      pts.textContent = `+${r.points}`;
      li.append(name, km, pts);
      return li;
    }));
    this.updateStats();
    this.el.summary.hidden = false;
    this.el.again.focus();
  }

  updateStats() {
    this.el.round.textContent = `${Math.min(this.index + 1, ROUNDS)} / ${ROUNDS}`;
    this.el.score.textContent = fmt(this.score);
    const best = this.stats[this.difficulty === 'easy' ? 'bestEasy' : 'bestHard'];
    this.el.best.textContent = best > 0 ? fmt(best) : '–';
  }
}

new PinTheCity();
