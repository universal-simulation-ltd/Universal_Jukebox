import { createContext } from 'react'

/**
 * Where the record on the deck is during a swipe (`DeckSwiper`), for the face
 * to follow. James, 2026-09-11: "On the swipe to change track on animated view
 * have the prev or next track swipe in at same time. On the vinyl the needle
 * could stay and just the records move."
 *
 * Only the ceremonial deck reads it. The VINYL face moves just its record, so
 * the tonearm stays where it is; every other face is moved whole by `Deck`.
 */
export interface DeckSlide {
  /** Pixels across — the finger's travel, then the end of the swipe. */
  x: number
  /** The record fades as it leaves. */
  opacity: number
  /** Transition to the new value (a release), or follow exactly (a drag). */
  animate: boolean
  /** How long that transition takes — a swipe's settle, or a whole crossfade. */
  ms?: number
}

export const DeckSlideContext = createContext<DeckSlide | null>(null)

/** The CSS for a record following a slide. */
export function slideStyle(slide: DeckSlide): React.CSSProperties {
  return {
    transform: slide.x ? `translateX(${slide.x}px)` : undefined,
    opacity: slide.opacity,
    transition: slide.animate
      ? `transform ${slide.ms ?? 240}ms cubic-bezier(.2,.8,.2,1), opacity ${slide.ms ?? 240}ms ease-out`
      : 'none',
  }
}
