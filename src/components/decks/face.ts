import type { DeckStyle } from '../../stores/settingsStore'

// What every deck face is handed, and nothing more.
//
// ⚠️ The list is deliberately SHORT and already-derived. A face gets numbers,
// not stores: no `usePlayerStore`, no `useSettingsStore`, no reading the
// ceremony's state for itself. `Deck.tsx` subscribes once and passes the result
// down, so all three faces are pure functions of the same five values and a
// fourth deck cannot quietly invent a rule of its own — which is exactly how
// the vinyl deck once ended up owning the ceremony's timing (see `Deck.tsx`).

export interface DeckFaceProps {
  /**
   * How far through the track, 0 → 1.
   *
   * Already guarded: a track whose duration the browser has not worked out
   * arrives here as 0, never NaN.
   */
  progress: number
  /**
   * Is the pickup on the medium — the arm down, the laser lit, the head against
   * the tape? False during the ceremony's swing and the handover between
   * tracks.
   */
  engaged: boolean
  /** Is the medium moving? True during the ceremony as well as during playback. */
  spinning: boolean
  /** `prefers-reduced-motion`: draw the end state, animate nothing. */
  reduced: boolean
  /** The album art as an object URL, or null when there is none. */
  url: string | null
  /** The per-album fallback hue, for when there is no art. */
  hue: number
  /**
   * A CSS `animation` shorthand for THE MEDIUM arriving on the deck or being
   * lifted off it — or `undefined`, which is the usual case.
   *
   * ⚠️ THE MEDIUM ONLY, and that is the whole reason this is a prop rather than
   * one wrapper around the whole face in `Deck.tsx` (which is what it was
   * first). "The disc fading in from just above the record player into
   * position" (James, 2026-09-09) needs the record player to still be there
   * while the disc arrives — so the record, the disc and the shell take this,
   * and the tonearm, the laser sled and the tape head do not. A face that
   * cannot separate the two (the cassette is one drawing) applies it to
   * everything, which is right for a cassette going into a slot.
   *
   * ⚠️ Do NOT merge it into the same `animation` property as the spin. They
   * share `animation-play-state`, which the spin pauses when the music stops —
   * and an arrival frozen halfway is a record hanging in mid-air.
   */
  arrival?: string
}

/** Where the drifting notes leave from, per deck: roughly, the pickup. */
export interface NotesAnchor {
  right: string
  top: string
}

/**
 * The shape of the frame a face wants.
 *
 * `ratio` is height ÷ width. `size` from `Deck` is always the WIDTH, so a face
 * that is not square (the cassette) shortens its own frame rather than floating
 * inside a square one.
 */
export interface DeckFrame {
  ratio: number
  radius: string
}

/**
 * Each deck's frame, and where its pickup is.
 *
 * ⚠️ Here rather than beside each face because a module that exports a
 * component AND a constant object breaks React Fast Refresh — the same reason
 * `usePrefersReducedMotion` is not in `Deck.tsx`, and eslint's
 * `react-refresh/only-export-components` says so out loud.
 *
 * ⚠️ Keyed by `DeckStyle`, so adding a medium to that union fails to compile
 * until it has a shape here AND a face in `Deck.tsx`'s table. A stored setting
 * that renders nothing looks exactly like a broken player.
 */
export const SHAPES: Record<DeckStyle, { frame: DeckFrame; notes: NotesAnchor }> = {
  // A record fills its square, and it is round. The notes drift off the
  // headshell, which sits low and right.
  vinyl: { frame: { ratio: 1, radius: '50%' }, notes: { right: '4%', top: '58%' } },
  // ⚠️ A PORTABLE PLAYER, not a bare disc — so a rounded rectangle, slightly
  // taller than wide to leave room for the control strip along the bottom, and
  // NOT the `50%` circle this was until 2026-09-09. The radius here is what the
  // focus ring and the hover target take their shape from, so a circle around a
  // square body would put the ring nowhere near the object being aimed at. Its
  // notes leave the lid, upper right.
  cd: { frame: { ratio: 1.1, radius: '16%' }, notes: { right: '10%', top: '58%' } },
  // ⚠️ A shell is LANDSCAPE, so this frame is shorter than the size it is given
  // — the ratio is the frame's, not a margin inside a square one. A square
  // frame with a cassette floating in the middle puts the focus ring and the
  // hover target a long way from the thing you are aiming at, and leaves a hole
  // above and below the deck that nothing fills. Its notes leave the tape head,
  // low and centre.
  cassette: { frame: { ratio: 0.66, radius: '14px' }, notes: { right: '40%', top: '80%' } },
}
