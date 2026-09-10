// The optional Web Audio graph around the `<audio>` elements.
//
//   element A ──▶ MediaElementSource ─┐
//                                     ├──▶ boostGain ──▶ analyser ──▶ destination
//   element B ──▶ MediaElementSource ─┘
//
// It exists for exactly two things the elements cannot do on their own: gain
// ABOVE 1.0 (the HTML spec hard-caps `HTMLMediaElement.volume` at unity) and a
// real `AnalyserNode` for the visualiser. Everything else — decoding, buffering,
// seeking, Media Session — stays with the elements, which is why this is opt-in
// rather than the default path.
//
// ⚠️⚠️ THE THING TO UNDERSTAND BEFORE TOUCHING THIS FILE.
//
// `createMediaElementSource` is a ONE-WAY DOOR, twice over:
//
//   1. It may be called ONCE per element, ever. A second call throws
//      `InvalidStateError`. Hence the module-level singleton — the graph
//      outlives every component, exactly like the elements it is attached to.
//   2. From the moment it is called, that element's audio no longer goes to the
//      speakers by itself. It goes into the graph. **If the graph is not
//      connected through to `destination`, or the context is suspended, there
//      is SILENCE** — not an error, not a warning, just a track that appears to
//      play with no sound.
//
// So every failure path below reconnects or gives up loudly, `ensureRunning()`
// is called on every play, and the graph is not built at all unless something
// actually needs it.
//
// ⚠️ BOTH DECKS ARE CAPTURED, IN ONE GO, and that is not an optimisation — it
// is the only correct order of operations now that `lib/audio.ts` crossfades
// between two elements. Capturing only the deck that happens to be active would
// mean the app fell silent the first time a crossfade made the OTHER one active
// (rule 2 above cuts no sound off; the uncaptured element simply is not in the
// graph the boost and the analyser are reading). Capture is permanent, so
// getting this wrong once is not recoverable within the session.

import { isNativeShell, nativePlatform } from './nativeFile'

/**
 * May the app build this graph at all here?
 *
 * ⚠️ NEVER IN THE iOS APP (James, 2026-09-10: "Needs to play music in the
 * background when minimised iPhone"). Capturing an element into Web Audio moves
 * its sound out of the `<audio>` element's own playback, which iOS keeps going
 * in the background, and into an `AudioContext` — which iOS suspends the moment
 * the app is not on screen. The music stops, with no error anywhere. The two
 * things that need the graph (the boost above 100%, and the jukebox deck's
 * level tubes and the visualiser) are decoration next to music that keeps
 * playing with the phone in a pocket, so on iOS they are simply not offered.
 */
export function graphAllowed(): boolean {
  return !(isNativeShell() && nativePlatform() === 'ios')
}

let context: AudioContext | null = null
let sources: MediaElementAudioSourceNode[] = []
let boostGain: GainNode | null = null
let analyser: AnalyserNode | null = null
/** Set once we have tried and failed, so we do not retry on every play. */
let unavailable = false

export interface Graph {
  context: AudioContext
  analyser: AnalyserNode
}

/**
 * Build the graph, once, around EVERY element it is given.
 *
 * Callers pass `mediaElements()` — both decks — and must not pass a single one:
 * see the note at the top of this file. Returns null when Web Audio is
 * unavailable or the wiring failed; callers must treat that as "this feature is
 * not available here", never as an error worth showing over the music.
 */
export function ensureGraph(elements: HTMLAudioElement[]): Graph | null {
  if (analyser && context) return { context, analyser }
  if (unavailable) return null
  if (!graphAllowed()) {
    unavailable = true
    return null
  }

  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) {
      unavailable = true
      return null
    }
    const ctx = new Ctor()
    const captured: MediaElementAudioSourceNode[] = []
    for (const element of elements) {
      captured.push(ctx.createMediaElementSource(element))
    }

    // From here the elements are captured. Anything that throws below has to
    // end with every source connected to something audible.
    try {
      const gain = ctx.createGain()
      gain.gain.value = 1
      const node = ctx.createAnalyser()
      node.fftSize = 128
      node.smoothingTimeConstant = 0.78

      for (const src of captured) src.connect(gain)
      gain.connect(node)
      node.connect(ctx.destination)

      context = ctx
      sources = captured
      boostGain = gain
      analyser = node
      void ctx.resume().catch(() => {})
      return { context: ctx, analyser: node }
    } catch (wiring) {
      // ⚠️ The element is already captured, so "give up" is not an option —
      // leaving it here would mute the app permanently. Wire the source
      // straight to the speakers and report the feature as unavailable.
      try {
        for (const src of captured) src.connect(ctx.destination)
        context = ctx
        sources = captured
      } catch { /* nothing left to try */ }
      unavailable = true
      console.warn('[jukebox] Web Audio wiring failed; boost and visualiser disabled', wiring)
      return null
    }
  } catch {
    // Failed before the element was captured — nothing is broken, the graph
    // simply does not exist and the element still plays on its own.
    unavailable = true
    return null
  }
}

/** The analyser, if a graph has already been built. Never builds one. */
export function existingAnalyser(): AnalyserNode | null {
  return analyser
}

export function graphExists(): boolean {
  return analyser !== null || sources.length > 0
}

/** Whether this browser has refused us a graph. */
export function graphUnavailable(): boolean {
  return unavailable || !graphAllowed()
}

/**
 * Resume the context if it is suspended.
 *
 * ⚠️ Call this on EVERY play, not once at startup. A context created before any
 * user gesture starts `suspended`, and browsers may suspend it again when a tab
 * is backgrounded. While the graph exists and the context is suspended, the
 * element produces no sound at all — so this is the line standing between the
 * boost feature and a silent player.
 */
export function ensureRunning(): void {
  if (!context) return
  if (context.state === 'suspended') void context.resume().catch(() => {})
}

/**
 * Set the extra gain, 1 = unity.
 *
 * Ramped rather than assigned: a step change in gain is an audible click, and
 * on a boost of 4x it is a loud one.
 */
export function setBoost(multiplier: number): void {
  if (!boostGain || !context) return
  const value = Math.max(0, Math.min(8, multiplier))
  try {
    const now = context.currentTime
    boostGain.gain.cancelScheduledValues(now)
    boostGain.gain.setValueAtTime(boostGain.gain.value, now)
    boostGain.gain.linearRampToValueAtTime(value, now + 0.08)
  } catch {
    try { boostGain.gain.value = value } catch { /* ignore */ }
  }
}
