import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Paperclip, SendHorizontal, Sparkles, X } from 'lucide-react'
import { GlassCard } from 'react-glass-ui'
import { UIButton } from '@/ui'
import { uploadDocument } from '@/api/documentsClient'
import { useChatSessionStore } from '@/contexts/chatSessionStore'

type ChatComposerProps = {
  onSend: (message: string) => void
  onStartFill: () => void
  disabled?: boolean
}

type ComposerForm = {
  message: string
}

export function ChatComposer({ onSend, onStartFill, disabled }: ChatComposerProps) {
  const { t } = useTranslation()
  const { register, handleSubmit, reset, formState } = useForm<ComposerForm>({
    defaultValues: { message: '' },
  })

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const sessionId = useChatSessionStore((state) => state.sessionId)
  const attachedDocument = useChatSessionStore((state) => state.attachedDocument)
  const setAttachedDocument = useChatSessionStore((state) => state.setAttachedDocument)

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

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = '' // allow re-selecting the same file
    if (!file) return

    setUploading(true)
    setUploadError(null)
    try {
      const result = await uploadDocument(file, sessionId)
      setAttachedDocument({
        id: result.documentId,
        filename: result.filename,
        hasFormFields: result.hasFormFields,
      })
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : t('chat.document.error'))
    } finally {
      setUploading(false)
    }
  }

  return (
    <form className="w-full flex flex-col gap-[var(--space-2)]" onSubmit={handleSubmit(submit)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      {(attachedDocument || uploading || uploadError) && (
        <div className="flex flex-wrap items-center gap-[var(--space-2)] px-[var(--space-2)]">
          {uploading && (
            <span className="text-[length:var(--font-size-sm)] text-[var(--color-text-muted)]">
              {t('chat.document.uploading')}
            </span>
          )}

          {attachedDocument && !uploading && (
            <span className="inline-flex items-center gap-[var(--space-2)] px-[var(--space-3)] py-[var(--space-1)] rounded-[var(--radius-pill)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[length:var(--font-size-sm)] text-[var(--color-text)]">
              <Paperclip aria-hidden="true" size={14} />
              {attachedDocument.filename}
              <button
                type="button"
                aria-label={t('chat.document.remove')}
                className="inline-flex items-center cursor-pointer text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                onClick={() => setAttachedDocument(null)}
              >
                <X aria-hidden="true" size={14} />
              </button>
            </span>
          )}

          {attachedDocument?.hasFormFields && !uploading && (
            <UIButton type="button" variant="secondary" size="sm" onClick={onStartFill} disabled={disabled}>
              <Sparkles aria-hidden="true" size={14} /> {t('chat.document.fillWithMe')}
            </UIButton>
          )}

          {uploadError && (
            <span className="text-[length:var(--font-size-sm)] text-[var(--color-danger)]">
              {uploadError}
            </span>
          )}
        </div>
      )}

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
        <button
          type="button"
          aria-label={t('chat.document.attach')}
          title={t('chat.document.attach')}
          className="shrink-0 inline-flex items-center justify-center w-[2.5rem] h-[2.5rem] rounded-[var(--radius-2)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] cursor-pointer disabled:opacity-[0.56] disabled:cursor-not-allowed"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <Paperclip aria-hidden="true" size={18} />
        </button>
        <label htmlFor="chat-input" className="visually-hidden">
          {t('chat.composerLabel')}
        </label>
        <textarea
          id="chat-input"
          aria-controls="chat-thread"
          className="flex-1 max-h-[8rem] min-h-11 px-[var(--space-3)] py-[var(--space-2)] border-0 bg-transparent text-[var(--color-text)] resize-none text-[length:var(--font-size-md)] focus-visible:outline-[3px] focus-visible:outline-offset-[4px] focus-visible:outline-[var(--color-focus)]"
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
