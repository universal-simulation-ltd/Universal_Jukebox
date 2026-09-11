import { createContext } from 'react'

/**
 * Where the record on the deck is during a swipe or a record crossfade
 * (`DeckSwiper`), for the face to follow. James, 2026-09-11: "On the swipe to
 * change track on animated view have the prev or next track swipe in at same
 * time. On the vinyl the needle could stay and just the records move."
 *
 * Only the ceremonial deck reads it. The VINYL face moves just its record, so
 * the tonearm stays where it is; every other face is moved whole by `Deck`.
 *
 * ⚠️ THE RECORDS TRAVEL ON AN ARC, like records on a wheel (James, 2026-09-11:
 * "the right record needs to follow an arc so it ends up where the current
 * track was, not below it, equally for now track exiting left"). A record at
 * the side sits a little LOWER and smaller; the one leaving sinks as it goes,
 * the one arriving rises as it comes. Across and down move on SEPARATE curves
 * — two nested layers, `slideOuter` and `slideInner` — and that is what bends a
 * transition's straight line into an arc.
 */
export interface DeckSlide {
  /** Pixels across — the finger's travel, then the end of the move. */
  x: number
  /** Pixels down — a record sinks as it goes to the side. */
  y: number
  /** 1 on the deck, a peek's size at the side. */
  scale: number
  /** The record fades as it leaves. */
  opacity: number
  /** Transition to the new value (a release), or follow exactly (a drag). */
  animate: boolean
  /** How long that transition takes — a swipe's settle, or a whole crossfade. */
  ms?: number
}

export const DeckSlideContext = createContext<DeckSlide | null>(null)

/** Across: the same easing for every record. */
export const ARC_ACROSS = 'cubic-bezier(.45,0,.55,1)'
/** Down, LEAVING: level at first, then sinking — the far side of the wheel. */
export const ARC_SINK = 'cubic-bezier(.55,0,1,.45)'
/** Up, ARRIVING: rising at once, then level — the near side of the wheel. */
export const ARC_RISE = 'cubic-bezier(0,.55,.45,1)'

/** The outer layer: across, and the fade. */
export function slideOuter(slide: DeckSlide): React.CSSProperties {
  const ms = slide.ms ?? 240
  return {
    transform: slide.x ? `translateX(${slide.x}px)` : undefined,
    opacity: slide.opacity,
    transition: slide.animate ? `transform ${ms}ms ${ARC_ACROSS}, opacity ${ms}ms ease-out` : 'none',
  }
}

/** The inner layer: down, and the size — on its own curve. */
export function slideInner(slide: DeckSlide): React.CSSProperties {
  const ms = slide.ms ?? 240
  return {
    transform: slide.y || slide.scale !== 1 ? `translateY(${slide.y}px) scale(${slide.scale})` : undefined,
    transition: slide.animate ? `transform ${ms}ms ${ARC_SINK}` : 'none',
  }
}
