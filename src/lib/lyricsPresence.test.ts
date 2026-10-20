import { describe, expect, it } from 'vitest'
import { learnLyricsPresence, retryLyricsPresence } from './lyricsPresence'
import type { Track } from './types'

function track(id: string, over: Partial<Track> = {}): Track {
  return { id, path: `${id}.mp3`, name: `${id}.mp3`, size: 1, mtime: 0, ext: 'mp3', title: id, albumId: 'x', ...over }
}

describe('learning which songs carry words', () => {
  it('asks only the unknown ones, keeps the answers, and leaves the unanswerable unknown', async () => {
    let tracks = [track('a'), track('b', { hasLyrics: false }), track('c'), track('d')]
    const asked: string[] = []
    const answers: Record<string, boolean | null> = { a: true, c: null, d: false }
    await learnLyricsPresence({
      tracks: () => tracks,
      check: async (t) => {
        asked.push(t.id)
        return answers[t.id] ?? null
      },
      publish: (found) => {
        tracks = tracks.map((t) => (found.has(t.id) ? { ...t, hasLyrics: found.get(t.id) } : t))
      },
    })
    expect(asked).toEqual(['a', 'c', 'd'])
    expect(tracks.map((t) => t.hasLyrics)).toEqual([true, false, undefined, false])

    // Not asked again this session…
    asked.length = 0
    await learnLyricsPresence({ tracks: () => tracks, check: async (t) => (asked.push(t.id), true), publish: () => {} })
    expect(asked).toEqual([])
    // …until the files change.
    retryLyricsPresence()
    await learnLyricsPresence({ tracks: () => tracks, check: async (t) => (asked.push(t.id), true), publish: () => {} })
    expect(asked).toEqual(['c'])
  })

  it('treats a check that throws as unanswerable, not as "no words"', async () => {
    let tracks = [track('e')]
    await learnLyricsPresence({
      tracks: () => tracks,
      check: async () => { throw new Error('gone') },
      publish: (found) => { tracks = tracks.map((t) => ({ ...t, hasLyrics: found.get(t.id) })) },
    })
    expect(tracks[0].hasLyrics).toBeUndefined()
  })
})
