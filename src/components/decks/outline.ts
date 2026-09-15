import { createContext } from 'react'

/**
 * The frame the machine is drawn in — its size and its corners — for what is
 * drawn round it. `LyricsAround` follows the machine's outline (see
 * `lib/outline.ts`), and `Deck` provides this because it is the one place that
 * knows which machine is on screen and how big its frame is.
 */
export interface DeckOutline {
  width: number
  height: number
  /** The frame's CSS `border-radius` — `SHAPES[style].frame.radius`. */
  radius: string
}

export const DeckOutlineContext = createContext<DeckOutline | null>(null)
