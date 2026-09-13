import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Album, Root, Track } from '../lib/types'
import { musicLibrarySkips, refusalLabel, useLibraryStore } from './libraryStore'

// The scan card's two buttons, and what a stopped scan leaves behind.
//
// The Music library is read through a native plugin on iOS; it is stubbed
// here, which is enough to check the store's side of it — that Stop reaches
// the import, that Keep keeps every song, and that Delete stays deleted.

/** The native Music-library plugin, as far as the store talks to it. */
const plugin = vi.hoisted(() => ({
  requestAccess: vi.fn(async () => ({ status: 'authorized' })),
  songs: vi.fn(),
  artwork: vi.fn<(options: { albumId: string; size?: number }) => Promise<{ mime?: string; data?: string }>>(),
}))
vi.mock('@capacitor/core', async (original) => ({
  ...(await original<typeof import('@capacitor/core')>()),
  registerPlugin: () => plugin,
}))

/** IndexedDB, which a node test has none of. */
const db = vi.hoisted(() => ({
  putTracks: vi.fn(async () => {}),
  putAlbums: vi.fn(async () => {}),
  replaceLibrary: vi.fn(async () => {}),
  putRoot: vi.fn(async () => {}),
  deleteRoot: vi.fn(async () => {}),
  allFixes: vi.fn(async () => []),
  clearLibrary: vi.fn(async () => {}),
}))
vi.mock('../lib/library', () => db)

// A sleeve that "decodes" without a canvas.
vi.mock('../lib/art', async (original) => ({
  ...(await original<typeof import('../lib/art')>()),
  makeCoverBlob: async () => new Blob(['sleeve']),
}))

/** `count` records, one song each. */
function library(count: number) {
  const songs = Array.from({ length: count }, (_, i) => ({
    id: String(1000 + i),
    albumId: String(i),
    title: `Song ${i}`,
    album: `Album ${String(i).padStart(2, '0')}`,
    artist: 'Someone',
    duration: 200,
    ext: 'm4a',
    added: 1_700_000_000_000,
  }))
  return { songs, total: count, cloudOnly: 0, protected: 0 }
}

/**
 * Sleeves: the first `after` arrive at once, and every one after that waits
 * for `release()` — so a test can stop the import with some in flight.
 */
function holdArtAfter(after: number): () => void {
  let release!: () => void
  const gate = new Promise<void>((resolve) => (release = resolve))
  let calls = 0
  plugin.artwork.mockImplementation(async () => {
    calls++
    if (calls > after) await gate
    return { mime: 'image/jpeg', data: 'AAAA' }
  })
  return release
}

const folderRoot: Root = { id: 'Music', label: 'Music', prefix: 'Music', handle: null, scannedAt: 0, trackCount: 1 }
const folderTrack: Track = {
  id: 'folder-1', path: 'Music/A/01.mp3', name: '01.mp3', size: 1, mtime: 1, ext: 'mp3', title: 'Folder song', albumId: 'folder-album',
}
const folderAlbum: Album = { id: 'folder-album', title: 'Folder album', artist: 'Someone else', trackCount: 1, cover: null }

const store = () => useLibraryStore.getState()
const musicTracks = () => store().tracks.filter((t) => t.path.startsWith('Music library/'))

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('Capacitor', { isNativePlatform: () => true, PluginHeaders: [{ name: 'JukeboxAppleMusic' }] })
  useLibraryStore.setState({
    status: 'empty', tracks: [], albums: [], roots: [], progress: null, refusals: [],
    error: null, stoppedEarly: null, filesByPath: new Map(), folderImages: new Map(),
  })
})
afterEach(() => vi.unstubAllGlobals())

describe('stopping a Music-library import — "Keep …"', () => {
  it('stops fetching sleeves and keeps every song, the rest left without', async () => {
    useLibraryStore.setState({ status: 'ready', roots: [folderRoot], tracks: [folderTrack], albums: [folderAlbum] })
    plugin.songs.mockResolvedValue(library(40))
    const release = holdArtAfter(6)

    const running = store().importMusicLibrary()
    // Six sleeves in, four more in flight — one per lane.
    await vi.waitFor(() => expect(plugin.artwork).toHaveBeenCalledTimes(10))
    expect(store().progress?.done).toBe(false)

    store().stopScan()
    release()
    await running

    // Nothing asked for after the stop…
    expect(plugin.artwork).toHaveBeenCalledTimes(10)
    // …but every song is in, beside the folder that was there already.
    expect(musicTracks()).toHaveLength(40)
    expect(store().tracks).toContainEqual(folderTrack)
    const records = store().albums.filter((a) => a.id !== folderAlbum.id)
    expect(records).toHaveLength(40)
    expect(records.filter((a) => a.cover)).toHaveLength(10)
    expect(store()).toMatchObject({ status: 'ready', progress: null, error: null })
    expect(db.replaceLibrary).toHaveBeenCalledTimes(1)
  })

  it('marks the MUSIC LIBRARY as the one stopped, not the first root', async () => {
    // "Scan the rest" reads the root named here; it used to take roots[0],
    // which with a folder added first is the folder.
    useLibraryStore.setState({ status: 'ready', roots: [folderRoot], tracks: [folderTrack], albums: [folderAlbum] })
    plugin.songs.mockResolvedValue(library(20))
    const release = holdArtAfter(0)

    const running = store().importMusicLibrary()
    await vi.waitFor(() => expect(plugin.artwork).toHaveBeenCalledTimes(4))
    store().stopScan()
    release()
    await running

    expect(store().roots[0].id).toBe('Music')
    expect(store().stoppedEarly).toBe('music-library')
  })

  it('is not "stopped early" when nobody stopped it', async () => {
    plugin.songs.mockResolvedValue(library(12))
    holdArtAfter(Infinity)
    await store().importMusicLibrary()
    expect(musicTracks()).toHaveLength(12)
    expect(store().albums.every((a) => a.cover)).toBe(true)
    expect(store().stoppedEarly).toBeNull()
  })
})

describe('"Delete" during a Music-library import', () => {
  it('stays deleted — the import does not put the library back', async () => {
    plugin.songs.mockResolvedValue(library(45))
    // 36 sleeves in (enough for the first records to reach the shelves), then
    // four in flight — and the 40th landing would report progress again.
    const release = holdArtAfter(36)

    const running = store().importMusicLibrary()
    await vi.waitFor(() => expect(plugin.artwork).toHaveBeenCalledTimes(40))
    expect(musicTracks().length).toBeGreaterThan(0)

    // What the scan card's Delete does.
    store().stopScan()
    const cleared = store().clear()
    release()
    await Promise.all([running, cleared])

    expect(plugin.artwork).toHaveBeenCalledTimes(40)
    expect(store()).toMatchObject({ status: 'empty', tracks: [], albums: [], roots: [], progress: null, stoppedEarly: null })
    expect(db.replaceLibrary).not.toHaveBeenCalled()
    expect(db.putRoot).not.toHaveBeenCalled()
  })
})

describe('"Delete" during a folder scan', () => {
  it('stays deleted too — a stopped scan no longer writes the library back', async () => {
    useLibraryStore.setState({ status: 'ready', roots: [folderRoot], tracks: [folderTrack], albums: [folderAlbum] })
    const adding = store().addFiles([new File(['x'], '01.mp3')], 'New folder')
    store().stopScan()
    const cleared = store().clear()
    await Promise.all([adding, cleared])

    expect(store()).toMatchObject({ status: 'empty', tracks: [], albums: [], roots: [] })
    expect(db.replaceLibrary).not.toHaveBeenCalled()
  })
})

describe('rescanFolder on the Music library', () => {
  it('refreshes it, rather than asking for a folder that does not exist', async () => {
    const musicRoot: Root = {
      id: 'music-library', label: 'Music library', prefix: 'Music library', handle: null, nativePath: null,
      source: 'music-library', scannedAt: 0, trackCount: 0,
    }
    useLibraryStore.setState({ status: 'ready', roots: [folderRoot, musicRoot], tracks: [folderTrack], albums: [folderAlbum] })
    plugin.songs.mockResolvedValue(library(3))
    holdArtAfter(Infinity)

    await store().rescanFolder('music-library')

    expect(plugin.songs).toHaveBeenCalledTimes(1)
    expect(store().error).toBeNull()
    expect(musicTracks()).toHaveLength(3)
  })
})

describe('the skipped-files report', () => {
  it('names the Music library’s skips in words, not as extensions', () => {
    const skips = musicLibrarySkips({ protected: 3, cloudOnly: 2 })
    expect(skips.map(refusalLabel)).toEqual(['Apple Music downloads', 'iCloud-only songs'])
    expect(skips.map((s) => s.count)).toEqual([3, 2])
  })

  it('says nothing about a kind of song there are none of', () => {
    expect(musicLibrarySkips({ protected: 0, cloudOnly: 0 })).toEqual([])
    expect(musicLibrarySkips({ protected: 0, cloudOnly: 4 }).map(refusalLabel)).toEqual(['iCloud-only songs'])
  })

  it('still names a refused FORMAT by its extension', () => {
    expect(refusalLabel({ ext: 'wma', count: 2, why: 'No browser ships a decoder.' })).toBe('.WMA')
  })
})
