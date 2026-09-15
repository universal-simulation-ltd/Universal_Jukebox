// Siri, a phone call, a timer going off — and whether the music is ours to
// bring back afterwards (James, 2026-09-15: "when doing hey siri the track
// stops, and doesn't come back, ideally it would go quieter to a faint sound
// whilst doing Siri but either way come back on later").
//
// The mechanism lives in `lib/audio.ts`; the two JUDGEMENTS live here, because
// they are the part that can be wrong in a way no amount of looking at the
// phone would explain. Both have a failure mode that is worse than doing
// nothing: resuming when the audio now belongs to something else means two
// things playing at once, and NOT resuming means the report we are answering.
//
// ⚠️ Nothing in this file, or in what calls it, touches an audio session. The
// interruption is OBSERVED by `NowPlayingPlugin.swift` and answered entirely in
// the page — see the rule at the top of `ios/App/App/AppDelegate.swift`, which
// cost this app background playback the one time it was broken.

/**
 * How long after something outside paused us an interruption still counts the
 * music as ours.
 *
 * ⚠️ There IS a race, and this is it: WebKit pauses the element because iOS
 * interrupted the audio, and iOS tells us it interrupted the audio, and the two
 * arrive in either order. Asking "is it playing" at the moment the notice lands
 * answers no whenever the pause won — which is most of the time, which would
 * mean never coming back. A pause from a moment ago is the same event.
 */
export const TAKEN_GRACE_MS = 2000

/**
 * Was the music ours when the interruption began?
 *
 * `sincePause` is the milliseconds since something OUTSIDE this app last paused
 * the active deck — our own pauses do not count, or pressing pause and then
 * asking Siri the time would start the music again.
 */
export function wasOurs(playing: boolean, sincePause: number): boolean {
  return playing || sincePause < TAKEN_GRACE_MS
}

export interface ComingBack {
  /** `wasOurs` at the moment it began. */
  ours: boolean
  /**
   * iOS's own `shouldResume` for this interruption.
   *
   * ⚠️ FALSE AND MISSING ARE DIFFERENT ANSWERS. False is iOS saying the audio
   * belongs to something else now — ask Siri to play a podcast and the podcast
   * is the music, so starting ours under it is two apps at once. Missing
   * (null/undefined) is iOS saying nothing at all, and "either way come back on
   * later" is the answer to nothing.
   */
  shouldResume?: boolean | null
  /** Is the element paused right now? */
  paused: boolean
  /** Has it a file on it? Nothing to come back to otherwise. */
  loaded: boolean
}

/** Should the music start again now the interruption is over? */
export function shouldComeBack({ ours, shouldResume, paused, loaded }: ComingBack): boolean {
  return ours && shouldResume !== false && paused && loaded
}
