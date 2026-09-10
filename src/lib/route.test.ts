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

describe('routeFromHash', () => {
  it('still reads every view, and an album id with spaces', () => {
    expect(routeFromHash('#/album/Nick%20Cave%20Let%20Love%20In')).toEqual({ view: 'album', albumId: 'Nick Cave Let Love In' })
    expect(routeFromHash('#/playing')).toEqual({ view: 'playing' })
    expect(routeFromHash('')).toEqual({ view: 'albums', home: true })
  })
})
