import { describe, expect, it } from 'vitest'
import { NOTHING_HIDDEN, parseHidden, trackHider, visibleLibrary, withFilteredOut } from './hidden'
import type { Album, Track } from './types'

const track = (id: string, albumId: string, artist?: string, albumArtist?: string): Track =>
  ({ id, path: `music/${id}.mp3`, name: id, size: 1, mtime: 1, ext: 'mp3', title: id, artist, albumArtist, albumId }) as Track
const album = (id: string, trackCount: number, artist = 'A'): Album => ({ id, title: id, artist, trackCount, cover: null }) as Album

const tracks = [
  track('t1', 'ab', 'Abba'),
  track('t2', 'ab', 'Abba'),
  track('t3', 'comp', 'Abba', 'Various'),
  track('t4', 'comp', 'Blur', 'Various'),
]
const albums = [album('ab', 2, 'Abba'), album('comp', 2, 'Various')]

describe('removing from Jukebox', () => {
  it('shows everything, as the same arrays, when nothing is removed', () => {
    const shown = visibleLibrary(tracks, albums, NOTHING_HIDDEN)
    expect(shown.tracks).toBe(tracks)
    expect(shown.albums).toBe(albums)
  })

  it('a song goes by its path, and its album is recounted', () => {
    const shown = visibleLibrary(tracks, albums, { ...NOTHING_HIDDEN, tracks: ['music/t1.mp3'] })
    expect(shown.tracks.map((t) => t.id)).toEqual(['t2', 't3', 't4'])
    expect(shown.albums.find((a) => a.id === 'ab')?.trackCount).toBe(1)
  })

  it('an album takes its songs, and goes itself', () => {
    const shown = visibleLibrary(tracks, albums, { ...NOTHING_HIDDEN, albums: ['ab'] })
    expect(shown.tracks.map((t) => t.id)).toEqual(['t3', 't4'])
    expect(shown.albums.map((a) => a.id)).toEqual(['comp'])
  })

  it('an artist takes their guest spots on other albums too', () => {
    const shown = visibleLibrary(tracks, albums, { ...NOTHING_HIDDEN, artists: ['Abba'] })
    expect(shown.tracks.map((t) => t.id)).toEqual(['t4'])
    expect(shown.albums).toEqual([{ ...albums[1], trackCount: 1 }])
    expect(trackHider({ ...NOTHING_HIDDEN, artists: ['Various'] })(tracks[3])).toBe(true)
  })

  it('a list written back through the view keeps what the view hid', () => {
    const shown = visibleLibrary(tracks, albums, { ...NOTHING_HIDDEN, tracks: ['music/t1.mp3'] })
    const written = shown.tracks.map((t) => ({ ...t, durationSec: 60 }))
    const whole = withFilteredOut(written, tracks, shown.tracks)
    expect(whole.map((t) => t.id).sort()).toEqual(['t1', 't2', 't3', 't4'])
    expect(withFilteredOut(written, tracks, tracks)).toBe(written)
  })

  it('reads back only well-formed lists', () => {
    expect(parseHidden({ tracks: ['a', 3, 'a'], albums: 'x', artists: [''] })).toEqual({ tracks: ['a'], albums: [], artists: [] })
    expect(parseHidden(null)).toEqual(NOTHING_HIDDEN)
  })
})
