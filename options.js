const NEXT_EPISODE_KEY_STORAGE_KEY = "hdrezka_next_episode_key";
const DEFAULT_NEXT_EPISODE_KEY = "PageDown";

const availableKeys = [
  { label: "Page Down", value: "PageDown" },
  { label: "Arrow Right", value: "ArrowRight" },
  { label: "N (Next)", value: "KeyN" },
  { label: "M (Media)", value: "KeyM" },
  { label: "F (Forward)", value: "KeyF" },
  { label: "Enter (основная)", value: "Enter" }, 
  { label: "Enter (Numpad)", value: "NumpadEnter" }, 
  { label: "/ . (Slash key)", value: "Slash" },
];

async function loadNextEpisodeKey() {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    const result = await chrome.storage.local.get(NEXT_EPISODE_KEY_STORAGE_KEY);
    return result[NEXT_EPISODE_KEY_STORAGE_KEY] || DEFAULT_NEXT_EPISODE_KEY;
  } else {
    // Fallback for development outside extension context (e.g., if running directly in browser)
    console.warn("chrome.storage.local not available. Using localStorage fallback.");
    return localStorage.getItem(NEXT_EPISODE_KEY_STORAGE_KEY) || DEFAULT_NEXT_EPISODE_KEY;
  }
}

async function saveNextEpisodeKey(key) {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    await chrome.storage.local.set({ [NEXT_EPISODE_KEY_STORAGE_KEY]: key });
  } else {
    // Fallback for development outside extension context
    console.warn("chrome.storage.local not available. Using localStorage fallback.");
    localStorage.setItem(NEXT_EPISODE_KEY_STORAGE_KEY, key);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const selectElement = document.getElementById('nextEpisodeKey');
  const saveButton = document.getElementById('saveButton');
  const statusDiv = document.getElementById('status');

  // Populate select options
  availableKeys.forEach(keyOption => {
    const option = document.createElement('option');
    option.value = keyOption.value;
    option.textContent = keyOption.label;
    selectElement.appendChild(option);
  });

  // Load current setting
  const currentKey = await loadNextEpisodeKey();
  selectElement.value = currentKey;

  // Save button click handler
  saveButton.addEventListener('click', async () => {
    const newKey = selectElement.value;
    await saveNextEpisodeKey(newKey);
    statusDiv.textContent = 'Настройки сохранены!';
    statusDiv.className = 'success';
    setTimeout(() => {
      statusDiv.textContent = '';
      statusDiv.className = '';
    }, 3000);
  });
});