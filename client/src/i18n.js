import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import translationEN from './locales/en.json';
import translationDE from './locales/de.json';
import translationZH from './locales/zh.json';

const resources = {
  en: { translation: translationEN },
  de: { translation: translationDE },
  zh: { translation: translationZH }
};

i18n
  .use(LanguageDetector)               // optional but nice to have
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    // If you prefer to force English first run, uncomment next line:
    // lng: 'en',
    supportedLngs: ['en', 'de', 'zh'],
    interpolation: { escapeValue: false },
    // prevent i18next from trying to load missing files over HTTP:
    backend: undefined,
    returnEmptyString: false,
  });

export default i18n;