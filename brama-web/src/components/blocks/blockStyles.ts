/** Shared Tailwind class strings for answer blocks (replaces the old chat.css block rules). */

export const BLOCK_SURFACE =
  'border border-[rgb(255_255_255/0.55)] rounded-[var(--radius-2)] ' +
  'bg-[linear-gradient(180deg,rgb(255_255_255/0.5),rgb(255_255_255/0.26))] ' +
  'shadow-[0_10px_26px_rgb(0_0_0/0.07),inset_0_1px_0_rgb(255_255_255/0.6)] ' +
  'backdrop-blur-[12px] backdrop-saturate-[1.4]'

export const BLOCK = `px-[var(--space-4)] py-[var(--space-3)] ${BLOCK_SURFACE}`

export const BLOCK_TITLE =
  'inline-flex items-center gap-[var(--space-2)] mt-0 mb-[var(--space-2)] font-bold'

export const FACT = `${BLOCK} flex flex-wrap items-center gap-[var(--space-2)]`

export const FACT_LABEL = 'inline-flex items-center gap-[var(--space-2)] font-semibold'

/** Dashed, transparent surface used by citations + feedback; spans full width in worker mode. */
export const BLOCK_DASHED =
  'px-[var(--space-4)] py-[var(--space-3)] border border-dashed border-[rgb(255_255_255/0.55)] ' +
  'rounded-[var(--radius-2)] bg-transparent'
