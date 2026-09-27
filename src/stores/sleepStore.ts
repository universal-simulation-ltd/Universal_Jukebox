import { create } from 'zustand'
import * as audio from '../lib/audio'
import { SLEEP_MAX_MIN, sleepGain } from '../lib/sleep'

// The sleep timer's clock — the rules are `lib/sleep.ts`. It ends the music
// when it runs out, fading it over the last minute, and then switches itself
// off. It is not remembered: a timer for tonight is not one for tomorrow.
//
// ⚠️ TWO CLOCKS, BECAUSE THE PHONE IS LOCKED. A sleep timer is used with the
// screen off, and a hidden web view suspends `setInterval` — the lesson of the
// crossfade that never finished while locked (`tickRamps` in `lib/audio.ts`).
// So it is checked on a one-second interval AND on every report from the
// player, which `timeupdate` keeps coming for as long as music plays. Nothing
// needs checking while nothing plays.

interface SleepState {
  /** When the music stops, epoch ms — or null, off. */
  endsAt: number | null
  /** The minutes asked for: which preset a tap moves on from. */
  minutes: number | null
  /** Seconds left, for the button's word. Updated as it runs. */
  leftSec: number
  start(minutes: number | null): void
}

let interval: number | null = null

function stopClock(): void {
  if (interval !== null) window.clearInterval(interval)
  interval = null
}

function check(): void {
  const { endsAt } = useSleepStore.getState()
  if (endsAt === null) return
  const leftSec = (endsAt - Date.now()) / 1000
  audio.setSleepGain(sleepGain(leftSec))
  if (leftSec > 0) {
    // A whole second changed — the word under the button moves on.
    if (Math.ceil(leftSec) !== Math.ceil(useSleepStore.getState().leftSec)) useSleepStore.setState({ leftSec })
    return
  }
  audio.pause('sleep timer')
  // Full again for whenever play is next pressed — the pause is what ended it.
  audio.setSleepGain(1)
  stopClock()
  useSleepStore.setState({ endsAt: null, minutes: null, leftSec: 0 })
}

export const useSleepStore = create<SleepState>((set) => ({
  endsAt: null,
  minutes: null,
  leftSec: 0,
  start(minutes) {
    stopClock()
    audio.setSleepGain(1)
    if (minutes === null || minutes <= 0) {
      set({ endsAt: null, minutes: null, leftSec: 0 })
      return
    }
    const clamped = Math.min(SLEEP_MAX_MIN, Math.round(minutes))
    set({ endsAt: Date.now() + clamped * 60_000, minutes: clamped, leftSec: clamped * 60 })
    interval = window.setInterval(check, 1000)
  },
}))

// The player's reports — `timeupdate` among them — go on while locked.
audio.subscribe(() => check())
