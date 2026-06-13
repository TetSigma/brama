import { useForm } from 'react-hook-form'
import { SendHorizontal } from 'lucide-react'
import { UIButton } from '../../../../ui'

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
    <form className="chat-composer" onSubmit={handleSubmit(submit)}>
      <label htmlFor="chat-input" className="visually-hidden">
        Zadaj pytanie
      </label>
      <textarea
        id="chat-input"
        className="chat-composer__input"
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
