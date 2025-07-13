## hdrezka-plugin v3.0

Плагин, позволяющий переключить следующую серию сериала на сайте HDrezka по нажатию выбранной клавиши в настройках.


This document outlines the technical stack and guidelines for making modifications to the HDRezka Plugin.

## Tech Stack Overview

*   **Core Languages:** HTML5, CSS3, and JavaScript (ES6+).
*   **Application Type:** This is a browser extension, primarily targeting Google Chrome, utilizing Chrome Extension APIs.
*   **Frontend Framework:** No external frontend frameworks (e.g., React, Vue, Angular) are used. The application is built with vanilla JavaScript.
*   **Styling:** Styling is handled using pure CSS, either inline within HTML or embedded in `<style>` tags. No CSS frameworks (e.g., Tailwind CSS, Bootstrap, Material UI) are currently in use.
*   **Data Persistence:** Settings and data are stored using `chrome.storage.local` for browser extension persistence, with `localStorage` as a fallback for development or non-extension contexts.
*   **DOM Manipulation:** Standard Web APIs for DOM manipulation are used (e.g., `document.getElementById`, `document.querySelector`, `addEventListener`).
*   **Build System:** There is no complex build system or package manager (e.g., Webpack, Parcel, npm scripts) configured. The project relies on direct browser execution of HTML and JavaScript files.
*   **Icons:** No specific icon library is currently integrated.

## Library and Tooling Usage Rules

*   **Frontend Development:**
    *   **Frameworks:** Do NOT introduce any frontend frameworks (e.g., React, Vue, Angular). Continue to use vanilla JavaScript for all interactive elements and logic.
    *   **DOM Manipulation:** Use native JavaScript DOM manipulation methods.
*   **Styling:**
    *   **CSS:** Continue to use pure CSS for all styling. Do NOT introduce CSS frameworks like Tailwind CSS, Bootstrap, or Material UI unless explicitly requested by the user.
    *   **Responsiveness:** Ensure any new UI elements or modifications are responsive using standard CSS techniques.
*   **Data Storage:**
    *   **Extension Settings:** For persistent storage within the extension, prioritize `chrome.storage.local`.
    *   **Fallback:** Use `localStorage` only as a fallback for environments where `chrome.storage.local` is unavailable (e.g., direct browser testing of `options.html`).
*   **Dependencies:**
    *   **External Libraries:** Avoid adding external JavaScript libraries or npm packages unless absolutely necessary and explicitly requested by the user. The goal is to keep the project lightweight and dependency-free.
    *   **Package Manager:** Do NOT introduce `npm` or `yarn` or a `package.json` file unless a specific third-party library requiring it is requested.
*   **File Structure:**
    *   Maintain the existing simple file structure (`options.html`, `options.js`, `content.js`).
    *   New JavaScript logic should be placed in separate, clearly named `.js` files if it becomes substantial, but keep the overall structure flat.
*   **Browser Extension Context:**
    *   Always consider the context of a browser extension when making changes, especially regarding security (e.g., Content Security Policy, isolated worlds) and API availability (`chrome` object).
*   **Code Style:**
    *   Adhere to the existing JavaScript and CSS coding style (e.g., indentation, variable naming).