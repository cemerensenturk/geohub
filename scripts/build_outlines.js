// Rebuilds BorderLine svgPath outlines from Natural Earth 1:50m (world-atlas TopoJSON).
// Inputs (download first):
//   https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-50m.json
//   https://cdn.jsdelivr.net/npm/i18n-iso-countries@7.11.0/codes.json
// Usage: node scripts/build_outlines.js data/countries.json countries-50m.json codes.json data/countries.json
// Only records that already have an svgPath are redrawn; each also gets svgScale and svgLat.
// Regenerate data/countries.js afterwards.
const fs = require('fs');
const [, , inPath, topoPath, codesPath, outPath] = process.argv;

const countries = JSON.parse(fs.readFileSync(inPath, 'utf8'));
const topo = JSON.parse(fs.readFileSync(topoPath, 'utf8'));
const codes = JSON.parse(fs.readFileSync(codesPath, 'utf8'));
const alpha2ToNum = new Map(codes.map(([a2, , num]) => [a2, String(Number(num))]));

// ---- Minimal TopoJSON decoding (quantized arcs) ----
const { scale, translate } = topo.transform;
const arcs = topo.arcs.map(arc => {
  let x = 0, y = 0;
  return arc.map(([dx, dy]) => {
    x += dx; y += dy;
    return [x * scale[0] + translate[0], y * scale[1] + translate[1]];
  });
});
function arcPoints(i) {
  return i >= 0 ? arcs[i] : arcs[~i].slice().reverse();
}
function ring(indices) {
  const pts = [];
  indices.forEach((i, k) => {
    const a = arcPoints(i);
    pts.push(...(k === 0 ? a : a.slice(1)));
  });
  return pts;
}
function polygons(geom) {
  if (geom.type === 'Polygon') return [geom.arcs.map(ring)];
  if (geom.type === 'MultiPolygon') return geom.arcs.map(p => p.map(ring));
  return [];
}

const geoms = topo.objects.countries.geometries;
// Several shapes can share an ISO number (Australia and Ashmore and Cartier Is. are both 036)
const byNum = new Map();
for (const g of geoms.filter(g => g.id !== undefined)) {
  const k = String(Number(g.id));
  byNum.set(k, (byNum.get(k) || []).concat(g));
}
const pickByNum = (num, name) => {
  const list = byNum.get(num) || [];
  return list.find(g => g.properties.name === name) || list[0];
};
const byName = new Map(geoms.map(g => [g.properties.name, g]));

// Natural Earth splits these off; fold them back into the ISO country
const EXTRA = { CY: ['N. Cyprus'], SO: ['Somaliland'] };
const NAME_FALLBACK = { XK: 'Kosovo' };

// ---- Geometry helpers ----
const mercY = lat => {
  const c = Math.max(-85, Math.min(85, lat)) * Math.PI / 180;
  return Math.log(Math.tan(Math.PI / 4 + c / 2)) * 180 / Math.PI;
};
function ringArea(pts) {
  let a = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) a += (pts[j][0] + pts[i][0]) * (pts[j][1] - pts[i][1]);
  return Math.abs(a / 2);
}
function bbox(list) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const pts of list) for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return [x0, y0, x1, y1];
}
function bboxGap(a, b) {
  const dx = Math.max(0, a[0] - b[2], b[0] - a[2]);
  const dy = Math.max(0, a[1] - b[3], b[1] - a[3]);
  return Math.hypot(dx, dy);
}
function simplify(pts, tol) {
  if (pts.length < 4) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop();
    let maxD = 0, idx = -1;
    const [ax, ay] = pts[s], [bx, by] = pts[e];
    const len = Math.hypot(bx - ax, by - ay) || 1e-9;
    for (let i = s + 1; i < e; i++) {
      const d = Math.abs((bx - ax) * (ay - pts[i][1]) - (ax - pts[i][0]) * (by - ay)) / len;
      if (d > maxD) { maxD = d; idx = i; }
    }
    if (maxD > tol && idx > 0) { keep[idx] = 1; stack.push([s, idx], [idx, e]); }
  }
  return pts.filter((_, i) => keep[i]);
}

// Per-country drops for far-flung parts the generic rule keeps
const DROP = {
  US: ([x, y]) => x < -125 || y < 24,      // Alaska, Hawaii: keep the contiguous 48
  NO: ([, y]) => y > 74,                   // Svalbard, Jan Mayen
};

const invMerc = m => (2 * Math.atan(Math.exp(m * Math.PI / 180)) - Math.PI / 2) * 180 / Math.PI;

const BOX = 400, PAD = 35, TOL = 1.0, MIN_PX_AREA = 2;
let total = 0;
const report = [];

for (const c of countries) {
  if (!c.svgPath) continue;
  const a2 = (c.flags.png.match(/\/(\w\w)\.png$/) || [])[1]?.toUpperCase();
  let g = pickByNum(alpha2ToNum.get(a2), c.name.common) || byName.get(NAME_FALLBACK[a2]);
  if (!g) { report.push(`NO MATCH ${c.name.common} ${a2}`); continue; }
  let polys = polygons(g);
  for (const extra of EXTRA[a2] || []) polys = polys.concat(polygons(byName.get(extra)));

  // Drop known far-flung parts on raw lon/lat (a part goes only if every point matches)
  if (DROP[a2]) polys = polys.filter(p => !p[0].every(DROP[a2]));

  // Antimeridian: shift western longitudes east when the shape wraps
  const [lx0, , lx1] = bbox(polys.map(p => p[0]));
  if (lx1 - lx0 > 180) polys = polys.map(p => p.map(r => r.map(([x, y]) => [x < 0 ? x + 360 : x, y])));

  // Project (Mercator, y down)
  polys = polys.map(p => p.map(r => r.map(([x, y]) => [x, -mercY(y)])));

  // Keep the main landmass plus sizeable parts near it
  polys.sort((p, q) => ringArea(q[0]) - ringArea(p[0]));
  const mainArea = ringArea(polys[0][0]);
  const kept = [polys[0]];
  let kb = bbox([polys[0][0]]);
  for (const p of polys.slice(1)) {
    const area = ringArea(p[0]);
    if (area < mainArea * 0.004) continue;
    const diag = Math.hypot(kb[2] - kb[0], kb[3] - kb[1]);
    if (bboxGap(bbox([p[0]]), kb) > diag * 0.6) continue;
    kept.push(p);
    kb = bbox(kept.map(k => k[0]));
  }

  // Fit into the 400x400 box with 35px padding
  const [x0, y0, x1, y1] = kb;
  const s = (BOX - 2 * PAD) / Math.max(x1 - x0, y1 - y0);
  const ox = (BOX - (x1 - x0) * s) / 2, oy = (BOX - (y1 - y0) * s) / 2;
  let d = '';
  let pts = 0;
  for (const p of kept) {
    for (const r of p) {
      const px = r.map(([x, y]) => [(x - x0) * s + ox, (y - y0) * s + oy]);
      if (ringArea(px) < MIN_PX_AREA) continue;
      // Closed ring: split at the point farthest from the start so both halves have distinct ends
      let far = 0, farD = -1;
      px.forEach(([x, y], i) => { const dd = Math.hypot(x - px[0][0], y - px[0][1]); if (dd > farD) { farD = dd; far = i; } });
      const sp = simplify(px.slice(0, far + 1), TOL).concat(simplify(px.slice(far), TOL).slice(1));
      if (sp.length < 4) continue;
      pts += sp.length;
      d += 'M' + sp.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L') + 'Z';
    }
  }
  c.svgPath = d;
  // Pixels per Mercator degree and the outline's middle latitude, so games can
  // redraw several outlines at one common scale (or undo Mercator's stretching)
  c.svgScale = Number(s.toFixed(4));
  c.svgLat = Number(invMerc(-(y0 + y1) / 2).toFixed(2));
  total += d.length;
  report.push(`${c.name.common}: parts=${kept.length} pts=${pts}`);
}

fs.writeFileSync(outPath, JSON.stringify(countries, null, 2));
console.log(report.filter(l => l.startsWith('NO MATCH')).join('\n') || 'all matched');
console.log('svg bytes', total);
