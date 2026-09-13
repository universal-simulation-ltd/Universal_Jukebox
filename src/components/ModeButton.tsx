import { forwardRef, type MouseEvent, type ReactNode } from 'react'

// One round button with its word underneath — the row under the records
// waiting to go on (`PlayModes`): shuffle, the two repeats, a shelf, About.
//
// ⚠️ THE WORD GOES UNDER EACH ICON because repeat-all and repeat-one differ by
// one small "1" — as icons alone they read as the same button twice (James,
// 2026-09-11: "have the word under the button because they're similar"). The
// rest of the row follows suit so the row reads as one thing.
//
// ⚠️ NARROWER ON A PHONE (`w-16`, gaps of 4px) so all five fit across a 390px
// screen; `sm` and up get the room they had when there were three.

export const ModeButton = forwardRef<
  HTMLButtonElement,
  {
    label: string
    /** Lit, for a mode that is on or a panel that is open. Leave out for a button that only opens something. */
    on?: boolean
    onClick(e: MouseEvent<HTMLButtonElement>): void
    /** What a screen reader hears (and a hover shows), when it is more than `label`. */
    ariaLabel?: string
    children: ReactNode
  }
>(function ModeButton({ label, on, onClick, ariaLabel, children }, ref) {
  const lit = on === true
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-pressed={on}
      aria-label={ariaLabel}
      title={ariaLabel}
      className="group flex w-16 flex-col items-center gap-1.5 focus:outline-none sm:w-20"
    >
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-full transition group-focus-visible:outline group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-[#E05504] ${
          lit
            ? 'bg-gradient-to-br from-[#FE8C01] to-[#E05504] text-white shadow-sm'
            : 'border border-slate-300 text-slate-600 group-hover:border-orange-500 group-hover:text-orange-700 dark:border-slate-700 dark:text-slate-300 dark:group-hover:text-orange-400'
        }`}
      >
        {children}
      </span>
      <span
        className={`text-center text-[11px] leading-tight font-medium sm:text-[11.5px] ${
          lit ? 'text-orange-700 dark:text-orange-400' : 'text-slate-500 dark:text-slate-400'
        }`}
      >
        {label}
      </span>
    </button>
  )
})
