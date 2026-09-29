import { create } from 'zustand'
import { useLibraryStore } from './libraryStore'
import { haptic } from '../lib/haptics'
import { addToShelf, moveOnShelf, parseShelves, renameShelf, toggleOnShelf, type JukeboxShelf } from '../lib/shelves'

// The Jukebox tab's shelves, kept on the device — see `lib/shelves.ts`.

const KEY = 'jukebox:shelves'

function read(): JukeboxShelf[] {
  try {
    return parseShelves(JSON.parse(localStorage.getItem(KEY) ?? '[]'))
  } catch {
    return []
  }
}

function persist(shelves: JukeboxShelf[]): void {
  // ⚠️ Not while the example library is being TRIED: its shelves are the
  // demo's, kept for as long as the trial lasts, and the saved ones are the
  // real library's — see the note at the foot of this file.
  if (useLibraryStore.getState().trying) return
  try {
    localStorage.setItem(KEY, JSON.stringify(shelves))
  } catch { /* storage full or off — the shelves last until the app closes */ }
}

const newId = () => `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

interface ShelvesState {
  shelves: JukeboxShelf[]
  /** On if it is off, off if it is on. Returns the shelf it went to (a new one for the empty shelf). */
  toggle(shelfId: string, trackId: string): string
  /** Several on at once, skipping any already there. Returns the shelf they went to. */
  add(shelfId: string, trackIds: readonly string[]): string
  rename(shelfId: string, name: string): void
  move(shelfId: string, trackId: string, delta: -1 | 1): void
}

export const useShelvesStore = create<ShelvesState>((set, get) => ({
  // A store first opened mid-trial starts on the demo's (empty) shelves too.
  shelves: useLibraryStore.getState().trying ? [] : read(),
  toggle(shelfId, trackId) {
    const result = toggleOnShelf(get().shelves, shelfId, trackId, newId())
    if (result.shelves.find((s) => s.id === result.shelfId)?.trackIds.includes(trackId)) haptic('thunk')
    set({ shelves: result.shelves })
    persist(result.shelves)
    return result.shelfId
  },
  add(shelfId, trackIds) {
    const result = addToShelf(get().shelves, shelfId, trackIds, newId())
    // A record set down on a shelf — see `lib/haptics.ts`.
    if (trackIds.length > 0) haptic('thunk')
    set({ shelves: result.shelves })
    persist(result.shelves)
    return result.shelfId
  },
  rename(shelfId, name) {
    const shelves = renameShelf(get().shelves, shelfId, name)
    set({ shelves })
    persist(shelves)
  },
  move(shelfId, trackId, delta) {
    const shelves = moveOnShelf(get().shelves, shelfId, trackId, delta)
    set({ shelves })
    persist(shelves)
  },
}))

// A shelf none of whose songs is in the library any more goes (James,
// 2026-09-27: "If there's two empty shelves then delete and only show one
// shelf"). Its songs went with a library that was cleared or re-imported under
// new ids, so it can never fill again. Only once the library is READY and has
// songs: while it loads, or with nothing in it, every shelf looks like that.
//
// ⚠️ AND NEVER DURING A TRIAL OF THE EXAMPLE LIBRARY (`libraryStore.tryExample`).
// That swaps the library for the demo's, none of whose songs is on any of your
// shelves — so to this rule every shelf you had "can never fill again", and
// the first thing trying the example did was delete them all, for good. The
// trial gets shelves of its own instead: empty, kept in memory, gone when it
// ends; yours are set aside and put back untouched.
let realShelves: JukeboxShelf[] | null = null
useLibraryStore.subscribe((now, before) => {
  if (now.trying !== before.trying) {
    if (now.trying) {
      realShelves = useShelvesStore.getState().shelves
      useShelvesStore.setState({ shelves: [] })
    } else {
      // Set aside by the transition above — or, for a store first opened
      // mid-trial, never taken out of storage in the first place.
      useShelvesStore.setState({ shelves: realShelves ?? read() })
      realShelves = null
    }
    return
  }
  if (now.trying) return
  if (now.status !== 'ready' || now.tracks.length === 0) return
  if (before.status === 'ready' && now.tracks === before.tracks) return
  const have = new Set(now.tracks.map((t) => t.id))
  const { shelves } = useShelvesStore.getState()
  const kept = shelves.filter((s) => s.trackIds.some((id) => have.has(id)))
  if (kept.length === shelves.length) return
  useShelvesStore.setState({ shelves: kept })
  persist(kept)
})
