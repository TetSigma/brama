import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { defaultLanguage, languageCodes, type LanguageCode, resources } from './resources'

const storageKey = 'brama.language'

function parseLanguage(value: string | null | undefined): LanguageCode | null {
  if (!value) {
    return null
  }

  const normalizedLanguage = value.toLowerCase().split('-')[0]

  return languageCodes.find((languageCode) => languageCode === normalizedLanguage) ?? null
}

function getStoredLanguage(): LanguageCode | null {
  try {
    return parseLanguage(window.localStorage.getItem(storageKey))
  } catch {
    return null
  }
}

function getBrowserLanguage(): LanguageCode | null {
  const browserLanguages = window.navigator.languages.length
    ? window.navigator.languages
    : [window.navigator.language]

  for (const browserLanguage of browserLanguages) {
    const parsedLanguage = parseLanguage(browserLanguage)

    if (parsedLanguage) {
      return parsedLanguage
    }
  }

  return null
}

export function getInitialLanguage(): LanguageCode {
  return getStoredLanguage() ?? getBrowserLanguage() ?? defaultLanguage
}

export function persistLanguage(language: LanguageCode) {
  try {
    window.localStorage.setItem(storageKey, language)
  } catch {
    return
  }
}

i18n.use(initReactI18next).init({
  resources,
  lng: getInitialLanguage(),
  fallbackLng: defaultLanguage,
  supportedLngs: languageCodes,
  interpolation: {
    escapeValue: false,
  },
})

document.documentElement.lang = i18n.resolvedLanguage ?? defaultLanguage

i18n.on('languageChanged', (language) => {
  document.documentElement.lang = parseLanguage(language) ?? defaultLanguage
})

export default i18n
