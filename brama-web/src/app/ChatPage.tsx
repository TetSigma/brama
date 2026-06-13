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

export function ChatPage() {
  const { t } = useTranslation()
  const { send, isStreaming } = useChat()
  const messages = useChatSessionStore((state) => state.messages)
  const role = useUIStore((state) => state.role)

  const isEmpty = messages.length === 0

  return (
    <main className="chat-shell" data-role={role}>
      <header className="chat-header">
        <a className="chat-brand" href="/" aria-label="Brama — strona główna">
          <span className="brand-gate" aria-hidden="true" />
          <span>Brama</span>
        </a>
        <RoleModeSwitch />
      </header>

      <section className="chat-main" aria-label="Asystent">
        {isEmpty ? (
          <div className="chat-empty">
            <h1>{t('hero.title', 'Brama')}</h1>
            <p>Zapytaj o sprawę urzędową w Lublinie. Odpowiem na podstawie oficjalnych źródeł.</p>
            <ul className="chat-suggestions" aria-label="Przykładowe pytania">
              {SUGGESTIONS.map((question) => (
                <li key={question}>
                  <button type="button" onClick={() => send(question)}>
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

      <footer className="chat-footer">
        <ChatComposer onSend={send} disabled={isStreaming} />
      </footer>
    </main>
  )
}
