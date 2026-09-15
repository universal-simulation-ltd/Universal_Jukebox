// Where the sound comes out — the phone's speaker, headphones, a Bluetooth
// speaker, an AirPlay device (James, 2026-09-15: "we need a way to select the
// output in app (speaker / headphones etc)").
//
// ⚠️ THIS ASKS THE SYSTEM TO SHOW ITS OWN PICKER. It does not list devices, name
// them, or choose between them, and it must not start: routing audio is the
// operating system's, the list changes under you as things connect, and the one
// thing this app is most firmly not allowed to do is reach into the audio
// session (see `ios/App/App/AppDelegate.swift`, where doing it cost background
// playback entirely). A `<audio>` element can ask WebKit to put the system's
// route sheet on screen, and that sheet is the same one Control Centre shows.
//
// Two APIs say the same thing to different engines, and WebKit's is tried
// first because iOS is the platform the request came from:
//   - `webkitShowPlaybackTargetPicker` — Safari and every WKWebView, so the
//     phone app too. Shows the route sheet: speaker, headset, Bluetooth,
//     AirPlay.
//   - `remote.prompt()` (the Remote Playback API) — Chrome and Android, where
//     it offers cast targets.
// Where neither exists there is no picker and the button does not appear; the
// device's own controls are the answer there, the same as the volume slider's
// (`lib/volumeSupport.ts`).

/** As much of a media element as choosing an output needs. */
export interface RoutableMedia {
  webkitShowPlaybackTargetPicker?: () => void
  /** True while the sound is going somewhere wireless. */
  webkitCurrentPlaybackTargetIsWireless?: boolean
  remote?: {
    prompt?: () => Promise<void>
    /** 'disconnected' | 'connecting' | 'connected'. */
    state?: string
  }
}

export type PickResult =
  /** The system put its picker on screen. */
  | 'shown'
  /** Nothing here can show one — the button should not have been there. */
  | 'unsupported'
  /** There was a picker and it did not open: no gesture, or the person closed it. */
  | 'refused'

/** Can this engine show a picker at all? */
export function canPickOutput(el: RoutableMedia | null | undefined): boolean {
  if (!el) return false
  return typeof el.webkitShowPlaybackTargetPicker === 'function' || typeof el.remote?.prompt === 'function'
}

/**
 * Ask the system to show its output picker.
 *
 * ⚠️ MUST BE CALLED STRAIGHT OUT OF THE TAP, and not after an `await`. Both
 * APIs want a user gesture and both count it as spent by the time a promise has
 * resolved — which is why the WebKit call is made before anything is awaited,
 * and why this returns a promise rather than taking one.
 */
export async function pickOutput(el: RoutableMedia | null | undefined): Promise<PickResult> {
  if (!el) return 'unsupported'
  if (typeof el.webkitShowPlaybackTargetPicker === 'function') {
    try {
      el.webkitShowPlaybackTargetPicker()
      return 'shown'
    } catch {
      // Fall through: an engine with the method and no picker to show is worth
      // one attempt at the other API before giving up.
    }
  }
  const prompt = el.remote?.prompt
  if (typeof prompt === 'function') {
    try {
      await prompt.call(el.remote)
      return 'shown'
    } catch {
      // `prompt` rejects both when the person dismissed the sheet and when
      // there was no gesture to open it with. Neither is an error worth showing
      // — the sound is still coming out of wherever it was.
      return 'refused'
    }
  }
  return 'unsupported'
}

/** Is the sound going somewhere other than the device itself right now? */
export function routedAway(el: RoutableMedia | null | undefined): boolean {
  if (!el) return false
  return el.webkitCurrentPlaybackTargetIsWireless === true || el.remote?.state === 'connected'
}

/**
 * The events either API fires when the answer to `routedAway` changes.
 *
 * ⚠️ WebKit's two are lower-case and unprefixed in the listener name despite
 * the `webkit` in them, and neither has a typed name in lib.dom — they go
 * through `addEventListener` as plain strings or not at all.
 */
export const ROUTE_EVENTS = [
  'webkitcurrentplaybacktargetiswirelesschanged',
  'webkitplaybacktargetavailabilitychanged',
  'connect',
  'disconnect',
] as const
