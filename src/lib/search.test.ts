import { describe, expect, it } from 'vitest'
import { matchAlbums, matchArtistNames, matchTracks, tabCounts } from './search'
import type { Album, Track } from './types'

// The counts beside the tabs and the lists behind them come from these
// functions and nothing else — which is the only way `Tracks (2)` can be
// trusted while you are looking at the Albums tab.

function album(over: Partial<Album> & Pick<Album, 'id' | 'title' | 'artist'>): Album {
  return { trackCount: 1, cover: null, ...over }
}

function track(over: Partial<Track> & Pick<Track, 'id' | 'title'>): Track {
  return {
    path: `${over.id}.mp3`,
    name: `${over.id}.mp3`,
    size: 1,
    mtime: 0,
    ext: 'mp3',
    albumId: 'a',
    ...over,
  }
}

const ALBUMS: Album[] = [
  album({ id: 'a1', title: 'Sides A and B', artist: 'The Tone Arms' }),
  album({ id: 'a2', title: 'Both Halves', artist: 'The Tone Arms' }),
  album({ id: 'a3', title: 'Homogénic', artist: 'Björk' }),
]

const TRACKS: Track[] = [
  track({ id: 't1', title: 'Side A', artist: 'The Tone Arms', album: 'Sides A and B', albumId: 'a1' }),
  track({ id: 't2', title: 'Side B', artist: 'The Tone Arms', album: 'Sides A and B', albumId: 'a1' }),
  track({ id: 't3', title: 'Jóga', artist: 'Björk', album: 'Homogénic', albumId: 'a3' }),
]

describe('an empty query', () => {
  it('matches everything, unfiltered and in the order given', () => {
    expect(matchAlbums(ALBUMS, '')).toEqual(ALBUMS)
    expect(matchTracks(TRACKS, '   ')).toEqual(TRACKS)
    expect(matchArtistNames(ALBUMS, '')).toEqual(['The Tone Arms', 'Björk'])
  })
})

describe('albums', () => {
  it('matches the title or the artist', () => {
    expect(matchAlbums(ALBUMS, 'halves').map((a) => a.id)).toEqual(['a2'])
    expect(matchAlbums(ALBUMS, 'tone arms').map((a) => a.id)).toEqual(['a1', 'a2'])
  })
})

describe('tracks', () => {
  it('matches the title, the artist OR the album', () => {
    expect(matchTracks(TRACKS, 'side b').map((t) => t.id)).toEqual(['t2'])
    // ⚠️ The album match is what makes searching a record name in the Tracks
    // tab give you its tracks instead of an empty list.
    expect(matchTracks(TRACKS, 'sides a and b').map((t) => t.id)).toEqual(['t1', 't2'])
  })
})

describe('artists', () => {
  // An artist is a set of RECORDS here, the same as in ArtistList — counting
  // tracks would put "Artists (14)" over a list of two names.
  it('counts distinct names, not albums and not tracks', () => {
    expect(matchArtistNames(ALBUMS, 'arms')).toEqual(['The Tone Arms'])
  })
})

describe('folding', () => {
  it('finds an accented name typed without the accent', () => {
    expect(matchArtistNames(ALBUMS, 'bjork')).toEqual(['Björk'])
    expect(matchAlbums(ALBUMS, 'homogenic').map((a) => a.id)).toEqual(['a3'])
    expect(matchTracks(TRACKS, 'joga').map((t) => t.id)).toEqual(['t3'])
  })
})

describe('the tab counts', () => {
  // The whole point of the file: three numbers, one rule each, all from the
  // same functions the three views filter with.
  it('are the lengths of exactly what each tab will show', () => {
    expect(tabCounts(ALBUMS, TRACKS, 'tone arms')).toEqual({ albums: 2, artists: 1, tracks: 2 })
    expect(tabCounts(ALBUMS, TRACKS, 'bjork')).toEqual({ albums: 1, artists: 1, tracks: 1 })
    expect(tabCounts(ALBUMS, TRACKS, 'nothing here')).toEqual({ albums: 0, artists: 0, tracks: 0 })
  })
})
