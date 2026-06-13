import type { HTMLAttributes, ReactNode } from 'react'

type UIBadgeTone = 'neutral' | 'primary' | 'success' | 'info' | 'warning' | 'danger'

export type UIBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode
  tone?: UIBadgeTone
}

export function UIBadge({ children, className, tone = 'neutral', ...props }: UIBadgeProps) {
  return (
    <span className={['ui-badge', `ui-badge--${tone}`, className ?? ''].filter(Boolean).join(' ')} {...props}>
      {children}
    </span>
  )
}
