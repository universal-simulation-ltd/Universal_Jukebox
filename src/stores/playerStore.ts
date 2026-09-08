import { create } from 'zustand'
import { coverUrl } from '../lib/art'
import { playNeedleDrop } from '../lib/crackle'
import * as audio from '../lib/audio'
import * as db from '../lib/library'
import * as ms from '../lib/mediaSession'
import { shuffled } from '../lib/audio'
import type { Track } from '../lib/types'
import { useLibraryStore } from './libraryStore'

// Playback: the queue, what is on, and the transport.
//
// The queue is a list of TRACKS plus an ORDER — a list of indices into it. That
// indirection is what makes shuffle honest: shuffling permutes the order and
// leaves the queue alone, so turning shuffle off restores the real running
// order of the album rather than a re-sorted approximation of it, and "next"
// means the same thing to the UI in both modes.

export type Repeat = 'off' | 'all' | 'one'

const VOLUME_KEY = 'unisim-jukebox-volume'
const MODES_KEY = 'unisim-jukebox-modes'
const CRACKLE_KEY = 'unisim-jukebox-crackle'

interface PlayerState {
  queue: Track[]
  /** Indices into `queue`, in play order. */
  order: number[]
  /** Position within `order`, not within `queue`. -1 when nothing is loaded. */
  cursor: number

  playing: boolean
  loading: boolean
  currentSec: number
  durationSec: number
  volume: number
  muted: boolean
  shuffle: boolean
  repeat: Repeat
  error: string | null

  /**
   * The first-play ceremony (§22.9 of next-products.md): the platter spins up,
   * the arm comes down, 3·2·1 counts beside the deck, and the track starts.
   *
   * ⚠️ ONCE PER SESSION, on the FIRST play only. A three-second ceremony before
   * every track is an app you close. `ceremonyDone` is deliberately NOT
   * persisted — it resets with the tab, because the ceremony is an arrival and
   * arriving happens once per visit, not once ever.
   */
  ceremony: boolean
  ceremonyDone: boolean
  /** 3, 2, 1 — or null when no countdown is running. */
  ceremonyCount: number | null
  /** Whether the tonearm is down. True whenever a ceremony is not running. */
  armDown: boolean
  /** The synthesised thunk and crackle. Persisted; off in one click. */
  crackle: boolean

  playTracks(tracks: Track[], startAt?: number): void
  toggle(): void
  next(): void
  previous(): void
  seekTo(seconds: number): void
  seekBy(offset: number): void
  setVolume(v: number): void
  toggleMute(): void
  toggleShuffle(): void
  cycleRepeat(): void
  setCrackle(on: boolean): void
  /** Any click, key, or second press of play cuts straight to the audio. */
  skipCeremony(): void
  enqueue(tracks: Track[], mode: 'next' | 'end'): void
  removeFromQueue(index: number): void
  clearQueue(): void
  dismissError(): void
}

function readModes(): { shuffle: boolean; repeat: Repeat } {
  try {
    const raw = localStorage.getItem(MODES_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as { shuffle?: boolean; repeat?: Repeat }
      return {
        shuffle: !!parsed.shuffle,
        repeat: parsed.repeat === 'all' || parsed.repeat === 'one' ? parsed.repeat : 'off',
      }
    }
  } catch { /* storage disabled, or someone else's JSON */ }
  return { shuffle: false, repeat: 'off' }
}

function readNumber(key: string, fallback: number): number {
  try {
    const raw = localStorage.getItem(key)
    if (raw !== null) {
      const n = Number(raw)
      if (Number.isFinite(n) && n >= 0 && n <= 1) return n
    }
  } catch { /* ignore */ }
  return fallback
}

function readCrackle(): boolean {
  try {
    const raw = localStorage.getItem(CRACKLE_KEY)
    if (raw !== null) return raw === '1'
  } catch { /* ignore */ }
  // Default on is defensible ONLY because it lasts under a second and sits
  // under the first bar of music. See §22.9 rule 4.
  return true
}

const modes = readModes()

export const usePlayerStore = create<PlayerState>((set, get) => ({
  queue: [],
  order: [],
  cursor: -1,
  playing: false,
  loading: false,
  currentSec: 0,
  durationSec: 0,
  volume: readNumber(VOLUME_KEY, 0.85),
  muted: false,
  shuffle: modes.shuffle,
  repeat: modes.repeat,
  error: null,
  ceremony: false,
  ceremonyDone: false,
  ceremonyCount: null,
  armDown: true,
  crackle: readCrackle(),

  /**
   * Replace the queue and start playing.
   *
   * `startAt` is an index into `tracks` — the track the user actually clicked —
   * and it survives shuffling: `shuffled()` keeps it first, so pressing play on
   * track 9 with shuffle on plays track 9 and then wanders, rather than
   * immediately playing something else. Anything else reads as a broken click.
   */
  playTracks(tracks, startAt = 0) {
    if (tracks.length === 0) return
    const { shuffle } = get()
    const order = shuffle
      ? shuffled(tracks.length, startAt)
      : Array.from({ length: tracks.length }, (_, i) => i)
    const cursor = shuffle ? 0 : startAt

    set({ queue: tracks, order, cursor, error: null })
    startCeremonyOrPlay(set, get, tracks[order[cursor]])
  },

  toggle() {
    const { playing, ceremony } = get()
    // A second press of play during the ceremony is one of the three documented
    // ways to skip it — not a pause.
    if (ceremony) {
      get().skipCeremony()
      return
    }
    if (playing) audio.pause()
    else void audio.play()
  },

  next() {
    advance(set, get, 1)
  },

  previous() {
    // The convention every player shares: "previous" restarts the current track
    // unless you are already near its start. Jumping back mid-song is almost
    // never what the button was pressed for.
    if (get().currentSec > 3) {
      audio.seek(0)
      return
    }
    advance(set, get, -1)
  },

  seekTo(seconds) {
    audio.seek(seconds)
  },

  seekBy(offset) {
    audio.seek(get().currentSec + offset)
  },

  setVolume(v) {
    const volume = Math.max(0, Math.min(1, v))
    audio.setVolume(volume)
    // Moving the slider off zero is an unmute — leaving it muted while the
    // slider says 60% is a control that lies.
    if (volume > 0 && get().muted) {
      audio.setMuted(false)
      set({ muted: false })
    }
    try { localStorage.setItem(VOLUME_KEY, String(volume)) } catch { /* ignore */ }
    set({ volume })
  },

  toggleMute() {
    const muted = !get().muted
    audio.setMuted(muted)
    set({ muted })
  },

  toggleShuffle() {
    const shuffle = !get().shuffle
    const { queue, order, cursor } = get()
    const playingIndex = cursor >= 0 ? order[cursor] : undefined

    const nextOrder = shuffle
      ? shuffled(queue.length, playingIndex)
      : Array.from({ length: queue.length }, (_, i) => i)
    // Keep the CURRENT track current. Turning shuffle on or off mid-song must
    // never change what is playing — only what comes after it.
    const nextCursor = playingIndex === undefined ? -1 : nextOrder.indexOf(playingIndex)

    persistModes(shuffle, get().repeat)
    set({ shuffle, order: nextOrder, cursor: nextCursor })
  },

  cycleRepeat() {
    const repeat: Repeat = get().repeat === 'off' ? 'all' : get().repeat === 'all' ? 'one' : 'off'
    persistModes(get().shuffle, repeat)
    set({ repeat })
  },

  setCrackle(on) {
    try { localStorage.setItem(CRACKLE_KEY, on ? '1' : '0') } catch { /* ignore */ }
    set({ crackle: on })
  },

  skipCeremony() {
    if (!get().ceremony) return
    clearCeremony()
    set({ ceremony: false, ceremonyDone: true, ceremonyCount: null, armDown: true })
    void audio.play()
  },

  enqueue(tracks, mode) {
    if (tracks.length === 0) return
    const { queue, order, cursor } = get()
    if (queue.length === 0) {
      get().playTracks(tracks, 0)
      return
    }
    const base = queue.length
    const added = tracks.map((_, i) => base + i)
    const nextQueue = [...queue, ...tracks]
    // "Play next" splices into the ORDER right after the cursor, not into the
    // queue — so it works identically with shuffle on, which is the only time
    // anyone actually reaches for it.
    const nextOrder = mode === 'next' && cursor >= 0
      ? [...order.slice(0, cursor + 1), ...added, ...order.slice(cursor + 1)]
      : [...order, ...added]
    set({ queue: nextQueue, order: nextOrder })
  },

  removeFromQueue(orderIndex) {
    const { order, cursor } = get()
    if (orderIndex < 0 || orderIndex >= order.length) return
    // Removing the track that is playing would leave the cursor pointing at
    // something the user did not choose. Skipping to the next one first is the
    // only behaviour that isn't a surprise.
    if (orderIndex === cursor) {
      advance(set, get, 1)
      return
    }
    const nextOrder = order.filter((_, i) => i !== orderIndex)
    set({
      order: nextOrder,
      cursor: orderIndex < cursor ? cursor - 1 : cursor,
    })
  },

  clearQueue() {
    audio.stop()
    publishNowPlaying(null)
    set({ queue: [], order: [], cursor: -1, playing: false, currentSec: 0, durationSec: 0 })
  },

  dismissError() {
    set({ error: null })
  },
}))

function persistModes(shuffle: boolean, repeat: Repeat) {
  try { localStorage.setItem(MODES_KEY, JSON.stringify({ shuffle, repeat })) } catch { /* ignore */ }
}

/**
 * Tell the OS what is playing.
 *
 * ⚠️ Called from BOTH places a track can change — `startCeremonyOrPlay` and
 * `advance` — because there is no single funnel they share. Missing this was a
 * real bug found by driving the app in a browser rather than by any test:
 * `playbackState` was being set correctly, so the OS knew something was
 * playing, while `metadata` was never set at all. The lock screen and the car
 * showed a blank card for every track, and nothing anywhere failed.
 */
function publishNowPlaying(track: Track | null): void {
  if (!track) {
    ms.setMetadata(null, null)
    return
  }
  const album = useLibraryStore.getState().albums.find((a) => a.id === track.albumId)
  ms.setMetadata(track, album ? coverUrl(album.id, album.cover) : null)
}

/** The track currently pointed at, or null. */
export function currentTrack(state: Pick<PlayerState, 'queue' | 'order' | 'cursor'>): Track | null {
  if (state.cursor < 0 || state.cursor >= state.order.length) return null
  return state.queue[state.order[state.cursor]] ?? null
}

type Set = (partial: Partial<PlayerState>) => void
type Get = () => PlayerState

/**
 * The first-play ceremony's beats (§22.9), in milliseconds.
 *
 * ⚠️ THE TIMELINE LIVES HERE, IN THE STORE, AND NOT IN `Deck.tsx`.
 *
 * It was in the Deck, and that was a real bug rather than an arrangement
 * preference: the ceremonial Deck is only mounted on the Now Playing view, so
 * pressing Play from an ALBUM — the most ordinary way anyone starts music —
 * set `ceremony: true` with nothing anywhere to run the timeline or to call
 * `skipCeremony()` at the end of it. The audio is deliberately LOADED and not
 * PLAYED during the ceremony, so the failure mode was silence that never
 * resolved. Owned by the store, the beats run whether or not any deck is
 * watching, and the Deck is left to do what a view should: read the phase and
 * draw it.
 */
const BEATS = { two: 780, one: 1560, land: 1830, start: 2340 }

let ceremonyTimers: number[] = []

function clearCeremony(): void {
  for (const t of ceremonyTimers) clearTimeout(t)
  ceremonyTimers = []
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

/**
 * Load a track and either start it or hand over to the ceremony.
 *
 * ⚠️ The ceremony loads the audio but does NOT play it — the countdown is cover
 * for the first byte coming off disk, which is the whole reason it earns its
 * place rather than being decoration.
 */
function startCeremonyOrPlay(set: Set, get: Get, track: Track | undefined) {
  if (!track) return
  const file = useLibraryStore.getState().fileFor(track)
  if (!file) {
    set({
      error: 'That file isn’t reachable any more. If the folder moved or the drive was unplugged, choose the folder again.',
    })
    return
  }

  publishNowPlaying(track)
  clearCeremony()

  const first = !get().ceremonyDone
  // Under reduced motion the end state has to be reachable without the
  // transition: the arm is simply DOWN and playback is immediate. Same rule
  // every app mark follows.
  if (!first || prefersReducedMotion()) {
    set({ ceremony: false, ceremonyDone: true, ceremonyCount: null, armDown: true })
    void audio.load(file, true)
    return
  }

  set({ ceremony: true, ceremonyCount: 3, armDown: false })
  void audio.load(file, false)

  const at = (ms: number, fn: () => void) => {
    ceremonyTimers.push(setTimeout(fn, ms) as unknown as number)
  }
  at(BEATS.two, () => set({ ceremonyCount: 2 }))
  at(BEATS.one, () => set({ ceremonyCount: 1 }))
  at(BEATS.land, () => {
    set({ armDown: true })
    if (get().crackle) playNeedleDrop(get().volume)
  })
  // This is what actually starts the sound.
  at(BEATS.start, () => get().skipCeremony())
}

/**
 * Move by one, honouring repeat.
 *
 * `repeat: 'one'` is checked ONLY on a natural end, not on a button press —
 * pressing next with repeat-one on and getting the same track again is the
 * single most confusing thing a player can do. `advance` is the button path;
 * `onEnded` below handles the natural one.
 */
function advance(set: Set, get: Get, delta: number) {
  const { order, cursor, repeat } = get()
  if (order.length === 0) return
  let nextCursor = cursor + delta

  if (nextCursor >= order.length) {
    if (repeat === 'off') {
      // The end of the queue. Stop rather than wrapping silently.
      audio.pause()
      audio.seek(0)
      set({ playing: false })
      return
    }
    nextCursor = 0
  } else if (nextCursor < 0) {
    nextCursor = repeat === 'off' ? 0 : order.length - 1
  }

  set({ cursor: nextCursor })
  const track = get().queue[order[nextCursor]]
  const file = track ? useLibraryStore.getState().fileFor(track) : null
  if (!file) {
    set({ error: 'That file isn’t reachable any more. Choose the folder again to restore playback.' })
    return
  }
  publishNowPlaying(track)
  void audio.load(file, true)
}

// ── Wiring ───────────────────────────────────────────────────────────────────
//
// Done once at module load rather than in a component effect. The audio element
// and the Media Session outlive every screen — a Now Playing view unmounting
// when the window narrows to T6 must not take the media keys with it.

audio.subscribe((state) => {
  usePlayerStore.setState({
    playing: state.playing,
    loading: state.loading,
    currentSec: state.currentSec,
    durationSec: state.durationSec,
  })
  ms.setPlaybackState(state.playing)
  ms.setPosition(state.currentSec, state.durationSec)
})

audio.setCallbacks({
  onEnded() {
    const store = usePlayerStore.getState()
    if (store.repeat === 'one') {
      audio.seek(0)
      void audio.play()
      return
    }
    advance(usePlayerStore.setState, usePlayerStore.getState, 1)
  },
  onDuration(seconds) {
    // Durations are not in the tags — they are learnt here, the first time a
    // track plays, and written back so the album's total time fills in over
    // time instead of never. See the note on `Track.durationSec`.
    const track = currentTrack(usePlayerStore.getState())
    if (!track || track.durationSec) return
    void db.setDuration(track.id, seconds)
    useLibraryStore.setState({
      tracks: useLibraryStore.getState().tracks.map((t) =>
        t.id === track.id ? { ...t, durationSec: seconds } : t,
      ),
    })
  },
  onError(message) {
    usePlayerStore.setState({ error: message })
  },
})

ms.setHandlers({
  onPlay: () => void audio.play(),
  onPause: () => audio.pause(),
  onStop: () => usePlayerStore.getState().clearQueue(),
  onNext: () => usePlayerStore.getState().next(),
  onPrevious: () => usePlayerStore.getState().previous(),
  onSeekTo: (seconds) => usePlayerStore.getState().seekTo(seconds),
  onSeekBy: (offset) => usePlayerStore.getState().seekBy(offset),
})

// Apply the stored volume to the element the first time anything touches it.
audio.setVolume(usePlayerStore.getState().volume)
