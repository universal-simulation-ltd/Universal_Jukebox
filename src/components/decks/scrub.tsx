import { useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react'
import { clock } from '../../lib/format'
import { haptic } from '../../lib/haptics'
import type { ScrubMap } from '../../lib/scrub'
import type { DeckControls } from './face'

// Moving through the song with the machine's own moving part (James,
// 2026-09-29: "For the other players have like the needle movement to change
// position, i.e. cassette doing circles at the tape turning, iPod circling the
// trackpad, CD moving the laser point"). The record player's tonearm came first
// (`VinylDeck`); this is what it and the others share:
//   - the record player's arm and the CD's laser sled are put DOWN somewhere —
//     where the finger is is where the song goes (`at` is absolute);
//   - the cassette's reels and the pocket player's wheel are WOUND — going
//     round clockwise moves the song on, anticlockwise back, `turnShare` of it
//     a lap (`rotary`).
// Either way the time it would land on rides beside the finger, a detent is
// felt as it goes, and the song only moves when the finger lets go.
//
// ⚠️ STOPS THE POINTER. The machine under it swipes to the next song
// (`DeckSwiper`) and a long press opens the machine picker (`Deck`); a drag here
// must be neither. A TAP that never became a drag is handed to `onTap` if the
// face has one (the pocket player's wheel is buttons too) and otherwise let
// through as a click, which opens the album like a tap anywhere else on the deck.
//
// ⚠️ A slider to a screen reader and the keyboard: ← → move five seconds.

/** How far the finger must move before a press is a drag. */
const DRAG_SLOP = 6

export function Scrubber({
  controls,
  position,
  held,
  setHeld,
  begin,
  detents,
  label,
  className = '',
  style,
  onTap,
  onEnd,
  children,
}: {
  controls: DeckControls
  /** Where the music is, 0 → 1 — what the keyboard moves from. */
  position: number
  held: number | null
  setHeld(fraction: number | null): void
  /**
   * At the press: how the finger maps to the song from here, or null to refuse
   * it. `el` is this control, for measuring it or the machine it sits on.
   */
  begin(x: number, y: number, from: number, el: HTMLElement): ScrubMap | null
  /** How many detents the whole song is felt in. */
  detents: number
  label: string
  className?: string
  style: CSSProperties
  /** A press that never became a drag. True if it was handled (the click is eaten). */
  onTap?(x: number, y: number, el: HTMLElement): boolean
  /** The gesture is over, dragged or not — for a face that turned something. */
  onEnd?(): void
  children?: ReactNode
}) {
  const press = useRef<{ x: number; y: number; map: ScrubMap | null; dragging: boolean; eat: boolean } | null>(null)
  const detent = useRef(-1)
  const eatClick = useRef(false)
  /**
   * This one is in a hand — so the time shows beside IT. Two can share one
   * `held` (the cassette's two reels wind the same tape), and only the one
   * under the finger gets the bubble.
   */
  const [active, setActive] = useState(false)

  const follow = (x: number, y: number) => {
    const at = press.current?.map?.(x, y)
    if (at == null) return
    const step = Math.floor(at * detents)
    if (step !== detent.current) {
      if (detent.current !== -1) haptic('tick')
      detent.current = step
    }
    setHeld(at)
  }
  const finish = () => {
    press.current = null
    setActive(false)
    onEnd?.()
  }
  const nudge = (seconds: number) =>
    controls.seek(Math.max(0, Math.min(1, (held ?? position) + seconds / controls.durationSec)))

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={Math.round(controls.durationSec)}
      aria-valuenow={Math.round((held ?? position) * controls.durationSec)}
      aria-valuetext={`${clock((held ?? position) * controls.durationSec)} of ${clock(controls.durationSec)}`}
      className={`absolute z-10 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#E05504] ${className}`}
      style={{ touchAction: 'none', ...style }}
      onPointerDown={(e) => {
        if (e.button !== 0) return
        e.stopPropagation()
        const map = begin(e.clientX, e.clientY, position, e.currentTarget)
        eatClick.current = false
        if (!map) return
        e.currentTarget.setPointerCapture(e.pointerId)
        detent.current = -1
        // Without a tap of its own a press is a grab at once, as the tonearm
        // always was; with one, it waits to see whether the finger moves.
        const dragging = !onTap
        setActive(true)
        press.current = { x: e.clientX, y: e.clientY, map, dragging, eat: dragging }
        if (dragging) {
          haptic('tap')
          follow(e.clientX, e.clientY)
        }
      }}
      onPointerMove={(e) => {
        const p = press.current
        if (!p) return
        e.stopPropagation()
        if (!p.dragging) {
          if (Math.hypot(e.clientX - p.x, e.clientY - p.y) < DRAG_SLOP) return
          p.dragging = true
          p.eat = true
          haptic('tap')
        }
        follow(e.clientX, e.clientY)
      }}
      onPointerUp={(e) => {
        const p = press.current
        if (!p) return
        e.stopPropagation()
        if (p.dragging) {
          if (held !== null) controls.seek(held)
        } else if (onTap?.(e.clientX, e.clientY, e.currentTarget)) {
          p.eat = true
        }
        eatClick.current = p.eat
        setHeld(null)
        finish()
      }}
      onPointerCancel={() => {
        setHeld(null)
        finish()
      }}
      onClick={(e) => {
        // A drag, or a tap the face answered, is not also a tap on the deck.
        if (eatClick.current) e.stopPropagation()
        eatClick.current = false
      }}
      onContextMenu={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}
      onKeyDown={(e: KeyboardEvent) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') nudge(5)
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') nudge(-5)
        else return
        e.preventDefault()
        e.stopPropagation()
      }}
    >
      {children}
      {active && held !== null && (
        <span className="pointer-events-none absolute bottom-full left-1/2 mb-1 -translate-x-1/2 rounded-full bg-slate-900/85 px-2 py-0.5 text-[12px] font-medium whitespace-nowrap text-white tabular-nums shadow dark:bg-white/90 dark:text-slate-900">
          {clock(held * controls.durationSec)}
        </span>
      )}
    </div>
  )
}
