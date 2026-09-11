import { describe, expect, it } from 'vitest'
import { columnsLabel, isFullAlbum, nextColumns, seededOrder, shuffleQueue } from './libraryView'
import type { Album, Track } from './types'

const items = Array.from({ length: 50 }, (_, i) => `item-${i}`)
const same = (x: string) => x

describe('seededOrder', () => {
  it('reorders without losing or adding anything', () => {
    expect([...seededOrder(items, same, 7)].sort()).toEqual([...items].sort())
  })
  it('holds still for the same seed — the page does not reshuffle as it redraws', () => {
    expect(seededOrder(items, same, 7)).toEqual(seededOrder(items, same, 7))
  })
  it('is a different order for a different seed', () => {
    expect(seededOrder(items, same, 7)).not.toEqual(seededOrder(items, same, 8))
  })
  it('is not the A–Z order', () => {
    expect(seededOrder(items, same, 7)).not.toEqual(items)
  })
  it('drops a new item in without moving the others', () => {
    const before = seededOrder(items, same, 3)
    const after = seededOrder([...items, 'new one'], same, 3).filter((x) => x !== 'new one')
    expect(after).toEqual(before)
  })
})

describe('isFullAlbum', () => {
  const album = (trackCount: number): Album => ({ id: 'a', title: 't', artist: 'x', trackCount, cover: null })
  it('is three tracks or more', () => {
    expect(isFullAlbum(album(2))).toBe(false)
    expect(isFullAlbum(album(3))).toBe(true)
    expect(isFullAlbum(album(12))).toBe(true)
  })
})

describe('shuffleQueue', () => {
  const track = (id: string, albumId: string, no: number) => ({ id, albumId, title: id, trackNo: no }) as unknown as Track
  const albums: Album[] = [
    { id: 'a1', title: 'A1', artist: 'Ann', trackCount: 3, cover: null },
    { id: 'a2', title: 'A2', artist: 'Ann', trackCount: 2, cover: null },
    { id: 'b1', title: 'B1', artist: 'Bob', trackCount: 3, cover: null },
  ]
  const tracks = [
    track('a1-3', 'a1', 3), track('a1-1', 'a1', 1), track('a1-2', 'a1', 2),
    track('a2-2', 'a2', 2), track('a2-1', 'a2', 1),
    track('b1-1', 'b1', 1), track('b1-3', 'b1', 3), track('b1-2', 'b1', 2),
  ]
  const byNumber = (list: Track[]) => [...list].sort((x, y) => (x.trackNo ?? 0) - (y.trackNo ?? 0))
  const runs = (queue: Track[], key: (t: Track) => string) => queue.map(key).filter((k, i, all) => k !== all[i - 1])

  it('songs: every track once', () => {
    expect(shuffleQueue('songs', tracks, albums, 5, byNumber).map((t) => t.id).sort()).toEqual(tracks.map((t) => t.id).sort())
  })
  it('albums: each album whole, in its running order, one after another', () => {
    const queue = shuffleQueue('albums', tracks, albums, 5, byNumber)
    expect(runs(queue, (t) => t.albumId)).toHaveLength(3)
    for (const id of ['a1', 'a2', 'b1']) {
      const numbers = queue.filter((t) => t.albumId === id).map((t) => t.trackNo)
      expect(numbers).toEqual([...numbers].sort((x, y) => (x ?? 0) - (y ?? 0)))
    }
  })
  it('artists: each artist together, all their songs', () => {
    const artistOf = (t: Track) => (t.albumId.startsWith('a') ? 'Ann' : 'Bob')
    const queue = shuffleQueue('artists', tracks, albums, 5, byNumber)
    expect(runs(queue, artistOf)).toHaveLength(2)
    expect(queue).toHaveLength(tracks.length)
  })
})

describe('the per-row button', () => {
  it('cycles 2 → 3 → 4 → jukebox → 1 → 2', () => {
    const seen: string[] = []
    let c: Parameters<typeof nextColumns>[0] = 2
    for (let i = 0; i < 5; i++) {
      seen.push(columnsLabel(c))
      c = nextColumns(c)
    }
    expect(seen).toEqual(['2 per row', '3 per row', '4 per row', 'Jukebox shelf', '1 per row'])
    expect(c).toBe(2)
  })
})
