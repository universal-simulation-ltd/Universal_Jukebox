import { buildWatchLibrary, type WatchShelfInput } from './watchLibrary'
import { EXAMPLE_ROOT_ID } from './exampleLibrary'
import { rankHits } from './hits'
import { barsHits } from './nativeFile'
import { mostPlayed, usePlayCounts } from './playCounts'
import { NEW_SHELF, shelfName, shelvesToShow } from './shelves'
import { shownTabs } from './tabs'
import type { Album, Track } from './types'
import { compareName } from './collate'
import { getT } from '../i18n/runtime.ts'
import { useHitsStore } from '../stores/hitsStore'
import { useLibraryStore } from '../stores/libraryStore'
import { useSettingsStore } from '../stores/settingsStore'
import { LOVED_SHELF, useShelvesStore } from '../stores/shelvesStore'

// The page's half of the Apple Watch remote: the library, as the watch shows
// it (`watchLibrary.ts`), with a tiny cover for each album, handed to the
// native `JukeboxWatch` plugin (`ios/App/App/WatchPlugin.swift`).
//
// ⚠️ THE PHONE KEEPS IT, NOT THIS PAGE. A watch asks while the phone is in a
// pocket, and this page's JavaScript stops within a second of the lock. So the
// native side writes what it is sent to disk, answers the watch from there
// (`WatchBridge.swift`), and plays from the watch through Siri's own path with
// the page away (`SiriPlayer`). Like Siri's manifest, it is written a little
// after things settle, and at once as the app leaves the screen.
//
// Covers: 80 px JPEGs, cropped square, for the first `COVER_CAP` albums A–Z —
// about 3 KB each, enough for Now playing's 52 pt picture on a 2× watch, and
// a large library still goes to the watch as one file of a megabyte or so.
// Albums past the cap (and albums with no cover) get a coloured tile.

interface WatchPlugin {
  getStatus(): Promise<{ paired: boolean; installed: boolean }>
  setLibrary(o: { json: string; thumbs: Record<string, string> }): Promise<void>
  addListener(event: 'status', fn: (s: { paired: boolean; installed: boolean }) => void): Promise<unknown>
}

const SETTLE_MS = 3000
const COVER_SIZE = 80
const COVER_CAP = 400

let plugin: WatchPlugin | null = null
let started = false
let timer: ReturnType<typeof setTimeout> | null = null
let lastRev = ''
const thumbs = new Map<string, { blob: Blob; data: string | null }>()

export async function startWatchSync(): Promise<void> {
  const { registerPlugin } = await import('@capacitor/core')
  plugin = registerPlugin<WatchPlugin>('JukeboxWatch')
  await plugin.addListener('status', (s) => {
    if (s.installed) begin()
  })
  const status = await plugin.getStatus().catch(() => ({ paired: false, installed: false }))
  if (status.installed) begin()
}

function begin(): void {
  if (started) {
    schedule(true)
    return
  }
  started = true
  useLibraryStore.subscribe((next, prev) => {
    if (next.tracks !== prev.tracks || next.albums !== prev.albums || next.status !== prev.status || next.trying !== prev.trying) schedule()
  })
  useShelvesStore.subscribe(() => schedule())
  usePlayCounts.subscribe(() => schedule())
  useSettingsStore.subscribe(() => schedule())
  useHitsStore.subscribe((next, prev) => {
    if (next.records !== prev.records) schedule()
  })
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) schedule(true)
  })
  schedule(true)
}

function schedule(now = false): void {
  if (timer !== null) clearTimeout(timer)
  timer = null
  if (now) void send()
  else timer = setTimeout(() => void send(), SETTLE_MS)
}

/** What the Shelves tab shows, top to bottom (`JukeboxShelves`), named as it names them. */
export function drawnShelves(tracks: readonly Track[]): WatchShelfInput[] {
  const t = getT()
  const s = useSettingsStore.getState()
  const library = useLibraryStore.getState()
  const byId = new Map(tracks.map((track) => [track.id, track]))
  const exampleOnly = library.trying || (library.roots.length > 0 && library.roots.every((r) => r.id === EXAMPLE_ROOT_ID))
  const out: WatchShelfInput[] = []
  if (!exampleOnly && s.hitsShelf && !barsHits() && s.hitsOnline === true) {
    const songs = rankHits(useHitsStore.getState().records, tracks)
    if (songs.length) out.push({ id: 'hits', name: t('shelves.hits'), kind: 'hits', trackIds: songs.map((x) => x.id) })
  }
  if (s.mostPlayedShelf) {
    const songs = mostPlayed(usePlayCounts.getState().counts, byId)
    if (songs.length) out.push({ id: 'most', name: t('shelves.most_played'), kind: 'most', trackIds: songs.map((x) => x.id) })
  }
  const own = shelvesToShow(useShelvesStore.getState().shelves).filter(
    (shelf) => shelf.id !== NEW_SHELF && shelf.trackIds.some((id) => byId.has(id)),
  )
  own.forEach((shelf, i) => {
    out.push({ id: shelf.id, name: shelfName(shelf, i), kind: shelf.id === LOVED_SHELF ? 'loved' : 'shelf', trackIds: shelf.trackIds })
  })
  return out
}

async function send(): Promise<void> {
  timer = null
  const library = useLibraryStore.getState()
  if (!plugin || (library.status !== 'ready' && library.status !== 'empty')) return
  const s = useSettingsStore.getState()
  const albums = library.albums
  const covered = [...albums].sort((a, b) => compareName(a.title, b.title)).filter((a) => a.cover).slice(0, COVER_CAP)
  const made: Record<string, string> = {}
  for (const album of covered) {
    const data = await thumbOf(album)
    if (data) made[album.id] = data
  }
  const snapshot = buildWatchLibrary({
    tracks: library.tracks,
    albums,
    shelves: drawnShelves(library.tracks),
    tabs: shownTabs(s.tabOrder, s.hiddenTabs),
    example: library.trying || (library.roots.length > 0 && library.roots.every((r) => r.id === EXAMPLE_ROOT_ID)),
    covers: Object.keys(made),
  })
  if (snapshot.rev === lastRev) return
  lastRev = snapshot.rev
  await plugin.setLibrary({ json: JSON.stringify(snapshot), thumbs: made }).catch(() => {
    lastRev = ''
  })
}

/** A square 80 px JPEG of the album's cover, base64 — made once per cover. */
async function thumbOf(album: Album): Promise<string | null> {
  const blob = album.cover
  if (!blob) return null
  const kept = thumbs.get(album.id)
  if (kept && kept.blob === blob) return kept.data
  let data: string | null = null
  try {
    const bitmap = await createImageBitmap(blob)
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = COVER_SIZE
    const ctx = canvas.getContext('2d')
    if (ctx) {
      const side = Math.min(bitmap.width, bitmap.height)
      ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, COVER_SIZE, COVER_SIZE)
      data = canvas.toDataURL('image/jpeg', 0.62).split(',')[1] ?? null
    }
    bitmap.close()
  } catch {
    data = null
  }
  thumbs.set(album.id, { blob, data })
  return data
}
