import { create } from 'zustand'
import { addRequest, parseRequests, setGot, tickFound, type MusicRequest } from '../lib/requests'
import { useLibraryStore } from './libraryStore'

// The Jukebox tab's requests, kept on the device — see `lib/requests.ts`.

const KEY = 'jukebox:requests'

function read(): MusicRequest[] {
  try {
    return parseRequests(JSON.parse(localStorage.getItem(KEY) ?? '[]'))
  } catch {
    return []
  }
}

function persist(requests: readonly MusicRequest[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(requests))
  } catch { /* storage full or off — the requests last until the app closes */ }
}

const newId = () => `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

interface RequestsState {
  requests: readonly MusicRequest[]
  add(request: Omit<MusicRequest, 'id' | 'addedAt'>): void
  /** Ticked or not, by hand. */
  setGot(id: string, got: boolean): void
  remove(id: string): void
  /** Take every ticked one off the shelf. */
  clearGot(): void
}

export const useRequestsStore = create<RequestsState>((set, get) => {
  const save = (requests: readonly MusicRequest[]) => {
    set({ requests })
    persist(requests)
  }
  /** Tick off whatever the library has now. */
  const check = (requests: readonly MusicRequest[]) => {
    const { status, tracks, albums } = useLibraryStore.getState()
    return status === 'ready' ? tickFound(requests, tracks, albums, Date.now()) : requests
  }
  return {
    // The library may have opened before this store did.
    requests: check(read()),
    // A request for something already in the library is ticked as it goes on.
    add: (request) => save(check(addRequest(get().requests, { ...request, id: newId(), addedAt: Date.now() }))),
    setGot: (id, got) => save(setGot(get().requests, id, got, Date.now())),
    remove: (id) => save(get().requests.filter((r) => r.id !== id)),
    clearGot: () => save(get().requests.filter((r) => !r.gotAt)),
  }
})

// Every time the library settles — opened, rescanned, a folder added — the
// open requests are looked for in it (James, 2026-09-26: "could we do this
// check automatically on next library update?"). Only on 'ready': mid-scan the
// library is half there, and a tick is never taken back by the library, so
// nothing is lost by waiting for the end.
useLibraryStore.subscribe((now, before) => {
  if (now.status !== 'ready') return
  if (before.status === 'ready' && now.tracks === before.tracks && now.albums === before.albums) return
  const { requests } = useRequestsStore.getState()
  const next = tickFound(requests, now.tracks, now.albums, Date.now())
  if (next !== requests) {
    useRequestsStore.setState({ requests: next })
    persist(next)
  }
})
