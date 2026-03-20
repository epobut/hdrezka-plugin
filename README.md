# 🎬 HDRezka Enhancer: Auto-Next & Overlay

[UA] Браузерне розширення для комфортного перегляду серіалів на HDRezka. Автозапуск, гарячі клавіші та інфо-оверлей.
[EN] Browser extension for a better HDRezka experience. Autoplay, hotkeys, and episode info overlay.

---

## 🚀 Що він вміє? / Key Features

### 🇺🇦 Українською:
- **Автоматичне відтворення:** Більше не треба тиснути "Play" після перемикання серії. Плагін сам обходить обмеження браузера та запускає відео.
- **Гаряча клавіша (Next Episode):** Перемикайте на наступну серію одним натисканням (дефолт: `/` або `Slash`). Клавішу можна налаштувати.
- **Інфо-панель (Overlay):** При старті серії у кутку на 3 секунди з'являється стильний напис з номером епізоду. Працює навіть у повноекранному режимі!
- **Розумна логіка:** Плагін сам знаходить активну серію через URL, хеш або DOM-елементи сайту.

---

### 🇺🇸 English:
- **Smart Autoplay:** Automatically starts video playback after switching episodes, bypassing browser autoplay policies.
- **Custom Hotkeys:** Skip to the next episode with a single keypress (default: `Slash` `/`).
- **Episode Overlay:** Displays a sleek "Episode X" notification in the top-left corner for 3 seconds when playback starts. Compatible with fullscreen mode.
- **Advanced Detection:** Automatically detects the current episode number via URL, hash, or site structure.

---

## 🛠 Налаштування / Configuration

### 🇺🇦 Як змінити клавішу:
Ви можете налаштувати клавішу для перемикання через `chrome.storage` або просто відредагувати константу в коді:
- `DEFAULT_NEXT_EPISODE_KEY = "Slash"` (за замовчуванням).

### 🇺🇸 How to change the hotkey:
You can configure the trigger key via extension settings or by editing the constant in the script:
- `DEFAULT_NEXT_EPISODE_KEY = "Slash"` (default).

---

## 📦 Установка / Installation

1. Встановіть менеджер скриптів (наприклад, **Tampermonkey**).
2. Створіть новий скрипт та вставте код з цього репозиторію.
3. Відкрийте HDRezka та насолоджуйтесь автоматизацією!

---

## 📝 Технічні деталі / Technical Info
- **Tech:** JavaScript (ES6+), DOM Observer, LocalStorage Sync.
- **Compatibility:** Chrome, Firefox, Edge (via Tampermonkey or as a standalone extension).
