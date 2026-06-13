import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { SendHorizontal } from 'lucide-react'
import { GlassCard } from 'react-glass-ui'
import { UIButton } from '@/ui'

type ChatComposerProps = {
  onSend: (message: string) => void
  disabled?: boolean
}

type ComposerForm = {
  message: string
}

export function ChatComposer({ onSend, disabled }: ChatComposerProps) {
  const { t } = useTranslation()
  const { register, handleSubmit, reset, formState } = useForm<ComposerForm>({
    defaultValues: { message: '' },
  })

  function submit(values: ComposerForm) {
    const trimmed = values.message.trim()
    if (!trimmed) return
    onSend(trimmed)
    reset({ message: '' })
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void handleSubmit(submit)()
    }
  }

  return (
    <form className="w-full" onSubmit={handleSubmit(submit)}>
      <GlassCard
        className="composer-glass"
        contentClassName="flex gap-[var(--space-2)] items-end"
        blur={12}
        distortion={90}
        flexibility={0}
        borderColor="#ffffff"
        borderSize={1}
        borderRadius={20}
        borderOpacity={0.5}
        backgroundColor="#000000"
        backgroundOpacity={0.05}
        chromaticAberration={0}
        onHoverScale={1}
        saturation={100}
        brightness={100}
        padding="8px"
      >
        <label htmlFor="chat-input" className="visually-hidden">
          {t('chat.composerLabel')}
        </label>
        <textarea
          id="chat-input"
          className="flex-1 max-h-[8rem] px-[var(--space-3)] py-[var(--space-2)] border-0 bg-transparent text-[var(--color-text)] resize-none text-[length:var(--font-size-md)] focus:outline-none"
          rows={1}
          placeholder={t('chat.composerPlaceholder')}
          onKeyDown={handleKeyDown}
          {...register('message')}
        />
        <UIButton type="submit" size="md" disabled={disabled || !formState.isDirty} aria-label={t('chat.send')}>
          <SendHorizontal aria-hidden="true" size={18} />
        </UIButton>
      </GlassCard>
    </form>
  )
}
