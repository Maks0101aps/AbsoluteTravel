import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import ukCommon from './locales/uk/common.json';
import ukCore from './locales/uk/core.json';
import ukExplore from './locales/uk/explore.json';
import ukSocial from './locales/uk/social.json';
import ukForms from './locales/uk/forms.json';
import ukShop from './locales/uk/shop.json';
import ukPlaces from './locales/uk/places.json';
import ukRegions from './locales/uk/regions.json';
import ukAchievements from './locales/uk/achievements.json';

import enCommon from './locales/en/common.json';
import enCore from './locales/en/core.json';
import enExplore from './locales/en/explore.json';
import enSocial from './locales/en/social.json';
import enForms from './locales/en/forms.json';
import enShop from './locales/en/shop.json';
import enPlaces from './locales/en/places.json';
import enRegions from './locales/en/regions.json';
import enAchievements from './locales/en/achievements.json';

import plCommon from './locales/pl/common.json';
import plCore from './locales/pl/core.json';
import plExplore from './locales/pl/explore.json';
import plSocial from './locales/pl/social.json';
import plForms from './locales/pl/forms.json';
import plShop from './locales/pl/shop.json';
import plPlaces from './locales/pl/places.json';
import plRegions from './locales/pl/regions.json';
import plAchievements from './locales/pl/achievements.json';

export const LANG_KEY = 'absolute_travel_lang';
export type Lang = 'uk' | 'en' | 'pl';
export const LANGUAGES: { code: Lang; label: string }[] = [
  { code: 'uk', label: 'UA' },
  { code: 'en', label: 'EN' },
  { code: 'pl', label: 'PL' },
];

function detectLang(): Lang {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === 'uk' || saved === 'en' || saved === 'pl') return saved;
  } catch {
    // localStorage unavailable — fall through to browser detection
  }
  const browser = navigator.language.slice(0, 2);
  if (browser === 'en' || browser === 'pl') return browser;
  return 'uk';
}

i18n.use(initReactI18next).init({
  resources: {
    uk: { translation: { ...ukCommon, ...ukCore, ...ukExplore, ...ukSocial, ...ukForms, ...ukShop, ...ukPlaces, ...ukRegions, ...ukAchievements } },
    en: { translation: { ...enCommon, ...enCore, ...enExplore, ...enSocial, ...enForms, ...enShop, ...enPlaces, ...enRegions, ...enAchievements } },
    pl: { translation: { ...plCommon, ...plCore, ...plExplore, ...plSocial, ...plForms, ...plShop, ...plPlaces, ...plRegions, ...plAchievements } },
  },
  lng: detectLang(),
  fallbackLng: 'uk',
  interpolation: { escapeValue: false },
});

i18n.on('languageChanged', (lng) => {
  try {
    localStorage.setItem(LANG_KEY, lng);
  } catch {
    // ignore
  }
});

export default i18n;
