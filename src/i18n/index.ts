import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import hi from './locales/hi.json'
import te from './locales/te.json'

const saved = localStorage.getItem('nidhi-lang') ?? localStorage.getItem('seva-lang')
const initial = saved === 'te' || saved === 'hi' || saved === 'en' ? saved : 'en'

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    hi: { translation: hi },
    te: { translation: te },
  },
  lng: initial,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

i18n.on('languageChanged', (lng) => {
  localStorage.setItem('nidhi-lang', lng)
  localStorage.removeItem('seva-lang')
  document.documentElement.lang = lng
})

document.documentElement.lang = i18n.language

export default i18n
