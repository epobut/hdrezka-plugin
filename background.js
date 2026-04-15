const FAVORITE_SERIES_STORAGE_KEY = 'hdrezka_favorite_series';
const FAVORITE_SERIES_SYNC_KEY = 'hdrezka_favorite_series_sync_backup';

function normalizeFavoriteTitles(seriesTitles) {
  return Array.from(new Set((seriesTitles || []).map((title) => String(title || '').replace(/\s+/g, ' ').trim()).filter(Boolean)));
}

async function readLocalFavorites() {
  const result = await chrome.storage.local.get(FAVORITE_SERIES_STORAGE_KEY);
  const storedValue = result[FAVORITE_SERIES_STORAGE_KEY];
  return Array.isArray(storedValue) ? normalizeFavoriteTitles(storedValue) : [];
}

async function readSyncFavorites() {
  const result = await chrome.storage.sync.get(FAVORITE_SERIES_SYNC_KEY);
  const storedValue = result[FAVORITE_SERIES_SYNC_KEY];
  return Array.isArray(storedValue) ? normalizeFavoriteTitles(storedValue) : [];
}

async function writeLocalFavorites(seriesTitles) {
  await chrome.storage.local.set({
    [FAVORITE_SERIES_STORAGE_KEY]: normalizeFavoriteTitles(seriesTitles)
  });
}

async function writeSyncFavorites(seriesTitles) {
  await chrome.storage.sync.set({
    [FAVORITE_SERIES_SYNC_KEY]: normalizeFavoriteTitles(seriesTitles)
  });
}

async function mirrorLocalFavoritesToSync(seriesTitles = null) {
  const favoriteSeries = normalizeFavoriteTitles(seriesTitles || await readLocalFavorites());
  await writeSyncFavorites(favoriteSeries);
  return favoriteSeries;
}

async function restoreLocalFavoritesFromSyncIfNeeded(force = false) {
  const localFavorites = await readLocalFavorites();
  const syncFavorites = await readSyncFavorites();

  if (!syncFavorites.length) {
    return { restored: false, reason: 'sync-empty', favoriteSeries: localFavorites };
  }

  if (!force && localFavorites.length) {
    return { restored: false, reason: 'local-not-empty', favoriteSeries: localFavorites };
  }

  await writeLocalFavorites(syncFavorites);
  return { restored: true, reason: 'restored-from-sync', favoriteSeries: syncFavorites };
}

chrome.runtime.onInstalled.addListener(() => {
  restoreLocalFavoritesFromSyncIfNeeded(false).catch((error) => {
    console.warn('HDRezka Plugin: Failed to restore favorites on install.', error);
  });
});

chrome.runtime.onStartup.addListener(() => {
  restoreLocalFavoritesFromSyncIfNeeded(false).catch((error) => {
    console.warn('HDRezka Plugin: Failed to restore favorites on startup.', error);
  });
});

chrome.storage.local.onChanged.addListener((changes, namespace) => {
  if (namespace !== 'local' || !changes[FAVORITE_SERIES_STORAGE_KEY]) {
    return;
  }

  const newValue = changes[FAVORITE_SERIES_STORAGE_KEY].newValue;
  const favoriteSeries = Array.isArray(newValue) ? newValue : [];

  mirrorLocalFavoritesToSync(favoriteSeries).catch((error) => {
    console.warn('HDRezka Plugin: Failed to mirror favorites to chrome.storage.sync.', error);
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) {
    return;
  }

  if (message.type === 'RESTORE_FAVORITES_FROM_SYNC') {
    restoreLocalFavoritesFromSyncIfNeeded(Boolean(message.force))
      .then((result) => sendResponse({ ok: true, ...result }))
      .catch((error) => sendResponse({ ok: false, reason: String(error) }));
    return true;
  }

  if (message.type === 'GET_FAVORITES_SYNC_STATUS') {
    Promise.all([readLocalFavorites(), readSyncFavorites()])
      .then(([localFavorites, syncFavorites]) => {
        sendResponse({
          ok: true,
          localCount: localFavorites.length,
          syncCount: syncFavorites.length,
          syncAvailable: true
        });
      })
      .catch((error) => sendResponse({ ok: false, reason: String(error) }));
    return true;
  }
});
