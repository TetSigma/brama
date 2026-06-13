import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react'

type UIButtonVariant = 'primary' | 'secondary' | 'quiet' | 'danger'
type UIButtonSize = 'sm' | 'md' | 'lg'

type UIButtonOwnProps = {
  children: ReactNode
  className?: string
  fullWidth?: boolean
  size?: UIButtonSize
  variant?: UIButtonVariant
}

type UIButtonAsButtonProps = UIButtonOwnProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: never
  }

type UIButtonAsAnchorProps = UIButtonOwnProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string
  }

export type UIButtonProps = UIButtonAsButtonProps | UIButtonAsAnchorProps

function isAnchorButton(props: UIButtonProps): props is UIButtonAsAnchorProps {
  return typeof props.href === 'string'
}

function getButtonClassName({
  className,
  fullWidth,
  size = 'md',
  variant = 'primary',
}: Pick<UIButtonOwnProps, 'className' | 'fullWidth' | 'size' | 'variant'>) {
  return [
    'ui-button',
    `ui-button--${variant}`,
    `ui-button--${size}`,
    fullWidth ? 'ui-button--full' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')
}

export function UIButton(props: UIButtonProps) {
  if (isAnchorButton(props)) {
    const { children, className, fullWidth, size = 'md', variant = 'primary', ...restProps } = props
    const buttonClassName = getButtonClassName({ className, fullWidth, size, variant })

    return (
      <a className={buttonClassName} {...restProps}>
        {children}
      </a>
    )
  }

  const { children, className, fullWidth, size = 'md', variant = 'primary', ...restProps } = props
  const buttonClassName = getButtonClassName({ className, fullWidth, size, variant })

  return (
    <button className={buttonClassName} type="button" {...restProps}>
      {children}
    </button>
  )
}
