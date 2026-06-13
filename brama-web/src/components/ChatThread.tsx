import { useEffect, useRef } from 'react'
import type { ChatMessage as ChatMessageModel } from '@/@types/chat'
import { ChatMessage } from './ChatMessage'

type ChatThreadProps = {
  messages: ChatMessageModel[]
  onAsk?: (query: string) => void
}

export function ChatThread({ messages, onAsk }: ChatThreadProps) {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  return (
    <div
      className="flex flex-col gap-[var(--space-5)] pt-[var(--space-4)] pb-[var(--space-8)]"
      role="log"
      aria-live="polite"
      aria-relevant="additions text"
      aria-label="Rozmowa z asystentem"
    >
      {messages.map((message) => (
        <ChatMessage key={message.id} message={message} onAsk={onAsk} />
      ))}
      <div ref={endRef} />
    </div>
  )
}
