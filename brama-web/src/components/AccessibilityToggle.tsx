import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

const contrastStorageKey = 'brama.highContrast'

function getStoredHighContrastPreference() {
  try {
    return window.localStorage.getItem(contrastStorageKey) === 'true'
  } catch {
    return false
  }
}

/** Persisted WCAG-friendly high contrast toggle shared across routes. */
export function AccessibilityToggle() {
  const { t } = useTranslation()
  const [usesHighContrast, setUsesHighContrast] = useState(getStoredHighContrastPreference)

  useEffect(() => {
    document.documentElement.dataset.theme = usesHighContrast ? 'high-contrast' : ''

    try {
      window.localStorage.setItem(contrastStorageKey, String(usesHighContrast))
    } catch {
      return
    }
  }, [usesHighContrast])

  return (
    <button
      aria-pressed={usesHighContrast}
      className="contrast-toggle"
      onClick={() => setUsesHighContrast((currentValue) => !currentValue)}
      type="button"
    >
      {usesHighContrast ? t('accessibility.highContrastOn') : t('accessibility.highContrastOff')}
    </button>
  )
}
