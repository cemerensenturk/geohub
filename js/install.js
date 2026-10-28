// Portal "Install app" button.
// Android / Chromium: shows the browser's own install prompt.
// iPhone / iPad (any browser): Apple offers no install prompt, so it opens a short
// "Share → Add to Home Screen" sheet instead.
// Hidden when GeoHub is already running as an installed app, or when there is nothing to offer.
(function () {
  const button = document.getElementById('install-btn');
  const sheet = document.getElementById('install-sheet');
  const closeButton = document.getElementById('install-sheet-close');
  if (!button) return;

  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  }

  function isIOS() {
    // iPadOS reports itself as a Mac, so also look for a touch screen
    return /iPhone|iPad|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  function show() { button.hidden = false; }
  function hide() { button.hidden = true; }

  if (isStandalone()) return;

  if (isIOS()) {
    const openSheet = () => {
      sheet.hidden = false;
      closeButton.focus();
    };
    const closeSheet = () => {
      sheet.hidden = true;
      button.focus();
    };
    button.addEventListener('click', openSheet);
    closeButton.addEventListener('click', closeSheet);
    sheet.addEventListener('click', event => { if (event.target === sheet) closeSheet(); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && !sheet.hidden) closeSheet(); });
    show();
    return;
  }

  // The prompt can be used only once per page load
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredPrompt = event;
    show();
  });
  button.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    const prompt = deferredPrompt;
    deferredPrompt = null;
    hide();
    await prompt.prompt();
    await prompt.userChoice;
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    hide();
  });
})();
