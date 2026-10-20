import { create } from 'zustand'
import { getLyricRecord, putLyricRecord } from '../lib/library'
import { parseLyrics } from '../lib/lyrics'
import { CACHE_VERSION } from '../lib/lrclib'
import { lyricsFromFile, type LyricSheet } from '../lib/lyrics'
import { onlineLyrics } from '../lib/lrclib'
import { exampleLyrics } from '../lib/exampleLibrary'
import { useLibraryStore } from './libraryStore'
import { settings } from './settingsStore'
import { barsOnlineLyrics } from '../lib/nativeFile'
import { hasMusicLibrary, isMusicLibraryTrack, musicLibraryLyrics } from '../lib/appleMusic'
import { setHasLyrics } from '../lib/library'
import { learnLyricsPresence, retryLyricsPresence, type PresenceHost } from '../lib/lyricsPresence'
import type { Track } from '../lib/types'

// Finding the words for the track on the deck.
//
// ⚠️ THE ORDER IS THE POINT: the file first, ALWAYS, and the network only when
// the file has nothing. A tagged sheet is the user's own data, it is one range
// read away, it is right even when it disagrees with the internet, and reaching
// past it to ask a server about a file we are holding would be absurd. It is
// also the half of this feature that costs nothing and works on a train.
//
// The second half is `lib/lrclib.ts`, which is off until somebody turns it on.
// This store is what decides WHEN it is allowed to run; that file is what
// decides what it may say. Neither reads the other's rules.

export type LyricsStatus =
  | 'idle'
  /** Reading the file, or waiting on lrclib.net. */
  | 'loading'
  | 'ready'
  /** Nothing in the file, and either nothing online or nothing was asked. */
  | 'none'
  /** LRCLIB says this track has no words in it. */
  | 'instrumental'
  /** Too few tags to ask a sensible question — see `lrclib.ts`. */
  | 'untagged'
  | 'error'

interface LyricsState {
  /** The track the current answer is about, so a stale one can be spotted. */
  trackId: string | null
  status: LyricsStatus
  sheet: LyricSheet | null
  message: string | null
  /** Whether the online half was consulted, so the panel can offer to. */
  askedOnline: boolean

  /** Find the words for this track, unless they are already in hand. */
  load(track: Track): void
  /** Look again — after turning the online lookup on, or after a failure. */
  reload(track: Track): void
  forget(): void

  /**
   * The track the lyrics panel was OPENED on, or null when it is closed.
   *
   * ⚠️ In memory, not in Settings, and cleared whenever Now Playing is left —
   * so every VISIT starts closed, with a "Show lyrics" button (James,
   * 2026-09-10: "hide lyrics by default so everytime there's a show lyrics
   * button"). It used to be the persisted `showLyrics` setting, so once opened
   * the panel was there on every visit, below the fold, where nobody had just
   * asked for it.
   *
   * ⚠️ But NOT closed on every new song while you stay on the screen. The old
   * setting's reasoning still holds for that: "somebody who opens the lyrics
   * wants them for the next track too, and having the panel shut itself on
   * every change-over is the version of this that gets turned off after ten
   * minutes". Open means `!== null`; the id is kept only so it is clear which
   * song the panel was opened on.
   */
  shownFor: string | null
  showFor(trackId: string): void
  hideLyrics(): void
  /**
   * Use lyrics the person supplied — a `.lrc` or a plain text file — for this
   * track, now and from now on. False when the text is not a lyric sheet.
   */
  adoptLyrics(track: Track, raw: string): Promise<boolean>
}

/**
 * The lookup in flight, so that changing track twice quickly cannot leave the
 * first answer on screen.
 *
 * ⚠️ A module-level token rather than an `AbortController` per call, because
 * the file read is not abortable and the fetch's own abort is only half the
 * problem: what matters is that a late answer for the PREVIOUS track never
 * writes itself into the store. The token is checked after every await.
 */
let token = 0

export const useLyricsStore = create<LyricsState>((set, get) => ({
  trackId: null,
  status: 'idle',
  sheet: null,
  message: null,
  askedOnline: false,
  shownFor: null,

  showFor(trackId) {
    set({ shownFor: trackId })
  },

  hideLyrics() {
    if (get().shownFor !== null) set({ shownFor: null })
  },

  async adoptLyrics(track, raw) {
    const sheet = parseLyrics(raw, 'upload')
    if (!sheet || sheet.lines.every((line) => line.text.trim() === '')) return false
    // A lookup still in flight for this track must not land on top of it.
    const mine = ++token
    try {
      await putLyricRecord({ id: track.id, raw, at: Date.now(), source: 'upload', v: CACHE_VERSION })
    } catch { /* storage disabled — it still shows now, it just won't be remembered */ }
    // And the other way round: if the track changed (and a new lookup began)
    // while the sheet was being saved, this one is kept but not shown over it.
    if (mine !== token) return true
    set({ trackId: track.id, status: 'ready', sheet, message: null })
    return true
  },

  load(track) {
    const state = get()
    // Already answered for this track, and the answer is not one that a retry
    // would change. `error` is excluded on purpose: reopening the panel after
    // the wifi came back should try again rather than show the old failure.
    if (state.trackId === track.id && state.status !== 'idle' && state.status !== 'error') return
    void run(track, set)
  },

  reload(track) {
    void run(track, set)
  },

  forget() {
    token++
    set({ trackId: null, status: 'idle', sheet: null, message: null, askedOnline: false })
  },
}))

/**
 * The words a song carries with it, from everywhere but lrclib.net, in the
 * order `run` trusts them. `prepare`: copy a Music-library song out to read
 * its file (the panel, for the song on now); without it such a song is read
 * from the library's own lyrics only, which needs no copy — what the
 * lock-screen look-ahead uses (`lib/lockLinesAhead.ts`).
 */
export async function localLyricSheet(track: Track, prepare: boolean): Promise<LyricSheet | null> {
  // ⚠️ The person's OWN lyrics file wins over everything — they added it
  // because the others were missing or wrong (see `adoptLyrics`). Next, a
  // `.lrc` that sat beside the song in its folder (`lib/folderLyrics.ts`):
  // also theirs, put there on purpose, so ahead of the tags and lrclib too.
  const own = await getLyricRecord(track.id).catch(() => null)
  if ((own?.source === 'upload' || own?.source === 'folder') && own.raw) {
    const sheet = parseLyrics(own.raw, 'upload')
    if (sheet) return sheet
  }

  // The example library's songs carry their words in the app, not the file.
  const example = exampleLyrics(track)
  if (example) return example

  // ⚠️ WAIT FOR A MUSIC-LIBRARY SONG'S COPY. Its file only exists once it has
  // been copied out of the library (`lib/appleMusic.ts`), and the song becomes
  // the current one BEFORE that (`playAt` moves the cursor first). Asking
  // `fileFor` at once answered "no file" for every song not copied ahead, so
  // its embedded lyrics never showed and nothing asked again (James,
  // 2026-10-12: "lost my lyrics which were embedded into tracks on Apple
  // library"). `prepare` shares the copy the player is already making.
  const library = useLibraryStore.getState()
  const waiting = library.needsPreparing(track)
  const file = waiting ? (prepare ? await library.prepare(track) : null) : library.fileFor(track)
  if (file) {
    try {
      const sheet = await lyricsFromFile(file)
      if (sheet) return sheet
    } catch {
      // A file that has moved or lost its permission is not a lyrics error —
      // fall through and let the others have a go.
    }
  }

  // A Music-library song: the lyrics the library holds for it, which is where
  // an MP3's embedded lyrics survive (its playback copy has no tags).
  if (isMusicLibraryTrack(library.roots, track)) {
    const raw = await musicLibraryLyrics(track).catch(() => null)
    const sheet = raw ? parseLyrics(raw) : null
    if (sheet) return sheet
  }
  return null
}

async function run(track: Track, set: (partial: Partial<LyricsState>) => void): Promise<void> {
  const mine = ++token
  set({ trackId: track.id, status: 'loading', sheet: null, message: null, askedOnline: false })

  const local = await localLyricSheet(track, true)
  if (mine !== token) return
  if (local) return set({ status: 'ready', sheet: local, message: null })

  const allowNetwork = settings().lyricsOnline && !barsOnlineLyrics()
  const found = await onlineLyrics(track, allowNetwork)
  if (mine !== token) return

  if (found.kind === 'found') set({ status: 'ready', sheet: found.sheet, message: null, askedOnline: allowNetwork })
  else if (found.kind === 'instrumental') set({ status: 'instrumental', askedOnline: true })
  else if (found.kind === 'untagged') set({ status: 'untagged', askedOnline: false })
  else if (found.kind === 'error') set({ status: 'error', message: found.message, askedOnline: true })
  else set({ status: 'none', askedOnline: allowNetwork })
}

// ── Which songs carry words, for the lyric-sheet mark on the lists ──────────

/**
 * Whether the song itself carries words — the file's tags, the Music
 * library's own lyrics, the example's — or null when it cannot be asked about
 * now. Never the network, and never a copy out of the Music library.
 */
async function songCarriesWords(track: Track): Promise<boolean | null> {
  if (exampleLyrics(track)) return true
  const library = useLibraryStore.getState()
  if (isMusicLibraryTrack(library.roots, track)) {
    if (!hasMusicLibrary()) return null
    const raw = await musicLibraryLyrics(track, true)
    return raw !== null && parseLyrics(raw) !== null
  }
  const file = library.fileFor(track)
  if (!file) return null
  return (await lyricsFromFile(file)) !== null
}

const presenceHost: PresenceHost = {
  tracks: () => useLibraryStore.getState().tracks,
  check: songCarriesWords,
  publish: (found) => {
    useLibraryStore.setState({
      tracks: useLibraryStore.getState().tracks.map((t) => {
        const has = found.get(t.id)
        return has !== undefined && t.hasLyrics !== has ? { ...t, hasLyrics: has } : t
      }),
    })
    void setHasLyrics(found)
  },
}

// Started once the library is in, and again whenever the files change (a
// folder allowed back can answer what it could not before).
useLibraryStore.subscribe((state, prev) => {
  if (state.status !== 'ready') return
  if (state.filesByPath !== prev.filesByPath) retryLyricsPresence()
  if (state.tracks !== prev.tracks || state.filesByPath !== prev.filesByPath || prev.status !== 'ready') {
    void learnLyricsPresence(presenceHost)
  }
})
