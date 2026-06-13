import { useTranslation } from 'react-i18next'
import type { ChatMessage as ChatMessageModel } from '@/@types/chat'
import { AnswerBlocks } from './AnswerBlocks'
import { Markdown } from './Markdown'

type ChatMessageProps = {
  message: ChatMessageModel
  onAsk?: (query: string) => void
}

const BUBBLE_BASE = 'max-w-[80%] px-[var(--space-5)] py-[var(--space-4)] rounded-[var(--radius-3)]'

const BUBBLE_USER =
  'bg-[linear-gradient(135deg,var(--color-primary),color-mix(in_srgb,var(--color-primary)_80%,#ff5a3c))] ' +
  'text-[var(--color-primary-contrast)] ' +
  'shadow-[0_10px_30px_rgb(250_20_20/0.22),inset_0_1px_0_rgb(255_255_255/0.35)]'

const BUBBLE_ASSISTANT =
  'w-full max-w-full border border-[rgb(255_255_255/0.6)] ' +
  'bg-[linear-gradient(180deg,rgb(255_255_255/0.62),rgb(255_255_255/0.34))] ' +
  'shadow-[0_16px_42px_rgb(0_0_0/0.1),inset_0_1px_0_rgb(255_255_255/0.7)] ' +
  'backdrop-blur-[18px] backdrop-saturate-[1.5]'

const TYPING_DOT = 'w-2 h-2 rounded-full bg-[var(--color-text-subtle)] animate-[chat-typing_1s_infinite_ease-in-out]'

function stripBlockTags(text: string): string {
  return text
    .replace(/\s*\[\[(?:map|fee|deadline|docs|form)\]\]\s*/giu, ' ')
    .replace(/\s*\[\[[a-z]*$/iu, '')
    .replace(/[ \t]+([,.;:!?])/g, '$1')
    .replace(/[ \t]{2,}/g, ' ')
}

export function ChatMessage({ message, onAsk }: ChatMessageProps) {
  const { t } = useTranslation()
  const isUser = message.role === 'user'
  const assistantText = isUser ? message.text : stripBlockTags(message.text)

  return (
    <article
      className={`flex ${isUser ? 'justify-end' : ''}`}
      aria-label={isUser ? t('chat.userMessage') : t('chat.assistantMessage')}
    >
      <div className={`${BUBBLE_BASE} ${isUser ? BUBBLE_USER : BUBBLE_ASSISTANT}`}>
        {isUser ? (
          <p className="m-0 whitespace-pre-wrap">{assistantText}</p>
        ) : (
          <>
            {assistantText ? <Markdown>{assistantText}</Markdown> : null}
            {message.streaming && !message.text ? (
              <p className="inline-flex gap-[0.35rem] my-[var(--space-2)]" aria-hidden="true">
                <span className={TYPING_DOT} />
                <span className={`${TYPING_DOT} [animation-delay:0.15s]`} />
                <span className={`${TYPING_DOT} [animation-delay:0.3s]`} />
              </p>
            ) : null}
            <AnswerBlocks blocks={message.blocks} onAsk={onAsk} />
          </>
        )}
      </div>
    </article>
  )
}
