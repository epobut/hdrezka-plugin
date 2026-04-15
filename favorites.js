(() => {
  const FAVORITE_SERIES_STORAGE_KEY = 'hdrezka_favorite_series';

  let favoriteSeriesObserver = null;
  let favoriteSeriesRefreshTimeoutId = null;

  function normalizeSeriesTitle(title) {
    return String(title || '').replace(/\s+/g, ' ').trim();
  }

  function normalizeHeadingText(text) {
    return String(text || '').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  async function getFavoriteSeriesFromStorage() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      const result = await chrome.storage.local.get(FAVORITE_SERIES_STORAGE_KEY);
      const storedValue = result[FAVORITE_SERIES_STORAGE_KEY];
      if (Array.isArray(storedValue)) {
        return storedValue.map(normalizeSeriesTitle).filter(Boolean);
      }
      return [];
    }

    try {
      return JSON.parse(localStorage.getItem(FAVORITE_SERIES_STORAGE_KEY) || '[]');
    } catch (error) {
      console.warn('[HDRezka Plugin] Favorites parse failed', error);
      return [];
    }
  }

  async function setFavoriteSeriesInStorage(seriesTitles) {
    const uniqueTitles = Array.from(new Set((seriesTitles || []).map(normalizeSeriesTitle).filter(Boolean)));

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set({ [FAVORITE_SERIES_STORAGE_KEY]: uniqueTitles });
    } else {
      localStorage.setItem(FAVORITE_SERIES_STORAGE_KEY, JSON.stringify(uniqueTitles));
    }
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

      .hdrezka-favorite-series-item .lastSeries-title,
      .hdrezka-favorite-series-item.block__update_item {
        position: relative;
        padding-right: 28px;
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

      .hdrezka-favorite-series-toggle.hdrezka-lastseries-toggle,
      .hdrezka-favorite-series-toggle.hdrezka-blockupdate-toggle {
        position: absolute;
        top: 0;
        right: 0;
      }

      .hdrezka-favorite-series-item.lastSeries-item {
        position: relative;
      }

      .hdrezka-favorite-series-item.lastSeries-item .lastSeries-details {
        padding-right: 28px;
      }

      .hdrezka-favorite-series-item.block__update_item {
        display: block;
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

      .hdrezka-favorite-series-item.is-favorite .b-seriesupdate__block_list_link,
      .hdrezka-favorite-series-item.is-favorite .lastSeries-title b,
      .hdrezka-favorite-series-item.is-favorite .block__update_item__title {
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
    buttonElement.setAttribute('title', isFavorite ? 'Remove from favorites' : 'Add to favorites');
    buttonElement.innerHTML = createFavoriteStarIcon(isFavorite);
  }

  async function toggleFavoriteSeries(seriesTitle, listItem) {
    const normalizedTitle = normalizeSeriesTitle(seriesTitle);
    if (!normalizedTitle) {
      return;
    }

    const favoriteTitles = await getFavoriteSeriesFromStorage();
    const favoriteSet = new Set(favoriteTitles);
    const isFavoriteNow = favoriteSet.has(normalizedTitle);

    if (isFavoriteNow) {
      favoriteSet.delete(normalizedTitle);
    } else {
      favoriteSet.add(normalizedTitle);
    }

    await setFavoriteSeriesInStorage(Array.from(favoriteSet));
    applyFavoriteStateToSeriesItem(listItem, !isFavoriteNow);
  }

  function getSeriesUpdateHeadings() {
    const headingCandidates = Array.from(document.querySelectorAll('.b-content__htitle.small, .contentTitle, .sidebar_block__heading, div'));
    return headingCandidates.filter((element) => /обновления сериалов/i.test(normalizeHeadingText(element.textContent)));
  }

  function getFollowingSectionContainers(heading) {
    const containers = [];
    let nextElement = heading.nextElementSibling;

    while (nextElement && containers.length < 2) {
      if (nextElement.matches('div, ul, section, aside')) {
        containers.push(nextElement);
      }
      nextElement = nextElement.nextElementSibling;
    }

    return containers;
  }

  function getSectionContainers() {
    const headings = getSeriesUpdateHeadings();
    const containers = [];
    const seenContainers = new Set();

    headings.forEach((heading) => {
      getFollowingSectionContainers(heading).forEach((container) => {
        if (seenContainers.has(container)) {
          return;
        }
        seenContainers.add(container);
        containers.push(container);
      });
    });

    return containers;
  }

  function collectFavoriteTargetsFromContainer(container) {
    const targets = [];

    container.querySelectorAll('.b-seriesupdate__block_list_item').forEach((listItem) => {
      const seriesLink = listItem.querySelector('.b-seriesupdate__block_list_link');
      const mountContainer = listItem.querySelector('.b-seriesupdate__block_list_item_inner');
      if (seriesLink && mountContainer) {
        targets.push({
          type: 'legacy',
          listItem,
          seriesLink,
          mountContainer,
          buttonClassName: 'hdrezka-favorite-series-toggle'
        });
      }
    });

    container.querySelectorAll('.lastSeries-item').forEach((listItem) => {
      const seriesLink = listItem.querySelector('.lastSeries-title b');
      const mountContainer = listItem.querySelector('.lastSeries-title');
      if (seriesLink && mountContainer) {
        targets.push({
          type: 'lastSeries',
          listItem,
          seriesLink,
          mountContainer,
          buttonClassName: 'hdrezka-favorite-series-toggle hdrezka-lastseries-toggle'
        });
      }
    });

    container.querySelectorAll('.block__update_item').forEach((listItem) => {
      const seriesLink = listItem.querySelector('.block__update_item__title');
      const mountContainer = listItem;
      if (seriesLink && mountContainer) {
        targets.push({
          type: 'blockUpdate',
          listItem,
          seriesLink,
          mountContainer,
          buttonClassName: 'hdrezka-favorite-series-toggle hdrezka-blockupdate-toggle'
        });
      }
    });

    return targets;
  }

  function collectFavoriteTargets() {
    const headings = getSeriesUpdateHeadings();
    const sectionContainers = getSectionContainers();
    const seenItems = new Set();
    const targets = [];

    sectionContainers.forEach((container) => {
      collectFavoriteTargetsFromContainer(container).forEach((target) => {
        if (seenItems.has(target.listItem)) {
          return;
        }
        seenItems.add(target.listItem);
        targets.push(target);
      });
    });

    console.log('[HDRezka Plugin] Favorites scan', {
      currentUrl: window.location.href,
      headingCount: headings.length,
      sectionCount: sectionContainers.length,
      count: targets.length
    });

    return targets;
  }

  async function decorateSeriesUpdateList() {
    const favoriteTargets = collectFavoriteTargets();
    if (!favoriteTargets.length) {
      return;
    }

    ensureFavoriteSeriesStyles();
    const favoriteTitles = await getFavoriteSeriesFromStorage();
    const favoriteSet = new Set(favoriteTitles);

    favoriteTargets.forEach(({ listItem, seriesLink, mountContainer, buttonClassName, type }) => {
      const seriesTitle = normalizeSeriesTitle(seriesLink.textContent);
      if (!seriesTitle) {
        return;
      }

      listItem.classList.add('hdrezka-favorite-series-item');

      let favoriteButton = listItem.querySelector('.hdrezka-favorite-series-toggle');
      if (!favoriteButton) {
        favoriteButton = document.createElement('button');
        favoriteButton.type = 'button';
        favoriteButton.className = buttonClassName;
        favoriteButton.setAttribute('aria-label', `Toggle favorite for ${seriesTitle}`);
        favoriteButton.addEventListener('click', async (event) => {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
          console.log('[HDRezka Plugin] Favorites toggle', { currentUrl: window.location.href, seriesTitle, type });
          await toggleFavoriteSeries(seriesTitle, listItem);
        });
        mountContainer.appendChild(favoriteButton);
        console.log('[HDRezka Plugin] Favorites button appended', { currentUrl: window.location.href, seriesTitle, type });
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

  function init() {
    console.log('[HDRezka Plugin] Favorites init start', { currentUrl: window.location.href });
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

  window.HDRezkaFavorites = { init };
})();
