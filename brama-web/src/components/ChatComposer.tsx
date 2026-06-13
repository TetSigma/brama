import { useForm } from 'react-hook-form'
import { SendHorizontal } from 'lucide-react'
import { UIButton } from '@/ui'

type ChatComposerProps = {
  onSend: (message: string) => void
  disabled?: boolean
}

type ComposerForm = {
  message: string
}

export function ChatComposer({ onSend, disabled }: ChatComposerProps) {
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
    <form
      className="flex gap-[var(--space-2)] items-end p-[var(--space-2)] border-2 border-[rgb(255_255_255/0.6)] rounded-[var(--radius-3)] bg-[linear-gradient(180deg,rgb(255_255_255/0.62),rgb(255_255_255/0.36))] shadow-[0_18px_44px_rgb(0_0_0/0.12),inset_0_1px_0_rgb(255_255_255/0.7)] backdrop-blur-[20px] backdrop-saturate-[1.6] focus-within:border-[var(--color-focus)]"
      onSubmit={handleSubmit(submit)}
    >
      <label htmlFor="chat-input" className="visually-hidden">
        Zadaj pytanie
      </label>
      <textarea
        id="chat-input"
        className="flex-1 max-h-[8rem] px-[var(--space-3)] py-[var(--space-2)] border-0 bg-transparent text-[var(--color-text)] resize-none text-[length:var(--font-size-md)] focus:outline-none"
        rows={1}
        placeholder="Zadaj pytanie o sprawę urzędową…"
        onKeyDown={handleKeyDown}
        {...register('message')}
      />
      <UIButton
        type="submit"
        size="md"
        disabled={disabled || !formState.isDirty}
        aria-label="Wyślij"
      >
        <SendHorizontal aria-hidden="true" size={18} />
      </UIButton>
    </form>
  )
}
