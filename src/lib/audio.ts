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
// There is deliberately no Web Audio graph around this. `<audio>` decodes MP3,
// M4A/AAC, FLAC and WAV natively in every current browser — that is the whole
// reason this app is cheap to build — and routing it through an `AudioContext`
// would buy a visualiser at the cost of the element's own buffering, seeking
// and Media Session integration. The analyser in `Visualiser.tsx` attaches to
// this element through a `MediaElementSource` only when the visualiser is
// actually on screen.

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
  audio.addEventListener('timeupdate', () => set({ currentSec: audio.currentTime }))
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
export async function load(file: File, autoplay: boolean): Promise<void> {
  const audio = el()
  const previous = currentUrl
  const url = URL.createObjectURL(file)
  currentUrl = url

  set({ loading: true, currentSec: 0, durationSec: 0 })
  audio.src = url
  if (previous) URL.revokeObjectURL(previous)

  if (!autoplay) return
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
}

export function setVolume(volume: number): void {
  el().volume = Math.max(0, Math.min(1, volume))
}

export function setMuted(muted: boolean): void {
  el().muted = muted
}

/** The element itself, for the Media Session and the visualiser to attach to. */
export function mediaElement(): HTMLAudioElement {
  return el()
}

/** Stop, release the file, and forget everything. */
export function stop(): void {
  const audio = el()
  audio.pause()
  audio.removeAttribute('src')
  audio.load()
  if (currentUrl) {
    URL.revokeObjectURL(currentUrl)
    currentUrl = null
  }
  set({ playing: false, currentSec: 0, durationSec: 0, loading: false })
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
