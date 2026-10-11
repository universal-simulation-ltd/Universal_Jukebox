import { forwardRef, useRef, type MouseEvent, type ReactNode } from 'react'
import { haptic } from '../lib/haptics'

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
    /** Which mode this is (`MODE_KEYS`), as `data-mode` — how the store screenshots find a button in any language. */
    mode?: string
    /** A press held for half a second (the Player button's full picker). The release after it isn't also a tap. */
    onLongPress?: () => void
    children: ReactNode
  }
>(function ModeButton({ label, on, onClick, ariaLabel, mode, onLongPress, children }, ref) {
  const lit = on === true
  const hold = useRef<{ timer: number; fired: boolean } | null>(null)
  const cancelHold = () => {
    if (hold.current) window.clearTimeout(hold.current.timer)
  }
  const holdProps = onLongPress
    ? {
        onPointerDown: (e: React.PointerEvent) => {
          if (e.button > 0) return
          cancelHold()
          const h = { timer: 0, fired: false }
          h.timer = window.setTimeout(() => {
            h.fired = true
            haptic('thunk')
            onLongPress()
          }, 500)
          hold.current = h
        },
        onPointerUp: cancelHold,
        onPointerLeave: cancelHold,
        onPointerCancel: cancelHold,
        onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
      }
    : {}
  return (
    <button
      ref={ref}
      type="button"
      {...holdProps}
      onClick={(e) => {
        if (hold.current?.fired) {
          hold.current = null
          return
        }
        onClick(e)
      }}
      aria-pressed={on}
      aria-label={ariaLabel}
      title={ariaLabel}
      data-mode={mode}
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
