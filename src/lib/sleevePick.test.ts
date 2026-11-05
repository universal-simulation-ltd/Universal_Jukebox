import { describe, expect, it } from 'vitest'
import { pickPhotos } from './sleevePick'

const PHOTOS = Array.from({ length: 20 }, (_, i) => `p${i}`)

describe('picking photos for albums with no artwork', () => {
  it('never gives one artist the same photo twice', () => {
    const albums = Array.from({ length: 12 }, (_, i) => ({ id: `Prince Album ${i}`, artist: 'Prince' }))
    const picked = pickPhotos(albums, PHOTOS, {})
    expect(new Set(albums.map((a) => picked[a.id])).size).toBe(12)
  })

  it('spreads use evenly: 40 albums wear each of 20 photos twice', () => {
    const albums = Array.from({ length: 40 }, (_, i) => ({ id: `Artist ${i} Album`, artist: `Artist ${i}` }))
    const picked = pickPhotos(albums, PHOTOS, {})
    const uses = new Map<string, number>()
    for (const a of albums) uses.set(picked[a.id], (uses.get(picked[a.id]) ?? 0) + 1)
    expect([...uses.values()].every((n) => n === 2)).toBe(true)
  })

  it('keeps a choice made before, even as albums are added', () => {
    const first = [{ id: 'B album', artist: 'B' }, { id: 'D album', artist: 'D' }]
    const kept = pickPhotos(first, PHOTOS, {})
    const later = pickPhotos([...first, { id: 'A album', artist: 'A' }, { id: 'C album', artist: 'C' }], PHOTOS, kept)
    expect(later['B album']).toBe(kept['B album'])
    expect(later['D album']).toBe(kept['D album'])
  })

  it('re-dresses an album whose kept photo has left the set, and copes with an artist with more albums than photos', () => {
    expect(pickPhotos([{ id: 'x', artist: 'X' }], PHOTOS, { x: 'gone' }).x).toMatch(/^p\d+$/)
    const many = Array.from({ length: 25 }, (_, i) => ({ id: `Bach ${i}`, artist: 'Bach' }))
    const picked = pickPhotos(many, PHOTOS, {})
    expect(many.every((a) => PHOTOS.includes(picked[a.id]))).toBe(true)
  })

  it('is the same whatever order the library lists the albums in', () => {
    const albums = Array.from({ length: 15 }, (_, i) => ({ id: `Album ${i}`, artist: `Artist ${i % 4}` }))
    expect(pickPhotos([...albums].reverse(), PHOTOS, {})).toEqual(pickPhotos(albums, PHOTOS, {}))
  })
})
