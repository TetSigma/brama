import type { HTMLAttributes, ReactNode } from 'react'

type UITextTone = 'default' | 'muted' | 'subtle' | 'inverse' | 'danger' | 'success'
type UITextSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

export type UIHeadingProps = HTMLAttributes<HTMLHeadingElement> & {
  children: ReactNode
  level?: 1 | 2 | 3 | 4
  size?: 'display' | 'xl' | 'lg' | 'md' | 'sm'
}

export type UITextProps = HTMLAttributes<HTMLParagraphElement> & {
  as?: 'p' | 'span'
  children: ReactNode
  size?: UITextSize
  tone?: UITextTone
  weight?: 'regular' | 'medium' | 'semibold' | 'bold'
}

export function UIHeading({ children, className, level = 2, size = 'lg', ...props }: UIHeadingProps) {
  const Component = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4'

  return (
    <Component className={['ui-heading', `ui-heading--${size}`, className ?? ''].filter(Boolean).join(' ')} {...props}>
      {children}
    </Component>
  )
}

export function UIText({
  as: Component = 'p',
  children,
  className,
  size = 'md',
  tone = 'default',
  weight = 'regular',
  ...props
}: UITextProps) {
  return (
    <Component
      className={[
        'ui-text',
        `ui-text--${size}`,
        `ui-text--${tone}`,
        `ui-text--${weight}`,
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </Component>
  )
}
