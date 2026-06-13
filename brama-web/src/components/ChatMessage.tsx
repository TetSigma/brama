import type { ChatMessage as ChatMessageModel } from '../types'
import { AnswerBlocks } from './AnswerBlocks'
import { Markdown } from './Markdown'

type ChatMessageProps = {
  message: ChatMessageModel
  onAsk?: (query: string) => void
}

export function ChatMessage({ message, onAsk }: ChatMessageProps) {
  const isUser = message.role === 'user'

  return (
    <article
      className={`chat-message chat-message--${message.role}`}
      aria-label={isUser ? 'Twoja wiadomość' : 'Odpowiedź asystenta'}
    >
      <div className="chat-message__bubble">
        {isUser ? (
          <p className="chat-message__text">{message.text}</p>
        ) : (
          <>
            {message.text ? <Markdown>{message.text}</Markdown> : null}
            {message.streaming && !message.text ? (
              <p className="chat-message__typing" aria-hidden="true">
                <span />
                <span />
                <span />
              </p>
            ) : null}
            <AnswerBlocks blocks={message.blocks} onAsk={onAsk} />
          </>
        )}
      </div>
    </article>
  )
}
