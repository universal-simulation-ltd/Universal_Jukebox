import { describe, expect, it, vi } from 'vitest'

// `hits.ts` keeps its answers through `library.ts`, which is IndexedDB.
vi.mock('./library', () => ({ putHitRecord: vi.fn(async () => {}) }))

import {
  AWARDS_MIN_LISTENERS, CACHE_VERSION, HITS_MAX, TTL_MS, countAwards, hitScore, isHit, lookUpPlays, parseLookups, parsePopularity, parseRating, rankHits,
  recordFresh, wantsDeep,
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
  it('ListenBrainz lookup: each row by its index, nothing for a row not matched', () => {
    // As answered on 2026-11-01: any order, and an unmatched row simply missing.
    const body = [
      { index: 2, artist_credit_name: 'Adele', recording_mbid: 'mb-hello', recording_name: 'Hello' },
      { index: 0, artist_credit_name: 'Queen', recording_mbid: 'b1a9c0e9-d987-4042-ae91-78d6a3267d69', recording_name: 'Bohemian Rhapsody' },
    ]
    expect(parseLookups(body, 3)).toEqual(['b1a9c0e9-d987-4042-ae91-78d6a3267d69', null, 'mb-hello'])
    expect(parseLookups([{ index: 5, recording_mbid: 'x' }, { index: 0, recording_mbid: '' }], 2)).toEqual([null, null])
    expect(parseLookups([], 2)).toEqual([null, null])
    expect(parseLookups({ code: 401, error: 'You need to provide an Authorization header.' }, 1)).toEqual([null])
    expect(parseLookups(null, 1)).toEqual([null])
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

describe('the two passes', () => {
  it('asks for ratings and awards only after plays, and only for songs the world plays', () => {
    expect(wantsDeep(record('a', { deep: false, listeners: AWARDS_MIN_LISTENERS }))).toBe(true)
    expect(wantsDeep(record('a', { deep: false, listeners: AWARDS_MIN_LISTENERS - 1 }))).toBe(false)
    expect(wantsDeep(record('a', { deep: false, listeners: 9999, mbid: null }))).toBe(false)
    expect(wantsDeep(record('a', { deep: true, listeners: 9999 }))).toBe(false)
    // Kept before 2026-11-01: all three were asked at once.
    expect(wantsDeep(record('a', { listeners: 9999 }))).toBe(false)
  })

  it('plays: one match and one popularity request for the whole batch; the same song asked once', async () => {
    const calls: Array<{ url: string; body: unknown }> = []
    vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body))
      calls.push({ url, body })
      const answer = url.includes('acr-lookup')
        ? [{ index: 1, recording_mbid: 'mb-hello' }, { index: 0, recording_mbid: 'mb-bo' }]
        : [{ recording_mbid: 'mb-bo', total_listen_count: 2_000_000, total_user_count: 200_000 }, { recording_mbid: 'mb-hello', total_listen_count: 50, total_user_count: 5 }]
      return new Response(JSON.stringify(answer), { status: 200 })
    })
    try {
      const tracks = [
        track('t1', 'Bohemian Rhapsody', 'Queen'),
        track('t2', 'Hello', 'Adele'),
        track('t3', 'Bohemian  Rhapsody ', 'QUEEN'), // the same song, tagged differently
        track('t4', 'Qwxzv', 'Nobody'),
        { id: 't5', title: 'No artist' } as unknown as Track,
      ]
      const out = new Map((await lookUpPlays(tracks)).map((r) => [r.id, r]))
      expect(calls.map((c) => c.url.includes('acr-lookup'))).toEqual([true, false])
      expect(calls[0].body).toEqual([
        { artist_credit_name: 'Queen', recording_name: 'Bohemian Rhapsody' },
        { artist_credit_name: 'Adele', recording_name: 'Hello' },
        { artist_credit_name: 'Nobody', recording_name: 'Qwxzv' },
      ])
      expect(calls[1].body).toEqual({ recording_mbids: ['mb-bo', 'mb-hello'] })
      expect(out.get('t1')).toMatchObject({ mbid: 'mb-bo', listens: 2_000_000, listeners: 200_000, rating: null, awards: null, deep: false })
      expect(out.get('t3')).toMatchObject({ mbid: 'mb-bo', listens: 2_000_000 })
      expect(out.get('t2')).toMatchObject({ mbid: 'mb-hello', listens: 50 })
      expect(out.get('t4')).toMatchObject({ mbid: null, listens: null, deep: false })
      expect(out.get('t5')).toMatchObject({ mbid: null })
      expect(out.size).toBe(5)
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('plays: a failed request keeps nothing and throws', async () => {
    vi.stubGlobal('fetch', async () => new Response('down', { status: 500 }))
    try {
      await expect(lookUpPlays([track('t1', 'Hello', 'Adele')])).rejects.toThrow('HTTP 500')
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
