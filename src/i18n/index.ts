/**
 * i18next bootstrap — English-only resource bundle.
 *
 * Adding a new language later: drop a new `src/i18n/locales/<lang>/*.json`
 * file with the same keys, then import + register it under `resources` here.
 * No component code changes required because all paywall/CTA/trigger copy
 * already routes through `useTranslation()`.
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enPaywall from './locales/en/paywall.json';
import enErrors from './locales/en/errors.json';

void i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  defaultNS: 'paywall',
  ns: ['paywall', 'errors'],
  resources: {
    en: {
      paywall: enPaywall,
      errors: enErrors,
    },
  },
  interpolation: {
    escapeValue: false, // React already escapes
  },
  returnObjects: true,
});

export default i18n;
