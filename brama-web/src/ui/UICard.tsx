import type { HTMLAttributes, ReactNode } from 'react'

export type UICardProps = HTMLAttributes<HTMLElement> & {
  accent?: 'primary' | 'secondary' | 'info' | 'none'
  as?: 'article' | 'div' | 'section'
  children: ReactNode
}

const BASE =
  'relative overflow-hidden p-[var(--space-5)] border border-[var(--glass-border)] rounded-[var(--radius-3)] ' +
  'bg-[linear-gradient(180deg,rgb(255_255_255/0.76),rgb(255_255_255/0.42)),var(--glass-surface)] ' +
  'shadow-[0_18px_48px_rgb(0_0_0/0.08),var(--glass-inner-light)] backdrop-blur-[18px] backdrop-saturate-[1.35]'

const ACCENT: Record<NonNullable<UICardProps['accent']>, string> = {
  none: '',
  primary: 'border-t-[0.45rem] border-t-[var(--color-primary)]',
  secondary: 'border-t-[0.45rem] border-t-[var(--color-secondary)]',
  info: 'border-t-[0.45rem] border-t-[var(--color-info)]',
}

export function UICard({
  accent = 'none',
  as: Component = 'div',
  children,
  className,
  ...props
}: UICardProps) {
  return (
    <Component
      className={[BASE, ACCENT[accent], className ?? ''].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </Component>
  )
}
