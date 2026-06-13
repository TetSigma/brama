import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type { ChatAction } from '@/@types/chat'
import { useUIStore } from '@/contexts/uiStore'
import { useChatSessionStore } from '@/contexts/chatSessionStore'
import { streamChat } from '@/api/chatClient'
import { parseBlocks } from '@/api/blocks'

type SendInput = {
  message: string
  action?: ChatAction
  // Control turns (fill:start / fill:cancel) have no user-visible bubble.
  silent?: boolean
}

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
    mutationFn: async ({ message, action, silent }: SendInput) => {
      const {
        addUserMessage,
        startAssistantMessage,
        appendToken,
        setBlocks,
        setGrounded,
        finishAssistantMessage,
        attachedDocument,
      } = store.getState()

      if (!silent) {
        addUserMessage(message)
      }
      const assistantId = startAssistantMessage()

      try {
        for await (const event of streamChat({
          conversationId: sessionId,
          message,
          role,
          lang: i18n.resolvedLanguage ?? 'pl',
          documentId: attachedDocument?.id,
          action,
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
      mutation.mutate({ message: trimmed })
    },
    startFill: () => {
      if (isStreaming) return
      mutation.mutate({ message: '', action: 'fill:start', silent: true })
    },
    cancelFill: () => {
      if (isStreaming) return
      mutation.mutate({ message: '', action: 'fill:cancel', silent: true })
    },
    isStreaming,
    error: mutation.error,
  }
}
