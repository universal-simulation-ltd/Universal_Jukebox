import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  FIRST_SHOWN,
  MUSIC_LIBRARY_LABEL,
  hasMusicLibrary,
  isMusicLibraryTrack,
  readMusicLibrary,
  songIdOf,
  songsToLibrary,
  type MusicLibrarySong,
} from './appleMusic'
import { albumKey } from './keys'
import type { Root } from './types'

/** The native plugin, as far as `readMusicLibrary` talks to it. No sleeves. */
const plugin = vi.hoisted(() => ({
  songs: vi.fn(),
  artwork: vi.fn(async () => ({})),
}))
vi.mock('@capacitor/core', async (original) => ({
  ...(await original<typeof import('@capacitor/core')>()),
  registerPlugin: () => plugin,
}))

// The Music library, turned into the library's own tracks and albums.
//
// What can be checked without a phone is the SHAPE: that songs from the
// iPhone's library land as tracks and albums every screen already understands,
// with ids that survive a refresh. The export-on-play needs a device.

const song = (over: Partial<MusicLibrarySong> = {}): MusicLibrarySong => ({
  id: '9182736450123456789',
  albumId: '5550001',
  title: 'Do You Love Me?',
  duration: 355.2,
  ext: 'm4a',
  added: 1_700_000_000_000,
  artist: 'Nick Cave & the Bad Seeds',
  albumArtist: 'Nick Cave & the Bad Seeds',
  album: 'Let Love In',
  trackNo: 1,
  year: 1994,
  ...over,
})

afterEach(() => vi.unstubAllGlobals())

describe('songsToLibrary', () => {
  it('files every song under its album, with the tags iOS gave it', () => {
    const { tracks, albums } = songsToLibrary(
      [song(), song({ id: '2', title: 'Nobody’s Baby Now', trackNo: 2 })],
      MUSIC_LIBRARY_LABEL,
    )
    expect(tracks).toHaveLength(2)
    expect(albums).toHaveLength(1)
    expect(albums[0]).toMatchObject({ title: 'Let Love In', artist: 'Nick Cave & the Bad Seeds', year: 1994, trackCount: 2 })
    expect(tracks[0]).toMatchObject({ title: 'Do You Love Me?', trackNo: 1, albumId: albums[0].id })
    // iOS knows the length up front — a folder scan only learns it on first play.
    expect(tracks[0].durationSec).toBeCloseTo(355.2)
  })

  it('groups albums the way a folder scan does — by album artist and album', () => {
    const { tracks } = songsToLibrary([song()], MUSIC_LIBRARY_LABEL)
    expect(tracks[0].albumId).toBe(albumKey({ album: 'Let Love In', albumArtist: 'Nick Cave & the Bad Seeds' }))
  })

  it('puts the persistent IDs in the path, under the library’s own prefix', () => {
    const { tracks } = songsToLibrary([song()], MUSIC_LIBRARY_LABEL)
    expect(tracks[0].path).toBe('Music library/5550001/9182736450123456789.m4a')
    // ⚠️ A UInt64 persistent ID survives as text. As a JS number the last
    // digits would round, and two songs could collide.
    expect(songIdOf(tracks[0].path)).toBe('9182736450123456789')
  })

  it('gives a song the SAME id on every refresh', () => {
    // Play counts, the queue and tidy-up fixes are keyed to the track id; a
    // refresh that minted new ids would orphan all of them.
    const first = songsToLibrary([song()], MUSIC_LIBRARY_LABEL).tracks[0].id
    const again = songsToLibrary([song()], MUSIC_LIBRARY_LABEL).tracks[0].id
    expect(again).toBe(first)
  })

  it('names what iOS left blank the way a scan does', () => {
    const { tracks, albums } = songsToLibrary(
      [song({ title: '  ', album: undefined, albumArtist: undefined, artist: undefined, year: undefined })],
      MUSIC_LIBRARY_LABEL,
    )
    expect(tracks[0].title).toBe('Untitled')
    expect(albums[0]).toMatchObject({ title: 'Unknown album', artist: 'Unknown artist' })
  })

  it('remembers which library album each record’s sleeve comes from', () => {
    const { albums, artworkFor } = songsToLibrary([song()], MUSIC_LIBRARY_LABEL)
    expect(artworkFor.get(albums[0].id)).toBe('5550001')
  })
})

describe('readMusicLibrary', () => {
  // 70 records, one song each, handed over by iOS in reverse A–Z order.
  const titles = Array.from({ length: 70 }, (_, i) => `Album ${String(i).padStart(2, '0')}`)
  const songs = titles
    .map((album, i) => song({ id: String(1000 + i), albumId: String(i), album, title: `Song ${i}` }))
    .reverse()
  plugin.songs.mockResolvedValue({ songs, total: songs.length, cloudOnly: 0, protected: 0 })

  it('puts a first few records on the shelves before the art is all in — A to Z, then twice as many', async () => {
    const lots: { titles: string[]; whole: boolean }[] = []
    const read = await readMusicLibrary(MUSIC_LIBRARY_LABEL, undefined, (sofar) => {
      const ids = new Set(sofar.albums.map((a) => a.id))
      lots.push({ titles: sofar.albums.map((a) => a.title).sort(), whole: sofar.tracks.every((t) => ids.has(t.albumId)) })
    })
    expect(lots.map((l) => l.titles.length)).toEqual([FIRST_SHOWN, FIRST_SHOWN * 2])
    // The start of the alphabet first, so later lots land after it.
    expect(lots[0].titles).toEqual(titles.slice(0, FIRST_SHOWN))
    // Every song handed over belongs to a record handed over with it.
    expect(lots.every((l) => l.whole)).toBe(true)
    // The whole library still comes back at the end, not as another lot.
    expect(read.albums).toHaveLength(70)
    expect(read.tracks).toHaveLength(70)
  })

  it('hands nothing over early for a library smaller than the first lot', async () => {
    plugin.songs.mockResolvedValueOnce({ songs: songs.slice(0, FIRST_SHOWN), total: FIRST_SHOWN, cloudOnly: 0, protected: 0 })
    const onReady = vi.fn()
    await readMusicLibrary(MUSIC_LIBRARY_LABEL, undefined, onReady)
    expect(onReady).not.toHaveBeenCalled()
  })
})

describe('songIdOf', () => {
  it('reads the id back out of a path', () => {
    expect(songIdOf('Music library/1/42.mp3')).toBe('42')
  })

  it('refuses a folder track’s path, which has no persistent id in it', () => {
    expect(songIdOf('Music/Nick Cave/Let Love In/01 Do You Love Me.mp3')).toBeNull()
  })
})

describe('isMusicLibraryTrack', () => {
  const root = (over: Partial<Root>): Root => ({
    id: 'x', label: 'x', prefix: 'x', handle: null, scannedAt: 0, trackCount: 0, ...over,
  })
  const library = root({ id: 'music-library', label: MUSIC_LIBRARY_LABEL, prefix: MUSIC_LIBRARY_LABEL, source: 'music-library' })
  const folder = root({ id: 'Music', label: 'Music', prefix: 'Music', nativePath: '' })
  const [track] = songsToLibrary([song()], MUSIC_LIBRARY_LABEL).tracks

  it('is decided by the ROOT the track is filed under', () => {
    expect(isMusicLibraryTrack([folder, library], track)).toBe(true)
    expect(isMusicLibraryTrack([folder, library], { ...track, path: 'Music/A/01.mp3' })).toBe(false)
  })

  it('is false once the Music library has been removed', () => {
    expect(isMusicLibraryTrack([folder], track)).toBe(false)
  })
})

describe('hasMusicLibrary', () => {
  it('is false in a browser', () => {
    expect(hasMusicLibrary()).toBe(false)
  })

  it('is true where the shell registered the plugin', () => {
    vi.stubGlobal('Capacitor', { isNativePlatform: () => true, PluginHeaders: [{ name: 'JukeboxAppleMusic' }] })
    expect(hasMusicLibrary()).toBe(true)
  })

  it('is false on a native shell without it — Android', () => {
    vi.stubGlobal('Capacitor', { isNativePlatform: () => true, PluginHeaders: [{ name: 'JukeboxMusicFolder' }] })
    expect(hasMusicLibrary()).toBe(false)
  })
})
