import { describe, expect, it } from 'vitest'
import { CACHE_VERSION, type HitRecord } from './hits'
import { biggestSongs, worldStats } from './hitsView'
import type { Track } from './types'

const track = (id: string, title = id) => ({ id, title, artist: 'x', albumId: 'a' }) as unknown as Track
const record = (id: string, r: Partial<HitRecord> = {}): HitRecord => ({
  id, mbid: `mb-${id}`, listens: null, listeners: null, rating: null, votes: null, awards: null, at: 0, v: CACHE_VERSION, ...r,
})
const map = (...rs: HitRecord[]) => new Map(rs.map((r) => [r.id, r]))

describe('worldStats', () => {
  it('adds plays and awards, and weights the rating by votes', () => {
    const s = worldStats([track('a'), track('b'), track('c')], map(
      record('a', { listens: 1000, awards: 2, rating: 5, votes: 3 }),
      record('b', { listens: 500, rating: 3, votes: 1 }), // one vote: not counted
      record('c', { listens: 250, rating: 4, votes: 7 }),
    ))
    expect(s).toEqual({ listens: 1750, awards: 2, rating: (5 * 3 + 4 * 7) / 10, votes: 10 })
  })
  it('counts one recording once', () => {
    const s = worldStats([track('a'), track('deluxe')], map(record('a', { listens: 100 }), record('deluxe', { mbid: 'mb-a', listens: 100 })))
    expect(s?.listens).toBe(100)
  })
  it('is null when nothing is known', () => {
    expect(worldStats([track('a')], new Map())).toBeNull()
    expect(worldStats([track('a')], map(record('a', { mbid: null })))).toBeNull()
    expect(worldStats([track('a')], map(record('a')))).toBeNull()
  })
})

describe('biggestSongs', () => {
  it('ranks an artist’s hits, and needs two', () => {
    const tracks = [track('deep'), track('hit'), track('mid')]
    const records = map(record('deep', { listens: 120 }), record('hit', { listens: 2_000_000, awards: 1 }), record('mid', { listens: 40_000 }))
    expect(biggestSongs(tracks, records).map((t) => t.id)).toEqual(['hit', 'mid', 'deep'])
    expect(biggestSongs(tracks, map(record('hit', { listens: 2_000_000 })))).toEqual([])
  })
})
