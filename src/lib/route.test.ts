import { describe, expect, it } from 'vitest'
import { levelOf, planNavigation, routeFromHash } from './route'

// Back goes UP a level (James, 2026-09-10: "library -> album -> now playing ->
// album should then go to library NOT now playing"). The history is kept shaped
// like the app, so the phone's edge swipe — which only knows history — follows.

const LIB = '#/'
const TRACKS = '#/tracks'
const A = '#/album/a'
const B = '#/album/b'
const NP = '#/playing'

describe('levelOf', () => {
  it('puts the library at the top, a page under it, and Now Playing under that', () => {
    expect(levelOf(LIB)).toBe(0)
    expect(levelOf(TRACKS)).toBe(0)
    expect(levelOf(A)).toBe(1)
    expect(levelOf('#/settings')).toBe(1)
    expect(levelOf(NP)).toBe(2)
  })
})

describe('planNavigation', () => {
  it('pushes when going DOWN', () => {
    expect(planNavigation([LIB], A)).toEqual({ back: 0, then: 'push' })
    expect(planNavigation([LIB, A], NP)).toEqual({ back: 0, then: 'push' })
  })

  it('is one step back to the album you came from — James’s case', () => {
    // library → album A → Now Playing → album A: back from there is the LIBRARY.
    expect(planNavigation([LIB, A, NP], A)).toEqual({ back: 1, then: 'none' })
  })

  it('opens a DIFFERENT album on top of the library, not on top of Now Playing', () => {
    expect(planNavigation([LIB, A, NP], B)).toEqual({ back: 1, then: 'replace' })
  })

  it('replaces one tab with another instead of stacking them', () => {
    expect(planNavigation([TRACKS], '#/artists')).toEqual({ back: 0, then: 'replace' })
  })

  it('goes all the way home from anywhere', () => {
    expect(planNavigation([LIB, A, NP], LIB)).toEqual({ back: 2, then: 'none' })
    expect(planNavigation([TRACKS, A, NP], LIB)).toEqual({ back: 2, then: 'replace' })
  })

  it('does nothing when already there', () => {
    expect(planNavigation([LIB, A, NP], NP)).toEqual({ back: 0, then: 'none' })
  })

  it('treats Settings as a page off the library, so back from it is the library', () => {
    expect(planNavigation([LIB, NP], '#/settings')).toEqual({ back: 0, then: 'replace' })
    expect(planNavigation([LIB, A, NP], '#/settings')).toEqual({ back: 1, then: 'replace' })
  })
})

describe('artist pages', () => {
  const ART = '#/artist/Bob%20Marley'
  it('sit between the library and an album', () => {
    expect(levelOf(ART)).toBe(0.5)
  })
  it('are UP from an album — back from the artist is the library', () => {
    expect(planNavigation([LIB, A], ART)).toEqual({ back: 0, then: 'replace' })
  })
  it('stay under an album opened from them', () => {
    expect(planNavigation([LIB, ART], B)).toEqual({ back: 0, then: 'push' })
  })
  it('read the name back, spaces and all', () => {
    expect(routeFromHash(ART)).toEqual({ view: 'artist', artist: 'Bob Marley' })
  })
  it('open as one list of songs with /songs, a slash in the name and all', () => {
    expect(routeFromHash(`${ART}/songs`)).toEqual({ view: 'artist', artist: 'Bob Marley', songs: true })
    expect(routeFromHash('#/artist/AC%2FDC/songs')).toEqual({ view: 'artist', artist: 'AC/DC', songs: true })
    expect(routeFromHash('#/artist/AC%2FDC')).toEqual({ view: 'artist', artist: 'AC/DC' })
    expect(levelOf(`${ART}/songs`)).toBe(0.5)
  })
})

describe('routeFromHash', () => {
  it('still reads every view, and an album id with spaces', () => {
    expect(routeFromHash('#/album/Nick%20Cave%20Let%20Love%20In')).toEqual({ view: 'album', albumId: 'Nick Cave Let Love In' })
    expect(routeFromHash('#/playing')).toEqual({ view: 'playing' })
    expect(routeFromHash('')).toEqual({ view: 'albums', home: true })
  })
})

describe('a genre opened from the genre list', () => {
  const ROCK = '#/tracks/genre/Rock%20%26%20Roll'
  it('reads its tab and its name back', () => {
    expect(routeFromHash(ROCK)).toEqual({ view: 'tracks', genre: 'Rock & Roll' })
    expect(routeFromHash('#/artists/genre/Blues')).toEqual({ view: 'artists', genre: 'Blues' })
  })
  it('sits under the library, and over an artist or album opened from it', () => {
    expect(levelOf(ROCK)).toBe(0.25)
    expect(planNavigation([TRACKS], ROCK)).toEqual({ back: 0, then: 'push' })
    expect(planNavigation([TRACKS, ROCK], '#/artist/Bob%20Marley')).toEqual({ back: 0, then: 'push' })
    expect(planNavigation([TRACKS, ROCK], A)).toEqual({ back: 0, then: 'push' })
  })
  it('swaps tabs in place, and goes back up to the genre list', () => {
    expect(planNavigation([TRACKS, ROCK], '#/albums/genre/Rock%20%26%20Roll')).toEqual({ back: 0, then: 'replace' })
    expect(planNavigation([TRACKS, ROCK], TRACKS)).toEqual({ back: 1, then: 'none' })
  })
})
