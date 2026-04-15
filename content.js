(() => {
  const hostName = window.location.hostname;
  const currentUrl = window.location.href;
  const isRezkaHost = /rezka/i.test(hostName);

  console.log('[HDRezka Plugin] Bootstrap start', { hostName, currentUrl, isRezkaHost });

  if (!isRezkaHost) {
    console.log('[HDRezka Plugin] Skip page: hostname does not contain rezka');
    return;
  }

  function initRezkaPlugin() {
    console.log('[HDRezka Plugin] Init start', { hostName, currentUrl });

    if (window.HDRezkaPlayback && typeof window.HDRezkaPlayback.init === 'function') {
      console.log('[HDRezka Plugin] Playback init');
      window.HDRezkaPlayback.init();
    }

    if (window.HDRezkaFavorites && typeof window.HDRezkaFavorites.init === 'function') {
      console.log('[HDRezka Plugin] Favorites init');
      window.HDRezkaFavorites.init();
    }

    if (window.HDRezkaUi && typeof window.HDRezkaUi.init === 'function') {
      console.log('[HDRezka Plugin] UI init');
      window.HDRezkaUi.init();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRezkaPlugin, { once: true });
  } else {
    initRezkaPlugin();
  }
})();
