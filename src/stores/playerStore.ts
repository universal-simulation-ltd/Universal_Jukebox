import { create } from 'zustand'
import { coverUrl } from '../lib/art'
import { playNeedleDrop } from '../lib/crackle'
import * as audio from '../lib/audio'
import * as db from '../lib/library'
import * as ms from '../lib/mediaSession'
import { shuffled } from '../lib/audio'
import type { Track } from '../lib/types'
import { useLibraryStore } from './libraryStore'
import { settings } from './settingsStore'
import { shouldRunCeremony } from '../lib/ceremony'
import { navigate } from '../lib/route'

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
  /**
   * True while the arm is off the record between two tracks.
   *
   * ⚠️ Read by `followPlayback`, which otherwise puts the arm straight back
   * down: the outgoing track is still playing as the arm lifts, and "playing"
   * is what that function normally takes as proof the arm belongs on the
   * record. The ceremony has exactly the same exemption, for the same reason.
   */
  handover: boolean
  /** The track being previewed, or null. Never the same thing as `playing`. */
  previewTrackId: string | null
  /** The album the last ceremony was run for, so the same record doesn't repeat it. */
  lastCeremonyAlbumId: string | null
  /** When the last ceremony started, for the cooldown. Epoch ms. */
  lastCeremonyAt: number

  playTracks(tracks: Track[], startAt?: number): void
  toggle(): void
  next(): void
  previous(): void
  /**
   * Play the track at this position in `order` — NOT in `queue`.
   *
   * The distinction is the whole reason this takes the index it does: with
   * shuffle on, `queue[3]` and `order[3]` are different tracks, and every list
   * that shows what is coming up walks `order`. Out-of-range indices and the
   * currently-playing one are both no-ops rather than errors.
   */
  jumpTo(orderIndex: number): void
  seekTo(seconds: number): void
  seekBy(offset: number): void
  setVolume(v: number): void
  toggleMute(): void
  toggleShuffle(): void
  cycleRepeat(): void
  /** Any click, key, or second press of play cuts straight to the audio. */
  skipCeremony(): void
  /**
   * Ten seconds of a track from ten seconds in — the ONE way to hear something
   * without putting the record on. Pressing it again stops it.
   */
  preview(track: Track): void
  stopPreview(): void
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
  // Nothing has played yet, so the arm is parked — not resting on a record
  // that is not turning.
  armDown: false,
  handover: false,
  previewTrackId: null,
  lastCeremonyAlbumId: null,
  lastCeremonyAt: 0,

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
    get().stopPreview()
    showTheDeck()
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

  jumpTo(orderIndex) {
    const { order, cursor } = get()
    if (orderIndex < 0 || orderIndex >= order.length) return
    // Tapping the track that is already playing is not a request to restart it —
    // it is a mis-tap, and re-cueing the needle on it would be a surprise.
    if (orderIndex === cursor) return
    // A jump is a play, and two records at once is not a preview.
    get().stopPreview()
    playAt(set, get, orderIndex)
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
    audio.setPreviewVolume(get().muted ? 0 : volume)
    try { localStorage.setItem(VOLUME_KEY, String(volume)) } catch { /* ignore */ }
    set({ volume })
  },

  toggleMute() {
    const muted = !get().muted
    audio.setMuted(muted)
    audio.setPreviewVolume(muted ? 0 : get().volume)
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

  skipCeremony() {
    if (!get().ceremony) return
    clearCeremony()
    set({ ceremony: false, ceremonyDone: true, ceremonyCount: null, armDown: true })
    void audio.play()
  },

  /**
   * Preview a track: ten seconds, from ten seconds in, with the scratch.
   *
   * ⚠️ THE ONE PLAY THAT DOES NOT GO TO THE DECK. Everything else — a track
   * row, an album, a search result — navigates to Now Playing and cues the arm
   * (James, 2026-09-08). This is the exception that makes that bearable: a way
   * to answer "is this the one I mean?" from the library, without a queue, a
   * ceremony or a change of screen.
   *
   * It runs on its own element (see `lib/audio.ts`), so the queue survives it.
   * What it does NOT do is play over the top of the music: whatever is playing
   * is paused first, because two records at once is not a preview.
   */
  preview(track) {
    if (get().previewTrackId === track.id) {
      get().stopPreview()
      return
    }
    const file = useLibraryStore.getState().fileFor(track)
    if (!file) {
      set({ error: 'That file isn’t reachable any more. If the folder moved or the drive was unplugged, choose the folder again.' })
      return
    }
    audio.pause()
    audio.stopPreview()
    set({ previewTrackId: track.id, error: null })
    audio.startPreview(file, get().muted ? 0 : get().volume)
    // The scratch rides along, because the needle is landing on something —
    // it is just not landing on the deck you can see.
    if (settings().needleDrop) playNeedleDrop(get().volume)
  },

  stopPreview() {
    audio.stopPreview()
    if (get().previewTrackId !== null) set({ previewTrackId: null })
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
    set({ previewTrackId: null })
    publishNowPlaying(null)
    set({ queue: [], order: [], cursor: -1, playing: false, currentSec: 0, durationSec: 0 })
  },

  dismissError() {
    set({ error: null })
  },
}))

/**
 * Send the user to Now Playing when they start something.
 *
 * ⚠️ Done HERE rather than in each button, and that is deliberate: `playTracks`
 * is the single funnel for "the user explicitly started this", which is already
 * what decides whether the ceremony runs. Two rules keyed off the same moment
 * belong in the same place — the alternative is four call sites that each have
 * to remember, and forgetting is invisible.
 *
 * It also fixes something that was quietly broken: the ceremony only renders on
 * Now Playing, so pressing play from an ALBUM ran the whole animation on a
 * screen that cannot show it. The deck the app is built around was reachable
 * only by knowing to go and look.
 *
 * ⚠️ Except at the narrowest tier, where Now Playing is deliberately not a
 * screen at all (the player bar IS the app — see `useMiniMode` in App.tsx).
 * Navigating there would land on the "the player is at the bottom" note, which
 * is a worse answer than staying where you are.
 */
function showTheDeck(): void {
  try {
    if (window.matchMedia('(max-width: 429px)').matches) return
  } catch { /* no matchMedia — assume a real screen */ }
  navigate({ view: 'playing' })
}

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

/**
 * The needle handover between two tracks (§ James, 2026-09-08).
 *
 * "Progressively move the needle out as the track progresses, then at the end
 * remove the needle and place it at the start position again — fade the tracks
 * into each other and have the scratch on top as the needle lands."
 *
 * The travel is drawn by `Deck.tsx` off `currentSec / durationSec`. These three
 * numbers are the change-over itself:
 *
 *   LIFT_MS       the arm is off the record and going back to the outer groove
 *   FADE_OUT_SEC  what is still playing sinks away while it does
 *   FADE_IN_SEC   the next track rises under the scratch as the arm lands
 *
 * ⚠️ LIFT_MS IS A REAL GAP BETWEEN EVERY PAIR OF TRACKS, and it is the number
 * to change if it turns out to be too much. It is the price of the arm actually
 * going back to the start rather than teleporting; the alternative is a needle
 * that jumps, which is the thing the request is about. It is skipped entirely
 * when the animation is off or under `prefers-reduced-motion`, so anyone who
 * finds it a toll booth has a one-click way out that also matches the rest of
 * the app's behaviour.
 *
 * ⚠️ This is NOT a crossfade, and cannot be: one `<audio>` element decodes one
 * file (see the note at the top of `lib/audio.ts`). The two tracks do not
 * overlap — but neither of them ends or begins at full volume, and the scratch
 * covers the seam, which is what the request is actually asking to hear.
 */
const HANDOVER = { LIFT_MS: 420, FADE_OUT_SEC: 0.32, FADE_IN_SEC: 0.55 }

let ceremonyTimers: number[] = []
let handoverTimer: number | null = null

function clearCeremony(): void {
  for (const t of ceremonyTimers) clearTimeout(t)
  ceremonyTimers = []
}

function clearHandover(): void {
  if (handoverTimer !== null) {
    clearTimeout(handoverTimer)
    handoverTimer = null
  }
}

/**
 * Whether the tonearm animates at all.
 *
 * The needle handover is part of the same picture as the ceremony, so it obeys
 * the same two switches: "Never" in Settings, and `prefers-reduced-motion`. A
 * user who turned the animation off asked for music that starts immediately,
 * and would not thank us for a 420ms pause between every track in the name of
 * an arm they cannot see move.
 */
function armAnimates(): boolean {
  return settings().ceremonyMode !== 'off' && !prefersReducedMotion()
}

/**
 * Take the needle off, put it back at the start, and land it on the next thing.
 *
 * `land` is what actually starts the audio — a new file, or the same one from
 * the top for `repeat: 'one'`. It runs after the lift so the sound and the
 * picture agree; without the wait the music would start with the arm still in
 * the air, which is the bug this whole sequence exists to avoid.
 */
function needleChange(
  set: Set,
  get: Get,
  land: (fadeInSec: number | undefined) => void,
  duckFirst: boolean,
): void {
  clearHandover()
  // ⚠️ `undefined`, not `HANDOVER.FADE_IN_SEC`, and the difference is audible:
  // with the animation off the setting promises music that "starts
  // immediately, every time", so the handover's own half-second rise has to go
  // with the rest of it. The user's OWN fade-in, from Settings, still applies —
  // `audio.load` falls back to it when no override is given.
  if (!armAnimates()) {
    land(undefined)
    return
  }
  set({ armDown: false, handover: true })
  if (duckFirst) audio.duck(HANDOVER.FADE_OUT_SEC)
  handoverTimer = setTimeout(() => {
    handoverTimer = null
    set({ armDown: true, handover: false })
    if (settings().needleDrop) playNeedleDrop(get().volume)
    land(HANDOVER.FADE_IN_SEC)
  }, HANDOVER.LIFT_MS) as unknown as number
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
  clearHandover()
  if (get().handover) set({ handover: false })

  const { ceremonyDone, lastCeremonyAlbumId, lastCeremonyAt } = get()
  const run = shouldRunCeremony({
    mode: settings().ceremonyMode,
    reducedMotion: prefersReducedMotion(),
    ceremonyDone,
    lastAlbumId: lastCeremonyAlbumId,
    lastAt: lastCeremonyAt,
    albumId: track.albumId,
    now: Date.now(),
  })

  if (!run) {
    set({ ceremony: false, ceremonyDone: true, ceremonyCount: null, armDown: true })
    void audio.load(file, true)
    return
  }

  set({
    ceremony: true,
    ceremonyCount: 3,
    armDown: false,
    // Recorded when the ceremony STARTS, not when it finishes. Both are read by
    // the cooldown, and starting is the moment the user actually experienced.
    lastCeremonyAlbumId: track.albumId,
    lastCeremonyAt: Date.now(),
  })
  void audio.load(file, false)

  const at = (ms: number, fn: () => void) => {
    ceremonyTimers.push(setTimeout(fn, ms) as unknown as number)
  }
  at(BEATS.two, () => set({ ceremonyCount: 2 }))
  at(BEATS.one, () => set({ ceremonyCount: 1 }))
  at(BEATS.land, () => {
    set({ armDown: true })
    if (settings().needleDrop) playNeedleDrop(get().volume)
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
function advance(set: Set, get: Get, delta: number, naturalEnd = false) {
  const { order, cursor, repeat } = get()
  if (order.length === 0) return
  let nextCursor = cursor + delta

  if (nextCursor >= order.length) {
    if (repeat === 'off') {
      // The end of the queue. Stop rather than wrapping silently — and take the
      // needle off, since nothing is going to follow it.
      clearHandover()
      audio.pause()
      audio.seek(0)
      set({ playing: false, handover: false })
      return
    }
    nextCursor = 0
  } else if (nextCursor < 0) {
    nextCursor = repeat === 'off' ? 0 : order.length - 1
  }

  playAt(set, get, nextCursor, naturalEnd)
}

/**
 * Put the cursor at an absolute position in `order` and play what is there.
 *
 * Split out of `advance` when the queue became clickable. Everything below the
 * cursor move is the same whether the target came from `cursor + 1` or from a
 * row somebody tapped in "Up next" — the file lookup and its error, the Media
 * Session update, the needle change and its fade. What `advance` keeps is the
 * only part that differs: working out WHERE to go, which is the only part that
 * knows about repeat and about running off the end.
 *
 * ⚠️ The cursor moves BEFORE the file is checked, and that is deliberate — it
 * is the behaviour `advance` has always had. A track whose file has gone still
 * becomes the current one, so the error names the track the user chose rather
 * than leaving them on the previous one with a message about a different song.
 */
function playAt(set: Set, get: Get, nextCursor: number, naturalEnd = false) {
  const { order } = get()
  set({ cursor: nextCursor })
  const track = get().queue[order[nextCursor]]
  const file = track ? useLibraryStore.getState().fileFor(track) : null
  if (!file) {
    set({ error: 'That file isn’t reachable any more. Choose the folder again to restore playback.' })
    return
  }
  publishNowPlaying(track)
  // ⚠️ `naturalEnd` means the outgoing track has ALREADY finished, so there is
  // nothing left to fade out — ducking silence would only delay the next one.
  needleChange(set, get, (fadeIn) => {
    void audio.load(file, true, fadeIn)
  }, !naturalEnd)
}

// ── Wiring ───────────────────────────────────────────────────────────────────
//
// Done once at module load rather than in a component effect. The audio element
// and the Media Session outlive every screen — a Now Playing view unmounting
// when the window narrows to T6 must not take the media keys with it.

/**
 * The tonearm follows playback: down while a record is playing, lifted the
 * moment it stops.
 *
 * ⚠️ The LIFT is delayed and the drop is not, and that asymmetry is the whole
 * trick. Every track change pauses the element for a fraction of a second
 * before the next one starts, so an immediate lift makes the arm flick up and
 * back down between every pair of tracks — a twitch, on the one screen meant to
 * be pleasant to leave open. A quarter of a second is longer than any gap
 * between tracks and far shorter than anyone's pause.
 *
 * Derived from the audio element rather than from the pause BUTTON, so it is
 * right however playback stopped: the media keys, the lock screen, the end of
 * the queue, or a file that failed.
 */
const ARM_LIFT_DELAY_MS = 250
let armLiftTimer: number | null = null

function followPlayback(playing: boolean): void {
  const store = usePlayerStore.getState()
  // While the ceremony is running it owns the arm — it is mid-swing, and
  // playback is deliberately not started until the arm has landed.
  //
  // ⚠️ And the same during a needle handover, where the OUTGOING track is
  // still playing as the arm comes off the record. Without this the very next
  // `timeupdate` would put the arm straight back down and the lift would never
  // be seen — a bug whose only symptom is an animation that does not happen.
  if (store.ceremony || store.handover) return

  if (playing) {
    if (armLiftTimer !== null) {
      clearTimeout(armLiftTimer)
      armLiftTimer = null
    }
    if (!store.armDown) usePlayerStore.setState({ armDown: true })
    return
  }

  if (armLiftTimer !== null) return
  armLiftTimer = setTimeout(() => {
    armLiftTimer = null
    const now = usePlayerStore.getState()
    if (!now.playing && !now.ceremony && !now.handover) usePlayerStore.setState({ armDown: false })
  }, ARM_LIFT_DELAY_MS) as unknown as number
}

audio.subscribe((state) => {
  usePlayerStore.setState({
    playing: state.playing,
    loading: state.loading,
    currentSec: state.currentSec,
    durationSec: state.durationSec,
  })
  followPlayback(state.playing)
  ms.setPlaybackState(state.playing)
  ms.setPosition(state.currentSec, state.durationSec)
})

audio.setCallbacks({
  onEnded() {
    const store = usePlayerStore.getState()
    if (store.repeat === 'one') {
      // Even the same record gets the needle put back at the start — that is
      // literally what repeat-one is.
      needleChange(
        usePlayerStore.setState,
        usePlayerStore.getState,
        (fadeIn) => { void audio.restart(fadeIn) },
        false,
      )
      return
    }
    advance(usePlayerStore.setState, usePlayerStore.getState, 1, true)
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

// A preview that ran its ten seconds puts its own button back to rest. Wired
// here rather than in the component, because the component that started it may
// well have been scrolled away or unmounted by the time it finishes.
audio.setPreviewStoppedCallback(() => {
  if (usePlayerStore.getState().previewTrackId !== null) {
    usePlayerStore.setState({ previewTrackId: null })
  }
})

// Apply the stored volume to the element the first time anything touches it.
audio.setVolume(usePlayerStore.getState().volume)
