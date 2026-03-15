(function () {
  const sourceLanguage = 'mr';
  const storageKey = 'svLang';
  let pendingLanguage = null;
  const languages = [
    { code: 'mr', label: 'मराठी' },
    { code: 'hi', label: 'हिंदी' },
    { code: 'en', label: 'English' },
    { code: 'bn', label: 'বাংলা' },
    { code: 'ta', label: 'தமிழ்' },
    { code: 'te', label: 'తెలుగు' },
    { code: 'kn', label: 'ಕನ್ನಡ' },
    { code: 'ml', label: 'മലയാളം' },
    { code: 'gu', label: 'ગુજરાતી' },
    { code: 'pa', label: 'ਪੰਜਾਬੀ' },
    { code: 'or', label: 'ଓଡ଼ିଆ' },
    { code: 'as', label: 'অসমীয়া' },
    { code: 'ur', label: 'اردو' },
    { code: 'ne', label: 'नेपाली' },
    { code: 'sa', label: 'संस्कृत' },
    { code: 'sd', label: 'सिन्धी' }
  ];

  function ensureSwitcher() {
    if (document.querySelector('.gov-lang-switcher')) {
      return document.getElementById('govLangSelect');
    }

    const switcher = document.createElement('div');
    switcher.className = 'gov-lang-switcher';
    switcher.setAttribute('aria-label', 'Language switcher');

    const label = document.createElement('label');
    label.className = 'gov-lang-label';
    label.setAttribute('for', 'govLangSelect');
    label.textContent = 'Language';

    const select = document.createElement('select');
    select.className = 'gov-lang-select';
    select.id = 'govLangSelect';
    select.name = 'govLangSelect';

    languages.forEach((language) => {
      const option = document.createElement('option');
      option.value = language.code;
      option.textContent = language.label;
      select.appendChild(option);
    });

    switcher.appendChild(label);
    switcher.appendChild(select);
    document.body.appendChild(switcher);
    return select;
  }

  function setGoogTransCookie(value) {
    const cookieValue = `googtrans=${value};path=/;max-age=31536000`;
    document.cookie = cookieValue;
    document.cookie = `${cookieValue};domain=${window.location.hostname}`;
  }

  function triggerGoogleCombo(targetLanguage) {
    const combo = document.querySelector('.goog-te-combo');
    if (!combo) {
      return false;
    }

    combo.value = targetLanguage;
    combo.dispatchEvent(new Event('change'));
    combo.dispatchEvent(new Event('input'));
    return true;
  }

  function applyLanguage(langCode) {
    const target = langCode || sourceLanguage;
    localStorage.setItem(storageKey, target);
    setGoogTransCookie(`/auto/${target}`);
    setGoogTransCookie(`/${sourceLanguage}/${target}`);

    if (target === sourceLanguage) {
      setGoogTransCookie('/auto/auto');
      window.location.reload();
      return;
    }

    if (!triggerGoogleCombo(target)) {
      pendingLanguage = target;
    }
  }

  function installGoogleTranslateScript() {
    if (document.getElementById('google_translate_element')) {
      return;
    }

    const hiddenContainer = document.createElement('div');
    hiddenContainer.id = 'google_translate_element';
    hiddenContainer.className = 'translator-anchor';
    document.body.appendChild(hiddenContainer);

    window.googleTranslateElementInit = function () {
      new window.google.translate.TranslateElement(
        {
          pageLanguage: sourceLanguage,
          autoDisplay: false
        },
        'google_translate_element'
      );
    };

    if (!document.querySelector('script[data-google-translate="true"]')) {
      const script = document.createElement('script');
      script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      script.async = true;
      script.setAttribute('data-google-translate', 'true');
      document.head.appendChild(script);
    }
  }

  function applyPendingLanguageWithRetry(selectedLanguage) {
    let attempts = 0;
    const maxAttempts = 30;
    const timer = setInterval(function () {
      attempts += 1;
      if (triggerGoogleCombo(selectedLanguage) || attempts >= maxAttempts) {
        clearInterval(timer);
      }
    }, 250);
  }

  function placeTickerBelowMenu() {
    const nav = document.querySelector('.site-nav');
    const ticker = document.querySelector('.top-ticker');
    if (!nav || !ticker) {
      return;
    }

    if (nav.nextElementSibling !== ticker) {
      nav.insertAdjacentElement('afterend', ticker);
    }
  }

  function suppressGoogleUi() {
    const selectors = [
      '.goog-te-banner-frame',
      '.goog-te-menu-frame',
      '.goog-logo-link',
      '[class*="VIpgJd-ZVi9od"]',
      '[class*="goog-te-balloon"]',
      '[class*="goog-tooltip"]'
    ];

    selectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((node) => {
        node.style.display = 'none';
        node.style.visibility = 'hidden';
        node.style.opacity = '0';
        node.setAttribute('aria-hidden', 'true');
      });
    });

    document.body.style.top = '0px';
  }

  document.addEventListener('DOMContentLoaded', function () {
    placeTickerBelowMenu();

    const legacyBar = document.querySelector('.lang-bar');
    if (legacyBar) {
      legacyBar.style.display = 'none';
    }

    const select = ensureSwitcher();
    const savedLanguage = localStorage.getItem(storageKey) || sourceLanguage;
    select.value = savedLanguage;
    select.addEventListener('change', function () {
      applyLanguage(select.value);
    });

    installGoogleTranslateScript();
    suppressGoogleUi();

    if (savedLanguage !== sourceLanguage) {
      pendingLanguage = savedLanguage;
      applyPendingLanguageWithRetry(savedLanguage);
    }

    const observer = new MutationObserver(function () {
      suppressGoogleUi();
      if (pendingLanguage && triggerGoogleCombo(pendingLanguage)) {
        pendingLanguage = null;
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    setInterval(suppressGoogleUi, 1200);
  });
})();
