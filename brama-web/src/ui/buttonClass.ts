export type UIButtonVariant = 'primary' | 'secondary' | 'quiet' | 'danger'
export type UIButtonSize = 'sm' | 'md' | 'lg'

const BASE =
  'relative overflow-hidden inline-flex items-center justify-center gap-[var(--space-2)] min-w-max ' +
  'border-2 border-transparent rounded-[var(--radius-2)] shadow-[var(--shadow-sm)] font-bold leading-none ' +
  'text-center no-underline cursor-pointer transition-all duration-[180ms] ease-[cubic-bezier(0.2,0,0,1)] ' +
  "before:content-[''] before:absolute before:inset-px before:pointer-events-none " +
  'before:rounded-[calc(var(--radius-2)-1px)] before:opacity-[0.72] ' +
  'before:bg-[linear-gradient(135deg,rgb(255_255_255/0.34),transparent_52%)] ' +
  'hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)] ' +
  'disabled:opacity-[0.56] disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none ' +
  'aria-disabled:opacity-[0.56] aria-disabled:cursor-not-allowed'

const SIZE: Record<UIButtonSize, string> = {
  sm: 'min-h-[2.375rem] px-[var(--space-3)] text-sm',
  md: 'min-h-[3rem] px-[var(--space-5)]',
  lg: 'min-h-[3.5rem] px-[var(--space-6)] text-lg',
}

const VARIANT: Record<UIButtonVariant, string> = {
  primary:
    'text-[var(--color-primary-contrast)] border-[var(--color-primary)] bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]',
  secondary:
    'text-[var(--color-text)] border-[rgb(0_0_0/0.7)] backdrop-blur-[18px] backdrop-saturate-[1.45] ' +
    'bg-[linear-gradient(180deg,rgb(255_255_255/0.8),rgb(255_255_255/0.42)),var(--glass-surface)]',
  quiet: 'text-[var(--color-text)] border-[var(--color-border)] bg-[var(--color-surface)] shadow-none',
  danger: 'text-[var(--color-primary-contrast)] border-[var(--color-danger)] bg-[var(--color-danger)]',
}

type UIButtonClassArgs = {
  className?: string
  fullWidth?: boolean
  size?: UIButtonSize
  variant?: UIButtonVariant
}

/** Build the button class string. Shared by UIButton and non-button elements (router <Link>). */
export function uiButtonClass({ className, fullWidth, size = 'md', variant = 'primary' }: UIButtonClassArgs = {}) {
  return [BASE, SIZE[size], VARIANT[variant], fullWidth ? 'w-full' : '', className ?? '']
    .filter(Boolean)
    .join(' ')
}
