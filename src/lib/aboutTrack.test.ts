import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Track } from './types'

// "About this track" — the choosing, which is where it can go wrong quietly: a
// wrong article looks exactly like a right one. The pages below are trimmed
// from real Wikipedia answers, 2026-09-13.

const library = vi.hoisted(() => ({
  getAboutRecord: vi.fn(async (): Promise<unknown> => null),
  putAboutRecord: vi.fn(async () => {}),
}))
vi.mock('./library', () => library)

import {
  CACHE_VERSION,
  FOUND_TTL_MS,
  NONE_TTL_MS,
  aboutTrack,
  artistNames,
  artistTitles,
  cacheUsable,
  normalizeName,
  paragraphs,
  pickArtist,
  pickSong,
  type Page,
} from './aboutTrack'

const NIN_HURT: Page = {
  title: 'Hurt (Nine Inch Nails song)',
  index: 1,
  extract:
    '"Hurt" is a song by American industrial rock band Nine Inch Nails from its 1994 studio album The Downward Spiral. In 2002, Johnny Cash covered the song to wide acclaim.',
}

describe('pickSong', () => {
  it('takes the song, not the EP or the disambiguation page', () => {
    const pages: Page[] = [
      { title: 'Twist and Shout (EP)', index: 1, extract: 'Twist and Shout is the first UK extended play by the English rock band the Beatles.' },
      {
        title: 'Twist and Shout',
        index: 2,
        extract:
          '"Twist and Shout" is a 1961 song written by Phil Medley and Bert Berns. It was originally recorded by The Top Notes. The song has been covered by several artists, including the Beatles.',
      },
      { title: 'Twist and Shout (disambiguation)', index: 3, pageprops: { disambiguation: '' }, extract: '"Twist and Shout" is a song.' },
    ]
    expect(pickSong(pages, 'Twist and Shout', 'The Beatles')?.title).toBe('Twist and Shout')
  })

  it('skips an album of the same name', () => {
    const pages: Page[] = [
      { title: 'Imagine (John Lennon album)', index: 1, extract: 'Imagine is the second solo studio album by John Lennon, with the song "Imagine".' },
      { title: 'Imagine (song)', index: 2, extract: '"Imagine" is a song by the English musician John Lennon from his 1971 album.' },
    ]
    expect(pickSong(pages, 'Imagine', 'John Lennon')?.title).toBe('Imagine (song)')
  })

  it('finds a cover under the ORIGINAL artist when the article mentions the cover', () => {
    expect(pickSong([NIN_HURT], 'Hurt', 'Johnny Cash')?.title).toBe('Hurt (Nine Inch Nails song)')
    const hallelujah: Page = {
      title: 'Hallelujah (Leonard Cohen song)',
      index: 1,
      extract: '"Hallelujah" is a song written by Canadian singer Leonard Cohen. A version by Jeff Buckley was released in 1994.',
    }
    expect(pickSong([hallelujah], 'Hallelujah', 'Jeff Buckley')?.title).toBe('Hallelujah (Leonard Cohen song)')
  })

  it('refuses an article that never mentions this artist — wrong facts are worse than none', () => {
    expect(pickSong([NIN_HURT], 'Hurt', 'Some Local Band')).toBeNull()
  })

  it('prefers the song of the same name by THIS artist', () => {
    const aguilera: Page = {
      title: 'Hurt (Christina Aguilera song)',
      index: 2,
      extract: '"Hurt" is a song by American singer Christina Aguilera from her fifth studio album.',
    }
    expect(pickSong([NIN_HURT, aguilera], 'Hurt', 'Christina Aguilera')?.title).toBe('Hurt (Christina Aguilera song)')
  })
})

describe('pickArtist', () => {
  it('follows where a title LANDS — "Prince (band)" redirects to his backing band', () => {
    const body = {
      query: {
        redirects: [{ from: 'Prince (band)', to: 'The Revolution (band)' }],
        pages: [
          { title: 'Prince', extract: 'Prince is a male ruler or member of a royal family.' },
          { title: 'The Revolution (band)', extract: 'The Revolution is an American funk rock band formed in Minneapolis.' },
          { title: 'Prince (musician)', extract: 'Prince Rogers Nelson was an American singer, songwriter and musician.' },
        ],
      },
    }
    expect(pickArtist(body, ['Prince'], artistTitles(['Prince']))?.title).toBe('Prince (musician)')
  })

  it('passes over a disambiguation page to the band', () => {
    const body = {
      query: {
        pages: [
          { title: 'Queen', pageprops: { disambiguation: '' }, extract: 'Queen may refer to:' },
          { title: 'Queen (band)', extract: 'Queen are a British rock band formed in London in 1970.' },
        ],
      },
    }
    expect(pickArtist(body, ['Queen'], artistTitles(['Queen']))?.title).toBe('Queen (band)')
  })
})

describe('names', () => {
  it('tries a name with "&" whole before its first half', () => {
    expect(artistNames('Simon & Garfunkel')).toEqual(['Simon & Garfunkel', 'Simon'])
    expect(artistNames('Mark Ronson feat. Bruno Mars')).toEqual(['Mark Ronson feat. Bruno Mars', 'Mark Ronson'])
    expect(artistNames('Queen')).toEqual(['Queen'])
  })

  it('treats two spellings of one name alike', () => {
    expect(normalizeName('The Beatles')).toBe(normalizeName('Beatles'))
    expect(normalizeName('Don’t Stop Me Now')).toBe(normalizeName("Don't Stop Me Now"))
    expect(normalizeName('Beyoncé')).toBe('beyonce')
  })
})

describe('paragraphs', () => {
  it('closes the holes a plain-text extract leaves', () => {
    expect(paragraphs('Queen  are  a British rock band ( ) formed in London .\n\nSecond.')).toEqual([
      'Queen are a British rock band formed in London.',
      'Second.',
    ])
  })
})

describe('cacheUsable', () => {
  const at = 1_000_000
  it('keeps an answer for ninety days and a miss for three', () => {
    const found = { id: 't', song: null, artist: { title: 'A', url: '', paragraphs: [], thumbnail: null }, at, v: CACHE_VERSION }
    const none = { id: 't', song: null, artist: null, at, v: CACHE_VERSION }
    expect(cacheUsable(found, at + FOUND_TTL_MS - 1)).toBe(true)
    expect(cacheUsable(found, at + FOUND_TTL_MS + 1)).toBe(false)
    expect(cacheUsable(none, at + NONE_TTL_MS - 1)).toBe(true)
    expect(cacheUsable(none, at + NONE_TTL_MS + 1)).toBe(false)
    expect(cacheUsable({ ...found, v: CACHE_VERSION + 1 }, at)).toBe(false)
  })
})

describe('aboutTrack', () => {
  const track = {
    id: 'track-1',
    title: 'Twist And Shout - Remastered 2009',
    artist: 'The Beatles',
    album: 'Please Please Me',
  } as Track
  let urls: string[] = []

  beforeEach(() => {
    urls = []
    library.getAboutRecord.mockResolvedValue(null)
    library.putAboutRecord.mockClear()
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        urls.push(url)
        const params = new URL(url).searchParams
        const body = params.get('gsrsearch')?.endsWith(' song')
          ? {
              query: {
                pages: [
                  {
                    title: 'Twist and Shout',
                    index: 1,
                    extract: '"Twist and Shout" is a 1961 song written by Phil Medley and Bert Berns, covered by the Beatles.',
                  },
                ],
              },
            }
          : params.get('titles')
            ? {
                query: {
                  pages: [
                    {
                      title: 'The Beatles',
                      extract: 'The Beatles were an English rock band formed in Liverpool in 1960.',
                      thumbnail: { source: 'https://upload.wikimedia.org/beatles.jpg' },
                    },
                  ],
                },
              }
            : { query: { pages: [] } }
        return { ok: true, status: 200, json: async () => body } as Response
      }),
    )
  })
  afterEach(() => vi.unstubAllGlobals())

  it('asks nothing while the lookup is off', async () => {
    await expect(aboutTrack(track, false)).resolves.toEqual({ kind: 'off' })
    expect(urls).toEqual([])
  })

  it('finds the song and the artist, and remembers them', async () => {
    const found = await aboutTrack(track, true)
    expect(found.kind).toBe('found')
    if (found.kind !== 'found') return
    expect(found.song?.title).toBe('Twist and Shout')
    expect(found.song?.url).toBe('https://en.wikipedia.org/wiki/Twist_and_Shout')
    expect(found.artist?.thumbnail).toBe('https://upload.wikimedia.org/beatles.jpg')
    expect(library.putAboutRecord).toHaveBeenCalledTimes(1)
  })

  it('sends the title and the artist — never the album', async () => {
    await aboutTrack(track, true)
    expect(urls.length).toBeGreaterThan(0)
    for (const url of urls) {
      expect(decodeURIComponent(url)).not.toContain('Please Please Me')
      expect(url.startsWith('https://en.wikipedia.org/w/api.php?')).toBe(true)
    }
  })

  it('has nothing to ask about a track with no artist', async () => {
    await expect(aboutTrack({ ...track, artist: undefined, albumArtist: undefined }, true)).resolves.toEqual({ kind: 'untagged' })
    expect(urls).toEqual([])
  })
})
