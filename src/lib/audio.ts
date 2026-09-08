// The thing that actually makes sound.
//
// One `<audio>` element, created once and reused for every track, plus the
// object-URL discipline that keeps a long listening session from leaking the
// whole library into memory.
//
// ⚠️ ONE element, not one per track. Each `createObjectURL` pins its File until
// revoked, and a fresh `<audio>` per track leaves the old one holding a decoder
// and a buffer. Forty tracks into an evening that is forty pinned files. So:
// one element, and the previous URL is revoked at the moment the next is set.
//
// There is deliberately no Web Audio graph around this BY DEFAULT. `<audio>`
// decodes MP3, M4A/AAC, FLAC and WAV natively in every current browser — that
// is the whole reason this app is cheap to build — and routing it through an
// `AudioContext` costs the element's own buffering and seeking behaviour, plus
// a permanent risk of silence (see `lib/audioGraph.ts`). A graph is built only
// when something needs one: the visualiser, or a volume boost above unity.
//
// The FADES below need no graph at all, and that is on purpose. They scale the
// element's own `volume`, so the most-used new setting carries none of the
// Web Audio risk — only the boost, which genuinely cannot be done any other
// way, opts into it.

import { ensureRunning } from './audioGraph'

/** Where playback is, as far as anything outside this file is concerned. */
export interface AudioState {
  playing: boolean
  currentSec: number
  durationSec: number
  /** True between "asked for a track" and "the browser has enough to play it". */
  loading: boolean
}

type Listener = (state: AudioState) => void

let element: HTMLAudioElement | null = null
let currentUrl: string | null = null
const listeners = new Set<Listener>()

let state: AudioState = { playing: false, currentSec: 0, durationSec: 0, loading: false }

/** Fired when a track reaches its natural end — the queue's cue to advance. */
let onEnded: (() => void) | null = null
/** Fired the first time a track's real duration is known. */
let onDuration: ((seconds: number) => void) | null = null
/** Fired when a track cannot be played at all. */
let onError: ((message: string) => void) | null = null

function emit() {
  for (const listener of listeners) listener(state)
}

function set(patch: Partial<AudioState>) {
  state = { ...state, ...patch }
  emit()
}

function el(): HTMLAudioElement {
  if (element) return element
  const audio = new Audio()
  audio.preload = 'metadata'

  audio.addEventListener('play', () => set({ playing: true }))
  audio.addEventListener('pause', () => set({ playing: false }))
  audio.addEventListener('playing', () => set({ playing: true, loading: false }))
  audio.addEventListener('waiting', () => set({ loading: true }))
  audio.addEventListener('timeupdate', () => {
    set({ currentSec: audio.currentTime })
    maybeFadeOut(audio)
  })
  audio.addEventListener('durationchange', () => {
    // A stream with no known length reports Infinity; a not-yet-loaded one NaN.
    // Both must be treated as "unknown" rather than written to the library,
    // or a scrub bar ends up dividing by Infinity and sitting at zero forever.
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      set({ durationSec: audio.duration, loading: false })
      onDuration?.(audio.duration)
    }
  })
  audio.addEventListener('ended', () => {
    set({ playing: false, currentSec: 0 })
    onEnded?.()
  })
  audio.addEventListener('error', () => {
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
  audio.setAttribute('data-jukebox-audio', '')
  try {
    document.body.appendChild(audio)
  } catch {
    // No document (a test importing this module in Node) — the element works
    // detached, which is exactly what it did before.
  }

  element = audio
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
}): void {
  onEnded = callbacks.onEnded ?? null
  onDuration = callbacks.onDuration ?? null
  onError = callbacks.onError ?? null
}

/**
 * Point the element at a file and (optionally) start it.
 *
 * ⚠️ The previous object URL is revoked AFTER the new `src` is assigned, not
 * before. Revoking first leaves the element pointed at a dead URL for the
 * duration of the assignment, and some browsers fire an `error` for it — a
 * spurious "that file wouldn't play" on a track that plays fine.
 */
export async function load(file: File, autoplay: boolean, fadeInOverrideSec?: number): Promise<void> {
  const audio = el()
  const previous = currentUrl
  const url = URL.createObjectURL(file)
  currentUrl = url

  set({ loading: true, currentSec: 0, durationSec: 0 })
  audio.src = url
  if (previous) URL.revokeObjectURL(previous)
  // ⚠️ The override is the needle handover's, and it is a MAXIMUM of the two —
  // never less than the fade the user asked for in Settings. Somebody who set a
  // 6-second fade-in did not ask for it to be cut to a third of a second just
  // because the arm was lifted between tracks.
  beginTrack(fadeInOverrideSec === undefined ? undefined : Math.max(fadeInOverrideSec, fadeInSec))

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
  if (fadeOutSec <= 0 || remaining > fadeOutSec) endFade(1)
}

/**
 * The user's volume (the slider) and the fade envelope are SEPARATE, and the
 * element's `volume` is always the product of the two.
 *
 * ⚠️ Keeping them apart is what stops the two fighting. The obvious
 * implementation — a fade writing straight to `element.volume` — has no memory
 * of what the slider said, so a fade-out ends with the slider's own value
 * redefined as zero and the next track silent. Multiplying two independent
 * values means neither control can destroy the other's.
 */
let userVolume = 1
let fadeFactor = 1

function applyVolume(): void {
  const audio = el()
  const v = userVolume * fadeFactor
  audio.volume = Math.max(0, Math.min(1, v))
}

export function setVolume(volume: number): void {
  userVolume = Math.max(0, Math.min(1, volume))
  applyVolume()
}

export function setMuted(muted: boolean): void {
  el().muted = muted
}

// ── Fades ────────────────────────────────────────────────────────────────────
//
// A fade in at the start of a track and out before its end. Not a CROSSFADE:
// that needs two elements decoding at once, and this app has exactly one on
// purpose (see the note at the top). The gap between tracks stays the gap the
// browser gives us — what changes is that a track no longer starts or stops at
// full volume.
//
// ⚠️ Driven by a 50 ms interval rather than `timeupdate`. `timeupdate` fires
// about four times a second, which over a two-second fade is eight steps — an
// audible staircase, not a fade. The interval only exists while a fade is
// actually running.

const FADE_TICK_MS = 50

let fadeTimer: number | null = null
let fadeInSec = 0
let fadeOutSec = 0

export function setFades(inSec: number, outSec: number): void {
  fadeInSec = Math.max(0, inSec)
  fadeOutSec = Math.max(0, outSec)
  // Turning fades off mid-track must not leave the envelope wherever it was.
  if (fadeInSec === 0 && fadeOutSec === 0) endFade(1)
}

function stopFadeTimer(): void {
  if (fadeTimer !== null) {
    clearInterval(fadeTimer)
    fadeTimer = null
  }
}

function endFade(factor: number): void {
  stopFadeTimer()
  fadeFactor = factor
  applyVolume()
}

/**
 * Ramp the envelope from where it is to `target` over `seconds`.
 *
 * Linear in amplitude. A "correct" equal-power curve is the right answer for a
 * crossfade between two sources; for a single track fading to or from silence,
 * linear is what people expect and what every player does.
 */
function rampTo(target: number, seconds: number): void {
  stopFadeTimer()
  if (seconds <= 0) {
    endFade(target)
    return
  }
  const from = fadeFactor
  const started = Date.now()
  fadeTimer = setInterval(() => {
    const t = Math.min(1, (Date.now() - started) / (seconds * 1000))
    fadeFactor = from + (target - from) * t
    applyVolume()
    if (t >= 1) endFade(target)
  }, FADE_TICK_MS) as unknown as number
}

/**
 * Called on every `timeupdate`: start the fade-out once the end is close.
 *
 * ⚠️ Guarded on a KNOWN duration. A track whose length the browser has not
 * worked out yet reports NaN or Infinity, and `remaining` computed from that is
 * not a number — which would either fade nothing or fade instantly to silence
 * at the first tick, on every track, until metadata arrived.
 */
function maybeFadeOut(audio: HTMLAudioElement): void {
  if (fadeOutSec <= 0 || fadeTimer !== null) return
  const duration = audio.duration
  if (!Number.isFinite(duration) || duration <= 0) return
  // A track shorter than twice the fade would spend its whole life fading.
  if (duration < fadeOutSec * 2) return
  const remaining = duration - audio.currentTime
  if (remaining > 0 && remaining <= fadeOutSec) rampTo(0, remaining)
}

/**
 * Reset the envelope for a track that is about to start.
 *
 * `overrideSec` is the needle handover asking for a short rise under the
 * scratch even when the user's own fade-in is off — see `playerStore`.
 */
function beginTrack(overrideSec?: number): void {
  stopFadeTimer()
  const seconds = overrideSec ?? fadeInSec
  if (seconds > 0) {
    fadeFactor = 0
    applyVolume()
    rampTo(1, seconds)
  } else {
    endFade(1)
  }
}

/**
 * Fade what is playing down to silence over `seconds`, leaving it playing.
 *
 * Used by the needle handover: the outgoing track sinks away while the arm
 * comes off the record, and the incoming one rises under the scratch. With one
 * `<audio>` element this is as close to "tracks fading into each other" as the
 * app can honestly get — the two never overlap, but neither of them ends or
 * begins at full volume.
 */
export function duck(seconds: number): void {
  rampTo(0, seconds)
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
  beginTrack(fadeInOverrideSec === undefined ? undefined : Math.max(fadeInOverrideSec, fadeInSec))
  await play()
}

/** The element itself, for the Media Session and the visualiser to attach to. */
export function mediaElement(): HTMLAudioElement {
  return el()
}

/** Stop, release the file, and forget everything — a preview included. */
export function stop(): void {
  const audio = el()
  stopPreview()
  endFade(1)
  audio.pause()
  audio.removeAttribute('src')
  audio.load()
  if (currentUrl) {
    URL.revokeObjectURL(currentUrl)
    currentUrl = null
  }
  set({ playing: false, currentSec: 0, durationSec: 0, loading: false })
}

// ── Preview ──────────────────────────────────────────────────────────────────
//
// Ten seconds of a track, taken ten seconds in — the one way to hear something
// WITHOUT putting the record on (§ James, 2026-09-08: every other play goes to
// the deck and cues the arm; this is the exception).
//
// ⚠️ A SECOND, dedicated element, and that is a deliberate exception to the
// one-element rule at the top of this file. The reason for one element is that
// a fresh `<audio>` per track leaves forty pinned files behind over an evening;
// this is ONE more element, reused for every preview and emptied the moment a
// preview stops, so it pins nothing between previews. What it buys is the queue
// surviving a listen: auditioning a track must not throw away what you had
// cued up, and with a single element it would have to.
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
export function startPreview(file: File, volume: number): void {
  stopPreview()
  const audio = previewElement()
  const url = URL.createObjectURL(file)
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
    previewEl.pause()
    previewEl.removeAttribute('src')
    previewEl.load()
  }
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl)
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
