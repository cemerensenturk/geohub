/**
 * Further North - pair selection
 * Picks two cities whose latitudes are close enough to be tricky.
 * The latitude gap narrows and the city pool widens as the streak grows.
 */

const MIN_GAP = 0.3;

const lerp = (a, b, t) => a + (b - a) * t;

/** Latitude gap range (degrees) for a given streak: 6–15° at the start, 0.5–4° from streak 12 on */
export function gapRange(streak) {
  const t = Math.min(streak, 12) / 12;
  return [Math.max(MIN_GAP, lerp(6, 0.5, t)), lerp(15, 4, t)];
}

/** Share of rounds drawn only from the well-known "easy" tier */
function easyBias(streak) {
  return Math.max(0.25, 0.9 - streak * 0.06);
}

function sample(list, rand) {
  return list[Math.floor(rand() * list.length)];
}

/**
 * @param {Array} cities  CITIES dataset
 * @param {number} streak current streak (difficulty)
 * @param {Set<string>} used ids already shown in this run (avoided when possible)
 * @param {() => number} rand random source
 * @returns {[object, object]} two cities in random display order
 */
export function pickPair(cities, streak, used = new Set(), rand = Math.random) {
  const easyOnly = rand() < easyBias(streak);
  const fresh = cities.filter(c => !used.has(c.id));
  const base = fresh.length > 40 ? fresh : cities;
  const pool = easyOnly ? base.filter(c => c.difficulty === 'easy') : base;
  const firstPool = pool.length > 10 ? pool : base;

  let [lo, hi] = gapRange(streak);

  for (let widen = 0; widen < 6; widen++) {
    for (let attempt = 0; attempt < 30; attempt++) {
      const a = sample(firstPool, rand);
      const candidates = (easyOnly && pool.length > 10 ? pool : base).filter(b => {
        if (b.id === a.id || b.country === a.country) return false;
        const gap = Math.abs(a.lat - b.lat);
        return gap >= lo && gap <= hi && gap >= MIN_GAP;
      });
      if (!candidates.length) continue;

      // Prefer different continents: that is where intuition fails most
      const cross = candidates.filter(b => b.continent !== a.continent);
      const b = sample(cross.length && rand() < 0.85 ? cross : candidates, rand);
      return rand() < 0.5 ? [a, b] : [b, a];
    }
    lo = Math.max(MIN_GAP, lo * 0.7);
    hi = hi * 1.4;
  }

  // Last resort: any two cities from different countries with a valid gap
  const a = sample(cities, rand);
  const b = cities.find(c => c.country !== a.country && Math.abs(c.lat - a.lat) >= MIN_GAP);
  return [a, b];
}
