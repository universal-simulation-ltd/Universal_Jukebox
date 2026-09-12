import { describe, expect, it } from 'vitest'
import {
  GENRE_MIN, NO_GENRE, albumGenres, groupByGenre, hiddenByGenre, id3v1Genre,
  normaliseGenres, shownGenres, tallyGenres, trackGenres,
} from './genres'
import type { Album, Track } from './types'

const track = (id: string, genre?: string, albumId = 'alb'): Track =>
  ({ id, path: `${id}.mp3`, name: `${id}.mp3`, size: 1, mtime: 1, ext: 'mp3', title: id, albumId, genre }) as Track

const songs = (genre: string | undefined, n: number, from = 0) =>
  Array.from({ length: n }, (_, i) => track(`${genre ?? 'none'}-${from + i}`, genre))

describe('reading a genre tag', () => {
  it('takes the words as they are', () => {
    expect(normaliseGenres('Blues')).toEqual(['Blues'])
    expect(normaliseGenres('  Post-Rock  ')).toEqual(['Post-Rock'])
    expect(normaliseGenres('Drum   &   Bass')).toEqual(['Drum & Bass'])
  })

  it('has no genre for an empty or missing tag', () => {
    expect(normaliseGenres(undefined)).toEqual([])
    expect(normaliseGenres('')).toEqual([])
    expect(normaliseGenres('   ')).toEqual([])
  })

  it('resolves ID3v1 numbers, which is most of what old MP3s carry', () => {
    expect(normaliseGenres('(17)')).toEqual(['Rock'])
    expect(normaliseGenres('17')).toEqual(['Rock'])
    expect(normaliseGenres('(0)')).toEqual(['Blues'])
    // The words win where a refinement follows the number, as ID3v1 intended.
    expect(normaliseGenres('(17)Hardcore')).toEqual(['Hardcore'])
  })

  it('gives no genre for a number nobody named, rather than a shelf called "482"', () => {
    expect(normaliseGenres('482')).toEqual([])
    expect(normaliseGenres('(482)')).toEqual([])
  })

  it('is one genre per value: `;` and NUL split, `/` and `,` do not', () => {
    expect(normaliseGenres('Rock;Blues')).toEqual(['Rock', 'Blues'])
    expect(normaliseGenres('Rock\0Blues')).toEqual(['Rock', 'Blues'])
    // Real genres with punctuation in their names, from the lists people tag from.
    expect(normaliseGenres('Pop/Funk')).toEqual(['Pop/Funk'])
    expect(normaliseGenres('Folk, World, & Country')).toEqual(['Folk, World, & Country'])
  })

  it('does not repeat a genre a tag names twice', () => {
    expect(normaliseGenres('Rock;rock')).toEqual(['Rock'])
  })

  it('knows the numbers are fixed for ever', () => {
    expect(id3v1Genre(0)).toBe('Blues')
    expect(id3v1Genre(17)).toBe('Rock')
    expect(id3v1Genre(32)).toBe('Classical')
    expect(id3v1Genre(-1)).toBeUndefined()
    expect(id3v1Genre(999)).toBeUndefined()
  })
})

describe('the tally', () => {
  it('counts the songs behind each genre, A–Z, with "No genre" last', () => {
    const tally = tallyGenres([...songs('Rock', 4), ...songs('Blues', 2), ...songs(undefined, 3)])
    expect(tally).toEqual([
      { name: 'Blues', songs: 2 },
      { name: 'Rock', songs: 4 },
      { name: NO_GENRE, songs: 3 },
    ])
  })

  it('is one genre however the tags spell it, shown the way most songs spell it', () => {
    const tally = tallyGenres([...songs('rock', 1), ...songs('Rock', 3, 10), ...songs('ROCK', 1, 20)])
    expect(tally).toEqual([{ name: 'Rock', songs: 5 }])
  })

  it('counts a song tagged twice under both', () => {
    expect(tallyGenres([track('a', 'Rock;Blues')])).toEqual([
      { name: 'Blues', songs: 1 },
      { name: 'Rock', songs: 1 },
    ])
  })
})

describe(`the ${GENRE_MIN}-song rule`, () => {
  const tally = tallyGenres([...songs('Rock', 5), ...songs('Blues', 3), ...songs('Skiffle', 2), ...songs('Yodel', 1)])

  it('shows a genre with three songs and hides one with two', () => {
    expect(shownGenres(tally)).toEqual(['Blues', 'Rock'])
  })

  it('says what it is not showing, so a vanished EP is not a mystery', () => {
    expect(hiddenByGenre(tally)).toEqual({ songs: 3, genres: 2 })
  })

  it('hides nothing when every genre is big enough', () => {
    expect(hiddenByGenre(tallyGenres(songs('Rock', 5)))).toEqual({ songs: 0, genres: 0 })
  })
})

describe('the shelves themselves', () => {
  const library = [...songs('Rock', 4), ...songs('Blues', 3), ...songs('Skiffle', 2)]
  const shown = shownGenres(tallyGenres(library))

  it('is one shelf per genre, in shelf order, holding that genre only', () => {
    const groups = groupByGenre(library, trackGenres, shown)
    expect(groups.map((g) => g.genre)).toEqual(['Blues', 'Rock'])
    expect(groups[0].items).toHaveLength(3)
    expect(groups[1].items).toHaveLength(4)
  })

  it('leaves out the songs whose only genre is too small', () => {
    const groups = groupByGenre(library, trackGenres, shown)
    const on = groups.flatMap((g) => g.items.map((t) => t.id))
    expect(on.some((id) => id.startsWith('Skiffle'))).toBe(false)
    expect(on).toHaveLength(7)
  })

  it('puts a song tagged two ways on both shelves', () => {
    const both = [...songs('Rock', 3), ...songs('Blues', 3), track('x', 'Rock;Blues')]
    const groups = groupByGenre(both, trackGenres, shownGenres(tallyGenres(both)))
    expect(groups.every((g) => g.items.some((t) => t.id === 'x'))).toBe(true)
  })

  it('never shows an empty shelf', () => {
    const groups = groupByGenre([], trackGenres, ['Rock', 'Blues'])
    expect(groups).toEqual([])
  })

  it('files untagged songs under "No genre", last, once there are three', () => {
    const library2 = [...songs('Rock', 3), ...songs(undefined, 3)]
    const groups = groupByGenre(library2, trackGenres, shownGenres(tallyGenres(library2)))
    expect(groups.map((g) => g.genre)).toEqual(['Rock', NO_GENRE])
  })
})

describe('an album or an artist takes its songs’ genres', () => {
  const album = (id: string): Album => ({ id, title: id, artist: 'Someone', trackCount: 2, cover: null })

  it('is the genres of the songs on it', () => {
    const genresOf = albumGenres([track('a', 'Blues', 'alb1'), track('b', 'Blues', 'alb1'), track('c', 'Rock', 'alb2')])
    expect(genresOf(album('alb1'))).toEqual(['Blues'])
    expect(genresOf(album('alb2'))).toEqual(['Rock'])
  })

  it('stands on both shelves when its songs disagree — a compilation is both', () => {
    const genresOf = albumGenres([track('a', 'Blues', 'alb1'), track('b', 'Rock', 'alb1')])
    expect(genresOf(album('alb1')).sort()).toEqual(['Blues', 'Rock'])
  })

  it('has no genre when nothing on it is tagged', () => {
    expect(albumGenres([track('a', undefined, 'alb1')])(album('alb1'))).toEqual([])
  })
})
