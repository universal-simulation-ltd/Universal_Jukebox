import { describe, expect, it, vi } from 'vitest'

// `hits.ts` keeps its answers through `library.ts`, which is IndexedDB.
vi.mock('./library', () => ({ putHitRecord: vi.fn(async () => {}) }))

import {
  CACHE_VERSION, HITS_MAX, TTL_MS, countAwards, hitScore, isHit, parseLookup, parsePopularity, parseRating, rankHits, recordFresh,
  type HitRecord,
} from './hits'
import type { Track } from './types'

const track = (id: string, title = id, artist = 'x') => ({ id, title, artist, albumId: 'a' }) as unknown as Track
const record = (id: string, r: Partial<HitRecord> = {}): HitRecord => ({
  id, mbid: `mb-${id}`, listens: null, listeners: null, rating: null, votes: null, awards: null, at: 0, v: CACHE_VERSION, ...r,
})

describe('the Hits score', () => {
  it('counts plays in orders of magnitude', () => {
    expect(hitScore(record('a', { listens: 999 }))).toBeCloseTo(3)
    expect(hitScore(record('a', { listens: 1_000_000 }))).toBeGreaterThan(hitScore(record('b', { listens: 10_000 })))
  })
  it('adds half an order per award, up to six', () => {
    expect(hitScore(record('a', { awards: 2 }))).toBe(1)
    expect(hitScore(record('a', { awards: 40 }))).toBe(3)
  })
  it('counts a rating only with enough votes, around a middling 3', () => {
    expect(hitScore(record('a', { rating: 5, votes: 1 }))).toBe(0)
    expect(hitScore(record('a', { rating: 5, votes: 4 }))).toBeCloseTo(0.8)
    expect(hitScore(record('a', { rating: 1, votes: 4 }))).toBeCloseTo(-0.8)
  })
})

describe('the Hits shelf', () => {
  it('needs plays worldwide or an award to be on it', () => {
    expect(isHit(record('a', { listens: 99 }))).toBe(false)
    expect(isHit(record('a', { listens: 100 }))).toBe(true)
    expect(isHit(record('a', { awards: 1 }))).toBe(true)
    expect(isHit(record('a'))).toBe(false)
  })
  it('ranks the library biggest first, leaving out songs nobody knows', () => {
    const tracks = ['a', 'b', 'c', 'd'].map((id) => track(id))
    const records = new Map([
      ['a', record('a', { listens: 500 })],
      ['b', record('b', { listens: 2_000_000 })],
      ['c', record('c', { listens: 500, awards: 3 })],
    ])
    expect(rankHits(records, tracks).map((t) => t.id)).toEqual(['b', 'c', 'a'])
  })
  it('puts the same recording on once, however many albums carry it', () => {
    const tracks = [track('album'), track('best-of'), track('other')]
    const records = new Map([
      ['album', record('album', { mbid: 'same', listens: 5000 })],
      ['best-of', record('best-of', { mbid: 'same', listens: 5000 })],
      ['other', record('other', { listens: 200 })],
    ])
    expect(rankHits(records, tracks).map((t) => t.id)).toEqual(['album', 'other'])
  })
  it('stops at the most', () => {
    const tracks = Array.from({ length: 40 }, (_, i) => track(`t${i}`))
    const records = new Map(tracks.map((t, i) => [t.id, record(t.id, { listens: 1000 + i })]))
    expect(rankHits(records, tracks)).toHaveLength(HITS_MAX)
  })
  it('asks again after the cache runs out, or for an old version', () => {
    expect(recordFresh(record('a', { at: 0 }), TTL_MS - 1)).toBe(true)
    expect(recordFresh(record('a', { at: 0 }), TTL_MS)).toBe(false)
    expect(recordFresh(record('a', { v: CACHE_VERSION - 1 }), 1)).toBe(false)
    expect(recordFresh(undefined, 1)).toBe(false)
  })
})

describe('reading the answers', () => {
  it('ListenBrainz lookup: the recording, or nothing', () => {
    expect(parseLookup({ artist_credit_name: 'Queen', recording_mbid: 'b1a9c0e9-d987-4042-ae91-78d6a3267d69', recording_name: 'Bohemian Rhapsody' }))
      .toBe('b1a9c0e9-d987-4042-ae91-78d6a3267d69')
    expect(parseLookup({})).toBeNull()
    expect(parseLookup(null)).toBeNull()
  })
  it('ListenBrainz popularity: this recording’s row', () => {
    const body = [
      { recording_mbid: 'other', total_listen_count: 9, total_user_count: 1 },
      { recording_mbid: 'mine', total_listen_count: 1_234_567, total_user_count: 45_678 },
    ]
    expect(parsePopularity(body, 'mine')).toEqual({ listens: 1_234_567, listeners: 45_678 })
    expect(parsePopularity([{ recording_mbid: 'mine', total_listen_count: null, total_user_count: null }], 'mine')).toEqual({ listens: null, listeners: null })
    expect(parsePopularity({ error: 'x' }, 'mine')).toEqual({ listens: null, listeners: null })
  })
  it('MusicBrainz rating: only with votes', () => {
    expect(parseRating({ id: 'x', rating: { value: 4.65, 'votes-count': 17 } })).toEqual({ rating: 4.65, votes: 17 })
    expect(parseRating({ id: 'x', rating: { value: null, 'votes-count': 0 } })).toEqual({ rating: null, votes: 0 })
    expect(parseRating({ id: 'x' })).toEqual({ rating: null, votes: null })
  })
  it('Wikidata awards: each award once, deprecated ones left out', () => {
    const award = (id: string, rank = 'normal') => ({ rank, mainsnak: { datavalue: { value: { 'entity-type': 'item', id } } } })
    const body = { entities: { Q1: { claims: { P166: [award('Q10'), award('Q10'), award('Q11'), award('Q12', 'deprecated')], P31: [award('Q7366')] } } } }
    expect(countAwards(body, 'Q1')).toBe(2)
    expect(countAwards({ entities: { Q1: { claims: {} } } }, 'Q1')).toBe(0)
    expect(countAwards(body, 'Q2')).toBe(0)
  })
})
