import type { HTMLAttributes, ReactNode } from 'react'

type UIBadgeTone = 'neutral' | 'primary' | 'success' | 'info' | 'warning' | 'danger'

export type UIBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode
  tone?: UIBadgeTone
}

const BASE =
  'inline-flex items-center min-h-[1.75rem] px-[var(--space-2)] border border-transparent ' +
  'rounded-[var(--radius-pill)] text-xs font-bold leading-none'

const TONE: Record<UIBadgeTone, string> = {
  neutral: 'text-[var(--color-text)] border-[var(--color-border)] bg-[var(--color-surface)]',
  primary: 'text-[var(--color-primary-contrast)] bg-[var(--color-primary)]',
  success: 'text-[var(--color-secondary-contrast)] bg-[var(--color-success)]',
  info: 'text-[var(--color-text-inverse)] bg-[var(--color-info)]',
  warning: 'text-[var(--color-neutral-900)] bg-[var(--color-warning)]',
  danger: 'text-[var(--color-primary-contrast)] bg-[var(--color-danger)]',
}

export function UIBadge({ children, className, tone = 'neutral', ...props }: UIBadgeProps) {
  return (
    <span className={[BASE, TONE[tone], className ?? ''].filter(Boolean).join(' ')} {...props}>
      {children}
    </span>
  )
}
