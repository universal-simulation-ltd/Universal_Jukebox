import { describe, expect, it } from 'vitest'
import { countsAfter, mostPlayed, MOST_PLAYED_MAX } from './playCounts'
import { starterPicks } from './shelves'
import type { Track } from './types'

const track = (id: string, albumId = 'a', artist = 'x') => ({ id, albumId, artist, title: id }) as unknown as Track

describe('a play counts', () => {
  it('after half the song, at most four minutes', () => {
    expect(countsAfter(200)).toBe(100)
    expect(countsAfter(900)).toBe(240)
    expect(countsAfter(0)).toBe(30)
  })
})

describe('the Most played shelf', () => {
  const byId = new Map(['a', 'b', 'c', 'd'].map((id) => [id, track(id)]))
  it('takes songs played twice or more, most first, then the newest', () => {
    const counts = { a: { n: 2, last: 1 }, b: { n: 5, last: 1 }, c: { n: 1, last: 9 }, d: { n: 2, last: 7 } }
    expect(mostPlayed(counts, byId).map((t) => t.id)).toEqual(['b', 'd', 'a'])
  })
  it('leaves out songs no longer in the library, and stops at the most', () => {
    expect(mostPlayed({ gone: { n: 9, last: 1 } }, byId)).toEqual([])
    const many = new Map(Array.from({ length: 40 }, (_, i) => [`t${i}`, track(`t${i}`)]))
    const counts = Object.fromEntries([...many.keys()].map((id) => [id, { n: 3, last: 1 }]))
    expect(mostPlayed(counts, many)).toHaveLength(MOST_PLAYED_MAX)
  })
})

describe('the starter shelf', () => {
  it('picks one song each from different artists and albums', () => {
    const tracks = ['p', 'q', 'r', 's', 't', 'u'].flatMap((artist) => [track(`${artist}1`, `${artist}-al`, artist), track(`${artist}2`, `${artist}-al`, artist)])
    const picks = starterPicks(tracks, [])
    expect(picks).toHaveLength(3)
    expect(new Set(picks.map((id) => id[0])).size).toBe(3)
    expect(new Set(starterPicks(tracks, [], 5).map((id) => id[0])).size).toBe(5)
  })
  it('fills from other albums when there are few artists', () => {
    const tracks = [track('a1', 'A1', 'a'), track('a2', 'A2', 'a'), track('b1', 'B1', 'b'), track('b2', 'B2', 'b'), track('b3', 'B3', 'b')]
    expect(starterPicks(tracks, [], 5)).toHaveLength(5)
  })
})
