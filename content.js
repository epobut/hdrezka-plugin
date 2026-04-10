// Константы для ключа хранения и значения по умолчанию
const NEXT_EPISODE_KEY_STORAGE_KEY = "hdrezka_next_episode_key";
const DEFAULT_NEXT_EPISODE_KEY = "Slash";
const AUTOPLAY_FLAG_KEY = "hdrezka_autoplay_next_episode"; // Новый ключ для флага автовоспроизведения
const EPISODE_OVERLAY_PENDING_KEY = "hdrezka_episode_overlay_pending";
const FAVORITE_SERIES_STORAGE_KEY = "hdrezka_favorite_series";

let favoriteSeriesObserver = null;
let favoriteSeriesRefreshTimeoutId = null;
let episodeOverlayHideTimeoutId = null;

function normalizeSeriesTitle(title) {
  return (title || '').replace(/\s+/g, ' ').trim();
}

async function getFromExtensionStorage(key) {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    const result = await chrome.storage.local.get(key);
    return result[key];
  }

  return localStorage.getItem(key);
}

async function setInExtensionStorage(key, value) {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    await chrome.storage.local.set({ [key]: value });
    return;
  }

  if (typeof value === 'string') {
    localStorage.setItem(key, value);
  } else {
    localStorage.setItem(key, JSON.stringify(value));
  }
}

async function loadFavoriteSeriesTitles() {
  const storedValue = await getFromExtensionStorage(FAVORITE_SERIES_STORAGE_KEY);

  if (!storedValue) {
    return [];
  }

  if (Array.isArray(storedValue)) {
    return storedValue.map(normalizeSeriesTitle).filter(Boolean);
  }

  try {
    const parsedValue = JSON.parse(storedValue);
    return Array.isArray(parsedValue)
      ? parsedValue.map(normalizeSeriesTitle).filter(Boolean)
      : [];
  } catch (error) {
    console.warn('HDRezka Plugin: Failed to parse favorite series list.', error);
    return [];
  }
}

async function saveFavoriteSeriesTitles(seriesTitles) {
  const uniqueTitles = Array.from(new Set(seriesTitles.map(normalizeSeriesTitle).filter(Boolean)));
  await setInExtensionStorage(FAVORITE_SERIES_STORAGE_KEY, uniqueTitles);
}

function ensureFavoriteSeriesStyles() {
  if (document.getElementById('hdrezka-favorite-series-styles')) {
    return;
  }

  const styleElement = document.createElement('style');
  styleElement.id = 'hdrezka-favorite-series-styles';
  styleElement.textContent = `
    .hdrezka-favorite-series-item .b-seriesupdate__block_list_item_inner {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .hdrezka-favorite-series-item .b-seriesupdate__block_list_item_inner .cell-1 {
      flex: 1 1 auto;
      min-width: 0;
    }

    .hdrezka-favorite-series-item .b-seriesupdate__block_list_item_inner .cell-2 {
      flex: 0 0 auto;
    }

    .hdrezka-favorite-series-toggle {
      flex: 0 0 auto;
      width: 24px;
      height: 24px;
      padding: 0;
      border: 0;
      background: transparent;
      color: #b6b6b6;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
    }

    .hdrezka-favorite-series-toggle svg {
      width: 20px;
      height: 20px;
      display: block;
    }

    .hdrezka-favorite-series-toggle:hover {
      color: #ff9800;
    }

    .hdrezka-favorite-series-item.is-favorite .hdrezka-favorite-series-toggle {
      color: #ff9800;
    }

    .hdrezka-favorite-series-item.is-favorite .b-seriesupdate__block_list_link {
      color: #ff9800 !important;
      font-weight: 600;
    }
  `;

  document.head.appendChild(styleElement);
}

function createFavoriteStarIcon(isFavorite) {
  return isFavorite
    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2.25l2.96 6 6.62.96-4.79 4.67 1.13 6.59L12 17.36l-5.92 3.11 1.13-6.59-4.79-4.67 6.62-.96L12 2.25z"></path></svg>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.25l2.96 6 6.62.96-4.79 4.67 1.13 6.59L12 17.36l-5.92 3.11 1.13-6.59-4.79-4.67 6.62-.96L12 2.25z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"></path></svg>';
}

function applyFavoriteStateToSeriesItem(listItem, isFavorite) {
  listItem.classList.toggle('is-favorite', isFavorite);

  const buttonElement = listItem.querySelector('.hdrezka-favorite-series-toggle');
  if (!buttonElement) {
    return;
  }

  buttonElement.setAttribute('aria-pressed', isFavorite ? 'true' : 'false');
  buttonElement.setAttribute('title', isFavorite ? 'Убрать из избранного' : 'Добавить в избранное');
  buttonElement.innerHTML = createFavoriteStarIcon(isFavorite);
}

async function toggleFavoriteSeries(seriesTitle, listItem) {
  const normalizedTitle = normalizeSeriesTitle(seriesTitle);
  if (!normalizedTitle) {
    return;
  }

  const favoriteTitles = await loadFavoriteSeriesTitles();
  const favoriteSet = new Set(favoriteTitles);
  const isFavoriteNow = favoriteSet.has(normalizedTitle);

  if (isFavoriteNow) {
    favoriteSet.delete(normalizedTitle);
  } else {
    favoriteSet.add(normalizedTitle);
  }

  await saveFavoriteSeriesTitles(Array.from(favoriteSet));
  applyFavoriteStateToSeriesItem(listItem, !isFavoriteNow);
}

async function decorateSeriesUpdateList() {
  const seriesListItems = document.querySelectorAll('.b-seriesupdate__block_list_item');
  if (!seriesListItems.length) {
    return;
  }

  ensureFavoriteSeriesStyles();
  const favoriteTitles = await loadFavoriteSeriesTitles();
  const favoriteSet = new Set(favoriteTitles);

  seriesListItems.forEach((listItem) => {
    const seriesLink = listItem.querySelector('.b-seriesupdate__block_list_link');
    const innerContainer = listItem.querySelector('.b-seriesupdate__block_list_item_inner');

    if (!seriesLink || !innerContainer) {
      return;
    }

    const seriesTitle = normalizeSeriesTitle(seriesLink.textContent);
    if (!seriesTitle) {
      return;
    }

    listItem.classList.add('hdrezka-favorite-series-item');

    let favoriteButton = listItem.querySelector('.hdrezka-favorite-series-toggle');
    if (!favoriteButton) {
      favoriteButton = document.createElement('button');
      favoriteButton.type = 'button';
      favoriteButton.className = 'hdrezka-favorite-series-toggle';
      favoriteButton.setAttribute('aria-label', `Переключить избранное для "${seriesTitle}"`);
      favoriteButton.addEventListener('click', async (event) => {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        await toggleFavoriteSeries(seriesTitle, listItem);
      });
      innerContainer.appendChild(favoriteButton);
    }

    applyFavoriteStateToSeriesItem(listItem, favoriteSet.has(seriesTitle));
  });
}

function scheduleFavoriteSeriesRefresh() {
  if (favoriteSeriesRefreshTimeoutId) {
    clearTimeout(favoriteSeriesRefreshTimeoutId);
  }

  favoriteSeriesRefreshTimeoutId = setTimeout(() => {
    favoriteSeriesRefreshTimeoutId = null;
    decorateSeriesUpdateList();
  }, 100);
}

function initFavoriteSeriesFeature() {
  decorateSeriesUpdateList();

  if (favoriteSeriesObserver) {
    return;
  }

  favoriteSeriesObserver = new MutationObserver(() => {
    scheduleFavoriteSeriesRefresh();
  });

  favoriteSeriesObserver.observe(document.body, {
    childList: true,
    subtree: true
  });

  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local' && changes[FAVORITE_SERIES_STORAGE_KEY]) {
        decorateSeriesUpdateList();
      }
    });
  }
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

  overlayElement.textContent = `Серия ${resolvedEpisodeNumber}`;
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

// Функция для загрузки сохраненной клавиши
async function loadNextEpisodeKey() {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    const result = await chrome.storage.local.get(NEXT_EPISODE_KEY_STORAGE_KEY);
    return result[NEXT_EPISODE_KEY_STORAGE_KEY] || DEFAULT_NEXT_EPISODE_KEY;
  } else {
    // Fallback for development outside extension context or if chrome API is not available
    return localStorage.getItem(NEXT_EPISODE_KEY_STORAGE_KEY) || DEFAULT_NEXT_EPISODE_KEY;
  }
}

// Вспомогательная функция для имитации клика по центру экрана (общая)
function simulateClickAtCenterGeneric() {
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;
  const targetElement = document.elementFromPoint(centerX, centerY);

  if (targetElement) {
    console.log('HDRezka Plugin: Target element found for generic click:', targetElement);
    const clickEvent = new MouseEvent('click', {
      view: window,
      bubbles: true,
      cancelable: true,
      clientX: centerX,
      clientY: centerY,
      button: 0
    });
    targetElement.dispatchEvent(clickEvent);
    console.log('HDRezka Plugin: Generic click event dispatched.');
  } else {
    console.log('HDRezka Plugin: No suitable element found for generic click at center.');
  }
}

// Функция для одной попытки прямого воспроизведения видео или имитации клика
function tryPlayVideoOnce() {
  const videoElement = document.querySelector('video'); // Ищем видеоэлемент
  if (videoElement) {
    if (videoElement.paused) {
      console.log('HDRezka Plugin: Video is paused, attempting to play directly.');
      videoElement.play().then(() => {
        console.log('HDRezka Plugin: Video play successful.');
      }).catch(error => {
        console.error('HDRezka Plugin: Video play failed (likely autoplay policy), falling back to click:', error);
        simulateClickAtCenterGeneric(); // Если прямое воспроизведение не удалось, пробуем имитировать клик
      });
    } else {
      console.log('HDRezka Plugin: Video is already playing.');
    }
  } else {
    console.log('HDRezka Plugin: No video element found, attempting generic click.');
    simulateClickAtCenterGeneric(); // Если видеоэлемент не найден, пробуем имитировать клик
  }
}

// Функция для многократных попыток воспроизведения
function attemptPlayWithRetries(maxRetries = 10, delayMs = 500) {
  let retries = 0;
  const intervalId = setInterval(() => {
    if (retries >= maxRetries) {
      clearInterval(intervalId);
      console.log('HDRezka Plugin: Max retries reached for autoplay. Giving up.');
      return;
    }

    const videoElement = document.querySelector('video');
    if (videoElement && !videoElement.paused) {
      console.log('HDRezka Plugin: Video is now playing. Stopping retries.');
      consumePendingEpisodeOverlayIfAny();
      clearInterval(intervalId);
      return;
    }

    console.log(`HDRezka Plugin: Autoplay attempt ${retries + 1}/${maxRetries}...`);
    tryPlayVideoOnce();
    retries++;
  }, delayMs);
}

let configuredNextEpisodeKey = DEFAULT_NEXT_EPISODE_KEY; // Инициализируем значением по умолчанию

// Загружаем начальное значение ключа при запуске скрипта
loadNextEpisodeKey().then(key => {
  configuredNextEpisodeKey = key;
  console.log(`HDRezka Plugin: Initial configured key loaded: ${configuredNextEpisodeKey}`);
});

// Слушаем изменения в хранилище, чтобы динамически обновлять ключ
if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
  chrome.storage.local.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes[NEXT_EPISODE_KEY_STORAGE_KEY]) {
      configuredNextEpisodeKey = changes[NEXT_EPISODE_KEY_STORAGE_KEY].newValue || DEFAULT_NEXT_EPISODE_KEY;
      console.log(`HDRezka Plugin: Configured key updated to: ${configuredNextEpisodeKey}`);
    }
  });
}

// Проверяем флаг автовоспроизведения при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
  if (localStorage.getItem(AUTOPLAY_FLAG_KEY) === "true") {
    localStorage.removeItem(AUTOPLAY_FLAG_KEY); // Очищаем флаг
    console.log('HDRezka Plugin: Autoplay flag detected. Attempting to play video...');
    // Начинаем попытки автовоспроизведения через 1 секунду, 10 попыток с интервалом 500мс
    setTimeout(() => attemptPlayWithRetries(10, 500), 1000);
  }

  ensurePendingOverlayShownOnPlaybackStart();
  initFavoriteSeriesFeature();
});

document.addEventListener('keydown', (event) => {
  console.log('HDRezka Plugin: Key pressed:', event.key, 'Code:', event.code); // Логируем и key, и code

  // Логика для пробела (воспроизведение/пауза)
  if (event.key === ' ') {
    console.log('HDRezka Plugin: Spacebar pressed.');
    if (document.fullscreenElement) {
      console.log('HDRezka Plugin: Fullscreen mode detected.');
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      simulateClickAtCenterGeneric(); // Для пробела используем общую функцию, так как она переключает состояние
      console.log('HDRezka Plugin: Click simulation attempted.');
    } else {
      console.log('HDRezka Plugin: Not in fullscreen mode.');
    }
  }

  // Логика для следующей серии с настраиваемой клавишей
  // Используем event.code для проверки физической клавиши
  if (event.code === configuredNextEpisodeKey) { 
    console.log(`HDRezka Plugin: Configured key '${configuredNextEpisodeKey}' pressed.`);
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const currentUrl = window.location.href;
    console.log('HDRezka Plugin: Current URL detected:', currentUrl);
    
    const episodeRegex = /-e:(\d+)/;
    const seasonRegex = /-s:(\d+)/;

    const episodeMatch = currentUrl.match(episodeRegex);
    const seasonMatch = currentUrl.match(seasonRegex);

    if (episodeMatch && episodeMatch[1] && seasonMatch && seasonMatch[1]) {
      const currentEpisode = parseInt(episodeMatch[1], 10);
      const currentSeason = parseInt(seasonMatch[1], 10);
      const nextEpisode = currentEpisode + 1;
      console.log(`HDRezka Plugin: Current Season: ${currentSeason}, Current Episode: ${currentEpisode}, Next Episode: ${nextEpisode}`);

      const allEpisodeItems = document.querySelectorAll('.b-simple_episode__item');
      console.log(`HDRezka Plugin: Found ${allEpisodeItems.length} episode items.`);
      let nextEpisodeLinkFound = false;

      for (const item of Array.from(allEpisodeItems)) {
        const episodeId = item.getAttribute('data-episode_id');
        const seasonId = item.getAttribute('data-season_id');

        if (episodeId && seasonId &&
            parseInt(episodeId, 10) === nextEpisode &&
            parseInt(seasonId, 10) === currentSeason) {
          console.log(`HDRezka Plugin: Found item for episode ${nextEpisode} in season ${currentSeason}, attempting click.`);
          markPendingEpisodeOverlay(nextEpisode);

          setTimeout(() => {
            const clickEvent = new MouseEvent('click', {
              view: window,
              bubbles: true,
              cancelable: true,
              clientX: item.getBoundingClientRect().left + item.getBoundingClientRect().width / 2,
              clientY: item.getBoundingClientRect().top + item.getBoundingClientRect().height / 2,
              button: 0
            });
            item.dispatchEvent(clickEvent);
            console.log('HDRezka Plugin: Click event dispatched for next episode item.');
            // Начинаем попытки автовоспроизведения после клика по следующей серии
            setTimeout(() => attemptPlayWithRetries(10, 500), 500); 
          }, 50);

          nextEpisodeLinkFound = true;
          break;
        }
      }

      if (!nextEpisodeLinkFound) {
        console.warn(`HDRezka Plugin: Item for episode ${nextEpisode} in season ${currentSeason} not found. Attempting URL navigation fallback.`);
        localStorage.setItem(AUTOPLAY_FLAG_KEY, "true"); // Устанавливаем флаг для автовоспроизведения на новой странице
        markPendingEpisodeOverlay(nextEpisode);
        const newUrl = currentUrl.replace(episodeRegex, `-e:${nextEpisode}`);
        window.location.replace(newUrl);
        console.log('HDRezka Plugin: Falling back to navigating to next episode URL:', newUrl);
      }
    } else {
      console.error('HDRezka Plugin: Could not find current episode or season number in URL for next episode logic. No action taken. Current URL:', currentUrl);
    }
  }
}, true);

if (document.readyState !== 'loading') {
  initFavoriteSeriesFeature();
}
