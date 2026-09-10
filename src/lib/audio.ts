// The thing that actually makes sound.
//
// TWO `<audio>` elements — a deck A and a deck B — plus the object-URL
// discipline that keeps a long listening session from leaking the whole library
// into memory.
//
// ⚠️ TWO, AND EXACTLY TWO. This file used to say "one element, on purpose", and
// the reason was real: every `createObjectURL` pins its File until revoked, so
// a fresh `<audio>` per track leaves forty pinned files behind over an evening.
// That reason survives — what changed is the count, not the discipline. The two
// elements are created once and REUSED for every track, and the retiring one's
// URL is revoked the moment its fade finishes, so at most two files are ever
// pinned no matter how long the queue runs.
//
// What the second one buys is the one thing a single element genuinely cannot
// do: a REAL crossfade (James, 2026-09-09). One element decodes one file, so
// with one element the outgoing track has to stop before the incoming one can
// start, and "fade the tracks into each other" could only ever be a duck-out
// followed by a rise-in around a gap. Two elements overlap, which is what a
// crossfade is.
//
// ⚠️ WHICH ELEMENT IS "THE" ELEMENT CHANGES. `active` is the one the app is
// about: its `timeupdate` drives the scrub bar, its `ended` advances the queue,
// its `duration` is the track length. The other is either idle or RETIRING —
// still audible, fading out, and deliberately ignored by every one of those.
// Anything reading an element must go through `el()` or `mediaElements()`;
// nothing may cache one.
//
// There is deliberately no Web Audio graph around this BY DEFAULT. `<audio>`
// decodes MP3, M4A/AAC, FLAC and WAV natively in every current browser — that
// is the whole reason this app is cheap to build — and routing it through an
// `AudioContext` costs the element's own buffering and seeking behaviour, plus
// a permanent risk of silence (see `lib/audioGraph.ts`). A graph is built only
// when something needs one: the visualiser, or a volume boost above unity.
//
// The FADES below need no graph at all, and that is on purpose. They scale each
// element's own `volume`, so the most-used new settings — the fades AND the
// crossfade — carry none of the Web Audio risk. Only the boost, which genuinely
// cannot be done any other way, opts into it.

import { ensureRunning } from './audioGraph'
import { releaseTrackUrl, trackUrl } from './trackSource'
import { noteEvent } from './bgLog'

/**
 * When OUR code last paused an element — so a pause that did not come from here
 * can be told apart. See the `pause` listener below.
 */
let ownPauseAt = 0
function markOwnPause(): void {
  ownPauseAt = Date.now()
}
import { canSetElementVolume } from './volumeSupport'
import type { SourceFile } from './types'

/** Where playback is, as far as anything outside this file is concerned. */
export interface AudioState {
  playing: boolean
  currentSec: number
  durationSec: number
  /** True between "asked for a track" and "the browser has enough to play it". */
  loading: boolean
}

type Listener = (state: AudioState) => void

/**
 * One of the two decks.
 *
 * ⚠️ `fade` is this deck's OWN envelope, and it has to be per-deck rather than
 * module-level: during a crossfade the two are at different points on opposite
 * ramps, which is the entire mechanism. It multiplies `userVolume` — see
 * `applyVolume` for why the two are never merged.
 */
interface Deck {
  el: HTMLAudioElement | null
  url: string | null
  fade: number
  /** The interval running this deck's ramp, if any. */
  timer: number | null
}

const decks: [Deck, Deck] = [
  { el: null, url: null, fade: 1, timer: null },
  { el: null, url: null, fade: 1, timer: null },
]

/** Which deck the app is about. The other is idle or retiring. */
let active: 0 | 1 = 0
/**
 * The deck fading out under the incoming one, or null.
 *
 * Only ever the non-active deck. Its events are ignored, its `ended` does not
 * advance the queue, and it is silenced and released when its ramp finishes.
 */
let retiring: 0 | 1 | null = null

const listeners = new Set<Listener>()

let state: AudioState = { playing: false, currentSec: 0, durationSec: 0, loading: false }

/** Fired when a track reaches its natural end — the queue's cue to advance. */
let onEnded: (() => void) | null = null
/** Fired the first time a track's real duration is known. */
let onDuration: ((seconds: number) => void) | null = null
/** Fired when a track cannot be played at all. */
let onError: ((message: string) => void) | null = null
/**
 * Fired on the active deck's `timeupdate` with the seconds left in the track.
 *
 * ⚠️ This is what makes a crossfade at the END of a track possible at all. A
 * crossfade has to START before the outgoing track finishes — by the time
 * `ended` fires there is nothing left to fade — so the queue is told how close
 * the end is and decides for itself whether to begin the change-over early.
 * Nothing in this file knows what the next track is, and it stays that way.
 */
let onApproachingEnd: ((remainingSec: number) => void) | null = null

function emit() {
  for (const listener of listeners) listener(state)
}

function set(patch: Partial<AudioState>) {
  state = { ...state, ...patch }
  emit()
}

/** The active deck's element, built on first use. */
function el(): HTMLAudioElement {
  return element(active)
}

function element(index: 0 | 1): HTMLAudioElement {
  const deck = decks[index]
  if (deck.el) return deck.el

  const audio = new Audio()
  audio.preload = 'metadata'

  // ⚠️ EVERY listener below is gated on this deck being the ACTIVE one. A
  // retiring deck is still playing, still firing `timeupdate` four times a
  // second and still firing `ended` if its fade outlasts it — and every one of
  // those events describes the track the user has already moved on from. Left
  // ungated, the scrub bar jumps between two tracks during a crossfade and the
  // queue advances twice.
  const mine = () => active === index

  audio.addEventListener('play', () => { if (mine()) set({ playing: true }) })
  audio.addEventListener('pause', () => {
    // ⚠️ A PAUSE NOBODY HERE ASKED FOR, WITH THE APP OFF SCREEN, is the
    // background-playback failure (2026-09-10): the music was found already
    // paused at the moment the page went hidden, with no code of ours having
    // paused it. So it is recorded (`lib/bgLog.ts`), and one attempt is made to
    // carry on — if WebKit lets a hidden page resume, this is the moment. The
    // lock screen's own pause button comes through `pause()` below, which marks
    // itself, so a person pausing from there is never fought.
    const external = Date.now() - ownPauseAt > 400
    noteEvent('pause', { deck: audio.dataset.jukeboxAudio, external, sec: audio.currentTime })
    if (external && document.hidden && mine()) {
      audio
        .play()
        .then(() => noteEvent('rescue', { ok: true }))
        .catch((error: unknown) => {
          noteEvent('rescue', { ok: false, why: error instanceof Error ? error.name : String(error) })
          if (mine()) set({ playing: false })
        })
      return
    }
    if (mine()) set({ playing: false })
  })
  audio.addEventListener('play', () => noteEvent('play', { deck: audio.dataset.jukeboxAudio, sec: audio.currentTime }))
  audio.addEventListener('playing', () => { if (mine()) set({ playing: true, loading: false }) })
  audio.addEventListener('waiting', () => { if (mine()) set({ loading: true }) })
  audio.addEventListener('timeupdate', () => {
    if (!mine()) return
    set({ currentSec: audio.currentTime })
    maybeFadeOut(audio, index)
    reportRemaining(audio)
  })
  audio.addEventListener('durationchange', () => {
    if (!mine()) return
    // A stream with no known length reports Infinity; a not-yet-loaded one NaN.
    // Both must be treated as "unknown" rather than written to the library,
    // or a scrub bar ends up dividing by Infinity and sitting at zero forever.
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      set({ durationSec: audio.duration, loading: false })
      onDuration?.(audio.duration)
    }
  })
  audio.addEventListener('ended', () => {
    if (!mine()) return
    set({ playing: false, currentSec: 0 })
    onEnded?.()
  })
  audio.addEventListener('error', () => {
    if (!mine()) return
    set({ playing: false, loading: false })
    onError?.(describeError(audio.error))
  })

  // ⚠️ Put in the DOM, not left detached.
  //
  // `new Audio()` works perfectly well unattached, and this element was for a
  // while. Attaching it costs nothing — no controls, no layout, `hidden` — and
  // buys two real things: devtools can inspect what is actually playing, and a
  // browser test can read `currentTime` and `volume` instead of inferring them
  // from the UI that is supposed to be under test. Verifying a fade by reading
  // the same slider the fade is meant to leave alone proves nothing.
  audio.hidden = true
  audio.setAttribute('data-jukebox-audio', String(index))
  try {
    document.body.appendChild(audio)
  } catch {
    // No document (a test importing this module in Node) — the element works
    // detached, which is exactly what it did before.
  }

  deck.el = audio
  audio.volume = Math.max(0, Math.min(1, userVolume * deck.fade))
  return audio
}

/**
 * A sentence, not a code.
 *
 * `MEDIA_ERR_SRC_NOT_SUPPORTED` on a file that scanned fine almost always means
 * a container the browser lists but cannot decode with THIS codec inside it —
 * an ALAC in an .m4a is the common one, since the extension is shared with AAC
 * and nothing before playback can tell them apart.
 */
function describeError(error: MediaError | null): string {
  switch (error?.code) {
    case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
      return "This browser can't decode that file. If it's an .m4a it may be Apple Lossless rather than AAC — Universal Converter can turn it into FLAC."
    case MediaError.MEDIA_ERR_DECODE:
      return 'That file looks damaged — the audio stopped partway through decoding.'
    case MediaError.MEDIA_ERR_NETWORK:
      return 'The file could not be read. If it is on an external drive, check it is still connected.'
    case MediaError.MEDIA_ERR_ABORTED:
      return 'Playback was cancelled.'
    default:
      return "That file wouldn't play."
  }
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  listener(state)
  return () => listeners.delete(listener)
}

export function setCallbacks(callbacks: {
  onEnded?: () => void
  onDuration?: (seconds: number) => void
  onError?: (message: string) => void
  onApproachingEnd?: (remainingSec: number) => void
}): void {
  onEnded = callbacks.onEnded ?? null
  onDuration = callbacks.onDuration ?? null
  onError = callbacks.onError ?? null
  onApproachingEnd = callbacks.onApproachingEnd ?? null
}

/**
 * Point the active deck at a file and (optionally) start it.
 *
 * This is the CUT: whatever was playing stops, and the new track takes over the
 * same deck. Everything that is meant to be an arrival rather than a blend goes
 * through here — a record you chose, an album change, the first play.
 *
 * ⚠️ The previous object URL is revoked AFTER the new `src` is assigned, not
 * before. Revoking first leaves the element pointed at a dead URL for the
 * duration of the assignment, and some browsers fire an `error` for it — a
 * spurious "that file wouldn't play" on a track that plays fine.
 */
export async function load(file: SourceFile, autoplay: boolean, fadeInOverrideSec?: number): Promise<void> {
  // A load is a decision to play THIS, now. Anything still fading out under it
  // is from a change-over the user has just overtaken.
  finishRetirement()

  const index = active
  const deck = decks[index]
  const audio = element(index)
  const previous = deck.url
  const url = trackUrl(file)
  deck.url = url

  set({ loading: true, currentSec: 0, durationSec: 0 })
  audio.src = url
  if (previous) releaseTrackUrl(previous)
  // ⚠️ The override is the needle handover's, and it is a MAXIMUM of the two —
  // never less than the fade the user asked for in Settings. Somebody who set a
  // 6-second fade-in did not ask for it to be cut to a third of a second just
  // because the arm was lifted between tracks.
  beginTrack(index, fadeInOverrideSec === undefined ? undefined : Math.max(fadeInOverrideSec, fadeInSec))

  if (!autoplay) return
  ensureRunning()
  try {
    await audio.play()
  } catch {
    // Autoplay refused (no user gesture yet) is not an error state — the user
    // presses play and it works. Silently leaving it paused is correct; showing
    // an error for a browser policy is not.
    set({ playing: false, loading: false })
  }
}

/**
 * Start the next track UNDER the one playing, and swap the two over.
 *
 * The real crossfade, and the reason there are two elements at all. The
 * incoming file is loaded into the idle deck, started at silence and ramped up
 * while the outgoing deck ramps down over the same `seconds`. They genuinely
 * overlap: for that window both files are decoding and both are audible.
 *
 * ⚠️ THE SWAP HAPPENS IMMEDIATELY, NOT AT THE END OF THE RAMP. The moment the
 * incoming deck starts, it becomes `active` and the outgoing one becomes
 * `retiring`. That is what keeps the rest of the app coherent through the
 * overlap: the scrub bar, the duration, the media session and the queue are all
 * about the track that is arriving, which is the one the user has been shown.
 * The retiring deck goes on making sound for another `seconds` and is ignored
 * by all of them.
 *
 * ⚠️ Equal-power (√) rather than linear on BOTH sides. Two linear ramps crossing
 * dip audibly in the middle — the sum of two half-volume signals is not a
 * full-volume one — and that dip is exactly the seam a crossfade exists to
 * hide. See `rampTo`, which takes the curve.
 */
export async function crossfade(file: SourceFile, seconds: number): Promise<void> {
  // ⚠️ A CROSSFADE WITHOUT WORKING GAIN IS NOT A CROSSFADE, IT IS TWO TRACKS AT
  // ONCE. Every ramp below writes to `element.volume`; where that does nothing,
  // the overlap this function creates ON PURPOSE plays both records at full
  // level for `seconds`. Degrading to a clean change-over is not as good as a
  // crossfade; it is very much better than that.
  //
  // ⚠️ Which platforms those are is NOT hard-coded, and must not become so —
  // iOS was assumed to be one and measured not to be (iOS 26, iPhone 15 Pro:
  // the assignment round-trips, so the branch below does not fire there). See
  // the header of `lib/volumeSupport.ts`.
  if (!canSetElementVolume()) {
    await load(file, true)
    return
  }

  // Two crossfades at once would need three decks. The one in flight is
  // finished off instantly, which is what "you pressed next during a fade"
  // should sound like anyway.
  finishRetirement()

  const from = active
  const to: 0 | 1 = active === 0 ? 1 : 0
  const incoming = decks[to]
  const audio = element(to)

  const previous = incoming.url
  const url = trackUrl(file)
  incoming.url = url

  // Silence first, then the source: assigning `src` to a deck still at full
  // volume can leak a few milliseconds of the new track at full level on a slow
  // frame, which is a click at the very moment the seam is meant to disappear.
  setFade(to, 0)
  set({ loading: true, currentSec: 0, durationSec: 0 })
  audio.src = url
  if (previous) releaseTrackUrl(previous)

  // From here the incoming deck IS the app's deck.
  active = to
  retiring = from

  ensureRunning()
  try {
    await audio.play()
  } catch {
    // The browser refused to start the incoming track. Rather than leaving the
    // outgoing one fading into silence with nothing behind it, put everything
    // back the way it was — the queue's own error handling takes it from here.
    active = from
    retiring = null
    setFade(to, 1)
    set({ playing: !decks[from].el?.paused, loading: false })
    return
  }

  rampTo(to, 1, seconds, 'equal-power')
  rampTo(from, 0, seconds, 'equal-power', () => finishRetirement())
}

/** True while two tracks are genuinely overlapping. */
export function crossfading(): boolean {
  return retiring !== null
}

/**
 * Silence the retiring deck, let go of its file, and put its envelope back.
 *
 * Called when its ramp finishes, and eagerly by anything that supersedes the
 * change-over — a new load, a pause, another crossfade. Safe when nothing is
 * retiring.
 */
function finishRetirement(): void {
  if (retiring === null) return
  const index = retiring
  retiring = null
  const deck = decks[index]
  stopRamp(index)
  deck.fade = 1
  const audio = deck.el
  if (audio) {
    markOwnPause()
    audio.pause()
    audio.removeAttribute('src')
    // Without this the element keeps the old media loaded and, on some engines,
    // fires a spurious `error` for the removed source.
    audio.load()
    audio.volume = Math.max(0, Math.min(1, userVolume))
  }
  if (deck.url) {
    releaseTrackUrl(deck.url)
    deck.url = null
  }
}

export async function play(): Promise<void> {
  // ⚠️ Before every play, not once at startup. While a graph exists, a
  // suspended context means the element makes no sound at all — see
  // `audioGraph.ts`. Cheap and a no-op when there is no graph.
  ensureRunning()
  try {
    await el().play()
  } catch {
    set({ playing: false })
  }
}

export function pause(): void {
  // A pause during a crossfade has to stop BOTH, or the outgoing track carries
  // on playing under a paused player — the one bug a second element makes
  // possible that a single element could not.
  finishRetirement()
  el().pause()
}

export function seek(seconds: number): void {
  const audio = el()
  if (!Number.isFinite(audio.duration) || audio.duration <= 0) return
  audio.currentTime = Math.max(0, Math.min(seconds, audio.duration))
  set({ currentSec: audio.currentTime })
  // ⚠️ Scrubbing out of the fade-out zone has to cancel the fade. Without this,
  // seeking back from the last few seconds leaves the envelope wherever the
  // fade had got to — usually near zero — and the rest of the track plays
  // silently with a volume slider that says otherwise.
  const remaining = audio.duration - audio.currentTime
  if (fadeOutSec <= 0 || remaining > fadeOutSec) endFade(active, 1)
}

/**
 * The user's volume (the slider) and each deck's fade envelope are SEPARATE,
 * and an element's `volume` is always the product of the two.
 *
 * ⚠️ Keeping them apart is what stops the two fighting. The obvious
 * implementation — a fade writing straight to `element.volume` — has no memory
 * of what the slider said, so a fade-out ends with the slider's own value
 * redefined as zero and the next track silent. Multiplying two independent
 * values means neither control can destroy the other's.
 */
let userVolume = 1

function applyVolume(index: 0 | 1): void {
  const deck = decks[index]
  if (!deck.el) return
  deck.el.volume = Math.max(0, Math.min(1, userVolume * deck.fade))
}

function setFade(index: 0 | 1, value: number): void {
  decks[index].fade = value
  applyVolume(index)
}

export function setVolume(volume: number): void {
  userVolume = Math.max(0, Math.min(1, volume))
  applyVolume(0)
  applyVolume(1)
}

export function setMuted(muted: boolean): void {
  // Both, or a crossfade started before the mute leaks the outgoing track.
  for (const index of [0, 1] as const) {
    if (decks[index].el) decks[index].el.muted = muted
  }
  // Touching the active one builds it if it does not exist yet, which is what
  // the single-element version did.
  el().muted = muted
}

// ── Fades ────────────────────────────────────────────────────────────────────
//
// A fade in at the start of a track, a fade out before its end, and the two
// halves of a crossfade. All four are the same mechanism: ramp one deck's own
// envelope from where it is to a target, over a number of seconds.
//
// ⚠️ Driven by a 50 ms interval rather than `timeupdate`. `timeupdate` fires
// about four times a second, which over a two-second fade is eight steps — an
// audible staircase, not a fade. The interval only exists while a fade is
// actually running.

const FADE_TICK_MS = 50

let fadeInSec = 0
let fadeOutSec = 0

export function setFades(inSec: number, outSec: number): void {
  fadeInSec = Math.max(0, inSec)
  fadeOutSec = Math.max(0, outSec)
  // Turning fades off mid-track must not leave the envelope wherever it was.
  // Only the ACTIVE deck: a crossfade in flight is not the setting's business.
  if (fadeInSec === 0 && fadeOutSec === 0 && retiring === null) endFade(active, 1)
}

function stopRamp(index: 0 | 1): void {
  const deck = decks[index]
  if (deck.timer !== null) {
    clearInterval(deck.timer)
    deck.timer = null
  }
}

function endFade(index: 0 | 1, factor: number): void {
  stopRamp(index)
  setFade(index, factor)
}

/**
 * Ramp a deck's envelope from where it is to `target` over `seconds`.
 *
 * ⚠️ TWO CURVES, and which one is right depends on what is on the other side of
 * the fade.
 *
 * `linear` for a single track fading to or from SILENCE — a fade-in, a fade-out,
 * the duck under a needle change. It is what people expect and what every
 * player does.
 *
 * `equal-power` for the two halves of a CROSSFADE, where something else is
 * doing the opposite at the same time. Two linear ramps crossing produce an
 * audible dip in the middle: at the halfway point both tracks are at 0.5, and
 * two uncorrelated signals at half amplitude do not sum to one. Taking the
 * square root holds the perceived loudness flat across the overlap, which is
 * the difference between a crossfade and a dip.
 */
function rampTo(
  index: 0 | 1,
  target: number,
  seconds: number,
  curve: 'linear' | 'equal-power' = 'linear',
  done?: () => void,
): void {
  stopRamp(index)
  if (seconds <= 0) {
    endFade(index, target)
    done?.()
    return
  }
  const deck = decks[index]
  const from = deck.fade
  const started = Date.now()
  deck.timer = setInterval(() => {
    const t = Math.min(1, (Date.now() - started) / (seconds * 1000))
    const shaped = curve === 'equal-power' ? Math.sqrt(t) : t
    setFade(index, from + (target - from) * shaped)
    if (t >= 1) {
      endFade(index, target)
      done?.()
    }
  }, FADE_TICK_MS) as unknown as number
}

/**
 * Called on every `timeupdate`: start the fade-out once the end is close.
 *
 * ⚠️ Guarded on a KNOWN duration. A track whose length the browser has not
 * worked out yet reports NaN or Infinity, and `remaining` computed from that is
 * not a number — which would either fade nothing or fade instantly to silence
 * at the first tick, on every track, until metadata arrived.
 *
 * ⚠️ And skipped entirely while a crossfade is running. The user's fade-out and
 * the crossfade's own ramp are two envelopes on the same deck, and the last one
 * to be set wins — with both running, the crossfade's rise is repeatedly
 * stamped back down and the incoming track arrives silent.
 */
function maybeFadeOut(audio: HTMLAudioElement, index: 0 | 1): void {
  if (fadeOutSec <= 0 || decks[index].timer !== null || retiring !== null) return
  const duration = audio.duration
  if (!Number.isFinite(duration) || duration <= 0) return
  // A track shorter than twice the fade would spend its whole life fading.
  if (duration < fadeOutSec * 2) return
  const remaining = duration - audio.currentTime
  if (remaining > 0 && remaining <= fadeOutSec) rampTo(index, 0, remaining)
}

/** Tell the queue how much of the track is left, so it can start a change-over. */
function reportRemaining(audio: HTMLAudioElement): void {
  if (!onApproachingEnd) return
  const duration = audio.duration
  if (!Number.isFinite(duration) || duration <= 0) return
  onApproachingEnd(Math.max(0, duration - audio.currentTime))
}

/**
 * Reset a deck's envelope for a track that is about to start.
 *
 * `overrideSec` is the needle handover asking for a short rise under the
 * scratch even when the user's own fade-in is off — see `playerStore`.
 */
function beginTrack(index: 0 | 1, overrideSec?: number): void {
  stopRamp(index)
  const seconds = overrideSec ?? fadeInSec
  if (seconds > 0) {
    setFade(index, 0)
    rampTo(index, 1, seconds)
  } else {
    endFade(index, 1)
  }
}

/**
 * Fade what is playing down to silence over `seconds`, leaving it playing.
 *
 * Used by the needle change on an ALBUM change, where the two records are
 * deliberately not blended: the outgoing one sinks away while the arm comes off,
 * and the new one rises under the scratch after it. Within an album the tracks
 * genuinely overlap instead — see `crossfade`.
 */
export function duck(seconds: number): void {
  rampTo(active, 0, seconds)
}

/**
 * Start the current track again from the top, with a fade.
 *
 * `repeat: 'one'` needs this: the needle really does come off and go back to
 * the start, and reloading the file to say so would throw away a decode the
 * element already has.
 */
export async function restart(fadeInOverrideSec?: number): Promise<void> {
  const audio = el()
  try { audio.currentTime = 0 } catch { /* not seekable yet */ }
  set({ currentSec: 0 })
  beginTrack(active, fadeInOverrideSec === undefined ? undefined : Math.max(fadeInOverrideSec, fadeInSec))
  await play()
}

/**
 * The element the app is currently about.
 *
 * ⚠️ NEVER CACHE WHAT THIS RETURNS. It changes at every crossfade. The Media
 * Session is fine calling it per use; the Web Audio graph is not, which is why
 * `mediaElements()` exists and the graph captures both at once.
 */
export function mediaElement(): HTMLAudioElement {
  return el()
}

/**
 * Both elements, for the Web Audio graph to capture.
 *
 * `createMediaElementSource` is once-per-element and permanent, so a graph that
 * captured only the active deck would silence the app the first time a
 * crossfade made the other one active — see `audioGraph.ts`.
 */
export function mediaElements(): [HTMLAudioElement, HTMLAudioElement] {
  return [element(0), element(1)]
}

/** Stop, release both files, and forget everything — a preview included. */
export function stop(): void {
  finishRetirement()
  const audio = el()
  stopPreview()
  endFade(active, 1)
  markOwnPause()
  audio.pause()
  audio.removeAttribute('src')
  audio.load()
  const deck = decks[active]
  if (deck.url) {
    releaseTrackUrl(deck.url)
    deck.url = null
  }
  set({ playing: false, currentSec: 0, durationSec: 0, loading: false })
}

// ── Preview ──────────────────────────────────────────────────────────────────
//
// Ten seconds of a track, taken ten seconds in — the one way to hear something
// WITHOUT putting the record on (§ James, 2026-09-08: every other play goes to
// the deck and cues the arm; this is the exception).
//
// ⚠️ A THIRD, dedicated element, and that is deliberate. The two decks above
// are the queue's; a preview must not disturb either of them, because
// auditioning a track has to leave what you had cued up exactly where it was.
// It is reused for every preview and emptied the moment a preview stops, so it
// pins nothing between previews.
//
// Ten seconds in, because the first ten seconds of a record are the part that
// is least like it — an intro, a count-in, or silence.

/** How far into the track a preview starts. */
export const PREVIEW_START_SEC = 10
/** How long it runs for. */
export const PREVIEW_RUN_SEC = 10
/** A track shorter than this cannot give ten seconds from ten seconds in. */
const PREVIEW_MIN_SEEKABLE_SEC = PREVIEW_START_SEC + 2

let previewEl: HTMLAudioElement | null = null
let previewUrl: string | null = null
let previewTimer: number | null = null
let previewStopped: (() => void) | null = null

/** Told when a preview finishes on its own, so the button can go back to rest. */
export function setPreviewStoppedCallback(fn: (() => void) | null): void {
  previewStopped = fn
}

function previewElement(): HTMLAudioElement {
  if (previewEl) return previewEl
  const audio = new Audio()
  audio.preload = 'metadata'
  audio.hidden = true
  audio.setAttribute('data-jukebox-preview', '')
  try {
    document.body.appendChild(audio)
  } catch { /* no document — it works detached */ }
  previewEl = audio
  return audio
}

/**
 * Play ten seconds of a file, starting ten seconds in.
 *
 * ⚠️ The seek happens on `loadedmetadata` and not before. Setting
 * `currentTime` on an element that has not worked out its duration yet is
 * silently ignored by every engine, so the preview would start at 0:00 and
 * nothing anywhere would say why.
 */
export function startPreview(file: SourceFile, volume: number): void {
  stopPreview()
  const audio = previewElement()
  const url = trackUrl(file)
  previewUrl = url
  audio.volume = Math.max(0, Math.min(1, volume))
  audio.src = url

  const finish = () => {
    stopPreview()
    previewStopped?.()
  }

  audio.addEventListener('loadedmetadata', () => {
    const duration = audio.duration
    const known = Number.isFinite(duration) && duration > 0
    const from = known && duration > PREVIEW_MIN_SEEKABLE_SEC ? PREVIEW_START_SEC : 0
    try { audio.currentTime = from } catch { /* not seekable — start where it is */ }
    void audio.play().catch(finish)
    const runFor = known ? Math.min(PREVIEW_RUN_SEC, Math.max(1, duration - from)) : PREVIEW_RUN_SEC
    previewTimer = setTimeout(finish, runFor * 1000) as unknown as number
  }, { once: true })

  // A file the browser cannot decode ends the preview rather than leaving the
  // button stuck saying "stop" over silence.
  audio.addEventListener('error', finish, { once: true })
  audio.addEventListener('ended', finish, { once: true })
}

/** Stop a preview and let go of the file. Safe to call when none is running. */
export function stopPreview(): void {
  if (previewTimer !== null) {
    clearTimeout(previewTimer)
    previewTimer = null
  }
  if (previewEl) {
    markOwnPause()
    previewEl.pause()
    previewEl.removeAttribute('src')
    previewEl.load()
  }
  if (previewUrl) {
    releaseTrackUrl(previewUrl)
    previewUrl = null
  }
}

/** Follow the volume slider while a preview is running. */
export function setPreviewVolume(volume: number): void {
  if (previewEl) previewEl.volume = Math.max(0, Math.min(1, volume))
}

// ── Shuffle ──────────────────────────────────────────────────────────────────

/**
 * A proper Fisher-Yates shuffle of an index list.
 *
 * ⚠️ NOT `sort(() => Math.random() - 0.5)`, which is the one-liner everybody
 * reaches for and which is not a shuffle: it is biased, badly, and with V8's
 * sort it leaves large runs of the original order intact. On an album that
 * reads as "shuffle doesn't work", because the first four tracks keep coming up
 * in order — a bug report nobody can ever reproduce on demand.
 */
export function shuffled(length: number, keepFirst?: number): number[] {
  const order = Array.from({ length }, (_, i) => i)
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  // The track already playing stays where it is rather than being yanked away
  // the moment shuffle is switched on mid-song.
  if (keepFirst !== undefined) {
    const at = order.indexOf(keepFirst)
    if (at > 0) {
      ;[order[0], order[at]] = [order[at], order[0]]
    }
  }
  return order
}
