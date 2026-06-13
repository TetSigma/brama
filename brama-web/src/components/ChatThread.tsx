import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { ChatMessage as ChatMessageModel } from '@/@types/chat'
import { ChatMessage } from './ChatMessage'

type ChatThreadProps = {
  messages: ChatMessageModel[]
  onAsk?: (query: string) => void
}

export function ChatThread({ messages, onAsk }: ChatThreadProps) {
  const { t } = useTranslation()
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    endRef.current?.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'end' })
  }, [messages])

  return (
    <div
      id="chat-thread"
      className="flex flex-col gap-[var(--space-5)] pt-[var(--space-4)] pb-[var(--space-8)]"
      role="log"
      aria-live="polite"
      aria-relevant="additions text"
      aria-label={t('chat.threadLabel')}
    >
      {messages.map((message) => (
        <ChatMessage key={message.id} message={message} onAsk={onAsk} />
      ))}
      <div ref={endRef} />
    </div>
  )
}
