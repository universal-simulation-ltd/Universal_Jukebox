import { describe, expect, it } from 'vitest'
import { CACHE_VERSION, NONE_TTL_MS, cacheUsable, pickBest, searchTitle } from './lrclib'

// The lyrics lookup's two decisions that can be checked without the network:
// which search result to believe, and when a cached "not found" is stale.

const LRC = '[00:01.00]Sing us a song'

describe('pickBest', () => {
  it('takes the result closest to the track’s own length', () => {
    const got = pickBest([
      { duration: 360, syncedLyrics: '[00:01.00]wrong recording' },
      { duration: 339, syncedLyrics: LRC },
    ], 338.6)
    expect(got?.raw).toBe(LRC)
  })

  it('prefers synced over plain when both are close', () => {
    const got = pickBest([
      { duration: 339, plainLyrics: 'plain words' },
      { duration: 340, syncedLyrics: LRC },
    ], 339)
    expect(got?.raw).toBe(LRC)
  })

  it('refuses a different recording rather than time the wrong words to the song', () => {
    expect(pickBest([{ duration: 400, syncedLyrics: LRC }], 339)).toBeNull()
  })

  it('skips results with no words, and copes with junk', () => {
    expect(pickBest([{ duration: 339 }, null, 'x'], 339)).toBeNull()
    expect(pickBest('not a list', 339)).toBeNull()
  })

  it('takes the first usable one when the length is not known yet', () => {
    expect(pickBest([{ syncedLyrics: LRC }], undefined)?.raw).toBe(LRC)
  })
})

describe('searchTitle', () => {
  it('drops remaster, live and version tags', () => {
    expect(searchTitle('Piano Man - 2023 Remaster')).toBe('Piano Man')
    expect(searchTitle('Piano Man (Live)')).toBe('Piano Man')
    expect(searchTitle('Piano Man [Remastered 2011]')).toBe('Piano Man')
  })

  it('leaves an ordinary title — and one that is ALL tag — alone', () => {
    expect(searchTitle('Piano Man')).toBe('Piano Man')
    expect(searchTitle('Live and Let Die')).toBe('Live and Let Die')
  })
})

describe('cacheUsable', () => {
  const now = 1_800_000_000_000
  it('keeps found lyrics, instrumentals and uploads for good', () => {
    expect(cacheUsable({ id: 'a', raw: LRC, at: 0 }, now)).toBe(true)
    expect(cacheUsable({ id: 'a', raw: null, instrumental: true, at: 0 }, now)).toBe(true)
    expect(cacheUsable({ id: 'a', raw: LRC, at: 0, source: 'upload' }, now)).toBe(true)
  })

  it('asks again about a "not found" from before this version — the Piano Man fix', () => {
    expect(cacheUsable({ id: 'a', raw: null, at: now - 1000 }, now)).toBe(false)
  })

  it('keeps a fresh "not found", and lets an old one go', () => {
    expect(cacheUsable({ id: 'a', raw: null, at: now - 1000, v: CACHE_VERSION }, now)).toBe(true)
    expect(cacheUsable({ id: 'a', raw: null, at: now - NONE_TTL_MS - 1, v: CACHE_VERSION }, now)).toBe(false)
  })
})
