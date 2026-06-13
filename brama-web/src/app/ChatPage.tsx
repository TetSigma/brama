import { useTranslation } from 'react-i18next'
import { useChat } from '@/hooks/useChat'
import { ChatComposer } from '@/components/ChatComposer'
import { ChatThread } from '@/components/ChatThread'
import { RoleModeSwitch } from '@/components/RoleModeSwitch'
import { useChatSessionStore } from '@/contexts/chatSessionStore'
import { useUIStore } from '@/contexts/uiStore'

const SUGGESTIONS = [
  'Jak wyrobić dowód osobisty?',
  'Jakie dokumenty do rejestracji pojazdu?',
  'Gdzie złożyć wniosek o zezwolenie na alkohol?',
]

const BACKDROP =
  'fixed inset-0 -z-10 pointer-events-none ' +
  'bg-[radial-gradient(circle_at_12%_10%,rgb(0_195_230/0.22),transparent_26rem),' +
  'radial-gradient(circle_at_88%_16%,rgb(250_20_20/0.16),transparent_24rem),' +
  'radial-gradient(circle_at_50%_100%,rgb(115_190_70/0.2),transparent_30rem),' +
  'linear-gradient(180deg,var(--color-background)_0%,var(--color-background-subtle)_100%)]'

export function ChatPage() {
  const { t } = useTranslation()
  const { send, isStreaming } = useChat()
  const messages = useChatSessionStore((state) => state.messages)
  const role = useUIStore((state) => state.role)

  const isEmpty = messages.length === 0

  return (
    <main
      className="relative grid grid-rows-[auto_1fr_auto] w-[min(100%,var(--container-md))] min-h-[100svh] mx-auto px-[var(--container-padding)]"
      data-role={role}
    >
      <div aria-hidden="true" className={BACKDROP} />

      <header className="sticky top-0 z-10 flex items-center justify-between gap-[var(--space-4)] py-[var(--space-4)] bg-[linear-gradient(180deg,rgb(255_255_255/0.55)_60%,transparent)] backdrop-blur-[14px] backdrop-saturate-[1.4]">
        <a
          className="inline-flex items-center gap-[var(--space-3)] text-[var(--color-text)] text-[length:var(--font-size-lg)] font-bold no-underline"
          href="/"
          aria-label="Brama — strona główna"
        >
          <span className="brand-gate" aria-hidden="true" />
          <span>Brama</span>
        </a>
        <RoleModeSwitch />
      </header>

      <section className="flex flex-col min-h-0" aria-label="Asystent">
        {isEmpty ? (
          <div className="flex flex-col gap-[var(--space-4)] items-start justify-center flex-1 py-[var(--space-12)]">
            <h1 className="m-0 text-[clamp(2rem,5vw,3rem)]">{t('hero.title', 'Brama')}</h1>
            <p className="m-0 text-[var(--color-text-muted)] text-[length:var(--font-size-lg)]">
              Zapytaj o sprawę urzędową w Lublinie. Odpowiem na podstawie oficjalnych źródeł.
            </p>
            <ul
              className="flex flex-wrap gap-[var(--space-2)] mt-[var(--space-2)] p-0 list-none"
              aria-label="Przykładowe pytania"
            >
              {SUGGESTIONS.map((question) => (
                <li key={question}>
                  <button
                    type="button"
                    className="px-[var(--space-4)] py-[var(--space-2)] border border-[var(--color-border)] rounded-[var(--radius-pill)] bg-[var(--color-surface)] text-[var(--color-text)] text-[length:var(--font-size-sm)] cursor-pointer transition-[border-color] duration-[180ms] ease-[cubic-bezier(0.2,0,0,1)] hover:border-[var(--color-primary)]"
                    onClick={() => send(question)}
                  >
                    {question}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <ChatThread messages={messages} onAsk={send} />
        )}
      </section>

      <footer className="sticky bottom-0 pt-[var(--space-3)] pb-[var(--space-5)] bg-[linear-gradient(0deg,var(--color-background)_70%,transparent)]">
        <ChatComposer onSend={send} disabled={isStreaming} />
      </footer>
    </main>
  )
}
