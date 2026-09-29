import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NativeEntry } from '../lib/nativeFile'
import { readSession, saveSession } from '../lib/session'
import type { Album, Root, SourceFile, Track } from '../lib/types'
import { useLibraryStore } from './libraryStore'
import { useRequestsStore } from './requestsStore'
import { useShelvesStore } from './shelvesStore'
import { useTidyStore } from './tidyStore'

// Trying the example library from a real one — `libraryStore.tryExample` — and
// the way back.
//
// The promise the confirm makes is "your library stays safe", and every test
// here is one way that promise used to be breakable: the example written over
// the stored library, the shelves pruned for having none of the demo's songs, a
// folder added mid-trial merged into the demo and then written as the whole
// library, "Resume listening" pointed at a made-up track, a phone folder's grant
// given back. The stored library is IndexedDB, stubbed below — so "nothing
// written" is also "a reload opens on the real library", which is the other
// way back.

/** The native plugins, as far as the store talks to them — see `libraryStore.test.ts`. */
const folderPlugin = vi.hoisted(() => ({
  pick: vi.fn<(options?: { startInOwnFolder?: boolean }) => Promise<{ uri?: string; name?: string; cancelled?: boolean }>>(),
  walk: vi.fn(),
  release: vi.fn(async () => {}),
}))
vi.mock('@capacitor/core', async (original) => ({
  ...(await original<typeof import('@capacitor/core')>()),
  registerPlugin: (name: string) => (name === 'JukeboxMusicFolder' ? folderPlugin : {}),
}))
// ⚠️ Loaded NOW, before any test stubs `Capacitor`. The real module sets that
// global as it first loads — and the store loads it lazily, at the first
// picker — so the phone test's stub was replaced mid-test by a web one, and
// the folder it had just picked "could not be opened".
await import('@capacitor/core')

/** IndexedDB, which a node test has none of. Every write is a spy. */
const db = vi.hoisted(() => ({
  putTracks: vi.fn(async () => {}),
  putAlbums: vi.fn(async () => {}),
  replaceLibrary: vi.fn(async () => {}),
  putRoot: vi.fn(async () => {}),
  deleteRoot: vi.fn(async () => {}),
  putFixes: vi.fn(async () => {}),
  deleteAlbum: vi.fn(async () => {}),
  allFixes: vi.fn(async () => []),
  clearLibrary: vi.fn(async () => {}),
  allTracks: vi.fn(async (): Promise<Track[]> => []),
  allAlbums: vi.fn(async (): Promise<Album[]> => []),
  allRoots: vi.fn(async (): Promise<Root[]> => []),
  albumFixId: (id: string) => `album:${id}`,
  coverFixId: (id: string) => `cover:${id}`,
}))
vi.mock('../lib/library', () => db)
const WRITES = ['putTracks', 'putAlbums', 'replaceLibrary', 'putRoot', 'deleteRoot', 'putFixes', 'deleteAlbum', 'clearLibrary'] as const
const writes = () => WRITES.filter((name) => db[name].mock.calls.length > 0)

/** The demo, without a canvas to draw its sleeves on. */
const demoTrack: Track = {
  id: 'demo-1', path: 'Example library/The Demo Band/Made Up/01.wav', name: '01.wav', size: 1, mtime: 1, ext: 'wav',
  title: 'First Light', artist: 'The Demo Band', album: 'Made Up', albumId: 'demo-album',
}
const demoAlbum: Album = { id: 'demo-album', title: 'Made Up', artist: 'The Demo Band', trackCount: 1, cover: null }
vi.mock('../lib/exampleLibrary', async (original) => ({
  ...(await original<typeof import('../lib/exampleLibrary')>()),
  buildExampleLibrary: async () => ({ tracks: [demoTrack], albums: [demoAlbum] }),
}))

/** Somebody's own library: one folder, one song, its file live. */
const folderRoot: Root = { id: 'Music', label: 'Music', prefix: 'Music', handle: null, scannedAt: 0, trackCount: 1 }
const folderTrack: Track = {
  id: 'folder-1', path: 'Music/A/01.mp3', name: '01.mp3', size: 1, mtime: 1, ext: 'mp3',
  title: 'Folder song', artist: 'Someone', album: 'Folder album', albumId: 'folder-album',
}
const folderAlbum: Album = { id: 'folder-album', title: 'Folder album', artist: 'Someone', trackCount: 1, cover: null }

const store = () => useLibraryStore.getState()

/** A real library, as it is once it has loaded — returned so a test can check it came back as the SAME objects. */
function ownLibrary() {
  const real = {
    status: 'ready' as const,
    tracks: [folderTrack],
    albums: [folderAlbum],
    roots: [folderRoot],
    filesByPath: new Map<string, SourceFile>([[folderTrack.path, new File(['x'], '01.mp3')]]),
    folderImages: new Map(),
    refusals: [{ ext: 'wma', count: 2, why: 'no decoder' }],
    stoppedEarly: null,
  }
  useLibraryStore.setState(real)
  return real
}

/** localStorage, per test — shelves, requests and "Resume listening" live there. */
let saved: Map<string, string>
beforeEach(() => {
  vi.clearAllMocks()
  saved = new Map()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => saved.get(k) ?? null,
    setItem: (k: string, v: string) => { saved.set(k, v) },
    removeItem: (k: string) => { saved.delete(k) },
  })
  // Whatever a test left behind, ended the way the app ends it.
  store().leaveExample()
  useLibraryStore.setState({
    status: 'empty', tracks: [], albums: [], roots: [], progress: null, refusals: [],
    error: null, stoppedEarly: null, filesByPath: new Map(), folderImages: new Map(),
  })
  useShelvesStore.setState({ shelves: [] })
  useRequestsStore.setState({ requests: [] })
})
afterEach(() => {
  store().leaveExample()
  vi.unstubAllGlobals()
})

describe('trying the example library', () => {
  it('shows the demo in place of your library — and writes nothing, so a reload opens on yours', async () => {
    ownLibrary()
    await store().tryExample()

    expect(store()).toMatchObject({ trying: true, status: 'ready', tracks: [demoTrack], albums: [demoAlbum], refusals: [] })
    expect(store().roots.map((r) => r.id)).toEqual(['example'])
    // Not a byte of it stored, and nothing of yours cleared.
    expect(writes()).toEqual([])
  })

  it('"Back to my music" puts back the very same library — live files and all', async () => {
    const real = ownLibrary()
    await store().tryExample()
    store().leaveExample()

    expect(store().trying).toBe(false)
    // The SAME objects, not copies: the live file handles are what would
    // otherwise need a permission re-granted, or a phone folder walked again.
    expect(store().filesByPath).toBe(real.filesByPath)
    expect(store().tracks).toBe(real.tracks)
    expect(store()).toMatchObject({ status: 'ready', albums: real.albums, roots: real.roots, refusals: real.refusals })
    expect(writes()).toEqual([])
  })

  it('is offered only from a real library that has settled', async () => {
    await store().tryExample()
    expect(store().trying).toBe(false) // Nothing to set aside: that is the landing page's door.

    ownLibrary()
    useLibraryStore.setState({ status: 'scanning' })
    await store().tryExample()
    expect(store().trying).toBe(false) // Mid-scan there is no settled library to put back.

    useLibraryStore.setState({ status: 'ready', roots: [{ ...folderRoot, id: 'example' }] })
    await store().tryExample()
    expect(store().trying).toBe(false) // The example already IS the library.
  })

  it('treats "Remove" on the example as the way back, not a removal', async () => {
    const real = ownLibrary()
    await store().tryExample()
    await store().removeFolder('example')

    expect(store()).toMatchObject({ trying: false, tracks: real.tracks, roots: real.roots })
    // Taken literally, this wrote the library-without-the-example — which in a
    // trial is the EMPTY library — over the real one.
    expect(db.replaceLibrary).not.toHaveBeenCalled()
    expect(db.deleteRoot).not.toHaveBeenCalled()
  })

  it('does not "rescan" the example into the stored library', async () => {
    ownLibrary()
    await store().tryExample()
    await store().rescanFolder('example')
    await store().loadExample()

    expect(store().trying).toBe(true)
    expect(writes()).toEqual([])
  })
})

describe('what a trial must not touch', () => {
  it('leaves your shelves alone — not pruned, not saved over — and gives them back', async () => {
    ownLibrary()
    const mine = [{ id: 's1', trackIds: ['folder-1'], name: 'Sunday' }]
    useShelvesStore.setState({ shelves: mine })
    saved.set('jukebox:shelves', JSON.stringify(mine))

    await store().tryExample()
    // The demo's shelves are its own: none of your songs are in it, and the
    // rule for a shelf like that is "delete it" — which it used to, for good.
    expect(useShelvesStore.getState().shelves).toEqual([])
    useShelvesStore.getState().add('new', ['demo-1'])
    expect(useShelvesStore.getState().shelves).toHaveLength(1)
    expect(JSON.parse(saved.get('jukebox:shelves')!)).toEqual(mine)

    store().leaveExample()
    expect(useShelvesStore.getState().shelves).toBe(mine)
    expect(JSON.parse(saved.get('jukebox:shelves')!)).toEqual(mine)
  })

  it('does not write "Resume listening" while trying, and does again after', async () => {
    ownLibrary()
    saveSession(['folder-1'], 0, 73)
    await store().tryExample()
    saveSession(['demo-1'], 0, 12)
    expect(readSession()).toMatchObject({ trackId: 'folder-1', sec: 73 })

    store().leaveExample()
    saveSession(['folder-1'], 0, 80)
    expect(readSession()).toMatchObject({ trackId: 'folder-1', sec: 80 })
  })

  it('never ticks off a request against the made-up records', async () => {
    ownLibrary()
    await store().tryExample()
    useRequestsStore.getState().add({ kind: 'artist', title: 'The Demo Band' })
    expect(useRequestsStore.getState().requests[0].gotAt).toBeUndefined()
    // …and a library settling mid-trial does not tick it either.
    useLibraryStore.setState({ tracks: [demoTrack] })
    expect(useRequestsStore.getState().requests[0].gotAt).toBeUndefined()
  })

  it('applies a tidy-up of the demo on screen only', async () => {
    ownLibrary()
    await store().tryExample()
    const other: Album = { ...demoAlbum, id: 'demo-album-2' }
    const moved: Track = { ...demoTrack, id: 'demo-2', albumId: other.id }
    useLibraryStore.setState({ tracks: [demoTrack, moved], albums: [demoAlbum, other] })
    const merge = {
      kind: 'merge' as const, intoAlbumId: demoAlbum.id, intoTitle: 'Made Up', intoArtist: 'The Demo Band',
      fromAlbumIds: [other.id], trackIds: [moved.id], reason: 'test',
    }
    useTidyStore.setState({ status: 'done', proposals: [merge], chosen: new Set([`merge:${demoAlbum.id}:${moved.id}`]) })

    await useTidyStore.getState().apply()
    expect(store().albums.map((a) => a.id)).toEqual([demoAlbum.id])
    // Written, the demo's records went into the real library and came back
    // after the next reload, mixed in with yours.
    expect(writes()).toEqual([])
  })
})

// ── Real music added mid-trial goes into YOUR library ────────────────────────

const A = 'content://tree/A'
const B = 'content://tree/B'
let disk: Record<string, NativeEntry[]> = {}
const song = (tree: string, path: string): NativeEntry =>
  ({ path, uri: `${tree}/doc/${encodeURIComponent(path)}`, name: path.slice(path.lastIndexOf('/') + 1), size: 10, mtime: 5 })

describe('a folder added on the phone during a trial', () => {
  beforeEach(() => {
    vi.stubGlobal('Capacitor', {
      isNativePlatform: () => true,
      getPlatform: () => 'android',
      convertFileSrc: (u: string) => u,
      PluginHeaders: [{ name: 'JukeboxMusicFolder' }],
    })
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('no file server in a unit test') }))
    disk = {}
    folderPlugin.walk.mockImplementation(async ({ uri }: { uri: string }) => {
      if (!disk[uri]) throw new Error('NO_ACCESS')
      return { files: disk[uri] }
    })
  })

  it('ends the trial and goes in beside your folder — and your folder keeps its grant', async () => {
    disk[A] = [song(A, 'Nick Cave/01.mp3')]
    disk[B] = [song(B, 'Low/02.mp3')]
    folderPlugin.pick.mockResolvedValueOnce({ uri: A, name: 'Music' })
    await store().addNativeFolder()
    vi.clearAllMocks()

    await store().tryExample()
    expect(store().trying).toBe(true)
    folderPlugin.pick.mockResolvedValueOnce({ uri: B, name: 'Albums' })
    await store().addNativeFolder()

    expect(store().trying).toBe(false)
    expect(store().roots.map((r) => [r.label, r.nativePath])).toEqual([['Music', A], ['Albums', B]])
    expect(store().tracks.map((t) => t.path).sort()).toEqual(['Albums/Low/02.mp3', 'Music/Nick Cave/01.mp3'])
    // `loadExample` gives the phone's folder grants back; a trial must not.
    expect(folderPlugin.release).not.toHaveBeenCalled()
    // And what was written is the whole REAL library, never the demo.
    const written = (db.replaceLibrary.mock.calls.at(-1) as unknown as [Track[]])[0]
    expect(written.map((t) => t.path).sort()).toEqual(['Albums/Low/02.mp3', 'Music/Nick Cave/01.mp3'])
  })
})
