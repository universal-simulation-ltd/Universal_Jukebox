import { beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('./library', () => ({ putHitRecord: vi.fn(async () => {}) }))

import { lookUpHit, hitScore } from './hits'
import type { Track } from './types'

// The Hits shelf against the REAL ListenBrainz, MusicBrainz and Wikidata. Off
// unless asked for — it needs the network, and the numbers move:
//
//   LIVE_HITS=1 npx vitest run src/lib/hits.live.test.ts
//
// ⚠️ Run this before relying on the shelf: `hits.ts` was written where none of
// the three could be reached, against their documented answers.

const live = process.env.LIVE_HITS === '1'

describe.skipIf(!live)('lookUpHit, asking the world', () => {
  beforeAll(() => {
    const real = globalThis.fetch
    // Node's own User-Agent is refused by Wikimedia and MusicBrainz; a browser sends its own.
    vi.stubGlobal('fetch', (url: string, init?: RequestInit) =>
      real(url, { ...init, headers: { ...(init?.headers as Record<string, string>), 'User-Agent': 'UniversalJukebox-tests/0.1 (https://opensource.unisim.co.uk/jukebox)' } }),
    )
  })

  it('a famous song is played, rated and awarded', async () => {
    const r = await lookUpHit({ id: 'q', title: 'Bohemian Rhapsody', artist: 'Queen' } as Track)
    console.log(r, hitScore(r))
    expect(r.mbid).toBeTruthy()
    expect(r.listens ?? 0).toBeGreaterThan(10_000)
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
})
