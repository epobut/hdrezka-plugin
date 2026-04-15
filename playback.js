(() => {
  const NEXT_EPISODE_KEY_STORAGE_KEY = 'hdrezka_next_episode_key';
  const DEFAULT_NEXT_EPISODE_KEY = 'Slash';
  const AUTOPLAY_FLAG_KEY = 'hdrezka_autoplay_next_episode';
  const EPISODE_OVERLAY_PENDING_KEY = 'hdrezka_episode_overlay_pending';

  let configuredNextEpisodeKey = DEFAULT_NEXT_EPISODE_KEY;
  let episodeOverlayHideTimeoutId = null;
  let keyboardListenerAttached = false;
  let playbackInitialized = false;

  async function loadNextEpisodeKey() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      const result = await chrome.storage.local.get(NEXT_EPISODE_KEY_STORAGE_KEY);
      return result[NEXT_EPISODE_KEY_STORAGE_KEY] || DEFAULT_NEXT_EPISODE_KEY;
    }

    return localStorage.getItem(NEXT_EPISODE_KEY_STORAGE_KEY) || DEFAULT_NEXT_EPISODE_KEY;
  }

  function getCurrentEpisodeNumberForOverlay() {
    const activeEpisodeItem = document.querySelector('.b-simple_episode__item.active, .b-simple_episode__item.selected');
    if (activeEpisodeItem) {
      const activeEpisodeId = activeEpisodeItem.getAttribute('data-episode_id');
      if (activeEpisodeId) {
        return parseInt(activeEpisodeId, 10);
      }
    }

    const hashEpisodeMatch = window.location.hash.match(/-e:(\d+)/);
    if (hashEpisodeMatch && hashEpisodeMatch[1]) {
      return parseInt(hashEpisodeMatch[1], 10);
    }

    const urlEpisodeMatch = window.location.href.match(/-e:(\d+)/);
    if (urlEpisodeMatch && urlEpisodeMatch[1]) {
      return parseInt(urlEpisodeMatch[1], 10);
    }

    return null;
  }

  function showEpisodeOverlayForThreeSeconds(episodeNumber = null) {
    const resolvedEpisodeNumber = episodeNumber || getCurrentEpisodeNumberForOverlay();
    if (!resolvedEpisodeNumber) {
      return;
    }

    const overlayHost = document.fullscreenElement || document.webkitFullscreenElement || document.body;
    let overlayElement = document.getElementById('hdrezka-episode-overlay');

    if (!overlayElement) {
      overlayElement = document.createElement('div');
      overlayElement.id = 'hdrezka-episode-overlay';
      overlayElement.style.position = 'fixed';
      overlayElement.style.top = '16px';
      overlayElement.style.left = '16px';
      overlayElement.style.zIndex = '2147483647';
      overlayElement.style.padding = '8px 12px';
      overlayElement.style.background = 'rgba(0, 0, 0, 0.75)';
      overlayElement.style.color = '#ffffff';
      overlayElement.style.fontSize = '16px';
      overlayElement.style.fontWeight = '600';
      overlayElement.style.borderRadius = '8px';
      overlayElement.style.pointerEvents = 'none';
      overlayElement.style.fontFamily = 'Arial, sans-serif';
    }

    if (overlayElement.parentElement !== overlayHost) {
      overlayHost.appendChild(overlayElement);
    }

    overlayElement.textContent = `Episode ${resolvedEpisodeNumber}`;
    overlayElement.style.display = 'block';

    if (episodeOverlayHideTimeoutId) {
      clearTimeout(episodeOverlayHideTimeoutId);
    }

    episodeOverlayHideTimeoutId = setTimeout(() => {
      overlayElement.style.display = 'none';
      episodeOverlayHideTimeoutId = null;
    }, 3000);
  }

  function markPendingEpisodeOverlay(episodeNumber) {
    if (!episodeNumber) {
      return;
    }

    localStorage.setItem(EPISODE_OVERLAY_PENDING_KEY, String(episodeNumber));
  }

  function consumePendingEpisodeOverlayIfAny() {
    const pendingEpisodeValue = localStorage.getItem(EPISODE_OVERLAY_PENDING_KEY);
    if (!pendingEpisodeValue) {
      return false;
    }

    const pendingEpisodeNumber = parseInt(pendingEpisodeValue, 10);
    if (!pendingEpisodeNumber) {
      localStorage.removeItem(EPISODE_OVERLAY_PENDING_KEY);
      return false;
    }

    showEpisodeOverlayForThreeSeconds(pendingEpisodeNumber);
    localStorage.removeItem(EPISODE_OVERLAY_PENDING_KEY);
    return true;
  }

  function ensurePendingOverlayShownOnPlaybackStart() {
    const videoElement = document.querySelector('video');
    if (!videoElement) {
      return;
    }

    if (!videoElement.paused && !videoElement.ended) {
      consumePendingEpisodeOverlayIfAny();
      return;
    }

    const showPendingOverlayWhenPlaybackStarts = () => {
      if (!videoElement.paused && !videoElement.ended) {
        consumePendingEpisodeOverlayIfAny();
      }
    };

    videoElement.addEventListener('play', showPendingOverlayWhenPlaybackStarts, { once: true });
    videoElement.addEventListener('playing', showPendingOverlayWhenPlaybackStarts, { once: true });
  }

  function simulateClickAtCenterGeneric() {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const targetElement = document.elementFromPoint(centerX, centerY);

    if (!targetElement) {
      return;
    }

    const clickEvent = new MouseEvent('click', {
      view: window,
      bubbles: true,
      cancelable: true,
      clientX: centerX,
      clientY: centerY,
      button: 0
    });

    targetElement.dispatchEvent(clickEvent);
  }

  function tryPlayVideoOnce() {
    const videoElement = document.querySelector('video');
    if (videoElement) {
      if (videoElement.paused) {
        videoElement.play().catch(() => {
          simulateClickAtCenterGeneric();
        });
      }
      return;
    }

    simulateClickAtCenterGeneric();
  }

  function attemptPlayWithRetries(maxRetries = 10, delayMs = 500) {
    let retries = 0;
    const intervalId = setInterval(() => {
      if (retries >= maxRetries) {
        clearInterval(intervalId);
        return;
      }

      const videoElement = document.querySelector('video');
      if (videoElement && !videoElement.paused) {
        consumePendingEpisodeOverlayIfAny();
        clearInterval(intervalId);
        return;
      }

      tryPlayVideoOnce();
      retries += 1;
    }, delayMs);
  }

  function attachStorageListener() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes[NEXT_EPISODE_KEY_STORAGE_KEY]) {
          configuredNextEpisodeKey = changes[NEXT_EPISODE_KEY_STORAGE_KEY].newValue || DEFAULT_NEXT_EPISODE_KEY;
        }
      });
    }
  }

  function handleNextEpisodeNavigation() {
    const currentUrl = window.location.href;
    const episodeRegex = /-e:(\d+)/;
    const seasonRegex = /-s:(\d+)/;
    const episodeMatch = currentUrl.match(episodeRegex);
    const seasonMatch = currentUrl.match(seasonRegex);

    if (!(episodeMatch && episodeMatch[1] && seasonMatch && seasonMatch[1])) {
      console.error('HDRezka Plugin: Could not detect current episode or season from URL.', currentUrl);
      return;
    }

    const currentEpisode = parseInt(episodeMatch[1], 10);
    const currentSeason = parseInt(seasonMatch[1], 10);
    const nextEpisode = currentEpisode + 1;
    const allEpisodeItems = document.querySelectorAll('.b-simple_episode__item');
    let nextEpisodeLinkFound = false;

    for (const item of Array.from(allEpisodeItems)) {
      const episodeId = item.getAttribute('data-episode_id');
      const seasonId = item.getAttribute('data-season_id');

      if (episodeId && seasonId && parseInt(episodeId, 10) === nextEpisode && parseInt(seasonId, 10) === currentSeason) {
        markPendingEpisodeOverlay(nextEpisode);

        setTimeout(() => {
          const rect = item.getBoundingClientRect();
          const clickEvent = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true,
            clientX: rect.left + rect.width / 2,
            clientY: rect.top + rect.height / 2,
            button: 0
          });
          item.dispatchEvent(clickEvent);
          setTimeout(() => attemptPlayWithRetries(10, 500), 500);
        }, 50);

        nextEpisodeLinkFound = true;
        break;
      }
    }

    if (!nextEpisodeLinkFound) {
      localStorage.setItem(AUTOPLAY_FLAG_KEY, 'true');
      markPendingEpisodeOverlay(nextEpisode);
      const newUrl = currentUrl.replace(episodeRegex, `-e:${nextEpisode}`);
      window.location.replace(newUrl);
    }
  }

  function attachKeyboardListener() {
    if (keyboardListenerAttached) {
      return;
    }

    document.addEventListener('keydown', (event) => {
      if (event.key === ' ' && document.fullscreenElement) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        simulateClickAtCenterGeneric();
      }

      if (event.code === configuredNextEpisodeKey) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        handleNextEpisodeNavigation();
      }
    }, true);

    keyboardListenerAttached = true;
  }

  async function init() {
    if (playbackInitialized) {
      ensurePendingOverlayShownOnPlaybackStart();
      return;
    }

    configuredNextEpisodeKey = await loadNextEpisodeKey();
    attachStorageListener();
    attachKeyboardListener();

    if (localStorage.getItem(AUTOPLAY_FLAG_KEY) === 'true') {
      localStorage.removeItem(AUTOPLAY_FLAG_KEY);
      setTimeout(() => attemptPlayWithRetries(10, 500), 1000);
    }

    ensurePendingOverlayShownOnPlaybackStart();
    playbackInitialized = true;
  }

  window.HDRezkaPlayback = { init };
})();
