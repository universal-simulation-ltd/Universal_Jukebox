import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NativeEntry } from '../lib/nativeFile'
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
/**
 * The phone's folder plugin (`JukeboxMusicFolder`) — pick, walk, release. The
 * folders it can walk are `disk`, keyed by uri; a uri that is missing or
 * `'gone'` rejects, the way a folder whose grant has lapsed does.
 */
const folderPlugin = vi.hoisted(() => ({
  pick: vi.fn<(options?: { startInOwnFolder?: boolean }) => Promise<{ uri?: string; name?: string; cancelled?: boolean }>>(),
  walk: vi.fn(),
  release: vi.fn(async () => {}),
}))
vi.mock('@capacitor/core', async (original) => ({
  ...(await original<typeof import('@capacitor/core')>()),
  registerPlugin: (name: string) => (name === 'JukeboxMusicFolder' ? folderPlugin : plugin),
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
  allTracks: vi.fn(async (): Promise<Track[]> => []),
  allAlbums: vi.fn(async (): Promise<Album[]> => []),
  allRoots: vi.fn(async (): Promise<Root[]> => []),
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

// ── The phone apps: several folders (2026-09-14) ─────────────────────────────
//
// "Add a folder…" in the phone apps used to REPLACE the one folder. It adds
// now, as it does in a browser — and the rules that make that safe are all
// store-level: the same folder picked again is a rescan, a same-NAMED one is a
// second folder (James: keep both), a grant is given back only once no folder
// reads it, and a library from the one-folder build is simply folder #1.

const A = 'content://tree/a'
const B = 'content://tree/b'

/** Folders the plugin can walk, by uri. `'gone'` is one whose grant lapsed. */
let disk: Record<string, NativeEntry[] | 'gone'> = {}

function song(tree: string, path: string): NativeEntry {
  return { path, uri: `${tree}/doc/${encodeURIComponent(path)}`, name: path.slice(path.lastIndexOf('/') + 1), size: 10, mtime: 5 }
}

/** An Android shell with the folder plugin, and no file server to read tags from. */
function onAndroid() {
  vi.stubGlobal('Capacitor', {
    isNativePlatform: () => true,
    getPlatform: () => 'android',
    convertFileSrc: (u: string) => u,
    PluginHeaders: [{ name: 'JukeboxMusicFolder' }],
  })
  // Unreadable tags are fine: a track is still filed, titled from its name.
  vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('no file server in a unit test') }))
  disk = {}
  folderPlugin.walk.mockImplementation(async ({ uri }: { uri: string }) => {
    const files = disk[uri]
    if (!files || files === 'gone') throw new Error('NO_ACCESS')
    return { files }
  })
}

/** Pick `uri` (called `name`) in the phone's folder picker, and add it. */
async function addPicked(uri: string, name: string) {
  folderPlugin.pick.mockResolvedValueOnce({ uri, name })
  await store().addNativeFolder()
}

const rootsNow = () => store().roots.map((r) => [r.label, r.nativePath])
const pathsNow = () => store().tracks.map((t) => t.path).sort()
const released = () => folderPlugin.release.mock.calls.map((c) => (c as unknown as [{ uri: string }])[0].uri)

describe('"Add a folder…" on the phone', () => {
  beforeEach(onAndroid)

  it('ADDS a second folder beside the first, and both play', async () => {
    disk[A] = [song(A, 'Nick Cave/01.mp3')]
    disk[B] = [song(B, 'Low/02.mp3')]
    await addPicked(A, 'Music')
    await addPicked(B, 'Albums')

    expect(rootsNow()).toEqual([['Music', A], ['Albums', B]])
    expect(pathsNow()).toEqual(['Albums/Low/02.mp3', 'Music/Nick Cave/01.mp3'])
    // Both folders' files are live — adding the second did not strand the first.
    expect([...store().filesByPath.keys()].sort()).toEqual(pathsNow())
    expect(folderPlugin.release).not.toHaveBeenCalled()
    expect(store().error).toBeNull()
  })

  it('keeps a same-NAMED folder beside the first as "Music (2)" — two folders, no collision (James)', async () => {
    // The same album at the same place in two folders: a phone's Music and an
    // SD card's. Without the prefix these would be ONE track id.
    disk[A] = [song(A, 'Nick Cave/01.mp3')]
    disk[B] = [song(B, 'Nick Cave/01.mp3')]
    await addPicked(A, 'Music')
    await addPicked(B, 'Music')

    expect(rootsNow()).toEqual([['Music', A], ['Music (2)', B]])
    expect(pathsNow()).toEqual(['Music (2)/Nick Cave/01.mp3', 'Music/Nick Cave/01.mp3'])
    expect(new Set(store().tracks.map((t) => t.id)).size).toBe(2)
  })

  it('rescans the SAME folder picked again, rather than filing it twice', async () => {
    disk[A] = [song(A, 'Nick Cave/01.mp3')]
    await addPicked(A, 'Music')
    disk[A] = [song(A, 'Nick Cave/01.mp3'), song(A, 'Nick Cave/02.mp3')]
    await addPicked(A, 'Music')

    expect(rootsNow()).toEqual([['Music', A]])
    expect(pathsNow()).toEqual(['Music/Nick Cave/01.mp3', 'Music/Nick Cave/02.mp3'])
    // Its one grant is still in use — giving it back would strand it.
    expect(folderPlugin.release).not.toHaveBeenCalled()
  })

  it('adds nothing for a folder with no music in it, and gives its grant back', async () => {
    disk[A] = [song(A, 'Nick Cave/01.mp3')]
    disk[B] = [song(B, 'notes.txt')]
    await addPicked(A, 'Music')
    await addPicked(B, 'Documents')

    expect(rootsNow()).toEqual([['Music', A]])
    expect(released()).toEqual([B])
    expect(store().error).toMatch(/No music in that folder/)
  })

  it('opens the picker in the app’s own folder only while the library does not read it', async () => {
    // Android has no own folder, so it is never in the library: always true.
    disk[A] = [song(A, 'x.mp3')]
    await addPicked(A, 'Music')
    expect(folderPlugin.pick).toHaveBeenLastCalledWith({ startInOwnFolder: true })
  })
})

describe('removing one phone folder', () => {
  beforeEach(onAndroid)

  it('takes that folder and its grant, and the other keeps playing', async () => {
    disk[A] = [song(A, 'Nick Cave/01.mp3')]
    disk[B] = [song(B, 'Low/02.mp3')]
    await addPicked(A, 'Music')
    await addPicked(B, 'Albums')

    await store().removeFolder('Albums')

    expect(rootsNow()).toEqual([['Music', A]])
    expect(pathsNow()).toEqual(['Music/Nick Cave/01.mp3'])
    expect(store().filesByPath.has('Music/Nick Cave/01.mp3')).toBe(true)
    await vi.waitFor(() => expect(released()).toEqual([B]))
  })

  it('"Start a new library" gives back every folder’s grant', async () => {
    disk[A] = [song(A, 'a.mp3')]
    disk[B] = [song(B, 'b.mp3')]
    await addPicked(A, 'Music')
    await addPicked(B, 'Albums')

    await store().clear()

    await vi.waitFor(() => expect(released().sort()).toEqual([A, B]))
  })
})

describe('a phone folder that can no longer be read', () => {
  beforeEach(onAndroid)

  it('chosen again under its own name, keeps its place — and the old grant goes', async () => {
    disk[A] = [song(A, 'Nick Cave/01.mp3')]
    disk[B] = [song(B, 'Low/02.mp3')]
    await addPicked(A, 'Music')
    await addPicked(B, 'Albums')
    const idsBefore = store().tracks.map((t) => t.id).sort()

    // The folder was moved; its grant is gone. The banner's Rescan is a tap on
    // THAT folder, so the picker opens, and the same folder is chosen anew.
    const moved = 'content://tree/a-moved'
    disk[A] = 'gone'
    disk[moved] = [song(moved, 'Nick Cave/01.mp3')]
    folderPlugin.pick.mockResolvedValueOnce({ uri: moved, name: 'Music' })
    await store().scanNativeFolder('Music')

    expect(folderPlugin.pick).toHaveBeenCalledTimes(3)
    expect(rootsNow()).toEqual([['Albums', B], ['Music', moved]])
    // Same prefix, so the same track ids — play counts and fixes survive.
    expect(store().tracks.map((t) => t.id).sort()).toEqual(idsBefore)
    expect(released()).toEqual([A])
  })

  it('chosen again under ANOTHER name, is added — and the lost one is left for its own button', async () => {
    disk[A] = [song(A, 'Nick Cave/01.mp3')]
    await addPicked(A, 'Music')

    const podcasts = 'content://tree/podcasts'
    disk[A] = 'gone'
    disk[podcasts] = [song(podcasts, 'Show/ep1.mp3')]
    folderPlugin.pick.mockResolvedValueOnce({ uri: podcasts, name: 'Podcasts' })
    await store().scanNativeFolder('Music')

    expect(rootsNow()).toEqual([['Music', A], ['Podcasts', podcasts]])
    expect(folderPlugin.release).not.toHaveBeenCalled()
  })

  it('the menu’s Rescan reads every folder, never opens a picker, and keeps the failure on screen', async () => {
    disk[A] = [song(A, 'a.mp3')]
    disk[B] = [song(B, 'b.mp3')]
    await addPicked(A, 'Music')
    await addPicked(B, 'Albums')
    folderPlugin.walk.mockClear()
    folderPlugin.pick.mockClear()

    disk[A] = 'gone'
    await store().rescanNativeFolders()

    expect(folderPlugin.walk.mock.calls.map((c) => c[0].uri)).toEqual([A, B])
    expect(folderPlugin.pick).not.toHaveBeenCalled()
    // Albums read fine AFTER Music failed — the error must survive that.
    expect(store().error).toMatch(/^Music could not be opened/)
  })

  it('"Scan the rest" rescans a phone folder, rather than asking the browser to reopen it', async () => {
    disk[A] = [song(A, 'a.mp3')]
    await addPicked(A, 'Music')
    folderPlugin.walk.mockClear()

    await store().rescanFolder('Music')

    expect(folderPlugin.walk).toHaveBeenCalledWith({ uri: A })
    expect(store().error).toBeNull()
  })
})

describe('launching with phone folders', () => {
  beforeEach(() => {
    onAndroid()
    // `hydrate` reads the library once per page, so each launch is a fresh store.
    vi.resetModules()
  })

  const stored = (id: string, uri: string): Root => ({
    id, label: id, prefix: id, handle: null, nativePath: uri, scannedAt: 1, trackCount: 1,
  })
  const storedTrack = (path: string): Track => ({
    id: path, path, name: path.slice(path.lastIndexOf('/') + 1), size: 10, mtime: 5, ext: 'mp3', title: path, albumId: path,
  })
  const storedAlbum = (id: string): Album => ({ id, title: id, artist: 'Someone', trackCount: 1, cover: null })

  it('brings back a library from the one-folder build as folder #1 — nothing to re-pick — and can add a second', async () => {
    // Exactly what the one-folder build stored: one root, keyed by its uri.
    db.allRoots.mockResolvedValueOnce([stored('Music', A)])
    db.allTracks.mockResolvedValueOnce([storedTrack('Music/a.mp3')])
    db.allAlbums.mockResolvedValueOnce([storedAlbum('Music/a.mp3')])
    disk[A] = [song(A, 'a.mp3')]
    disk[B] = [song(B, 'b.mp3')]

    const { useLibraryStore: launched } = await import('./libraryStore')
    await launched.getState().hydrate()

    expect(launched.getState().filesByPath.has('Music/a.mp3')).toBe(true)
    expect(folderPlugin.pick).not.toHaveBeenCalled()

    folderPlugin.pick.mockResolvedValueOnce({ uri: B, name: 'Albums' })
    await launched.getState().addNativeFolder()
    expect(launched.getState().roots.map((r) => [r.label, r.nativePath])).toEqual([['Music', A], ['Albums', B]])
    expect(launched.getState().filesByPath.has('Music/a.mp3')).toBe(true)
  })

  it('walks every folder, and one that cannot be read strands only itself', async () => {
    const C = 'content://tree/c'
    db.allRoots.mockResolvedValueOnce([stored('Music', A), stored('Albums', B), stored('SD card', C)])
    db.allTracks.mockResolvedValueOnce([storedTrack('Music/a.mp3'), storedTrack('Albums/b.mp3'), storedTrack('SD card/c.mp3')])
    db.allAlbums.mockResolvedValueOnce(['Music/a.mp3', 'Albums/b.mp3', 'SD card/c.mp3'].map(storedAlbum))
    disk[A] = [song(A, 'a.mp3')]
    disk[B] = [song(B, 'b.mp3')]
    disk[C] = 'gone'

    const { useLibraryStore: launched, needAccessFrom } = await import('./libraryStore')
    await launched.getState().hydrate()

    const state = launched.getState()
    expect([...state.filesByPath.keys()].sort()).toEqual(['Albums/b.mp3', 'Music/a.mp3'])
    // The permission banner names exactly the folder that lapsed.
    expect(needAccessFrom(state.roots, state.tracks, state.filesByPath).map((r) => r.id)).toEqual(['SD card'])
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
