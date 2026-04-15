(() => {
  let scrollButton = null;
  let uiInitialized = false;
  let titleObserver = null;

  function ensureUiStyles() {
    if (document.getElementById('hdrezka-ui-styles')) {
      return;
    }

    const styleElement = document.createElement('style');
    styleElement.id = 'hdrezka-ui-styles';
    styleElement.textContent = `
      .hdrezka-scroll-top-button {
        position: fixed;
        right: 24px;
        bottom: 24px;
        width: 46px;
        height: 46px;
        border: none;
        border-radius: 999px;
        background: rgba(255, 152, 0, 0.95);
        color: #ffffff;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 10px 24px rgba(0, 0, 0, 0.25);
        z-index: 2147483646;
        opacity: 0;
        pointer-events: none;
        transform: translateY(10px);
        transition: opacity 0.2s ease, transform 0.2s ease, background-color 0.2s ease;
      }

      .hdrezka-scroll-top-button.is-visible {
        opacity: 1;
        pointer-events: auto;
        transform: translateY(0);
      }

      .hdrezka-scroll-top-button:hover {
        background: rgba(230, 126, 0, 0.98);
      }

      .hdrezka-scroll-top-button svg {
        width: 20px;
        height: 20px;
        display: block;
      }
    `;

    document.head.appendChild(styleElement);
  }

  function normalizePageTitle(title) {
    let normalizedTitle = String(title || '').trim();

    normalizedTitle = normalizedTitle.replace(/^\s*Смотреть\s+(мультфильм|сериал|фильм)\s+/i, '');
    normalizedTitle = normalizedTitle.replace(/^\s*Смотреть\s+/i, '');
    normalizedTitle = normalizedTitle.replace(/\s*онлайн\s+бесплатно.*$/i, '');
    normalizedTitle = normalizedTitle.replace(/\s*в\s+хорошем\s+качестве.*$/i, '');
    normalizedTitle = normalizedTitle.replace(/\s*на\s+hdrezka.*$/i, '');
    normalizedTitle = normalizedTitle.replace(/\s*[|:-]\s*hdrezka.*$/i, '');
    normalizedTitle = normalizedTitle.replace(/\s*[|:-]\s*смотреть.*$/i, '');
    normalizedTitle = normalizedTitle.replace(/\s{2,}/g, ' ');

    return normalizedTitle.trim();
  }

  function updateDocumentTitle() {
    const currentTitle = document.title;
    const normalizedTitle = normalizePageTitle(currentTitle);

    if (normalizedTitle && normalizedTitle !== currentTitle) {
      document.title = normalizedTitle;
      console.log('[HDRezka Plugin] Title normalized', {
        currentUrl: window.location.href,
        before: currentTitle,
        after: normalizedTitle
      });
    }
  }

  function ensureTitleObserver() {
    if (titleObserver) {
      return;
    }

    const titleElement = document.querySelector('title');
    if (!titleElement) {
      return;
    }

    titleObserver = new MutationObserver(() => {
      updateDocumentTitle();
    });

    titleObserver.observe(titleElement, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  function updateScrollButtonVisibility() {
    if (!scrollButton) {
      return;
    }

    const shouldShow = window.scrollY > window.innerHeight;
    scrollButton.classList.toggle('is-visible', shouldShow);
  }

  function ensureScrollTopButton() {
    if (scrollButton) {
      updateScrollButtonVisibility();
      return;
    }

    scrollButton = document.createElement('button');
    scrollButton.type = 'button';
    scrollButton.className = 'hdrezka-scroll-top-button';
    scrollButton.setAttribute('aria-label', 'Scroll to top');
    scrollButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 5l7 7-1.4 1.4-4.6-4.6V20h-2V8.8l-4.6 4.6L5 12z"></path></svg>';
    scrollButton.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    document.body.appendChild(scrollButton);

    window.addEventListener('scroll', updateScrollButtonVisibility, { passive: true });
    window.addEventListener('resize', updateScrollButtonVisibility);
    updateScrollButtonVisibility();
  }

  function init() {
    if (uiInitialized) {
      updateDocumentTitle();
      ensureScrollTopButton();
      return;
    }

    console.log('[HDRezka Plugin] UI init', { currentUrl: window.location.href });
    ensureUiStyles();
    updateDocumentTitle();
    ensureTitleObserver();
    ensureScrollTopButton();
    uiInitialized = true;
  }

  window.HDRezkaUi = { init };
})();
