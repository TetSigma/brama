import type {
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'

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

  return (
    <div className={['ui-field', className ?? ''].filter(Boolean).join(' ')}>
      <UILabel htmlFor={htmlFor}>{label}</UILabel>
      {children}
      {description ? (
        <p className="ui-field__description" id={descriptionId}>
          {description}
        </p>
      ) : null}
      {error ? (
        <p className="ui-field__error" id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  )
}

export function UILabel({ children, className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={['ui-label', className ?? ''].filter(Boolean).join(' ')} {...props}>
      {children}
    </label>
  )
}

export function UIInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={['ui-input', className ?? ''].filter(Boolean).join(' ')} {...props} />
}

export function UITextarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea className={['ui-input', 'ui-textarea', className ?? ''].filter(Boolean).join(' ')} {...props} />
  )
}

export function UISelect({ children, className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={['ui-input', 'ui-select', className ?? ''].filter(Boolean).join(' ')} {...props}>
      {children}
    </select>
  )
}

export function UICheckbox({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={['ui-checkbox', className ?? ''].filter(Boolean).join(' ')}
      type="checkbox"
      {...props}
    />
  )
}
