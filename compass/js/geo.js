/**
 * Compass - spherical geometry helpers (all angles in degrees at the API surface)
 */

const RAD = Math.PI / 180;
const EARTH_RADIUS_KM = 6371;

const POINTS_16 = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

export function normalize(deg) {
  return ((deg % 360) + 360) % 360;
}

/** Initial great-circle bearing from point 1 to point 2 */
export function greatCircleBearing(lat1, lng1, lat2, lng2) {
  const p1 = lat1 * RAD;
  const p2 = lat2 * RAD;
  const dl = (lng2 - lng1) * RAD;
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return normalize(Math.atan2(y, x) / RAD);
}

/** Constant-heading (rhumb line) bearing: a straight line on a Mercator map */
export function rhumbBearing(lat1, lng1, lat2, lng2) {
  const p1 = lat1 * RAD;
  const p2 = lat2 * RAD;
  let dl = (lng2 - lng1) * RAD;
  if (dl > Math.PI) dl -= 2 * Math.PI;
  if (dl < -Math.PI) dl += 2 * Math.PI;
  const dpsi = Math.log(Math.tan(Math.PI / 4 + p2 / 2) / Math.tan(Math.PI / 4 + p1 / 2));
  return normalize(Math.atan2(dl, dpsi) / RAD);
}

/** Haversine distance in km */
export function distanceKm(lat1, lng1, lat2, lng2) {
  const p1 = lat1 * RAD;
  const p2 = lat2 * RAD;
  const dp = p2 - p1;
  const dl = (lng2 - lng1) * RAD;
  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Smallest angle between two bearings, 0–180 */
export function angularError(a, b) {
  const d = Math.abs(normalize(a) - normalize(b));
  return Math.min(d, 360 - d);
}

/** 16-point compass label, e.g. 47 -> "NE" */
export function pointName(deg) {
  return POINTS_16[Math.round(normalize(deg) / 22.5) % 16];
}

/** "047° NE" */
export function formatBearing(deg) {
  const whole = Math.round(normalize(deg)) % 360;
  return `${String(whole).padStart(3, '0')}° ${pointName(whole)}`;
}

/** Points for a round: 100 for a perfect aim, 0 at 90° off or worse */
export function roundPoints(err) {
  return Math.round(Math.max(0, 100 * (1 - err / 90)));
}
