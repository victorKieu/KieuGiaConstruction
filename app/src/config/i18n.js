// src/config/i18n.js
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../locales/en/common.json';
import vi from '../locales/vi/common.json';

i18next
    .use(initReactI18next)
    .init({
        resources: {
            en: {
                translation: en
            },
            vi: {
                translation: vi
            }
        },
        lng: "vi",
        fallbackLng: "en",
        interpolation: {
            escapeValue: false
        }
    });

export default i18next;