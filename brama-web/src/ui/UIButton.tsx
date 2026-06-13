import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react'
import { uiButtonClass, type UIButtonSize, type UIButtonVariant } from './buttonClass'

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

export function UIButton(props: UIButtonProps) {
  if (isAnchorButton(props)) {
    const { children, className, fullWidth, size = 'md', variant = 'primary', ...restProps } = props
    const buttonClassName = uiButtonClass({ className, fullWidth, size, variant })

    return (
      <a className={buttonClassName} {...restProps}>
        {children}
      </a>
    )
  }

  const { children, className, fullWidth, size = 'md', variant = 'primary', ...restProps } = props
  const buttonClassName = uiButtonClass({ className, fullWidth, size, variant })

  return (
    <button className={buttonClassName} type="button" {...restProps}>
      {children}
    </button>
  )
}
