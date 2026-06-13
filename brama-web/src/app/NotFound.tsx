import { Link, useRouteError, isRouteErrorResponse } from 'react-router'
import { uiButtonClass } from '@/ui'

/**
 * Catch-all (no route matched) and route errorElement.
 * When rendered via errorElement, useRouteError() carries the thrown error.
 */
export function NotFound() {
  const error = useRouteError()

  const status = isRouteErrorResponse(error) ? error.status : 404
  const heading = status === 404 ? 'Nie znaleziono strony' : 'Coś poszło nie tak'
  const message =
    status === 404
      ? 'Ten adres nie istnieje. Wróć na stronę główną lub otwórz asystenta.'
      : 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie później.'

  return (
    <main
      className="flex flex-col items-center justify-center gap-[var(--space-3)] min-h-[100svh] px-[var(--container-padding)] py-[var(--space-8)] text-center"
      role="main"
    >
      <p
        className="m-0 text-[clamp(4rem,18vw,9rem)] font-bold leading-none text-[var(--color-primary)]"
        aria-hidden="true"
      >
        {status}
      </p>
      <h1 className="m-0">{heading}</h1>
      <p className="m-0 max-w-[32rem] text-[var(--color-text-muted)]">{message}</p>
      <div className="flex flex-wrap gap-[var(--space-3)] mt-[var(--space-4)]">
        <Link className={uiButtonClass({ variant: 'primary', size: 'md' })} to="/">
          Strona główna
        </Link>
        <Link className={uiButtonClass({ variant: 'secondary', size: 'md' })} to="/chat">
          Otwórz asystenta
        </Link>
      </div>
    </main>
  )
}
