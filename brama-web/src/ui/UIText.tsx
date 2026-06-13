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

const HEADING_BASE = 'mt-0 tracking-normal'

const HEADING_SIZE: Record<NonNullable<UIHeadingProps['size']>, string> = {
  display: 'text-[clamp(3rem,6vw,5.6rem)] leading-[0.96]',
  xl: 'text-[clamp(2rem,4vw,3.4rem)] leading-[var(--line-height-tight)]',
  lg: 'text-[length:var(--font-size-2xl)] leading-[var(--line-height-heading)]',
  md: 'text-[length:var(--font-size-xl)] leading-[var(--line-height-heading)]',
  sm: 'text-[length:var(--font-size-lg)] leading-[var(--line-height-heading)]',
}

const TEXT_SIZE: Record<UITextSize, string> = {
  xs: 'text-[length:var(--font-size-xs)]',
  sm: 'text-[length:var(--font-size-sm)]',
  md: 'text-[length:var(--font-size-md)]',
  lg: 'text-[length:var(--font-size-lg)]',
  xl: 'text-[length:var(--font-size-xl)]',
}

const TEXT_TONE: Record<UITextTone, string> = {
  default: 'text-[var(--color-text)]',
  muted: 'text-[var(--color-text-muted)]',
  subtle: 'text-[var(--color-text-subtle)]',
  inverse: 'text-[var(--color-text-inverse)]',
  danger: 'text-[var(--color-danger)]',
  success: 'text-[var(--color-success)]',
}

const TEXT_WEIGHT: Record<NonNullable<UITextProps['weight']>, string> = {
  regular: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
}

export function UIHeading({ children, className, level = 2, size = 'lg', ...props }: UIHeadingProps) {
  const Component = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4'

  return (
    <Component
      className={[HEADING_BASE, HEADING_SIZE[size], className ?? ''].filter(Boolean).join(' ')}
      {...props}
    >
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
      className={[TEXT_SIZE[size], TEXT_TONE[tone], TEXT_WEIGHT[weight], className ?? '']
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </Component>
  )
}
