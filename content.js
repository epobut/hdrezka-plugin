// Константы для ключа хранения и значения по умолчанию
const NEXT_EPISODE_KEY_STORAGE_KEY = "hdrezka_next_episode_key";
const DEFAULT_NEXT_EPISODE_KEY = "PageDown";
const AUTOPLAY_FLAG_KEY = "hdrezka_autoplay_next_episode"; // Новый ключ для флага автовоспроизведения

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

// Новая функция для попытки прямого воспроизведения видео
function tryPlayVideo() {
  const videoElement = document.querySelector('video'); // Ищем видеоэлемент
  if (videoElement) {
    if (videoElement.paused) {
      console.log('HDRezka Plugin: Video is paused, attempting to play.');
      videoElement.play().then(() => {
        console.log('HDRezka Plugin: Video play successful.');
      }).catch(error => {
        console.error('HDRezka Plugin: Video play failed (likely autoplay policy):', error);
        // Если прямое воспроизведение не удалось, пробуем имитировать клик
        simulateClickAtCenterGeneric();
      });
    } else {
      console.log('HDRezka Plugin: Video is already playing.');
    }
  } else {
    console.log('HDRezka Plugin: No video element found, falling back to generic click.');
    simulateClickAtCenterGeneric();
  }
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
    setTimeout(tryPlayVideo, 1500); // Увеличена задержка для автовоспроизведения
  }
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
            setTimeout(tryPlayVideo, 200); // Попытка автовоспроизведения после клика, используем tryPlayVideo
          }, 50);

          nextEpisodeLinkFound = true;
          break;
        }
      }

      if (!nextEpisodeLinkFound) {
        console.warn(`HDRezka Plugin: Item for episode ${nextEpisode} in season ${currentSeason} not found. Attempting URL navigation fallback.`);
        localStorage.setItem(AUTOPLAY_FLAG_KEY, "true"); // Устанавливаем флаг для автовоспроизведения на новой странице
        const newUrl = currentUrl.replace(episodeRegex, `-e:${nextEpisode}`);
        window.location.replace(newUrl);
        console.log('HDRezka Plugin: Falling back to navigating to next episode URL:', newUrl);
      }
    } else {
      console.error('HDRezka Plugin: Could not find current episode or season number in URL for next episode logic. No action taken. Current URL:', currentUrl);
    }
  }
}, true);