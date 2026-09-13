import { create } from 'zustand'
import { aboutTrack, type WikiPage } from '../lib/aboutTrack'
import { settings } from './settingsStore'
import type { Track } from '../lib/types'

// "About this track" for the song on the deck. `lib/aboutTrack.ts` decides what
// may be asked; this decides WHEN, and whether the panel is open.

export type AboutStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  /** Asked, and Wikipedia has nothing on the song or the artist. */
  | 'none'
  /** The lookup is off and nothing was asked before — the panel offers it. */
  | 'off'
  | 'untagged'
  | 'error'

interface AboutState {
  /** The track the current answer is about, so a stale one can be spotted. */
  trackId: string | null
  status: AboutStatus
  song: WikiPage | null
  artist: WikiPage | null
  message: string | null
  /**
   * Open for this visit to Now Playing. Closed when Now Playing is left, and
   * NOT on every new song while you stay — the lyrics panel's rules, for the
   * same reasons (`shownFor` in `lyricsStore.ts`).
   */
  open: boolean
  setOpen(open: boolean): void
  /** Find out about this track, unless the answer is already in hand. */
  load(track: Track): void
  /** Ask again — after turning the lookup on, or after a failure. */
  reload(track: Track): void
  forget(): void
}

/** The lookup in flight — a late answer for the previous song never lands. */
let token = 0

export const useAboutStore = create<AboutState>((set, get) => ({
  trackId: null,
  status: 'idle',
  song: null,
  artist: null,
  message: null,
  open: false,

  setOpen(open) {
    if (get().open !== open) set({ open })
  },

  load(track) {
    const state = get()
    // `error` asks again (the wifi may be back); `off` asks again in case the
    // lookup was turned on in Settings since.
    if (state.trackId === track.id && !['idle', 'error', 'off'].includes(state.status)) return
    void run(track, set)
  },

  reload(track) {
    void run(track, set)
  },

  forget() {
    token++
    set({ trackId: null, status: 'idle', song: null, artist: null, message: null })
  },
}))

async function run(track: Track, set: (partial: Partial<AboutState>) => void): Promise<void> {
  const mine = ++token
  set({ trackId: track.id, status: 'loading', song: null, artist: null, message: null })
  const found = await aboutTrack(track, settings().aboutOnline)
  if (mine !== token) return
  if (found.kind === 'found') set({ status: 'ready', song: found.song, artist: found.artist })
  else if (found.kind === 'error') set({ status: 'error', message: found.message })
  else set({ status: found.kind })
}
