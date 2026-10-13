// What the iPhone's native audio engine is told about the queue — and the
// arithmetic it does with it while the page cannot.
//
// ⚠️ WHY THE ENGINE NEEDS A PLAN AT ALL (probe 3, 2026-10-07). With the music in
// a native player the iPhone keeps the APP running while locked, but the PAGE'S
// JavaScript stops within a second of the lock. Everything `playerStore` does
// at the end of a song — start the crossfade early, pick the next track, play
// the start-up cue — is JavaScript, so on a locked phone none of it would
// happen. The engine (`ios/App/App/JukeboxEngine.swift`) therefore carries the
// next stretch of the queue with every change-over already decided, and runs it
// by itself until the page comes back. This file is the shape of that plan and
// the two pieces of maths both sides must agree on; `playerStore` builds the
// plan, `lib/audioEngine.ts` sends it.
//
// ⚠️ THE SWIFT SIDE MIRRORS `crossfadeTiming` AND THE INTRO / OUTRO THRESHOLDS
// (`EngineMaths` in `JukeboxEngine.swift`). They are duplicated on purpose — the
// engine has to decide the moment a crossfade starts with no page to ask — and
// `enginePlan.test.ts` pins the numbers so a change here that is not made
// there shows up as a failing test against the same table the Swift comment
// quotes.

import type { FadeCurve } from './fadeCurve'
import type { Handover } from './transition'
import type { SourceFile } from './types'

/**
 * How one track gives way to the next.
 *
 *   crossfade  the two overlap (a blend; within an album, or between records
 *              with "Crossfade between records" on)
 *   change     the record change: the pickup lifts, `gapSec` of silence, the
 *              cue, and the next one rises in
 *   cut        nothing animates: the next track simply starts
 */
export type EngineKind = 'crossfade' | 'change' | 'cut'

export interface EngineTransition {
  kind: EngineKind
  /**
   * A crossfade's length before any intro hold: `SEC` / `RECORD_SEC` at the end
   * of a song, `MANUAL_SEC` / `RECORD_MANUAL_SEC` for a skip.
   */
  blendSec: number
  /**
   * The skip length for this pair — the floor a LATE blend keeps between its
   * hold and its end, exactly as `maybeStartEarlyCrossfade` subtracts it.
   */
  manualSec: number
  curve: FadeCurve
  /**
   * The silence with the pickup off the record (`HANDOVER.LIFT_MS`) — 0 for a
   * cut. ⚠️ ALSO READ FOR A CROSSFADE, as what it falls back to when the song
   * has already ended and there is nothing left to blend with: a needle change
   * if this is above 0, a cut if not — the same degrade `playPrepared` makes
   * for `naturalEnd`.
   */
  gapSec: number
  /** The rise at landing (`HANDOVER.FADE_IN_SEC`), or null for the user's own fade-in. */
  fadeInSec: number | null
  /** A skip ducks the song leaving first (`HANDOVER.FADE_OUT_SEC`); 0 at a natural end. */
  duckSec: number
  /** Play the start-up cue — at the landing of a change, `cueDelaySec` into a crossfade. */
  cue: boolean
  cueDelaySec: number
}

/** The change-over constants `playerStore` uses, passed in so this file owns none of them. */
export interface ChangeoverTimes {
  /** `crossfadeTimes()` in `playerStore`. */
  SEC: number
  MANUAL_SEC: number
  RECORD_SEC: number
  RECORD_MANUAL_SEC: number
  SHAPE: FadeCurve
  /** `HANDOVER` in `playerStore`. */
  LIFT_MS: number
  FADE_OUT_SEC: number
  FADE_IN_SEC: number
  /** `NEEDLE_RETURN_MS` in `playerStore`. */
  NEEDLE_RETURN_MS: number
}

/**
 * The change-over `playerStore` would run for this `Handover`, written down so
 * the engine can run it instead.
 *
 * `auto` is a song reaching its end (`maybeStartEarlyCrossfade`, or `onEnded`
 * → `playPrepared` with `naturalEnd`); `skip` is somebody pressing Next
 * (`playPrepared` with a `lead-out` blend and a duck before a needle change).
 *
 * ⚠️ The cue's timing follows `runHandover` exactly: a blend across RECORDS
 * plays it as the blend starts (`startBlend`), a blend within one plays it once
 * the pickup is back (`NEEDLE_RETURN_MS`), and a change plays it at the
 * landing, after the gap.
 */
export function transitionFor(plan: Handover, times: ChangeoverTimes, when: 'auto' | 'skip'): EngineTransition {
  const manualSec = plan.swap ? times.RECORD_MANUAL_SEC : times.MANUAL_SEC
  return {
    kind: plan.crossfade ? 'crossfade' : plan.needle ? 'change' : 'cut',
    blendSec: when === 'auto' ? (plan.swap ? times.RECORD_SEC : times.SEC) : manualSec,
    manualSec,
    curve: when === 'auto' ? times.SHAPE : 'lead-out',
    gapSec: plan.needle ? times.LIFT_MS / 1000 : 0,
    fadeInSec: plan.needle ? times.FADE_IN_SEC : null,
    duckSec: when === 'skip' && plan.needle ? times.FADE_OUT_SEC : 0,
    cue: plan.cue,
    cueDelaySec: plan.crossfade && plan.needle && !plan.swap ? times.NEEDLE_RETURN_MS / 1000 : 0,
  }
}

/** The intro / outro rules (`lib/intro.ts`, `lib/outro.ts`) and the user's caps on them (Settings). */
export interface LeadLimits {
  /** `INTRO_MIN`: a quiet start shorter than this is just a breath. */
  introMin: number
  /** `INTRO_HOLD_MAX`. */
  introHoldMax: number
  /** `xfIntroMax` — Settings ▸ Fine-tune. */
  introMax: number
  /** `OUTRO_MIN`. */
  outroMin: number
  /** `OUTRO_LEAD_MAX`. */
  outroLeadMax: number
  /** `xfOutroMax`. */
  outroMax: number
}

/** `introHold` then the Settings cap — `null` (never measured) holds nothing. */
export function introHoldFor(introSec: number | null, limits: LeadLimits): number {
  const hold = introSec !== null && introSec >= limits.introMin ? Math.min(introSec, limits.introHoldMax) : 0
  return Math.min(hold, limits.introMax)
}

/** `outroLead` then the Settings cap — `null` (never measured) brings nothing forward. */
export function outroLeadFor(outroSec: number | null, limits: LeadLimits): number {
  const lead = outroSec !== null && outroSec >= limits.outroMin ? Math.min(outroSec, limits.outroLeadMax) : 0
  return Math.min(lead, limits.outroMax)
}

/**
 * When an end-of-song crossfade starts, and how long it is — the arithmetic of
 * `maybeStartEarlyCrossfade`, line for line.
 *
 * `lead` is how many seconds before the end it begins: the blend, plus the next
 * song's quiet opening (which lengthens it), plus the dead air on the end of
 * this one (which only moves it earlier). Once `remainingSec` is at or under
 * it, `blendSec` and `holdSec` are what to pass to the crossfade — shorter than
 * planned when it started late.
 */
export function crossfadeTiming(
  t: Pick<EngineTransition, 'blendSec' | 'manualSec'>,
  introSec: number | null,
  outroSecOfLeaving: number | null,
  remainingSec: number,
  limits: LeadLimits,
): { lead: number; blendSec: number; holdSec: number } {
  const hold = introHoldFor(introSec, limits)
  const blendLead = t.blendSec + hold
  const lead = blendLead + outroLeadFor(outroSecOfLeaving, limits)
  const blendSec = Math.max(0.6, Math.min(blendLead, remainingSec))
  const holdSec = Math.max(0, Math.min(hold, blendSec - t.manualSec))
  return { lead, blendSec, holdSec }
}

/**
 * The positions in `order` that come after `cursor`, in play order, up to `max`.
 *
 * ⚠️ `repeat: 'one'` WRAPS LIKE `'all'`, because Next does: repeat-one only
 * holds a song at its NATURAL end (`onEnded`), and `advance` wraps the cursor
 * for anything but `'off'`. The natural end is sent separately
 * (`EnginePlanDraft.repeatOne`).
 *
 * ⚠️ A REPEATING QUEUE IS SENT AS ONE TURN, NOT AS A LONG LIST: every other
 * song once, ending with the one before `cursor`. The engine ROTATES it — each
 * song it moves past goes back on the end (`wrap` in `JukeboxEngine.swift`) —
 * so a three-song queue on repeat plays all night rather than running out
 * after three. Each entry's change-over is from the song before it in play
 * order, which is still true after any number of turns.
 */
export function upcomingCursors(length: number, cursor: number, repeat: 'off' | 'all' | 'one', max: number): number[] {
  const out: number[] = []
  if (length <= 0 || cursor < 0 || cursor >= length) return out
  // One song on repeat: its own next, once — the engine rotates it for ever.
  const steps = repeat === 'off' ? length - 1 - cursor : Math.max(1, length - 1)
  for (let step = 1; step <= steps && out.length < max; step++) out.push((cursor + step) % length)
  return out
}

/** One queue entry, as `playerStore` describes it — `lib/audioEngine.ts` turns `file` into a URL. */
export interface EngineEntryDraft {
  /** `${cursor}:${trackId}` — how the page finds the song again on waking. */
  key: string
  cursor: number
  trackId: string
  albumId: string
  /** The file the page has for it, or null (a Music-library song not copied yet). */
  file: SourceFile | null
  /** A Music-library song's persistent ID — the engine opens it straight from the library. */
  mediaId: string | null
  title: string
  artist: string
  album: string
  /** "Stable volume": the measured factor, or null (the engine measures it itself). */
  gain: number | null
  /** Seconds of quiet opening / dead-air ending, or null when never measured. */
  introSec: number | null
  outroSec: number | null
  /** Arriving here from the entry before it, at the end of that song. */
  auto: EngineTransition
  /** …and when somebody presses Next to get here. */
  skip: EngineTransition
  /** The start-up cue for the machine this song plays on (`cue:vinyl`…), or null with the cue off. */
  cueKey: string | null
  /**
   * "Lyrics on the lock screen": the song's timed lines, in order, for the
   * engine to follow while the page is away (`lib/lockLinesAhead.ts`). Null
   * with the setting off, or no synced sheet found (yet).
   */
  lines: { t: number; text: string }[] | null
}

export interface EnginePlanDraft {
  /**
   * The entry the page believes is playing. Its `auto` / `skip` are from the
   * song before it in play order — what a rotated repeating queue needs.
   */
  current: EngineEntryDraft | null
  upcoming: EngineEntryDraft[]
  /** Repeat all or one: rotate `upcoming` (see `upcomingCursors`). */
  wrap: boolean
  /** Where lock-screen Previous goes from here (its `skip` is the way back). */
  previous: EngineEntryDraft | null
  /** Repeat-one's change-over back to the top, or null when repeat-one is off. */
  repeatOne: EngineTransition | null
  limits: LeadLimits
  stableVolume: boolean
  /** The start-up cue's level ÷ the clip headroom, as `playClip` plays it. */
  cueLevel: number
  /** "Notify me of each new song": the engine posts the card itself while the page is away. */
  notify: boolean
}

/** How far ahead the engine is told. ~50 songs is hours of locked listening. */
export const ENGINE_LOOKAHEAD = 50
