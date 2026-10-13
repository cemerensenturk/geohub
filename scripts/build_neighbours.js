// Builds neighbours/js/data.js: every country's Mercator map path (same units as data/worldmap.js)
// and its land neighbours, derived from Natural Earth 1:50m topology (two countries are
// neighbours when their outlines share an arc).
// Inputs (download first):
//   https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-50m.json
//   https://cdn.jsdelivr.net/npm/i18n-iso-countries@7.11.0/codes.json
// Usage: node scripts/build_neighbours.js countries-50m.json codes.json data/countries.json neighbours/js/data.js
const fs = require('fs');
const [, , topoPath, codesPath, countriesPath, outPath] = process.argv;
const topo = JSON.parse(fs.readFileSync(topoPath, 'utf8'));
const codes = JSON.parse(fs.readFileSync(codesPath, 'utf8'));
const ours = JSON.parse(fs.readFileSync(countriesPath, 'utf8'));

const numToA2 = new Map(codes.map(([a2, , num]) => [String(Number(num)), a2]));
const nameByA2 = new Map(ours.map(c => [c.flags.png.match(/\/(\w\w)\.png$/)[1].toUpperCase(), c.name.common]));

// Natural Earth splits these off or leaves them without an ISO number
const MERGE_INTO = { 'N. Cyprus': 'CY', 'Somaliland': 'SO' };
const NAME_TO_A2 = { 'Kosovo': 'XK' };
const SKIP = new Set(['Antarctica', 'Ashmore and Cartier Is.', 'Siachen Glacier', 'Indian Ocean Ter.']);
// Drawn on the map but not counted as anyone's neighbour (China's SARs; China has 14 neighbours)
const NOT_NEIGHBOURS = new Set(['HK', 'MO']);

// Same projection as data/worldmap.js
const WIDTH = 1000, LAT_TOP = 84, K = WIDTH / 360, TOL = 0.5, MIN_PX_AREA = 0.5;
const mercY = lat => {
  const c = Math.max(-85, Math.min(85, lat)) * Math.PI / 180;
  return Math.log(Math.tan(Math.PI / 4 + c / 2)) * 180 / Math.PI;
};
const TOP = mercY(LAT_TOP);
const project = (lon, lat) => [(lon + 180) * K, (TOP - mercY(lat)) * K];

// Minimal TopoJSON decoding
const { scale, translate } = topo.transform;
const arcs = topo.arcs.map(arc => {
  let x = 0, y = 0;
  return arc.map(([dx, dy]) => { x += dx; y += dy; return [x * scale[0] + translate[0], y * scale[1] + translate[1]]; });
});
const arcPoints = i => (i >= 0 ? arcs[i] : arcs[~i].slice().reverse());
const ring = idx => idx.reduce((pts, i, k) => pts.concat(k === 0 ? arcPoints(i) : arcPoints(i).slice(1)), []);
const polyArcs = g => (g.type === 'Polygon' ? [g.arcs] : g.type === 'MultiPolygon' ? g.arcs : []);

const ringArea = pts => {
  let a = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) a += (pts[j][0] + pts[i][0]) * (pts[j][1] - pts[i][1]);
  return Math.abs(a / 2);
};
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

// Group geometries by ISO alpha-2
const groups = new Map();
for (const g of topo.objects.countries.geometries) {
  const name = g.properties.name;
  if (SKIP.has(name)) continue;
  const a2 = MERGE_INTO[name] || NAME_TO_A2[name] || (g.id !== undefined && numToA2.get(String(Number(g.id))));
  if (!a2 || !nameByA2.has(a2)) continue;
  if (!groups.has(a2)) groups.set(a2, { a2, geoms: [], arcIds: new Set() });
  const grp = groups.get(a2);
  grp.geoms.push(g);
  for (const poly of polyArcs(g)) for (const r of poly) for (const i of r) grp.arcIds.add(i < 0 ? ~i : i);
}

// Arc -> countries using it; arcs shared by two countries are land borders
const arcOwners = new Map();
for (const grp of groups.values()) for (const i of grp.arcIds) arcOwners.set(i, (arcOwners.get(i) || new Set()).add(grp.a2));
const neighbours = new Map([...groups.keys()].map(k => [k, new Set()]));
for (const owners of arcOwners.values()) {
  if (owners.size < 2) continue;
  for (const a of owners) for (const b of owners) {
    if (a !== b && !NOT_NEIGHBOURS.has(a) && !NOT_NEIGHBOURS.has(b)) neighbours.get(a).add(b);
  }
}

const out = [];
for (const grp of groups.values()) {
  let d = '';
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, mainArea = 0, mainBox = null;
  for (const g of grp.geoms) {
    for (const poly of polyArcs(g)) {
      for (const [ri, r] of poly.entries()) {
        const raw = ring(r);
        const wraps = raw.some((pt, i) => i > 0 && Math.abs(pt[0] - raw[i - 1][0]) > 180);
        const variants = wraps
          ? [raw.map(([lon, lat]) => [lon < 0 ? lon + 360 : lon, lat]), raw.map(([lon, lat]) => [lon > 0 ? lon - 360 : lon, lat])]
          : [raw];
        for (const v of variants) {
          const px = v.map(([lon, lat]) => project(lon, lat));
          const area = ringArea(px);
          if (area < MIN_PX_AREA) continue;
          let far = 0, farD = -1;
          px.forEach(([x, y], i) => { const dd = Math.hypot(x - px[0][0], y - px[0][1]); if (dd > farD) { farD = dd; far = i; } });
          const sp = simplify(px.slice(0, far + 1), TOL).concat(simplify(px.slice(far), TOL).slice(1));
          if (sp.length < 4) continue;
          d += 'M' + sp.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L') + 'Z';
          // Box around the largest outer ring, so zooming ignores far-flung islands
          if (ri === 0 && !wraps && area > mainArea) {
            mainArea = area;
            mainBox = sp.reduce((b, [x, y]) => [Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y)], [Infinity, Infinity, -Infinity, -Infinity]);
          }
        }
      }
    }
  }
  if (!d) {
    // Microstates (Monaco, Vatican…) are below the size filter: draw their largest ring as is
    const rings = grp.geoms.flatMap(g => polyArcs(g).map(p => p[0].length ? ring(p[0]) : []));
    const px = rings.map(r => r.map(([lon, lat]) => project(lon, lat))).sort((a, b) => ringArea(b) - ringArea(a))[0];
    d = 'M' + px.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join('L') + 'Z';
    mainBox = px.reduce((b, [x, y]) => [Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y)], [Infinity, Infinity, -Infinity, -Infinity]);
  }
  const box = (mainBox || [0, 0, WIDTH, 679]).map(n => Number(n.toFixed(2)));
  out.push({ id: grp.a2, name: nameByA2.get(grp.a2), box, neighbours: [...neighbours.get(grp.a2)].sort(), path: d });
}
out.sort((a, b) => a.name.localeCompare(b.name));

fs.writeFileSync(outPath, `// Generated by scripts/build_neighbours.js from Natural Earth 1:50m (public domain). Do not edit by hand.
// Each country: ISO alpha-2 id, name (as in data/countries.json), box = [x0, y0, x1, y1] of its main
// landmass and path, both in data/worldmap.js map units, and its land neighbours (ids).
export const COUNTRIES = ${JSON.stringify(out)};
`);
const withN = out.filter(c => c.neighbours.length);
console.log(`${out.length} countries, ${withN.length} with land neighbours, ${(fs.statSync(outPath).size / 1024).toFixed(0)} KB`);
for (const n of ['TR', 'CN', 'RU', 'FR', 'CY', 'SO', 'XK', 'ES', 'GB', 'US', 'BR', 'ZA']) {
  const c = out.find(x => x.id === n);
  console.log(n, c ? c.neighbours.join(',') : 'missing');
}
