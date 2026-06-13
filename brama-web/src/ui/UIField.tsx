import { Children, cloneElement, isValidElement } from 'react'
import type {
  HTMLAttributes,
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactElement,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'

const INPUT_BASE =
  'w-full min-h-[3rem] px-[var(--space-3)] text-[var(--color-text)] border border-[var(--color-border)] ' +
  'rounded-[var(--radius-2)] bg-[var(--color-surface)] shadow-[inset_0_1px_2px_rgb(0_0_0/0.04)] ' +
  'transition-[border-color,box-shadow] duration-[180ms] ease-[cubic-bezier(0.2,0,0,1)] ' +
  'placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-focus)] ' +
  'focus:shadow-[var(--focus-ring)] focus:outline-0 disabled:text-[var(--color-text-subtle)] ' +
  'disabled:bg-[var(--color-surface-muted)] disabled:cursor-not-allowed'

const LABEL_CLASS = 'text-[var(--color-text)] text-[length:var(--font-size-sm)] font-bold'

const cx = (...parts: (string | undefined)[]) => parts.filter(Boolean).join(' ')

type UIFieldProps = {
  children: ReactNode
  className?: string
  description?: string
  error?: string
  htmlFor?: string
  label: string
}

export function UIField({ children, className, description, error, htmlFor, label }: UIFieldProps) {
  const descriptionId = htmlFor && description ? `${htmlFor}-description` : undefined
  const errorId = htmlFor && error ? `${htmlFor}-error` : undefined

  // Link the description/error to the control so assistive tech announces them.
  const describedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined
  const control = isValidElement(children)
    ? cloneElement(Children.only(children) as ReactElement<HTMLAttributes<HTMLElement>>, {
        'aria-describedby':
          [
            (children.props as HTMLAttributes<HTMLElement>)['aria-describedby'],
            describedBy,
          ]
            .filter(Boolean)
            .join(' ') || undefined,
        ...(error ? { 'aria-invalid': true } : {}),
      })
    : children

  return (
    <div className={cx('grid gap-[var(--space-2)]', className)}>
      <UILabel htmlFor={htmlFor}>{label}</UILabel>
      {control}
      {description ? (
        <p
          className="m-0 text-[length:var(--font-size-sm)] text-[var(--color-text-muted)]"
          id={descriptionId}
        >
          {description}
        </p>
      ) : null}
      {error ? (
        <p
          className="m-0 text-[length:var(--font-size-sm)] text-[var(--color-danger)] font-semibold"
          id={errorId}
        >
          {error}
        </p>
      ) : null}
    </div>
  )
}

export function UILabel({ children, className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cx(LABEL_CLASS, className)} {...props}>
      {children}
    </label>
  )
}

export function UIInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(INPUT_BASE, className)} {...props} />
}

export function UITextarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea className={cx(INPUT_BASE, 'min-h-[7rem] py-[var(--space-3)] resize-y', className)} {...props} />
  )
}

export function UISelect({ children, className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  const arrow =
    'appearance-none pr-[var(--space-8)] ' +
    'bg-[linear-gradient(45deg,transparent_50%,var(--color-text)_50%)_calc(100%-1.1rem)_1.35rem/0.42rem_0.42rem_no-repeat,' +
    'linear-gradient(135deg,var(--color-text)_50%,transparent_50%)_calc(100%-0.83rem)_1.35rem/0.42rem_0.42rem_no-repeat,' +
    'var(--color-surface)]'
  return (
    <select className={cx(INPUT_BASE, arrow, className)} {...props}>
      {children}
    </select>
  )
}

export function UICheckbox({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cx('w-[1.15rem] h-[1.15rem] m-0 accent-[var(--color-primary)]', className)}
      type="checkbox"
      {...props}
    />
  )
}
