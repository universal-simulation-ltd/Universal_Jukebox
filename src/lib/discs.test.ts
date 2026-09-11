import { describe, expect, it } from 'vitest'
import { discPart, mergeDiscSets } from './discs'
import type { Album, Track } from './types'

const album = (id: string, title: string, artist = 'Britney Spears', extra: Partial<Album> = {}): Album => ({
  id, title, artist, trackCount: 2, cover: null, ...extra,
})
const track = (id: string, albumId: string, trackNo: number, discNo?: number): Track => ({
  id, path: `${id}.mp3`, name: `${id}.mp3`, size: 1, mtime: 1, ext: 'mp3', title: id, albumId, trackNo, discNo,
})

describe('discPart', () => {
  it.each([
    ['The Essential Britney Spears (1)', 'The Essential Britney Spears', 1],
    ['The Essential Britney Spears (2)', 'The Essential Britney Spears', 2],
    ['Live [CD 2]', 'Live', 2],
    ['Anthology (Disc 1 of 3)', 'Anthology', 1],
    ['Anthology - Disc 2', 'Anthology', 2],
    ['Anthology CD3', 'Anthology', 3],
  ])('%s is disc %i of %s', (title, base, disc) => {
    expect(discPart(title)).toEqual({ base, disc })
  })

  it.each(['Blink-182', '21', 'Adele 21', 'Kill Bill Vol. 1', 'Greatest Hits (2004)', '1999 (Remastered)', '(1)'])(
    '%s is not a disc',
    (title) => {
      expect(discPart(title)).toEqual({ base: title, disc: null })
    },
  )
})

describe('mergeDiscSets', () => {
  it('joins the unnumbered album and its (1), (2) into one, numbering the discs', () => {
    const albums = [
      album('a0', 'The Essential Britney Spears', undefined, { year: 2013, cover: new Blob(['x']) }),
      album('a2', 'The Essential Britney Spears (2)', undefined, { year: 2013 }),
      album('a1', 'The Essential Britney Spears (1)', undefined, { year: 2012 }),
      album('b', 'Circus'),
    ]
    const tracks = [track('t1', 'a0', 1), track('t2', 'a0', 2), track('t3', 'a1', 1), track('t4', 'a1', 2), track('t5', 'a2', 1), track('t6', 'b', 1)]
    const out = mergeDiscSets(tracks, albums)
    expect(out.albums.map((a) => [a.id, a.title, a.trackCount, a.year])).toEqual([
      ['a0', 'The Essential Britney Spears', 6, 2012],
      ['b', 'Circus', 2, undefined],
    ])
    expect(out.albums[0].cover).toBe(albums[0].cover)
    expect(out.tracks.map((t) => [t.id, t.albumId, t.discNo])).toEqual([
      ['t1', 'a0', 1], ['t2', 'a0', 1], ['t3', 'a0', 2], ['t4', 'a0', 2], ['t5', 'a0', 3], ['t6', 'b', undefined],
    ])
  })

  it('keeps disc numbers the tags already had', () => {
    const albums = [album('d1', 'Anthology (Disc 1)'), album('d2', 'Anthology (Disc 2)')]
    const tracks = [track('x', 'd1', 1, 1), track('y', 'd2', 1, 2)]
    const out = mergeDiscSets(tracks, albums)
    expect(out.albums.map((a) => [a.id, a.title])).toEqual([['d1', 'Anthology']])
    expect(out.tracks.map((t) => [t.albumId, t.discNo])).toEqual([['d1', 1], ['d1', 2]])
  })

  it('leaves a lone numbered album, and other artists, alone — and hands back the same arrays', () => {
    const albums = [album('g', 'Greatest Hits (2)'), album('p', 'Live (1)', 'Pink'), album('q', 'Live (2)', 'Queen')]
    const tracks = [track('t', 'g', 1)]
    const out = mergeDiscSets(tracks, albums)
    expect(out.albums).toBe(albums)
    expect(out.tracks).toBe(tracks)
  })
})
