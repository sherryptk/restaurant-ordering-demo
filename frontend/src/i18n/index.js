import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import dayjs from 'dayjs'
import 'dayjs/locale/ar'
import en from './locales/en.json'
import ar from './locales/ar.json'

const STORAGE_KEY = 'locale'
const storedLocale = localStorage.getItem(STORAGE_KEY)
const initialLanguage = storedLocale === 'en' ? 'en' : 'ar'

function applyDocumentAttributes(lng) {
  document.documentElement.lang = lng
  document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr'
  dayjs.locale(lng === 'ar' ? 'ar' : 'en')
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ar: { translation: ar },
  },
  lng: initialLanguage,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

applyDocumentAttributes(initialLanguage)

i18n.on('languageChanged', (lng) => {
  localStorage.setItem(STORAGE_KEY, lng)
  applyDocumentAttributes(lng)
})

export default i18n
