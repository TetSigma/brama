import { useTranslation } from 'react-i18next'
import { persistLanguage } from '@/localization'
import { languageCodes, languageFlags, languageNames, type LanguageCode } from '@/localization/resources'

/** Flag language picker, shared by the home and chat headers. */
export function LanguageSwitcher() {
  const { i18n, t } = useTranslation()
  const currentLanguage =
    languageCodes.find((languageCode) => i18n.resolvedLanguage?.startsWith(languageCode)) ?? 'en'

  function handleLanguageChange(language: LanguageCode) {
    persistLanguage(language)
    void i18n.changeLanguage(language)
  }

  return (
    <div className="language-switcher">
      <label className="visually-hidden" htmlFor="language-select">
        {t('navigation.languageLabel')}
      </label>
      <select
        aria-label={`${t('navigation.languageLabel')}: ${languageNames[currentLanguage]}`}
        className="language-select"
        id="language-select"
        onChange={(event) => handleLanguageChange(event.target.value as LanguageCode)}
        value={currentLanguage}
      >
        {languageCodes.map((languageCode) => (
          <option key={languageCode} value={languageCode}>
            {languageFlags[languageCode]}
          </option>
        ))}
      </select>
    </div>
  )
}
