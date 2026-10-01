import { describe, expect, it } from 'vitest'
import { shuffleScope, type ShuffleView } from './shuffleScope'
import type { Album, Track } from './types'

const track = (id: string, albumId: string, artist: string, genre?: string): Track =>
  ({ id, albumId, title: id, artist, album: albumId, genre }) as unknown as Track

// Damien Rice's "9" is half Singer & Songwriter, half Rock; Norah Jones is all
// Jazz; Greg Holden has a two-song single.
const tracks: Track[] = [
  track('9 Crimes', 'nine', 'Damien Rice', 'Singer & Songwriter'),
  track('Rootless Tree', 'nine', 'Damien Rice', 'Rock'),
  track('Elephant', 'nine', 'Damien Rice', 'Rock'),
  track('Creepin In', 'feels', 'Norah Jones', 'Jazz'),
  track('Sunrise', 'feels', 'Norah Jones', 'Jazz'),
  track('Those Sweet Words', 'feels', 'Norah Jones', 'Jazz'),
  track('Boys in the Street', 'single', 'Greg Holden', 'Singer & Songwriter'),
  track('Hold On Tight', 'single', 'Greg Holden', 'Singer & Songwriter'),
]
const albums: Album[] = [
  { id: 'nine', title: '9', artist: 'Damien Rice', trackCount: 3, cover: null },
  { id: 'feels', title: 'Feels Like Home', artist: 'Norah Jones', trackCount: 3, cover: null },
  { id: 'single', title: 'Boys in the Street', artist: 'Greg Holden', trackCount: 2, cover: null },
]
const library = { albums, tracks }
const plain: ShuffleView = { query: '', fullAlbumsOnly: false, artistsMin3: false }
const ids = (list: { id: string }[]) => list.map((x) => x.id).sort()

describe('shuffleScope — Tracks', () => {
  it('is the whole library with nothing narrowing the list', () => {
    const scope = shuffleScope('tracks', library, plain)
    expect(scope.tracks).toHaveLength(tracks.length)
    expect(scope.narrowed).toBe(false)
  })
  it('inside a genre, is only the songs in it — the reported bug', () => {
    const scope = shuffleScope('tracks', library, { ...plain, genre: 'Singer & Songwriter' })
    expect(ids(scope.tracks)).toEqual(['9 Crimes', 'Boys in the Street', 'Hold On Tight'])
    expect(scope.narrowed).toBe(true)
  })
  it('during a search, is only the matches', () => {
    const scope = shuffleScope('tracks', library, { ...plain, query: 'norah' })
    expect(ids(scope.tracks)).toEqual(['Creepin In', 'Sunrise', 'Those Sweet Words'])
  })
  it('applies the genre and the search together', () => {
    const scope = shuffleScope('tracks', library, { ...plain, genre: 'Singer & Songwriter', query: 'damien' })
    expect(ids(scope.tracks)).toEqual(['9 Crimes'])
  })
})

describe('shuffleScope — Albums', () => {
  it('inside a genre, keeps each album WHOLE, as the grid opens it', () => {
    const scope = shuffleScope('albums', library, { ...plain, genre: 'Singer & Songwriter' })
    expect(ids(scope.albums)).toEqual(['nine', 'single'])
    expect(ids(scope.tracks)).toEqual(['9 Crimes', 'Boys in the Street', 'Elephant', 'Hold On Tight', 'Rootless Tree'])
  })
  it('honours "Full albums"', () => {
    const scope = shuffleScope('albums', library, { ...plain, fullAlbumsOnly: true })
    expect(ids(scope.albums)).toEqual(['feels', 'nine'])
    expect(scope.narrowed).toBe(true)
  })
})

describe('shuffleScope — Artists', () => {
  it('honours "Min. 3" and the search', () => {
    expect(ids(shuffleScope('artists', library, { ...plain, artistsMin3: true }).albums)).toEqual(['feels', 'nine'])
    const scope = shuffleScope('artists', library, { ...plain, query: 'greg' })
    expect(ids(scope.albums)).toEqual(['single'])
    expect(ids(scope.tracks)).toEqual(['Boys in the Street', 'Hold On Tight'])
  })
  it('is empty when nothing on screen matches — the button hides', () => {
    expect(shuffleScope('artists', library, { ...plain, query: 'nobody' }).tracks).toEqual([])
  })
})
