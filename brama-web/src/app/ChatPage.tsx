import { useTranslation } from 'react-i18next'
import { GlassCard } from 'react-glass-ui'
import { useChat } from '@/hooks/useChat'
import { ChatComposer } from '@/components/ChatComposer'
import { ChatThread } from '@/components/ChatThread'
import { RoleModeSwitch } from '@/components/RoleModeSwitch'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { useChatSessionStore } from '@/contexts/chatSessionStore'
import { useUIStore } from '@/contexts/uiStore'
import { LifeEventsPanel } from '@/components/lifeEvents/LifeEventsPanel'

const BACKDROP =
  'fixed inset-0 -z-10 pointer-events-none ' +
  'bg-[radial-gradient(circle_at_12%_10%,rgb(0_195_230/0.22),transparent_26rem),' +
  'radial-gradient(circle_at_88%_16%,rgb(250_20_20/0.16),transparent_24rem),' +
  'radial-gradient(circle_at_50%_100%,rgb(115_190_70/0.2),transparent_30rem),' +
  'linear-gradient(180deg,var(--color-background)_0%,var(--color-background-subtle)_100%)]'

export function ChatPage() {
  const { t } = useTranslation()
  const { send, startFill, isStreaming } = useChat()
  const messages = useChatSessionStore((state) => state.messages)
  const role = useUIStore((state) => state.role)
  const lifeMode = useUIStore((state) => state.lifeMode)

  const isEmpty = messages.length === 0

  return (
    <main
      className="relative grid grid-rows-[auto_1fr_auto] w-[min(100%,var(--container-md))] min-h-[100svh] mx-auto px-[var(--container-padding)]"
      data-role={role}
    >
      <div aria-hidden="true" className={BACKDROP} />

      <header className="site-header chat-header">
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
          <a
            className="inline-flex items-center gap-[var(--space-3)] text-[var(--color-text)] text-[length:var(--font-size-lg)] font-bold no-underline"
            href="/"
            aria-label={t('chat.brandHome')}
          >
            <span className="brand-gate" aria-hidden="true" />
            <span>Brama</span>
          </a>
          <div className="flex items-center gap-[var(--space-3)]">
            <RoleModeSwitch />
            <LanguageSwitcher />
          </div>
        </GlassCard>
      </header>

      <section className="flex flex-col min-h-0" aria-label={t('chat.emptyTitle')}>
        {lifeMode ? (
          <div className="flex-1 overflow-y-auto py-[var(--space-6)]">
            <LifeEventsPanel />
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col gap-[var(--space-4)] items-start justify-center flex-1 py-[var(--space-12)]">
            <h1 className="m-0 text-[clamp(2rem,5vw,3rem)]">{t('chat.emptyTitle')}</h1>
            <p className="m-0 text-[var(--color-text-muted)] text-[length:var(--font-size-lg)]">
              {t('chat.intro')}
            </p>
            <ul
              className="flex flex-wrap gap-[var(--space-2)] mt-[var(--space-2)] p-0 list-none"
              aria-label={t('chat.suggestionsLabel')}
            >
              {(['s1', 's2', 's3'] as const).map((key) => {
                const question = t(`chat.suggestions.${key}`)
                return (
                  <li key={key}>
                    <button
                      type="button"
                      className="px-[var(--space-4)] py-[var(--space-2)] border border-[var(--color-border)] rounded-[var(--radius-pill)] bg-[var(--color-surface)] text-[var(--color-text)] text-[length:var(--font-size-sm)] cursor-pointer transition-[border-color] duration-[180ms] ease-[cubic-bezier(0.2,0,0,1)] hover:border-[var(--color-primary)]"
                      onClick={() => send(question)}
                    >
                      {question}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ) : (
          <ChatThread messages={messages} onAsk={send} />
        )}
      </section>

      <footer className="sticky bottom-0 pt-[var(--space-3)] pb-[var(--space-5)] bg-[linear-gradient(0deg,var(--color-background)_70%,transparent)]">
        <ChatComposer onSend={send} onStartFill={startFill} disabled={isStreaming} />
      </footer>
    </main>
  )
}
