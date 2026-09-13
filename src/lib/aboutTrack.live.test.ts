import { beforeAll, describe, expect, it, vi } from 'vitest'
import { aboutTrack } from './aboutTrack'
import type { Track } from './types'

// "About this track" against the REAL Wikipedia, for the cases its choosing
// rules were written against. Off unless asked for — it needs the network, and
// Wikipedia's articles move under it:
//
//   LIVE_WIKI=1 npx vitest run src/lib/aboutTrack.live.test.ts
//
// `aboutTrack.test.ts` is the one that runs every time, on trimmed copies.

const live = process.env.LIVE_WIKI === '1'

/** [title, artist, the song's article, the artist's article] — null for none. */
const CASES: [string, string, string | null, string | null][] = [
  ['Twist and Shout', 'The Beatles', 'Twist and Shout', 'The Beatles'],
  ['Imagine', 'John Lennon', 'Imagine (song)', 'John Lennon'],
  // Covers: the article is the ORIGINAL's, which names the cover.
  ['Hallelujah', 'Jeff Buckley', 'Hallelujah (Leonard Cohen song)', 'Jeff Buckley'],
  ['Hurt', 'Johnny Cash', 'Hurt (Nine Inch Nails song)', 'Johnny Cash'],
  // The same title by somebody else is somebody else's article.
  ['Hurt', 'Christina Aguilera', 'Hurt (Christina Aguilera song)', 'Christina Aguilera'],
  // Names that are taken: the band, not the monarch; the man, not his band.
  ['Bohemian Rhapsody', 'Queen', 'Bohemian Rhapsody', 'Queen (band)'],
  ['Purple Rain', 'Prince', 'Purple Rain (song)', 'Prince (musician)'],
]

describe.skipIf(!live)('aboutTrack, asking Wikipedia', () => {
  beforeAll(() => {
    const real = globalThis.fetch
    // Node's own User-Agent is refused by Wikimedia; a browser sends its own.
    vi.stubGlobal('fetch', (url: string, init?: RequestInit) =>
      real(url, { ...init, headers: { 'User-Agent': 'UniversalJukebox-tests/0.1 (https://opensource.unisim.co.uk/jukebox)' } }),
    )
  })

  for (const [title, artist, song, who] of CASES) {
    it(`${title} — ${artist}`, async () => {
      const found = await aboutTrack({ id: `${artist}:${title}`, title, artist } as Track, true)
      const got = found.kind === 'found' ? [found.song?.title ?? null, found.artist?.title ?? null] : [null, null]
      console.log(`${title} — ${artist}: ${found.kind} song=${got[0]} artist=${got[1]}`)
      expect(got).toEqual([song, who])
    }, 20_000)
  }
})
