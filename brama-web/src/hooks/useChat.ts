import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useUIStore } from '@/contexts/uiStore'
import { useChatSessionStore } from '@/contexts/chatSessionStore'
import { streamChat } from '@/api/chatClient'
import { parseBlocks } from '@/api/blocks'

/**
 * Domain hook: owns the chat send + stream loop. UI components call `send(text)`.
 * Network goes through React Query (mutation); streamed state lands in the session store.
 */
export function useChat() {
  const { i18n } = useTranslation()
  const role = useUIStore((state) => state.role)
  const sessionId = useChatSessionStore((state) => state.sessionId)
  const isStreaming = useChatSessionStore((state) => state.isStreaming)
  const store = useChatSessionStore

  const mutation = useMutation({
    mutationFn: async (message: string) => {
      const {
        addUserMessage,
        startAssistantMessage,
        appendToken,
        setBlocks,
        setGrounded,
        finishAssistantMessage,
      } = store.getState()

      addUserMessage(message)
      const assistantId = startAssistantMessage()

      try {
        for await (const event of streamChat({
          sessionId,
          message,
          role,
          lang: i18n.resolvedLanguage ?? 'pl',
        })) {
          if (event.type === 'token') {
            appendToken(assistantId, event.delta)
          } else if (event.type === 'blocks') {
            setBlocks(assistantId, parseBlocks(event.blocks))
          } else if (event.type === 'meta') {
            setGrounded(assistantId, event.grounded)
          }
        }
      } finally {
        finishAssistantMessage(assistantId)
      }
    },
  })

  return {
    send: (message: string) => {
      const trimmed = message.trim()
      if (!trimmed || isStreaming) return
      mutation.mutate(trimmed)
    },
    isStreaming,
    error: mutation.error,
  }
}
