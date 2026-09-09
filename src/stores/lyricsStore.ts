import { create } from 'zustand'
import { lyricsFromFile, type LyricSheet } from '../lib/lyrics'
import { onlineLyrics } from '../lib/lrclib'
import { useLibraryStore } from './libraryStore'
import { settings } from './settingsStore'
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

async function run(track: Track, set: (partial: Partial<LyricsState>) => void): Promise<void> {
  const mine = ++token
  set({ trackId: track.id, status: 'loading', sheet: null, message: null, askedOnline: false })

  const file = useLibraryStore.getState().fileFor(track)
  if (file) {
    try {
      const sheet = await lyricsFromFile(file)
      if (mine !== token) return
      if (sheet) return set({ status: 'ready', sheet, message: null })
    } catch {
      // A file that has moved or lost its permission is not a lyrics error —
      // fall through and let the online half have a go.
      if (mine !== token) return
    }
  }

  const allowNetwork = settings().lyricsOnline
  const found = await onlineLyrics(track, allowNetwork)
  if (mine !== token) return

  if (found.kind === 'found') set({ status: 'ready', sheet: found.sheet, message: null, askedOnline: allowNetwork })
  else if (found.kind === 'instrumental') set({ status: 'instrumental', askedOnline: true })
  else if (found.kind === 'untagged') set({ status: 'untagged', askedOnline: false })
  else if (found.kind === 'error') set({ status: 'error', message: found.message, askedOnline: true })
  else set({ status: 'none', askedOnline: allowNetwork })
}
