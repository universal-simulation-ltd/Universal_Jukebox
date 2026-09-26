import { describe, expect, it } from 'vitest'
import {
  REQUESTS_MAX, addRequest, findInLibrary, indexLibrary, matchKey, parseRequests, requestsInOrder, setGot, tickFound, toArtResult,
  type MusicRequest,
} from './requests'
import type { Album, Track } from './types'

const track = (id: string, title: string, artist: string, albumId: string, albumArtist?: string): Track =>
  ({ id, path: id, name: id, size: 1, mtime: 1, ext: 'mp3', title, artist, albumArtist, albumId }) as Track
const album = (id: string, title: string, artist: string): Album => ({ id, title, artist, trackCount: 1, cover: null })

const albums = [album('ar', 'Abbey Road', 'The Beatles'), album('now', 'Now 80', 'Various Artists')]
const tracks = [
  track('t1', 'Come Together', 'The Beatles', 'ar'),
  track('t2', 'Something', 'The Beatles', 'ar'),
  track('t3', 'Hurt', 'Johnny Cash', 'now', 'Various Artists'),
]
const index = indexLibrary(tracks, albums)
const req = (over: Partial<MusicRequest>): MusicRequest => ({ id: 'r', kind: 'album', title: 'x', addedAt: 1, ...over })

describe('matching a request to the library', () => {
  it('folds away brackets, reissue tails, a leading "the" and "&"', () => {
    expect(matchKey('Abbey Road (2019 Mix)')).toBe('abbey road')
    expect(matchKey('The Beatles')).toBe('beatles')
    expect(matchKey('Simon & Garfunkel')).toBe(matchKey('Simon and Garfunkel'))
    expect(matchKey('Hey Jude - 2015 Remaster')).toBe('hey jude')
    expect(matchKey('Björk')).toBe('bjork')
  })

  it('finds an album by its title, held to its artist when one is given', () => {
    expect(findInLibrary(req({ title: 'abbey road (remastered)' }), index).map((t) => t.id)).toEqual(['t1', 't2'])
    expect(findInLibrary(req({ title: 'Abbey Road', artist: 'Beatles' }), index)).toHaveLength(2)
    expect(findInLibrary(req({ title: 'Abbey Road', artist: 'The Rolling Stones' }), index)).toEqual([])
  })

  it('finds a song by title, and by its own or its album’s artist', () => {
    expect(findInLibrary(req({ kind: 'track', title: 'Hurt' }), index).map((t) => t.id)).toEqual(['t3'])
    expect(findInLibrary(req({ kind: 'track', title: 'Hurt', artist: 'Nine Inch Nails' }), index)).toEqual([])
    expect(findInLibrary(req({ kind: 'track', title: 'hurt', artist: 'johnny cash' }), index)).toHaveLength(1)
  })

  it('finds an artist by track or album artist, and never by a part of a name', () => {
    expect(findInLibrary(req({ kind: 'artist', title: 'Beatles' }), index)).toHaveLength(2)
    expect(findInLibrary(req({ kind: 'artist', title: 'Various Artists' }), index)).toHaveLength(1)
    expect(findInLibrary(req({ kind: 'artist', title: 'Beat' }), index)).toEqual([])
  })
})

describe('ticking requests off', () => {
  it('ticks what the library has, and hands back the same list when nothing changed', () => {
    const list = [req({ id: 'a', title: 'Abbey Road' }), req({ id: 'b', title: 'Revolver' })]
    const ticked = tickFound(list, tracks, albums, 50)
    expect(ticked.map((r) => r.gotAt)).toEqual([50, undefined])
    expect(tickFound(ticked, tracks, albums, 60)).toBe(ticked)
  })

  it('never re-ticks one unticked by hand, and a hand tick clears that', () => {
    const off = setGot([req({ id: 'a', title: 'Abbey Road', gotAt: 5 })], 'a', false, 9)
    expect(off[0]).toMatchObject({ autoOff: true })
    expect(off[0].gotAt).toBeUndefined()
    expect(tickFound(off, tracks, albums, 10)).toBe(off)
    const on = setGot(off, 'a', true, 11)
    expect(on[0]).toMatchObject({ gotAt: 11 })
    expect('autoOff' in on[0]).toBe(false)
  })

  it('shows what is still to get first, oldest first, then the newest ticks', () => {
    const list = [req({ id: 'a', addedAt: 3 }), req({ id: 'b', addedAt: 1, gotAt: 5 }), req({ id: 'c', addedAt: 2 }), req({ id: 'd', addedAt: 0, gotAt: 9 })]
    expect(requestsInOrder(list).map((r) => r.id)).toEqual(['c', 'a', 'd', 'b'])
  })

  it('keeps under the cap by dropping the oldest ticked first', () => {
    const full = Array.from({ length: REQUESTS_MAX }, (_, i) => req({ id: `r${i}`, addedAt: i, ...(i === 7 ? { gotAt: 1 } : {}) }))
    const next = addRequest(full, req({ id: 'new', addedAt: 999 }))
    expect(next).toHaveLength(REQUESTS_MAX)
    expect(next.some((r) => r.id === 'r7')).toBe(false)
    expect(addRequest(next, req({ id: 'newer', addedAt: 1000 })).some((r) => r.id === 'r0')).toBe(false)
  })
})

describe('storage and search answers', () => {
  it('reads back only well-formed requests', () => {
    expect(
      parseRequests([
        { id: 'a', kind: 'artist', title: ' Beatles ', artist: 'dropped', art: 'javascript:x', addedAt: 2, autoOff: 'yes' },
        { id: 'b', kind: 'playlist', title: 'x' },
        { id: 'c', kind: 'album', title: '   ' },
        null,
      ]),
    ).toEqual([{ id: 'a', kind: 'artist', title: 'Beatles', addedAt: 2 }])
    expect(parseRequests('nonsense')).toEqual([])
  })

  it('turns Apple’s answer into a result: bigger picture, reissue tail off', () => {
    const song = toArtResult(
      { artworkUrl100: 'https://x/a.jpg/100x100bb.jpg', trackName: 'Something (2019 Mix)', artistName: 'The Beatles', collectionName: 'Abbey Road (Super Deluxe Edition)', releaseDate: '1969-09-26T12:00:00Z' },
      'track',
    )
    expect(song).toEqual({ image: 'https://x/a.jpg/300x300bb.jpg', thumb: 'https://x/a.jpg/100x100bb.jpg', title: 'Something', artist: 'The Beatles', album: 'Abbey Road', year: 1969 })
    expect(toArtResult({ artistName: 'No picture' }, 'album')).toBeNull()
    expect(toArtResult({ artworkUrl100: 'https://x/100x100bb.jpg', artistName: 'The Beatles', collectionName: 'Help!' }, 'artist')?.title).toBe('The Beatles')
  })
})
