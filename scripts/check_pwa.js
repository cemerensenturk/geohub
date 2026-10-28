// Checks that GeoHub is set up as an installable home-screen app (no offline caching).
// Usage: node scripts/check_pwa.js   (run from the repo root; exits 1 on any failure)
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const GAMES = ['satelcity', 'flagquiz', 'georank', 'borderline', 'coatofarms', 'compass', 'mercator', 'furthernorth', 'neighbours', 'pinthecity'];
const PAPER = '#F3EEE3';
const failures = [];
const check = (ok, message) => { if (!ok) failures.push(message); };
const read = rel => (fs.existsSync(path.join(ROOT, rel)) ? fs.readFileSync(path.join(ROOT, rel), 'utf8') : null);

// PNG width/height from the IHDR chunk
function pngSize(rel) {
  const buf = fs.readFileSync(path.join(ROOT, rel));
  if (buf.toString('ascii', 1, 4) !== 'PNG') return null;
  return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
}

// ---- Manifest ----
const manifestText = read('manifest.webmanifest');
let manifest = null;
if (manifestText === null) check(false, 'manifest.webmanifest is missing');
else {
  try { manifest = JSON.parse(manifestText); } catch (e) { check(false, `manifest.webmanifest is not valid JSON: ${e.message}`); }
}
if (manifest) {
  check(manifest.name === 'GeoHub', 'manifest name must be "GeoHub"');
  check(manifest.short_name === 'GeoHub', 'manifest short_name must be "GeoHub"');
  check(manifest.start_url === './', 'manifest start_url must be "./"');
  check(manifest.scope === './', 'manifest scope must be "./"');
  check(manifest.display === 'standalone', 'manifest display must be "standalone"');
  check(manifest.theme_color === PAPER, `manifest theme_color must be ${PAPER}`);
  check(manifest.background_color === PAPER, `manifest background_color must be ${PAPER}`);
  const icons = Array.isArray(manifest.icons) ? manifest.icons : [];
  const has = (size, maskable) => icons.some(i => i.sizes === `${size}x${size}` && i.type === 'image/png' &&
    (maskable ? (i.purpose || '').includes('maskable') : !(i.purpose || '').includes('maskable')));
  check(has(192, false), 'manifest needs a 192x192 PNG icon');
  check(has(512, false), 'manifest needs a 512x512 PNG icon');
  check(has(512, true), 'manifest needs a 512x512 maskable PNG icon');
  for (const icon of icons) {
    if (!fs.existsSync(path.join(ROOT, icon.src))) { check(false, `icon file missing: ${icon.src}`); continue; }
    const size = pngSize(icon.src);
    const [w, h] = (icon.sizes || '').split('x').map(Number);
    check(size && size[0] === w && size[1] === h, `icon ${icon.src} is ${size ? size.join('x') : 'not a PNG'}, manifest says ${icon.sizes}`);
  }
}

// ---- Service worker: present, no caching ----
const sw = read('sw.js');
if (sw === null) check(false, 'sw.js is missing');
else {
  check(sw.includes("addEventListener('fetch'"), "sw.js must register a fetch listener");
  for (const banned of ['caches', 'respondWith', 'addAll']) check(!sw.includes(banned), `sw.js must not use ${banned} (no offline caching)`);
}

// ---- Safe areas (notch, Dynamic Island, home indicator) ----
const atlas = read('css/atlas.css') || '';
const bodyRule = (atlas.match(/\nbody \{[^}]*\}/) || [''])[0];
const backdropRule = (atlas.match(/\n\.atlas-modal-backdrop \{[^}]*\}/) || [''])[0];
for (const side of ['top', 'right', 'bottom', 'left']) {
  check(bodyRule.includes(`env(safe-area-inset-${side})`), `css/atlas.css body must pad env(safe-area-inset-${side})`);
  check(backdropRule.includes(`max(16px, env(safe-area-inset-${side}))`), `css/atlas.css .atlas-modal-backdrop must pad max(16px, env(safe-area-inset-${side}))`);
}

// Modals must fit inside the padded backdrop instead of a fixed viewport height
const modalRule = (atlas.match(/\n\.atlas-modal \{[^}]*\}/) || [''])[0];
check(modalRule.includes('max-height: 100%'), 'css/atlas.css .atlas-modal must use max-height: 100% (fits inside safe-area padding)');
// SatelCity's full-screen photo overlay is the only other fixed layer
const satel = read('satelcity/css/style.css') || '';
const photoRule = (satel.match(/\n\.photo-modal-backdrop \{[^}]*\}/) || [''])[0];
check(['top', 'right', 'bottom', 'left'].every(side => photoRule.includes(`max(16px, env(safe-area-inset-${side}))`)),
  'satelcity .photo-modal-backdrop must pad max(16px, env(safe-area-inset-*)) on all sides');

// ---- Every page ----
const pages = [['index.html', ''], ...GAMES.map(g => [`${g}/index.html`, '../'])];
for (const [page, root] of pages) {
  const html = read(page);
  if (html === null) { check(false, `${page} is missing`); continue; }
  check(html.includes(`<link rel="manifest" href="${root}manifest.webmanifest">`), `${page}: missing manifest link`);
  check(html.includes('<meta name="apple-mobile-web-app-capable" content="yes">'), `${page}: missing apple-mobile-web-app-capable`);
  check(html.includes('<meta name="mobile-web-app-capable" content="yes">'), `${page}: missing mobile-web-app-capable (Chrome warns without it)`);
  check(html.includes('<meta name="apple-mobile-web-app-status-bar-style" content="default">'), `${page}: missing apple-mobile-web-app-status-bar-style=default`);
  check(html.includes('<meta name="apple-mobile-web-app-title" content="GeoHub">'), `${page}: missing apple-mobile-web-app-title`);
  check(html.includes(`<meta name="theme-color" content="${PAPER}">`), `${page}: missing theme-color`);
  const viewport = (html.match(/<meta name="viewport" content="([^"]*)">/) || [])[1] || '';
  check(viewport.includes('viewport-fit=cover'), `${page}: viewport lacks viewport-fit=cover`);
  // sw-guarded: registration must not run without service worker support or over file://
  check(/if \('serviceWorker' in navigator && location\.protocol\.startsWith\('http'\)\)/.test(html) &&
    html.includes(`navigator.serviceWorker.register('${root}sw.js')`), `${page}: missing guarded service worker registration`);
  check(html.includes(`${root}css/atlas.css?v=2`), `${page}: must link css/atlas.css?v=2`);
  if (page !== 'index.html') {
    check(!html.includes('id="install-btn"'), `${page}: install button belongs on the portal only`);
    check(!html.includes('install.js'), `${page}: js/install.js belongs on the portal only`);
  } else {
    check(html.includes('<script src="js/install.js?v=1"></script>'), 'index.html: must load js/install.js?v=1');
  }
}

// ---- README upload list covers every root folder/file the pages load ----
const readme = read('README.md') || '';
const uploadSection = (readme.match(/### Upload with FTP[\s\S]*?Not needed on the server/) || [''])[0];
const portal = read('index.html') || '';
const rootRefs = new Set();
for (const [, ref] of portal.matchAll(/(?:href|src)="([^":?#]+)/g)) {
  if (ref.startsWith('http') || ref.startsWith('//')) continue;
  const top = ref.split('/')[0];
  rootRefs.add(ref.includes('/') ? `${top}/` : top);
}
for (const ref of rootRefs) {
  if (ref === './' || ref === '' ) continue;
  check(uploadSection.includes('`' + ref + '`'), `README upload list is missing \`${ref}\` (loaded by index.html)`);
}

if (failures.length) {
  console.log(`PWA check: ${failures.length} failed`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log('PWA check: all passed');
