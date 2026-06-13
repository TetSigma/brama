import { create } from 'zustand'
import type { AnswerBlock } from '../features/chat/schema/blocks'
import type { ChatMessage } from '../features/chat/types'

let counter = 0
/** Stable id without Date.now()/Math.random() for predictable rendering. */
function nextId(prefix: string): string {
  counter += 1
  return `${prefix}-${counter}`
}

type ChatSessionState = {
  sessionId: string
  messages: ChatMessage[]
  isStreaming: boolean
  addUserMessage: (text: string) => void
  startAssistantMessage: () => string
  appendToken: (id: string, delta: string) => void
  setBlocks: (id: string, blocks: AnswerBlock[]) => void
  setGrounded: (id: string, grounded: boolean) => void
  finishAssistantMessage: (id: string) => void
  reset: () => void
}

export const useChatSessionStore = create<ChatSessionState>((set) => ({
  sessionId: nextId('session'),
  messages: [],
  isStreaming: false,

  addUserMessage: (text) =>
    set((state) => ({
      messages: [
        ...state.messages,
        { id: nextId('msg'), role: 'user', text, blocks: [] },
      ],
    })),

  startAssistantMessage: () => {
    const id = nextId('msg')
    set((state) => ({
      isStreaming: true,
      messages: [
        ...state.messages,
        { id, role: 'assistant', text: '', blocks: [], streaming: true },
      ],
    }))
    return id
  },

  appendToken: (id, delta) =>
    set((state) => ({
      messages: state.messages.map((message) =>
        message.id === id ? { ...message, text: message.text + delta } : message,
      ),
    })),

  setBlocks: (id, blocks) =>
    set((state) => ({
      messages: state.messages.map((message) =>
        message.id === id ? { ...message, blocks } : message,
      ),
    })),

  setGrounded: (id, grounded) =>
    set((state) => ({
      messages: state.messages.map((message) =>
        message.id === id ? { ...message, citationsGrounded: grounded } : message,
      ),
    })),

  finishAssistantMessage: (id) =>
    set((state) => ({
      isStreaming: false,
      messages: state.messages.map((message) =>
        message.id === id ? { ...message, streaming: false } : message,
      ),
    })),

  reset: () => set({ sessionId: nextId('session'), messages: [], isStreaming: false }),
}))
