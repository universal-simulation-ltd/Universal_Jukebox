import { create } from 'zustand'
import { isMiniMode } from '../lib/miniMode'
import type { SourceFile } from '../lib/types'
import { coverUrl, fallbackHue } from '../lib/art'
import { followMusic, playCountTick, playTransportCue, setCueOutput } from '../lib/crackle'
import { isNativeShell } from '../lib/nativeFile'
import { resolveDeck } from '../lib/decks'
import * as audio from '../lib/audio'
import * as db from '../lib/library'
import * as ms from '../lib/mediaSession'
import { cachedGain, measureGain } from '../lib/loudness'
import { lockArt } from '../lib/lockArt'
import { clearLockScreen, followProgress, showOnLockScreen } from '../lib/nowPlayingNative'
import { shuffled } from '../lib/audio'
import type { Track } from '../lib/types'
import { sortAlbumTracks, useLibraryStore } from './libraryStore'
import { newSeed, shuffleQueue, type ShuffleKind } from '../lib/libraryView'
import { settings, useSettingsStore } from './settingsStore'
import { shouldRunCeremony } from '../lib/ceremony'
import { artistKey, changeBetween, planHandover, type Handover } from '../lib/transition'
import { navigate } from '../lib/route'

// Playback: the queue, what is on, and the transport.
//
// The queue is a list of TRACKS plus an ORDER — a list of indices into it. That
// indirection is what makes shuffle honest: shuffling permutes the order and
// leaves the queue alone, so turning shuffle off restores the real running
// order of the album rather than a re-sorted approximation of it, and "next"
// means the same thing to the UI in both modes.

export type Repeat = 'off' | 'all' | 'one'

/**
 * What the deck itself is doing, as opposed to what the pickup is doing.
 *
 * - `arriving` — the medium is coming in from above and fading up into place.
 * - `leaving`  — it is lifting away and fading out, because a DIFFERENT record
 *                is about to go on.
 * - `idle`     — it is simply there.
 *
 * ⚠️ Read by `Deck.tsx`, which animates the whole face as one block. That is
 * what lets the cover swap happen while the picture is invisible: the old
 * record fades out, the album underneath changes, the new one fades in — with
 * no face needing to know anything about it, and no cross-dissolve between two
 * covers to build three times over.
 */
export type DeckPhase = 'idle' | 'arriving' | 'leaving'

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
   * The track whose file could not be found when `error` was raised, or null
   * when the error is about something else.
   *
   * ⚠️ The TRACK, not a reason. Why it was missing — a deleted file, or a
   * folder whose permission lapsed — is read live from the library by
   * `useMissingFile`, so the error can change its mind the moment the folder
   * comes back. Cleared everywhere `error` is.
   */
  missingTrack: Track | null
  /**
   * Tracks skipped because they could not be played — gone from the Music
   * library, a file moved — for "N tracks couldn't play" (`SkippedBanner`).
   */
  skipped: SkippedTrack[]

  /**
   * The first-play ceremony (§22.9 of next-products.md): the platter spins up,
   * the arm comes down, 2·1 counts beside the deck, and the track starts.
   *
   * ⚠️ ONCE PER SESSION, on the FIRST play only. A ceremony before
   * every track is an app you close. `ceremonyDone` is deliberately NOT
   * persisted — it resets with the tab, because the ceremony is an arrival and
   * arriving happens once per visit, not once ever.
   */
  ceremony: boolean
  ceremonyDone: boolean
  /** 2, 1 — or null when no countdown is running. */
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
  /** What the deck is doing: arriving, leaving, or simply sitting there. */
  deckPhase: DeckPhase
  /** The album the last ceremony was run for, so the same record doesn't repeat it. */
  lastCeremonyAlbumId: string | null
  /** Its artist, folded, for `ceremonyMode: 'artist'`. */
  lastCeremonyArtist: string | null
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
  /** Clear "N tracks couldn't play". */
  dismissSkipped(): void
  /** The Home Screen shortcuts — see `shuffleQueue`. */
  shuffleSongs(): void
  shuffleAlbums(): void
  shuffleArtists(): void
  /**
   * Try the missing track again, once its folder is back. The one thing the
   * transport cannot do for itself here: `unreachable` stopped and emptied the
   * player, so the play button has nothing loaded to resume.
   */
  replayMissing(): void
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
  missingTrack: null,
  skipped: [],
  ceremony: false,
  ceremonyDone: false,
  ceremonyCount: null,
  // Nothing has played yet, so the arm is parked — not resting on a record
  // that is not turning.
  armDown: false,
  handover: false,
  previewTrackId: null,
  deckPhase: 'idle',
  lastCeremonyAlbumId: null,
  lastCeremonyArtist: null,
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

    set({ queue: tracks, order, cursor, error: null, missingTrack: null })
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
    if (playing) audio.pause('button')
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
    // ⚠️ `deckPhase: 'idle'` too. Skipping cuts the countdown short, and a
    // record left mid-arrival — half faded in, floating above the deck — is the
    // one state the animation must never be able to stick in.
    set({ ceremony: false, ceremonyDone: true, ceremonyCount: null, armDown: true, deckPhase: 'idle' })
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
    if (whenPlayable(set, track, () => get().preview(track))) return
    const file = useLibraryStore.getState().fileFor(track)
    if (!file) {
      set({
        error: 'That file isn’t reachable any more. If the folder moved or the drive was unplugged, choose the folder again.',
        missingTrack: track,
      })
      return
    }
    audio.pause('preview')
    audio.stopPreview()
    set({ previewTrackId: track.id, error: null, missingTrack: null })
    audio.startPreview(file, get().muted ? 0 : get().volume)
    // The scratch rides along, because the needle is landing on something —
    // it is just not landing on the deck you can see.
    needleDrop(get().volume)
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
    set({ queue: [], order: [], cursor: -1, playing: false, currentSec: 0, durationSec: 0, deckPhase: 'idle' })
  },

  dismissError() {
    set({ error: null, missingTrack: null })
  },

  dismissSkipped() {
    set({ skipped: [] })
  },

  shuffleSongs() {
    startShuffle(get, 'songs')
  },
  shuffleAlbums() {
    startShuffle(get, 'albums')
  },
  shuffleArtists() {
    startShuffle(get, 'artists')
  },

  replayMissing() {
    const track = get().missingTrack
    if (!track) return
    set({ error: null, missingTrack: null })
    // The cursor is already ON the missing track — `playAt` moves it before it
    // looks for the file — so this is that track going on, not a new queue.
    // A missing PREVIEW is the one exception, and gets its preview back.
    if (currentTrack(get())?.id === track.id) {
      showTheDeck()
      startCeremonyOrPlay(set, get, track)
    } else {
      get().preview(track)
    }
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
 *
 * ⚠️ EXPORTED, for the one caller that wants the navigation WITHOUT the play:
 * the album cover, when the record it would put on is already turning. That
 * caller has to make the same narrow-screen exception, and a second copy of the
 * media query is exactly the kind of rule that gets fixed in one place and not
 * the other.
 */
export function showTheDeck(): void {
  try {
    // ⚠️ The SHARED rule, not a width of its own — see `lib/miniMode.ts` for
    // what a second copy of it did to phones.
    if (isMiniMode()) return
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
  // A track that goes on ends a run of skips — see `skipPast`.
  if (track) consecutiveSkips = 0
  // …and gets its "Stable volume" level before it is loaded.
  if (track && track.id !== levelledFor) {
    levelledFor = track.id
    levelTrack(track)
  }
  if (!track) {
    ms.setMetadata(null, null)
    void clearLockScreen()
    return
  }
  const album = useLibraryStore.getState().albums.find((a) => a.id === track.albumId)
  const cover = album ? coverUrl(album.id, album.cover) : null
  ms.setMetadata(track, cover)
  // Then the cover ON the machine playing it (`lib/lockArt.ts`), a frame or
  // two later — and, in the iPhone app on iOS 26, that record turning.
  const { deck, deckEras } = settings()
  const id = album?.id ?? track.albumId
  void lockArt({ albumId: id, cover, hue: fallbackHue(id), style: resolveDeck(deck, album ?? track, deckEras) }).then(
    (art) => {
      if (!art || currentTrack(usePlayerStore.getState())?.id !== track.id) return
      ms.setMetadata(track, art.stillUrl, 'image/png')
      void showOnLockScreen(track, art, () => {
        const { currentSec, durationSec, playing } = usePlayerStore.getState()
        return { elapsed: currentSec, duration: durationSec, playing }
      })
    },
  )
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
//
// ⚠️ TWO, ONE — NOT THREE, TWO, ONE (James, 2026-09-10: "Instead of 3,2,1 do
// just 2,1"). The first 780ms beat is simply gone and everything after it moved
// up by the same amount, so the spacing people had got used to is unchanged:
// a numeral every 780ms (Deck's `jb-count` animation is that long), the needle
// 270ms after the last one, the sound 510ms after the needle. The record's
// arrival (`jb-deck-in`, 700ms) still lands before the needle does.
const BEATS = { one: 780, land: 1050, start: 1560 }

/**
 * The change-over between two tracks (§ James, 2026-09-08 and 2026-09-09).
 *
 * There are now TWO of them, because he asked for two:
 *
 *   same album      "crossfade the tracks and have the needle move into the
 *                    start position as it's beginning with the player noise"
 *   different album "fade out, fade in, have an animation of one record lifting
 *   or artist        out and fading away with the new one fading in and the
 *                    needle resetting"
 *
 * Which one runs is decided by `lib/transition.ts`, and nothing here decides it.
 *
 * ── The blend (same album) ──────────────────────────────────────────────────
 *
 * A REAL crossfade, as of 2026-09-09: the two tracks genuinely overlap on two
 * `<audio>` elements (see the top of `lib/audio.ts`). It used to be impossible
 * — one element decodes one file — and the backlog said so for a while.
 *
 * `SEC` is also the LEAD: the change-over starts that many seconds before the
 * outgoing track ends, because a crossfade cannot begin at `ended`. `MANUAL_SEC`
 * is shorter, because a crossfade you asked for by pressing Next should not
 * leave the old track audible for two more seconds.
 *
 * ── The record change (different album or artist) ───────────────────────────
 *
 * Not a blend, on purpose: the request is "fade out, fade in", which is a
 * sequence. `LIFT_MS` is a real silence between the two records, and it is the
 * number to change if it turns out to be too much — it is the price of the arm
 * genuinely going back rather than teleporting, and of the record on the deck
 * being seen to change. `SWAP_IN_MS` is how long the new record takes to settle
 * once it is on.
 */
const CROSSFADE = { SEC: 1.8, MANUAL_SEC: 0.9 }
const HANDOVER = { LIFT_MS: 420, SWAP_IN_MS: 620, FADE_OUT_SEC: 0.32, FADE_IN_SEC: 0.55 }
/**
 * How long the pickup takes to get back to the start during a crossfade.
 *
 * Shorter than `LIFT_MS`, and it has to be: nothing is waiting for it. The
 * music has already begun — that is what a crossfade IS — so this is the arm
 * catching up with the sound rather than the sound waiting for the arm.
 */
const NEEDLE_RETURN_MS = 380

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
 * Run the change-over between two tracks, then start the new one.
 *
 * `land` is what actually starts the audio, and it is handed the fade-in the
 * change-over wants — a new file, or the same one from the top for
 * `repeat: 'one'`. Which of the three shapes below runs is `plan`'s decision,
 * made in `lib/transition.ts`, and this function makes none of its own.
 *
 *   a cut       nothing animates: `land` immediately, with no fade of ours.
 *   a blend     the tracks overlap, the pickup goes back while they do.
 *   a change    the record lifts off, a silence, then the new one lands.
 *
 * ⚠️ `land` is NOT called for a blend. A crossfade has to load the incoming
 * file into the OTHER element while this one is still playing, which is a
 * different call (`audio.crossfade`) rather than a differently-timed version of
 * the same one — so a blend passes `crossfadeFile` instead and `land` is left
 * for the two paths that really do replace what is on the deck.
 */
function runHandover(
  set: Set,
  get: Get,
  plan: Handover,
  land: (fadeInSec: number | undefined) => void,
  options: { duckFirst: boolean; crossfadeFile?: SourceFile | null; crossfadeSec?: number },
): void {
  clearHandover()

  // The blend. Both tracks are audible for a moment; the pickup catches up.
  if (plan.crossfade && options.crossfadeFile) {
    const seconds = options.crossfadeSec ?? CROSSFADE.MANUAL_SEC
    if (plan.needle) {
      set({ armDown: false, handover: true })
      handoverTimer = setTimeout(() => {
        handoverTimer = null
        set({ armDown: true, handover: false })
        if (plan.cue) needleDrop(get().volume)
      }, NEEDLE_RETURN_MS) as unknown as number
    }
    void audio.crossfade(options.crossfadeFile, seconds)
    return
  }

  // ⚠️ `undefined`, not `HANDOVER.FADE_IN_SEC`, and the difference is audible:
  // with the animation off the setting promises music that "starts
  // immediately, every time", so the change-over's own half-second rise has to
  // go with the rest of it. The user's OWN fade-in, from Settings, still
  // applies — `audio.load` falls back to it when no override is given.
  if (!plan.needle) {
    land(undefined)
    return
  }

  // The record change: off, a gap, on. `deckPhase` is what makes the picture
  // agree with it — see `DeckPhase`.
  set({ armDown: false, handover: true, deckPhase: plan.swap ? 'leaving' : get().deckPhase })
  if (options.duckFirst) audio.duck(HANDOVER.FADE_OUT_SEC)
  handoverTimer = setTimeout(() => {
    handoverTimer = null
    set({ armDown: true, handover: false, deckPhase: plan.swap ? 'arriving' : get().deckPhase })
    if (plan.cue) needleDrop(get().volume)
    land(HANDOVER.FADE_IN_SEC)
    if (plan.swap) {
      handoverTimer = setTimeout(() => {
        handoverTimer = null
        set({ deckPhase: 'idle' })
      }, HANDOVER.SWAP_IN_MS) as unknown as number
    }
  }, HANDOVER.LIFT_MS) as unknown as number
}

/**
 * What the animation setting says about a change from `from` to `to`.
 *
 * One line, but it is the line every caller has to get right, so it is here
 * rather than repeated at each of them.
 */
function handoverFor(from: Track | null, to: Track): Handover {
  return planHandover({
    mode: settings().ceremonyMode,
    reducedMotion: prefersReducedMotion(),
    change: changeBetween(from, to),
  })
}

/**
 * The start-up sound, with all three of its settings applied in one place.
 *
 * ⚠️ Three callers — the ceremony's landing, the handover between tracks, and a
 * preview — and they must not each remember to check the toggle AND pass the
 * level AND look up which deck is showing. The version of this that was inlined
 * at all three sites is exactly how a fourth caller would ship with the effect
 * stuck at full whatever the slider said — and, now, with a cassette on screen
 * making the noise of a needle.
 */
/**
 * The countdown's tick, on each numeral. Part of the start-up sound, so it
 * obeys the same switch and the same level as the needle drop that follows it —
 * somebody who turned that off did not want the countdown clicking either.
 */
function countTick(downbeat: boolean): void {
  const { needleDrop: on, needleDropLevel } = settings()
  if (!on) return
  playCountTick(usePlayerStore.getState().volume, needleDropLevel, downbeat)
}

function needleDrop(volume: number): void {
  const { needleDrop: on, needleDropLevel, deck, deckEras } = settings()
  if (!on) return
  // ⚠️ The CURSOR is read here rather than passed in, and all four callers are
  // better for it. Under `deck: 'automatic'` the cue has to be the one belonging
  // to the machine currently on screen — `Deck.tsx` resolves the same setting
  // against the same cursor — and every call site is inside a timer that fires
  // after the cursor has already moved. Passing it as an argument would give
  // four chances to pass the OLD one, and a cassette clunk over a spinning
  // record is exactly the kind of wrongness nobody can quite name.
  //
  // The preview is the one caller with no queue position of its own, and it
  // wants this answer too: it is a needle landing on something that is not the
  // deck you can see, so it sounds like the deck you can see.
  const track = currentTrack(usePlayerStore.getState())
  const album = track ? useLibraryStore.getState().albums.find((a) => a.id === track.albumId) : undefined
  playTransportCue(resolveDeck(deck, album ?? track, deckEras), volume, needleDropLevel)
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

/**
 * The track the user just chose has no file behind it any more. Say so — and
 * STOP.
 *
 * ⚠️ THE STOPPING IS THE POINT (James, 2026-09-09: "it showed the track as
 * playing but the sound was from the previous selection"). Both call sites move
 * the cursor BEFORE they check the file, deliberately, so the message names the
 * track that was asked for rather than the one before it — and then each of
 * them used to set `error` and return, touching nothing else. The previous
 * track's element was never told: the title changed, the bars beside it kept
 * animating, the scrub bar kept moving, and a completely different song went on
 * playing underneath an error message saying it could not be played. That reads
 * as a bug in the MESSAGE rather than as a missing file, which is the one
 * reading that leaves nobody able to fix it.
 *
 * So the whole transport comes down: the change-over and ceremony timers that
 * would otherwise fire into the wreckage, the sound itself, and the OS card,
 * which would otherwise still be offering play/pause for a track that is not on.
 * `audio.stop()` also releases the file, which is right — nothing is cued.
 */
function unreachable(set: Set, track: Track | undefined, message: string): void {
  clearCeremony()
  clearHandover()
  audio.stop()
  publishNowPlaying(null)
  set({
    error: message,
    // What lets the error say WHICH folder, and why — see `useMissingFile`.
    // `message` remains the fallback for a track no folder claims.
    missingTrack: track ?? null,
    ceremony: false,
    ceremonyCount: null,
    handover: false,
    armDown: false,
    deckPhase: 'idle',
    // `audio.stop()` silences a preview too, so the button that started one
    // must not be left saying "stop" over nothing.
    previewTrackId: null,
  })
}

/**
 * The Home Screen's shuffles (`lib/shortcuts.ts`).
 *
 * ⚠️ Shuffle SONGS leaves the shuffle button ON — the queue is random and the
 * button should say so. ALBUMS and ARTISTS turn it OFF, because their queue has
 * an order that shuffling would destroy: a whole album, then the next.
 */
function startShuffle(get: Get, kind: ShuffleKind): void {
  const { tracks, albums } = useLibraryStore.getState()
  const queue = shuffleQueue(kind, tracks, albums, newSeed(), sortAlbumTracks)
  if (queue.length === 0) return
  const wantShuffle = kind === 'songs'
  if (get().shuffle !== wantShuffle) get().toggleShuffle()
  get().playTracks(queue, 0)
}

/**
 * "Stable volume" (`lib/loudness.ts`): the level for a track about to go on.
 *
 * Called from `publishNowPlaying`, which runs just BEFORE every load and
 * crossfade — so a level already measured goes to `setNextLevel` and the track
 * starts at it. One not yet measured starts at full level and comes down when
 * the measurement lands, if that track is still the one playing. The next track
 * is measured ahead of time (`prefetchNext`), so that is mostly the first song.
 */
let levelledFor: string | null = null

function levelTrack(track: Track): void {
  if (!settings().stableVolume) {
    audio.setNextLevel(1)
    return
  }
  const cached = cachedGain(track.id)
  audio.setNextLevel(cached ?? 1)
  if (cached === null) levelLater(track)
}

function levelLater(track: Track): void {
  const file = useLibraryStore.getState().fileFor(track)
  if (!file) return
  void measureGain(track.id, file).then((gain) => {
    if (gain === null || !settings().stableVolume) return
    if (currentTrack(usePlayerStore.getState())?.id === track.id) audio.setLevel(gain)
  })
}

export interface SkippedTrack {
  id: string
  title: string
  artist?: string
  reason: string
}

/**
 * Skip a track that cannot be played, and note it for `SkippedBanner`.
 *
 * ⚠️ THE MUSIC NO LONGER STOPS FOR ONE MISSING TRACK (James, 2026-09-11: "The
 * playing stops and breaks the lock play when a track is no longer in library.
 * It should skip to next"). It used to stop the deck and clear the lock screen
 * — with the phone in a pocket, silence and no way to know why.
 *
 * ⚠️ But not for ever: `MAX_SKIPS` misses IN A ROW means something bigger — a
 * folder whose permission lapsed, a library that is gone — and skipping would
 * race through the whole queue saying nothing useful. Then it returns false
 * and the caller stops with the usual error, which knows how to explain a
 * folder and offer its button. A track that plays resets the count.
 */
const MAX_SKIPS = 8
let consecutiveSkips = 0

function skipPast(track: Track, reason: string): boolean {
  const get = usePlayerStore.getState
  const set = usePlayerStore.setState
  if (get().order.length < 2) return false
  consecutiveSkips++
  if (consecutiveSkips > Math.min(MAX_SKIPS, get().order.length - 1)) {
    consecutiveSkips = 0
    return false
  }
  set({
    skipped: [...get().skipped, { id: track.id, title: track.title, artist: track.artist ?? track.albumArtist, reason }],
    error: null,
    missingTrack: null,
  })
  // `naturalEnd`: the missing track never played, so there is nothing to fade.
  advance(set, get, 1, true)
  return true
}

/**
 * The song's copy is being made — see `whenPlayable`. Bumped by every start,
 * so an export that finishes after the user has moved on starts nothing.
 */
let preparing = 0

const UNPLAYABLE =
  'That song can’t be played — it isn’t on this iPhone any more, or it’s an Apple Music download, which iOS doesn’t let other apps play.'

/**
 * Make sure a track has a file before anything tries to play it.
 *
 * Returns FALSE when it already has one (the caller carries straight on), and
 * TRUE when it has taken over: the file is being made, and `resume` runs once
 * it exists — unless the user has started something else in the meantime.
 *
 * ⚠️ WHY A TRACK CAN HAVE NO FILE YET. Songs from the iPhone's Music library
 * (`lib/appleMusic.ts`) are copied out of it on first play, because WKWebView
 * cannot open the `ipod-library://` URL iOS gives them. That copy takes a
 * moment. Every other track — a folder's, the example library's — answers
 * `needsPreparing` with false and never waits here.
 *
 * ⚠️ The token matters more than it looks. Tap one album, then another before
 * the first song's copy is ready: without it, the first song would start the
 * moment its copy landed — on top of the one the user actually chose.
 */
function whenPlayable(set: Set, track: Track, resume: () => void): boolean {
  const library = useLibraryStore.getState()
  if (!library.needsPreparing(track)) {
    preparing++
    return false
  }
  const token = ++preparing
  void library.prepare(track).then((file) => {
    if (token !== preparing) return
    if (!file) {
      if (!skipPast(track, 'not on this iPhone any more')) unreachable(set, track, UNPLAYABLE)
      return
    }
    resume()
  })
  return true
}

/**
 * Start copying the NEXT track while this one plays, so a change-over — and
 * above all a crossfade, which starts a couple of seconds before the end — does
 * not have to wait for it. A no-op for anything that needs no copy.
 */
function prefetchNext(get: Get): void {
  const { queue, order, cursor, repeat } = get()
  if (order.length < 2) return
  let next = cursor + 1
  if (next >= order.length) {
    if (repeat === 'off') return
    next = 0
  }
  const track = queue[order[next]]
  if (!track) return
  const library = useLibraryStore.getState()
  // Measured ahead too, so "Stable volume" has its level before it starts.
  const measure = (file: SourceFile | null) => {
    if (file && settings().stableVolume && cachedGain(track.id) === null) void measureGain(track.id, file)
  }
  if (library.needsPreparing(track)) void library.prepare(track).then(measure)
  else measure(library.fileFor(track))
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
  if (whenPlayable(set, track, () => startCeremonyOrPlay(set, get, track))) return
  const file = useLibraryStore.getState().fileFor(track)
  if (!file) {
    if (skipPast(track, 'its file is missing')) return
    unreachable(set, track, 'That file isn’t reachable any more. If the folder moved or the drive was unplugged, choose the folder again.')
    return
  }

  publishNowPlaying(track)
  prefetchNext(get)
  clearCeremony()
  clearHandover()
  if (get().handover) set({ handover: false })

  const { ceremonyDone, lastCeremonyAlbumId, lastCeremonyArtist, lastCeremonyAt } = get()
  const run = shouldRunCeremony({
    mode: settings().ceremonyMode,
    reducedMotion: prefersReducedMotion(),
    ceremonyDone,
    lastAlbumId: lastCeremonyAlbumId,
    lastArtist: lastCeremonyArtist,
    lastAt: lastCeremonyAt,
    albumId: track.albumId,
    artist: artistKey(track),
    now: Date.now(),
  })

  if (!run) {
    set({ ceremony: false, ceremonyDone: true, ceremonyCount: null, armDown: true, deckPhase: 'idle' })
    void audio.load(file, true)
    return
  }

  set({
    ceremony: true,
    ceremonyCount: 2,
    armDown: false,
    // ⚠️ The medium comes IN as the countdown runs (James, 2026-09-09: "load the
    // record player with an animation, e.g. the disc fading in from just above
    // the record player into position as the countdown goes"). It is cleared at
    // the landing beat below, not at the end — the record is on the deck before
    // the pickup meets it, which is the order the two things happen in life.
    deckPhase: 'arriving',
    // Recorded when the ceremony STARTS, not when it finishes. Both are read by
    // the cooldown, and starting is the moment the user actually experienced.
    lastCeremonyAlbumId: track.albumId,
    lastCeremonyArtist: artistKey(track),
    lastCeremonyAt: Date.now(),
  })
  void audio.load(file, false)
  countTick(false)

  const at = (ms: number, fn: () => void) => {
    ceremonyTimers.push(setTimeout(fn, ms) as unknown as number)
  }
  at(BEATS.one, () => {
    set({ ceremonyCount: 1 })
    countTick(true)
  })
  at(BEATS.land, () => {
    set({ armDown: true, deckPhase: 'idle' })
    needleDrop(get().volume)
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
      audio.pause('end of queue')
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
  // ⚠️ Read BEFORE the cursor moves. What is leaving the deck is what decides
  // whether this is a blend or a record change, and one line further down it is
  // already gone.
  const from = currentTrack(get())
  set({ cursor: nextCursor })
  const track = get().queue[order[nextCursor]]
  // A Music-library song not played before is copied first. The cursor has
  // already moved (see above), so the screen names the song that is coming.
  if (track && whenPlayable(set, track, () => {
    if (get().cursor === nextCursor) playPrepared(set, get, from, track, naturalEnd)
  })) return
  playPrepared(set, get, from, track, naturalEnd)
}

/**
 * The rest of `playAt`, once the track has a file.
 *
 * ⚠️ `from` is passed IN, not read here: by the time a copy has been made the
 * cursor has long since moved, and `currentTrack` would answer with the track
 * that is arriving — turning every change-over into a "blend" with itself.
 */
function playPrepared(
  set: Set,
  get: Get,
  from: ReturnType<typeof currentTrack>,
  track: Track | undefined,
  naturalEnd: boolean,
) {
  const file = track ? useLibraryStore.getState().fileFor(track) : null
  if (!file || !track) {
    if (track && skipPast(track, 'its file is missing')) return
    unreachable(set, track, 'That file isn’t reachable any more. Choose the folder again to restore playback.')
    return
  }
  publishNowPlaying(track)
  prefetchNext(get)

  const plan = handoverFor(from, track)
  // ⚠️ `naturalEnd` means the outgoing track has ALREADY finished, so there is
  // nothing left to fade out — ducking silence would only delay the next one,
  // and there is nothing left to crossfade WITH either. A blend that reaches
  // here on a natural end is one the early start below could not run (a track
  // whose length the browser never worked out, or a queue that was changed
  // inside the lead), so it degrades to a plain change rather than pretending.
  runHandover(set, get, naturalEnd ? { ...plan, crossfade: false } : plan, (fadeIn) => {
    void audio.load(file, true, fadeIn)
  }, {
    duckFirst: !naturalEnd,
    crossfadeFile: file,
    crossfadeSec: CROSSFADE.MANUAL_SEC,
  })
}

/**
 * Start the change-over EARLY, so the two tracks really overlap.
 *
 * ⚠️ This is the only thing standing between "a crossfade" and "a fade-out
 * followed by a fade-in". By the time `ended` fires there is nothing left of
 * the outgoing track to fade, so the queue has to move while it is still
 * playing — `lib/audio.ts` reports the seconds remaining on every `timeupdate`
 * and this decides when that is close enough.
 *
 * It only ever runs for a blend (same record, and `planHandover` said so). A
 * record CHANGE is deliberately left to `onEnded`: "fade out, fade in" means
 * the first record finishes before the second starts.
 */
let crossfadeArmed = false

function maybeStartEarlyCrossfade(remainingSec: number): void {
  const set = usePlayerStore.setState
  const get = usePlayerStore.getState
  const store = get()

  // Rearm as soon as the new track is far enough from its own end. Anything
  // else — a flag cleared on load — misses the case where the crossfade is
  // superseded by the user pressing next inside the lead.
  if (remainingSec > CROSSFADE.SEC + 1) {
    crossfadeArmed = false
    return
  }
  if (crossfadeArmed || remainingSec > CROSSFADE.SEC) return
  // Nothing to overlap with: the ceremony owns the deck, a change-over is
  // already running, or two tracks are already crossing.
  if (store.ceremony || store.handover || audio.crossfading()) return
  // `repeat: 'one'` re-cues the same file rather than moving on, which
  // `onEnded` does by restarting the element it already has decoded.
  if (store.repeat === 'one') return

  const { order, cursor, repeat } = store
  const nextCursor = cursor + 1
  if (nextCursor >= order.length && repeat === 'off') return
  const target = nextCursor >= order.length ? 0 : nextCursor

  const from = currentTrack(store)
  const to = store.queue[order[target]]
  if (!from || !to) return
  if (!handoverFor(from, to).crossfade) return

  crossfadeArmed = true
  const file = useLibraryStore.getState().fileFor(to)
  // A missing file is not an error worth raising here — `onEnded` will reach
  // the same track a moment later and say so properly, on the path that owns
  // the message.
  if (!file) return

  set({ cursor: target })
  publishNowPlaying(to)
  runHandover(set, get, handoverFor(from, to), () => {}, {
    duckFirst: false,
    crossfadeFile: file,
    // The lead and the fade are the same number by definition: the overlap
    // starts `SEC` before the end and has exactly that long to finish.
    crossfadeSec: CROSSFADE.SEC,
  })
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
  followMusic(state.playing)
  ms.setPlaybackState(state.playing)
  followProgress(state.playing, state.currentSec, state.durationSec)
  ms.setPosition(state.currentSec, state.durationSec)
})

audio.setCallbacks({
  onEnded() {
    const store = usePlayerStore.getState()
    if (store.repeat === 'one') {
      // Even the same record gets the needle put back at the start — that is
      // literally what repeat-one is.
      //
      // ⚠️ `crossfade: false`, always. The same file cannot overlap itself: one
      // element decodes one file, and `audio.restart` re-cues the decode this
      // one already has rather than loading a second copy of the same track
      // into the other deck to fade between two identical signals.
      const track = currentTrack(store)
      const plan = track
        ? { ...handoverFor(track, track), crossfade: false }
        : { crossfade: false, needle: false, cue: false, swap: false }
      runHandover(
        usePlayerStore.setState,
        usePlayerStore.getState,
        plan,
        (fadeIn) => { void audio.restart(fadeIn) },
        { duckFirst: false },
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
    const track = currentTrack(usePlayerStore.getState())
    if (track && skipPast(track, message)) return
    usePlayerStore.setState({ error: message, missingTrack: null })
  },
  onApproachingEnd(remainingSec) {
    maybeStartEarlyCrossfade(remainingSec)
  },
})

ms.setHandlers({
  onPlay: () => void audio.play(),
  onPause: () => audio.pause('lock screen'),
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

// A different machine chosen while something plays redraws the lock screen's
// picture — the lock screen should show what Now Playing shows.
useSettingsStore.subscribe((next, prev) => {
  if (next.deck === prev.deck && next.deckEras === prev.deckEras) return
  const track = currentTrack(usePlayerStore.getState())
  if (track) publishNowPlaying(track)
})

// On the iPhone app the start-up sounds are clips played through <audio>, which
// iOS keeps playing off screen — see `setCueOutput` in `lib/crackle.ts`.
if (isNativeShell()) setCueOutput('clip')

// "Stable volume" switched while something plays takes effect on it at once.
useSettingsStore.subscribe((next, prev) => {
  if (next.stableVolume === prev.stableVolume) return
  const track = currentTrack(usePlayerStore.getState())
  if (!next.stableVolume) {
    audio.setNextLevel(1)
    audio.setLevel(1)
    return
  }
  if (!track) return
  const cached = cachedGain(track.id)
  if (cached !== null) audio.setLevel(cached)
  else levelLater(track)
})
