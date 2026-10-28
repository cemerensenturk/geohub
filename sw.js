// GeoHub service worker.
// It exists only so Chromium-based browsers treat the site as an installable app.
// Nothing is cached on purpose: the site is hosted on a friend's server, and an
// installed app should cost no more than a normal visit. Every request goes to the
// network exactly as it would without this file.

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', () => {});
