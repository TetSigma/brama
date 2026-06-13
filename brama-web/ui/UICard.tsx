import type { HTMLAttributes, ReactNode } from 'react'

export type UICardProps = HTMLAttributes<HTMLElement> & {
  accent?: 'primary' | 'secondary' | 'info' | 'none'
  as?: 'article' | 'div' | 'section'
  children: ReactNode
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
      className={['ui-card', `ui-card--${accent}`, className ?? ''].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </Component>
  )
}
