import { describe, expect, it } from 'vitest'
import { planVoice, type VoicePlan } from './voiceSearch'
import type { Track } from './types'

function track(id: string, title: string, artist: string, album: string, trackNo: number, genre?: string): Track {
  return {
    id, path: `${artist}/${album}/${title}.mp3`, name: `${title}.mp3`, size: 1, mtime: 1, ext: 'mp3',
    title, artist, album, trackNo, genre, albumId: `${artist}|${album}`,
  }
}

const tracks: Track[] = [
  track('ka2', 'Kid A', 'Radiohead', 'Kid A', 3, 'Rock'),
  track('ka1', 'Everything in Its Right Place', 'Radiohead', 'Kid A', 1, 'Rock'),
  track('ok1', 'Airbag', 'Radiohead', 'OK Computer', 1, 'Rock'),
  track('ab1', 'Come Together', 'The Beatles', 'Abbey Road', 1, 'Rock'),
  track('ab2', 'Something', 'The Beatles', 'Abbey Road', 2, 'Rock'),
  track('bj1', 'Joga', 'Björk', 'Homogenic', 2, 'Electronic'),
  track('a1', 'A', 'Aha', 'Hunting High and Low', 1),
]

const byNo = (list: Track[]) => [...list].sort((a, b) => (a.trackNo ?? 0) - (b.trackNo ?? 0))
const plan = (request: Parameters<typeof planVoice>[0]) => planVoice(request, tracks, byNo)
const ids = (p: VoicePlan) => ('tracks' in p ? p.tracks.map((t) => t.id) : [])

describe('planVoice', () => {
  it('plays on when nothing is named', () => {
    for (const query of ['', 'music', 'some music', 'my songs', 'anything']) expect(plan({ query }).kind).toBe('play')
  })

  it('lets a name in the library beat the stock phrases', () => {
    // "Something" is a Beatles song before it is "play something".
    expect(plan({ query: 'something' }).kind).toBe('inOrder')
    expect(planVoice({ query: 'something' }, [], byNo).kind).toBe('play')
  })

  it('shuffles songs, albums or artists when asked to', () => {
    expect(plan({ query: 'shuffle' })).toEqual({ kind: 'shuffle', what: 'songs' })
    expect(plan({ query: 'shuffle my music' })).toEqual({ kind: 'shuffle', what: 'songs' })
    expect(plan({ query: 'Shuffle albums' })).toEqual({ kind: 'shuffle', what: 'albums' })
    expect(plan({ query: 'shuffle all my artists' })).toEqual({ kind: 'shuffle', what: 'artists' })
  })

  it('mixes an artist, ignoring case, accents and a leading "the"', () => {
    expect(ids(plan({ query: 'radiohead' })).sort()).toEqual(['ka1', 'ka2', 'ok1'])
    expect(ids(plan({ query: 'bjork' }))).toEqual(['bj1'])
    expect(ids(plan({ query: 'beatles' })).sort()).toEqual(['ab1', 'ab2'])
  })

  it('plays an album in order, from the start', () => {
    const p = plan({ query: 'abbey road' })
    expect(p.kind).toBe('inOrder')
    expect(ids(p)).toEqual(['ab1', 'ab2'])
  })

  it('plays a song inside its album, from that song', () => {
    const p = plan({ query: 'airbag' })
    expect(p).toMatchObject({ kind: 'inOrder', at: 0 })
    const q = plan({ query: 'something' })
    expect(q).toMatchObject({ kind: 'inOrder', at: 1 })
    expect(ids(q)).toEqual(['ab1', 'ab2'])
  })

  it('reads "<album> by <artist>"', () => {
    expect(plan({ query: 'kid a by radiohead' })).toMatchObject({ kind: 'inOrder', at: 0 })
    expect(ids(plan({ query: 'kid a by radiohead' }))).toEqual(['ka1', 'ka2'])
  })

  it('prefers the album to the song of the same name', () => {
    expect(plan({ query: 'kid a' })).toMatchObject({ kind: 'inOrder', at: 0 })
  })

  it('uses the parts the assistant split out', () => {
    expect(plan({ query: 'kid a', focus: 'song', title: 'Kid A', artist: 'Radiohead' })).toMatchObject({ kind: 'inOrder', at: 1 })
    expect(ids(plan({ query: 'x', focus: 'artist', artist: 'The Beatles' })).sort()).toEqual(['ab1', 'ab2'])
    expect(ids(plan({ query: 'electronic', focus: 'genre' }))).toEqual(['bj1'])
  })

  it('takes whole words, and not short ones, for a partial match', () => {
    expect(ids(plan({ query: 'computer' }))).toEqual(['ok1'])
    // "a" is an exact song title, but must not partly match everything else.
    expect(ids(plan({ query: 'a' }))).toEqual(['a1'])
    expect(plan({ query: 'rad' }).kind).toBe('none')
  })

  it('says what it could not find', () => {
    expect(plan({ query: 'Taylor Swift' })).toEqual({ kind: 'none', asked: 'Taylor Swift' })
  })
})
