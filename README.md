# ⏭️ HDRezka Enhancer: Auto-Next & Overlay

[UA] Розширення для браузера, що додає автоплей, гарячі клавіші та інфо-оверлей для серіалів на HDRezka.
[EN] Browser extension that adds autoplay, hotkeys, and an episode info overlay for HDRezka series.

---

## ⚡ Що він робить? / Key Features

### 🇺🇦 Українською:
- **Smart Autoplay:** Автоматично запускає відео, обходячи блокування браузера (робить "розумний" клік).
- **Гаряча клавіша:** Перемикайте на наступну серію однією кнопкою (за замовчуванням `/` або `Slash`).
- **Інфо-оверлей:** При старті серії у кутку з'являється плашка "Серія X" на 3 секунди. Працює навіть у повноекранному режимі.
- **Розумне визначення:** Автоматично зчитує номер серії з URL або структури сайту.

---

### 🇺🇸 English:
- **Smart Autoplay:** Automatically triggers video playback by simulating a "smart click" to bypass browser policies.
- **Custom Hotkey:** Switch to the next episode instantly (default: `Slash` `/`).
- **Episode Overlay:** Shows a sleek "Episode X" notification in the top-left corner for 3 seconds. Fullscreen compatible.
- **Auto-Detection:** Detects the current episode number via URL, hash, or site DOM.

---

## 🛠 Налаштування / Setup

### 🇺🇦 Як встановити:
1. Завантажте файли розширення.
2. Перейдіть у `chrome://extensions/`.
3. Увімкніть **Developer mode**.
4. Натисніть **Load unpacked** та оберіть папку з проектом.

### 🇺🇸 How to install:
1. Download the extension files.
2. Open `chrome://extensions/`.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the project folder.

---

## 📝 Технічні деталі / Tech
- **Core:** Pure JavaScript, Chrome Storage API, DOM Mutation.
- **UI:** CSS-in-JS overlay, works over HTML5 Video layers.
