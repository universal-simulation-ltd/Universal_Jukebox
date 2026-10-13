import { useEffect } from 'react'
import { create } from 'zustand'
import { NAVIGATED } from './route'
import { useSettingsStore, type TipId } from '../stores/settingsStore'

/**
 * Retire a first-run tip for good (`components/Tip.tsx`). Called by the tip's
 * TARGET, from the handler that does the thing the tip points at — so one tap
 * both acts and retires it. "Show the tips again" in the Actions menu undoes it.
 */
export function markTipSeen(id: TipId): void {
  const { tipsSeen, set } = useSettingsStore.getState()
  if (tipsSeen.includes(id)) return
  set('tipsSeen', [...tipsSeen, id])
  restHints()
}

// ── One hint at a time ───────────────────────────────────────────────────────
//
// James, 2026-10-13: "Only show one hint at a time i.e. click here to see
// what's next and then next time swipe up to reveal more options". Now Playing
// used to raise "Tap here" on the record and "Swipe up for more buttons" at the
// foot together, and a new phone user had both bobbing at once.
//
// So the bubbles and pills (`Tip`, `FoldHint`, `PullHint`) take turns: each
// asks `useHintTurn`, and of the ones on screen and not yet learnt only the
// first in `HINT_ORDER` shows. Once one is learnt the rest WAIT until the next
// screen — "next time" — rather than popping up the moment the first goes.
//
// ⚠️ Only those floating hints. The grey "Hold for options" wording under a
// shelf's records is a caption, part of the shelf's own text, and stays.

/** Which goes first when several want the same screen. */
const HINT_ORDER: TipId[] = ['record', 'cover', 'pullDown', 'foldUp']

interface HintTurns {
  /** The hints on screen now that would show if it were their turn. */
  waiting: TipId[]
  /** A hint was just learnt: the others wait for the next screen. */
  resting: boolean
}

const useHintTurns = create<HintTurns>(() => ({ waiting: [], resting: false }))

function restHints(): void {
  useHintTurns.setState({ resting: true })
}

if (typeof window !== 'undefined') {
  const wake = () => {
    if (useHintTurns.getState().resting) useHintTurns.setState({ resting: false })
  }
  window.addEventListener(NAVIGATED, wake)
  window.addEventListener('popstate', wake)
  window.addEventListener('hashchange', wake)
}

/** Whether the hint `id` may show now. `wanted` is everything else that decides it. */
export function useHintTurn(id: TipId, wanted: boolean): boolean {
  const seen = useSettingsStore((s) => s.tipsSeen.includes(id))
  const live = wanted && !seen
  useEffect(() => {
    if (!live) return
    useHintTurns.setState((s) => ({ waiting: [...s.waiting, id] }))
    return () => {
      useHintTurns.setState((s) => {
        const i = s.waiting.indexOf(id)
        return i < 0 ? s : { waiting: [...s.waiting.slice(0, i), ...s.waiting.slice(i + 1)] }
      })
    }
  }, [id, live])
  const first = useHintTurns((s) => (s.resting ? null : (HINT_ORDER.find((h) => s.waiting.includes(h)) ?? null)))
  return live && first === id
}
