import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import te from './locales/te.json'

const saved = localStorage.getItem('seva-lang')

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    te: { translation: te },
  },
  lng: saved === 'te' ? 'te' : 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

i18n.on('languageChanged', (lng) => {
  localStorage.setItem('seva-lang', lng)
  document.documentElement.lang = lng
})

document.documentElement.lang = i18n.language

export default i18n
