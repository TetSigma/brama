import { useMutation } from '@tanstack/react-query'

export type FeedbackInput = {
  answerId: string
  vote: 'up' | 'down'
  reason?: 'wrong' | 'notGrounded' | 'incomplete' | 'offTopic'
  comment?: string
}

const USE_MOCK = import.meta.env.VITE_USE_MOCK_CHAT !== 'false'
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'

async function postFeedback(input: FeedbackInput): Promise<void> {
  if (USE_MOCK) {
    console.info('[mock] feedback', input)
    return
  }
  const response = await fetch(`${API_BASE}/api/feedback`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!response.ok) {
    throw new Error(`Feedback failed: ${response.status}`)
  }
}

export function useFeedback() {
  return useMutation({ mutationFn: postFeedback })
}
