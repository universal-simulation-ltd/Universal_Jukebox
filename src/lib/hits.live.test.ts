import { beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('./library', () => ({ putHitRecord: vi.fn(async () => {}) }))

import { lookUpDeep, lookUpPlays, hitScore, type HitRecord } from './hits'
import type { Track } from './types'

/** Both passes for one song, as the shelf ends up with them. */
async function lookUpHit(track: Track): Promise<HitRecord> {
  const [plays] = await lookUpPlays([track])
  return plays.mbid ? lookUpDeep(plays, track) : plays
}

// The Hits shelf against the REAL ListenBrainz, MusicBrainz and Wikidata. Off
// unless asked for — it needs the network, and the numbers move:
//
//   LIVE_HITS=1 npx vitest run src/lib/hits.live.test.ts
//
// ⚠️ Run this before relying on the shelf: `hits.ts` was written where none of
// the three could be reached, against their documented answers.

const live = process.env.LIVE_HITS === '1'

describe.skipIf(!live)('Hits, asking the world', () => {
  beforeAll(() => {
    const real = globalThis.fetch
    // Node's own User-Agent is refused by Wikimedia and MusicBrainz; a browser sends its own.
    vi.stubGlobal('fetch', (url: string, init?: RequestInit) =>
      real(url, { ...init, headers: { ...(init?.headers as Record<string, string>), 'User-Agent': 'UniversalJukebox-tests/0.1 (https://opensource.unisim.co.uk/jukebox)' } }),
    )
  })

  it('a famous song is played and rated', async () => {
    const r = await lookUpHit({ id: 'q', title: 'Bohemian Rhapsody', artist: 'Queen' } as Track)
    console.log(r, hitScore(r))
    expect(r.mbid).toBe('b1a9c0e9-d987-4042-ae91-78d6a3267d69')
    expect(r.listens ?? 0).toBeGreaterThan(10_000)
    expect(r.votes ?? 0).toBeGreaterThan(1)
  }, 60_000)

  // ⚠️ Wikidata's awards are sparse: on 2026-10-28 Bohemian Rhapsody, Hey Jude,
  // Billie Jean and Imagine had no P166 at all. Rolling in the Deep has two.
  it('an awarded song is awarded', async () => {
    const r = await lookUpHit({ id: 'r', title: 'Rolling in the Deep', artist: 'Adele' } as Track)
    console.log(r, hitScore(r))
    expect(r.awards ?? 0).toBeGreaterThan(0)
  }, 60_000)

  it('a famous song outranks an album track', async () => {
    const hit = await lookUpHit({ id: 'a', title: 'Smells Like Teen Spirit', artist: 'Nirvana' } as Track)
    const deep = await lookUpHit({ id: 'b', title: 'Endless, Nameless', artist: 'Nirvana' } as Track)
    console.log(hit, deep)
    expect(hitScore(hit)).toBeGreaterThan(hitScore(deep))
  }, 60_000)

  it('a made-up song is not found', async () => {
    const r = await lookUpHit({ id: 'z', title: 'Qwxzv Plorb Snarf', artist: 'Nobody Atall' } as Track)
    expect(r.mbid).toBeNull()
  }, 30_000)

  it('plays for many songs in one batch, each matched to its own row', async () => {
    const tracks = [
      { id: '1', title: 'Grace Kelly', artist: 'MIKA' },
      { id: '2', title: 'Hello', artist: 'Adele' },
      { id: '3', title: 'Qwxzv Plorb Snarf', artist: 'Nobody Atall' },
      { id: '4', title: 'Wonderwall', artist: 'Oasis' },
    ] as Track[]
    const out = new Map((await lookUpPlays(tracks)).map((r) => [r.id, r]))
    console.log(out)
    expect(out.get('1')?.mbid).toBe('f507b892-4dab-4c08-b517-4626a84041d3')
    expect(out.get('2')?.listens ?? 0).toBeGreaterThan(10_000)
    expect(out.get('3')?.mbid).toBeNull()
    expect(out.get('4')?.listens ?? 0).toBeGreaterThan(10_000)
  }, 60_000)
})
