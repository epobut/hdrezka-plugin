const NEXT_EPISODE_KEY_STORAGE_KEY = "hdrezka_next_episode_key";
const FAVORITE_SERIES_STORAGE_KEY = "hdrezka_favorite_series";
const DEFAULT_NEXT_EPISODE_KEY = "PageDown";

const availableKeys = [
  { label: "Page Down", value: "PageDown" },
  { label: "Arrow Right", value: "ArrowRight" },
  { label: "N (Next)", value: "KeyN" },
  { label: "M (Media)", value: "KeyM" },
  { label: "F (Forward)", value: "KeyF" },
  { label: "Enter (Main)", value: "Enter" },
  { label: "Enter (Numpad)", value: "NumpadEnter" },
  { label: "/ . (Slash key)", value: "Slash" }
];

function showStatus(statusDiv, message, type) {
  statusDiv.textContent = message;
  statusDiv.className = type;
  setTimeout(() => {
    statusDiv.textContent = '';
    statusDiv.className = '';
  }, 3000);
}

function normalizeSeriesTitle(title) {
  return String(title || '').replace(/\s+/g, ' ').trim();
}

async function loadNextEpisodeKey() {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    const result = await chrome.storage.local.get(NEXT_EPISODE_KEY_STORAGE_KEY);
    return result[NEXT_EPISODE_KEY_STORAGE_KEY] || DEFAULT_NEXT_EPISODE_KEY;
  }

  return localStorage.getItem(NEXT_EPISODE_KEY_STORAGE_KEY) || DEFAULT_NEXT_EPISODE_KEY;
}

async function saveNextEpisodeKey(key) {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    await chrome.storage.local.set({ [NEXT_EPISODE_KEY_STORAGE_KEY]: key });
  } else {
    localStorage.setItem(NEXT_EPISODE_KEY_STORAGE_KEY, key);
  }
}

async function loadFavoriteSeries() {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    const result = await chrome.storage.local.get(FAVORITE_SERIES_STORAGE_KEY);
    const storedValue = result[FAVORITE_SERIES_STORAGE_KEY];
    return Array.isArray(storedValue) ? storedValue.map(normalizeSeriesTitle).filter(Boolean) : [];
  }

  try {
    const parsedValue = JSON.parse(localStorage.getItem(FAVORITE_SERIES_STORAGE_KEY) || '[]');
    return Array.isArray(parsedValue) ? parsedValue.map(normalizeSeriesTitle).filter(Boolean) : [];
  } catch (error) {
    return [];
  }
}

async function saveFavoriteSeries(seriesTitles) {
  const uniqueTitles = Array.from(new Set((seriesTitles || []).map(normalizeSeriesTitle).filter(Boolean)));

  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    await chrome.storage.local.set({ [FAVORITE_SERIES_STORAGE_KEY]: uniqueTitles });
  } else {
    localStorage.setItem(FAVORITE_SERIES_STORAGE_KEY, JSON.stringify(uniqueTitles));
  }
}

function triggerJsonDownload(filename, payload) {
  const blob = new Blob([payload], { type: 'application/json' });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

function extractFavoriteSeries(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && Array.isArray(payload.favoriteSeries)) {
    return payload.favoriteSeries;
  }

  throw new Error('JSON must be an array or an object with favoriteSeries');
}

document.addEventListener('DOMContentLoaded', async () => {
  const selectElement = document.getElementById('nextEpisodeKey');
  const saveButton = document.getElementById('saveButton');
  const exportFavoritesButton = document.getElementById('exportFavoritesButton');
  const importFavoritesButton = document.getElementById('importFavoritesButton');
  const favoritesFileInput = document.getElementById('favoritesFileInput');
  const statusDiv = document.getElementById('status');

  availableKeys.forEach((keyOption) => {
    const option = document.createElement('option');
    option.value = keyOption.value;
    option.textContent = keyOption.label;
    selectElement.appendChild(option);
  });

  const currentKey = await loadNextEpisodeKey();
  selectElement.value = currentKey;

  saveButton.addEventListener('click', async () => {
    await saveNextEpisodeKey(selectElement.value);
    showStatus(statusDiv, 'Settings saved!', 'success');
  });

  exportFavoritesButton.addEventListener('click', async () => {
    try {
      const favoriteSeries = await loadFavoriteSeries();
      const payload = JSON.stringify({
        updatedAt: new Date().toISOString(),
        favoriteSeries
      }, null, 2);
      triggerJsonDownload('favorite-series.local.json', payload);
      showStatus(statusDiv, `Exported favorites: ${favoriteSeries.length}`, 'success');
    } catch (error) {
      showStatus(statusDiv, `Export failed: ${error.message}`, 'error');
    }
  });

  importFavoritesButton.addEventListener('click', () => {
    favoritesFileInput.click();
  });

  favoritesFileInput.addEventListener('change', async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) {
      return;
    }

    try {
      const fileContent = await file.text();
      const parsedJson = JSON.parse(fileContent);
      const favoriteSeries = extractFavoriteSeries(parsedJson);
      await saveFavoriteSeries(favoriteSeries);
      showStatus(statusDiv, `Imported favorites: ${favoriteSeries.length}`, 'success');
    } catch (error) {
      showStatus(statusDiv, `Import failed: ${error.message}`, 'error');
    } finally {
      favoritesFileInput.value = '';
    }
  });
});
