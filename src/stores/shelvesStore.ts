import { create } from 'zustand'
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
  shelves: read(),
  toggle(shelfId, trackId) {
    const result = toggleOnShelf(get().shelves, shelfId, trackId, newId())
    set({ shelves: result.shelves })
    persist(result.shelves)
    return result.shelfId
  },
  add(shelfId, trackIds) {
    const result = addToShelf(get().shelves, shelfId, trackIds, newId())
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
