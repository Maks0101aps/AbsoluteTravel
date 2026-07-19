import '@testing-library/jest-dom/vitest';
// Initializes the shared i18next singleton once for every test file, so
// components using useTranslation() render real copy instead of raw keys.
// Pinned to 'uk' (the app's default locale) rather than whatever jsdom's
// navigator.language auto-detects to, so assertions on rendered text are
// deterministic across environments.
import i18n from '../i18n';
i18n.changeLanguage('uk');

// jsdom doesn't implement matchMedia — several components/hooks
// (usePwa, Popover via useViewport) touch it defensively.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}

// jsdom has no IntersectionObserver; main.tsx's scroll-reveal effect isn't
// under test, but any component that happens to import something touching it
// should still be able to mount without throwing.
if (!('IntersectionObserver' in window)) {
  class MockIntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  // @ts-expect-error - test polyfill
  window.IntersectionObserver = MockIntersectionObserver;
}
