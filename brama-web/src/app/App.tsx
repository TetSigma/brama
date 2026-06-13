import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Menu, X } from 'lucide-react'
import { GlassCard } from 'react-glass-ui'
import heroImage from '@/assets/lublin-civic-platform.png'
import { UIButton, uiButtonClass } from '@/ui'
import { persistLanguage } from '@/localization'
import { languageCodes, languageFlags, languageNames, type LanguageCode } from '@/localization/resources'

const navLinks = [
  { id: 'platform', href: '#platform' },
  { id: 'services', href: '#services' },
  { id: 'trust', href: '#trust' },
] as const

const serviceAreas = ['documents', 'appointments', 'benefits', 'transport'] as const
const platformFeatures = ['guided', 'local', 'handoff'] as const
const processSteps = ['ask', 'review', 'continue'] as const
const contrastStorageKey = 'brama.highContrast'

function getStoredHighContrastPreference() {
  try {
    return window.localStorage.getItem(contrastStorageKey) === 'true'
  } catch {
    return false
  }
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)

  useEffect(() => {
    const mediaQuery = window.matchMedia(query)

    function handleChange() {
      setMatches(mediaQuery.matches)
    }

    handleChange()
    mediaQuery.addEventListener('change', handleChange)

    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [query])

  return matches
}

function usePrefersReducedMotion() {
  return useMediaQuery('(prefers-reduced-motion: reduce)')
}

function useTypewriter(words: readonly string[], prefersReducedMotion: boolean) {
  const [wordIndex, setWordIndex] = useState(0)
  const [characterCount, setCharacterCount] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (prefersReducedMotion || words.length === 0) {
      return
    }

    const currentWord = words[wordIndex] ?? ''
    const isWordComplete = characterCount === currentWord.length
    const isWordDeleted = characterCount === 0
    const delay = isWordComplete && !isDeleting ? 1500 : isDeleting ? 42 : 72

    const timeout = window.setTimeout(() => {
      if (isWordComplete && !isDeleting) {
        setIsDeleting(true)
        return
      }

      if (isWordDeleted && isDeleting) {
        setIsDeleting(false)
        setWordIndex((currentIndex) => (currentIndex + 1) % words.length)
        return
      }

      setCharacterCount((currentCount) => currentCount + (isDeleting ? -1 : 1))
    }, delay)

    return () => window.clearTimeout(timeout)
  }, [characterCount, isDeleting, prefersReducedMotion, wordIndex, words])

  if (prefersReducedMotion) {
    return words[0] ?? ''
  }

  return (words[wordIndex] ?? '').slice(0, characterCount)
}

function App() {
  const { i18n, t } = useTranslation()
  const prefersReducedMotion = usePrefersReducedMotion()
  const [usesHighContrast, setUsesHighContrast] = useState(getStoredHighContrastPreference)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const currentLanguage =
    languageCodes.find((languageCode) => i18n.resolvedLanguage?.startsWith(languageCode)) ?? 'en'
  const typewriterWords = useMemo(
    () => serviceAreas.map((area) => t(`services.areas.${area}`)),
    [t],
  )
  const typedServiceArea = useTypewriter(typewriterWords, prefersReducedMotion)

  useEffect(() => {
    document.title = t('meta.title')

    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    description?.setAttribute('content', t('meta.description'))
  }, [t])

  useEffect(() => {
    document.documentElement.dataset.theme = usesHighContrast ? 'high-contrast' : ''

    try {
      window.localStorage.setItem(contrastStorageKey, String(usesHighContrast))
    } catch {
      return
    }
  }, [usesHighContrast])

  useEffect(() => {
    if (!isMenuOpen) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsMenuOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isMenuOpen])

  function handleLanguageChange(language: LanguageCode) {
    persistLanguage(language)
    void i18n.changeLanguage(language)
  }

  return (
    <>
      <a className="skip-link" href="#main-content">
        {t('accessibility.skipToContent')}
      </a>
      <header className="site-header" aria-label={t('navigation.headerLabel')}>
        <GlassCard
          className="site-header__glass"
          contentClassName="site-header__content"
          blur={17}
          distortion={343}
          flexibility={0}
          borderColor="#ffffff"
          borderSize={1}
          borderRadius={130}
          borderOpacity={0.4}
          backgroundColor="#000000"
          backgroundOpacity={0.06}
          chromaticAberration={0}
          onHoverScale={1}
          saturation={100}
          brightness={100}
          padding="12px 18px"
        >
          <a className="brand-mark" href="#top" aria-label={t('navigation.homeLabel')}>
            <span className="brand-gate" aria-hidden="true" />
            <span>Brama</span>
          </a>
          <nav className="site-nav" aria-label={t('navigation.mainLabel')}>
            {navLinks.map((link) => (
              <a key={link.id} href={link.href}>
                {t(`navigation.${link.id}`)}
              </a>
            ))}
          </nav>
          <div className="header-actions">
            <Link
              className={uiButtonClass({ className: 'header-cta', variant: 'primary', size: 'sm' })}
              to="/chat"
            >
              {t('navigation.assistant')}
            </Link>
            <button
              aria-controls="mobile-menu"
              aria-expanded={isMenuOpen}
              aria-label={t('navigation.mainLabel')}
              className="menu-toggle"
              onClick={() => setIsMenuOpen((currentValue) => !currentValue)}
              type="button"
            >
              {isMenuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
            </button>
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
                    {languageFlags[languageCode]} {languageNames[languageCode]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </GlassCard>
        <nav
          aria-label={t('navigation.mainLabel')}
          className="mobile-menu"
          data-open={isMenuOpen}
          id="mobile-menu"
        >
          {navLinks.map((link) => (
            <a key={link.id} href={link.href} onClick={() => setIsMenuOpen(false)}>
              {t(`navigation.${link.id}`)}
            </a>
          ))}
        </nav>
      </header>

      <button
        role="switch"
        aria-checked={usesHighContrast}
        aria-label={usesHighContrast
          ? t('accessibility.highContrastOn')
          : t('accessibility.highContrastOff')}
        className="contrast-switch contrast-switch--floating"
        onClick={() => setUsesHighContrast((currentValue) => !currentValue)}
        type="button"
      >
        <span className="contrast-switch__label">{t('accessibility.highContrastOff')}</span>
        <span className="contrast-switch__track">
          <span className="contrast-switch__thumb" />
        </span>
      </button>

      <main className="site-shell" id="main-content" tabIndex={-1}>
      <section className="hero-section" id="top" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow">{t('hero.eyebrow')}</p>
          <h1 id="hero-title">{t('hero.title')}</h1>
          <p className="hero-rotator" aria-label={t('hero.rotatorLabel')}>
            <span>{t('hero.rotatorPrefix')}</span>
            <span className="typewriter-word" aria-hidden="true">
              {typedServiceArea}
            </span>
          </p>
          <p className="hero-lede">{t('hero.lede')}</p>
          <div className="hero-actions" aria-label={t('hero.actionsLabel')}>
            <Link className={uiButtonClass({ variant: 'primary', size: 'md' })} to="/chat">
              {t('hero.primaryAction')}
            </Link>
            <UIButton href="#services" variant="secondary">
              {t('hero.secondaryAction')}
            </UIButton>
          </div>
        </div>

        <div className="hero-visual" aria-label={t('hero.visualLabel')}>
          <GlassCard
            className="hero-glass"
            contentClassName="hero-glass__content"
            borderRadius={28}
            blur={3}
            distortion={95}
            chromaticAberration={9}
            saturation={150}
            brightness={106}
            flexibility={0}
            onHoverScale={1.03}
            borderColor="#ffffff"
            borderOpacity={0.65}
            borderSize={1}
            innerLightBlur={28}
            innerLightSpread={3}
            innerLightColor="#ffffff"
            innerLightOpacity={0.8}
            outerLightBlur={48}
            outerLightSpread={4}
            outerLightColor="#ffffff"
            outerLightOpacity={0.35}
          >
            <img src={heroImage} alt={t('hero.imageAlt')} />
          </GlassCard>
          <div className="assistant-panel" aria-label={t('assistantPreview.label')}>
            <p>{t('assistantPreview.question')}</p>
            <span>{t('assistantPreview.answer')}</span>
          </div>
        </div>
      </section>

      <section className="platform-band" id="platform" aria-labelledby="platform-title">
        <div className="section-heading">
          <p className="eyebrow">{t('platform.eyebrow')}</p>
          <h2 id="platform-title">{t('platform.title')}</h2>
        </div>
        <div className="feature-grid">
          {platformFeatures.map((feature) => (
            <article className="feature-card" key={feature}>
              <h3>{t(`platform.features.${feature}.title`)}</h3>
              <p>{t(`platform.features.${feature}.description`)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="services-section" id="services" aria-labelledby="services-title">
        <div className="services-copy">
          <p className="eyebrow">{t('services.eyebrow')}</p>
          <h2 id="services-title">{t('services.title')}</h2>
          <p>{t('services.body')}</p>
        </div>
        <ul className="service-list" aria-label={t('services.listLabel')}>
          {serviceAreas.map((area) => (
            <li key={area}>{t(`services.areas.${area}`)}</li>
          ))}
        </ul>
      </section>

      <section className="trust-band" id="trust" aria-labelledby="trust-title">
        <div>
          <p className="eyebrow">{t('trust.eyebrow')}</p>
          <h2 id="trust-title">{t('trust.title')}</h2>
        </div>
        <ol className="process-list" aria-label={t('trust.processLabel')}>
          {processSteps.map((step, index) => (
            <li className="process-step" key={step}>
              <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
              <p>{t(`trust.steps.${step}`)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="cta-section" aria-labelledby="cta-title">
        <h2 id="cta-title">{t('cta.title')}</h2>
        <p>{t('cta.body')}</p>
        <UIButton href="#top">{t('cta.action')}</UIButton>
      </section>
    </main>
    </>
  )
}

export default App
