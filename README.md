# hdrezka-plugin

## Українська

Розширення для Chrome, яке покращує перегляд серіалів на сайтах, де домен містить `rezka`.

### Можливості

- Перехід до наступної серії за налаштовуваною клавішею.
- Спроба автоматично запускати відтворення після переходу на наступну серію.
- Оверлей із номером серії під час старту відтворення.
- Обране у списках серіалів і оновлень: зірка, підсвітка назви та локальне збереження.
- Автоматичне дзеркалювання обраного в `chrome.storage.sync`.
- Автоматичне відновлення обраного після перевстановлення, якщо ввімкнений Chrome Sync.
- Ручний імпорт JSON як запасний варіант.

### Як працює з доменами

Розширення інжектується на всі `http/https` сторінки, але активується тільки тоді, коли `window.location.hostname` містить `rezka` у будь-якому регістрі та в будь-якій частині домену.

### Підтримка різних версток

Плагін підтримує щонайменше дві схеми списків:

- класичний список оновлень із `.b-seriesupdate__block_list_item`;
- карткову сітку на кшталт `hdrezka.inc` із `.postItem`, `.postTitle` та `.serialInfo`.

### Встановлення

1. Відкрий `chrome://extensions`.
2. Увімкни режим розробника.
3. Натисни `Load unpacked` / `Завантажити розпаковане розширення`.
4. Вибери папку проєкту.

## English

Chrome extension that improves watching series on sites whose domain contains `rezka`.

### Features

- Jump to the next episode using a configurable hotkey.
- Attempt autoplay after moving to the next episode.
- Show an episode number overlay when playback starts.
- Favorites in series lists and update feeds: star button, highlighted title, and local persistence.
- Automatic mirroring of favorites into `chrome.storage.sync`.
- Automatic restore after reinstall when Chrome Sync is enabled.
- Manual JSON import as a fallback option.

### Domain handling

The extension is injected into all `http/https` pages, but it only runs when `window.location.hostname` contains `rezka` in any casing and in any part of the host.

### Multi-layout support

The plugin supports at least two list layouts:

- the classic updates list with `.b-seriesupdate__block_list_item`;
- the card grid layout used by mirrors such as `hdrezka.inc` with `.postItem`, `.postTitle`, and `.serialInfo`.

### Installation

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click `Load unpacked`.
4. Select the project folder.

## Project files

- `manifest.json` - extension manifest.
- `background.js` - automatic sync and restore for favorites.
- `favorites.js` - favorites UI and persistence.
- `playback.js` - next episode, autoplay, and episode overlay.
- `content.js` - bootstrap and host filtering.
- `options.html` - popup UI.
- `options.js` - popup settings, sync restore, and manual import.
