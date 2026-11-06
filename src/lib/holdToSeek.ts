// holdToSeek.ts — a tap on ⏭ / ⏮ changes song; a HOLD runs through this one
// instead, a few seconds at a time for as long as the finger stays down (James,
// 2026-11-06: "holding down the next track buttons should … forward the track
// a bit" — the iPod's, and every car stereo's, button). Letting go after a
// hold does NOT then also change song.
//
// `holdToSeek` is the timing, with no React in it so the tests can drive it on
// fake timers; `useHoldToSeek` puts it on a button.

import { useEffect, useMemo, useRef } from 'react'
import { haptic } from './haptics'
import { usePlayerStore } from '../stores/playerStore'

/** How long a press must last to be a hold rather than a tap. */
export const HOLD_MS = 450
/** While held, one jump every this often… */
export const STEP_MS = 250
/** …of this many seconds: twenty times normal speed. */
export const STEP_SEC = 5

export interface HoldToSeek {
  down(): void
  /** The press ended (lifted, cancelled, or the pointer left the button). */
  up(): void
  /** The button's click: the tap's action, unless the press was a hold. */
  click(): void
  dispose(): void
}

export function holdToSeek(direction: 1 | -1, seekBy: (sec: number) => void, tap: () => void): HoldToSeek {
  let timer: ReturnType<typeof setTimeout> | undefined
  let held = false
  const stop = () => {
    clearTimeout(timer)
    clearInterval(timer)
    timer = undefined
  }
  const step = () => seekBy(direction * STEP_SEC)
  return {
    down() {
      stop()
      held = false
      timer = setTimeout(() => {
        held = true
        step()
        timer = setInterval(step, STEP_MS)
      }, HOLD_MS)
    },
    up() {
      stop()
    },
    click() {
      if (held) {
        held = false
        return
      }
      tap()
    },
    dispose: stop,
  }
}

/** Seek the playing song by `sec`, never before its start. */
function seekPlayer(sec: number): void {
  const player = usePlayerStore.getState()
  player.seekTo(Math.max(0, player.currentSec + sec))
  haptic('tick')
}

/**
 * Props for a ⏭ (`direction` 1) or ⏮ (-1) button: `tap` on a tap, a run
 * through the song while held. Spread them on the `<button>` in place of its
 * `onClick`.
 */
export function useHoldToSeek(direction: 1 | -1, tap: () => void) {
  const tapRef = useRef(tap)
  useEffect(() => { tapRef.current = tap })
  const control = useMemo(() => holdToSeek(direction, seekPlayer, () => tapRef.current()), [direction])
  useEffect(() => control.dispose, [control])
  return {
    onPointerDown: (e: React.PointerEvent) => {
      if (e.button === 0) control.down()
    },
    onPointerUp: control.up,
    onPointerCancel: control.up,
    onPointerLeave: control.up,
    // The phone's long-press menu would otherwise come up under the finger.
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    onClick: control.click,
  }
}
