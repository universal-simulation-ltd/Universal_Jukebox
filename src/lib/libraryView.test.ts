import { describe, expect, it } from 'vitest'
import { columnsLabel, isFullAlbum, nextColumns, seededOrder, shelfRows, shelfStarts, shuffleQueue } from './libraryView'
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
  it('albums: only the albums it is given ("Full albums only")', () => {
    const queue = shuffleQueue('albums', tracks, [albums[0], albums[2]], 5, byNumber)
    expect([...new Set(queue.map((t) => t.albumId))].sort()).toEqual(['a1', 'b1'])
    expect(queue).toHaveLength(6)
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

describe('the shelves', () => {
  const n = (count: number) => Array.from({ length: count }, (_, i) => i)
  const shape = (count: number) => shelfRows(n(count)).map((row) => row.length)
  it('keeps a small library on one shelf', () => {
    expect(shape(0)).toEqual([])
    expect(shape(20)).toEqual([20])
    expect(shape(29)).toEqual([29])
  })
  it('splits evenly, never a shelf under 15', () => {
    expect(shape(30)).toEqual([15, 15])
    expect(shape(100)).toEqual([17, 17, 17, 17, 16, 16])
  })
  it('stops at ten shelves, each a tenth', () => {
    expect(shape(150)).toEqual(Array(10).fill(15))
    expect(shape(2000)).toEqual(Array(10).fill(200))
  })
  it('keeps every album, in order', () => {
    expect(shelfRows(n(123)).flat()).toEqual(n(123))
  })
})

describe('shelfRows with a seed (shelves of different lengths)', () => {
  const list = Array.from({ length: 200 }, (_, i) => i)
  it('keeps every item once, in order, on the same number of shelves', () => {
    for (const seed of [1, 7, 12345, 999999]) {
      const rows = shelfRows(list, seed)
      expect(rows).toHaveLength(shelfRows(list).length)
      expect(rows.flat()).toEqual(list)
    }
  })
  it('varies the lengths, within about a half and one and a half times the even share', () => {
    const rows = shelfRows(list, 42)
    const lengths = rows.map((r) => r.length)
    expect(new Set(lengths).size).toBeGreaterThan(1)
    for (const n of lengths) {
      expect(n).toBeGreaterThanOrEqual(Math.floor((200 / rows.length) * 0.4))
      expect(n).toBeLessThanOrEqual(Math.ceil((200 / rows.length) * 1.7))
    }
  })
  it('is the same for the same seed, and different for another', () => {
    const lengths = (seed: number) => shelfRows(list, seed).map((r) => r.length).join(',')
    expect(lengths(5)).toBe(lengths(5))
    expect(new Set([1, 2, 3, 4, 5, 6].map(lengths)).size).toBeGreaterThan(1)
  })
  it('leaves a small library on one shelf', () => {
    expect(shelfRows(Array.from({ length: 20 }, (_, i) => i), 3)).toHaveLength(1)
  })
})

describe('where each shelf opens (shelfStarts)', () => {
  const lengths = [40, 35, 50, 20, 60, 25, 30, 45, 15, 55]
  /** Every seed a run of the app might pick — the rules have to hold for all of them. */
  const seeds = Array.from({ length: 200 }, (_, i) => i * 7919)

  it('always opens shelf 1 OR shelf 2 on its first record', () => {
    for (const seed of seeds) {
      const starts = shelfStarts(lengths, seed)
      expect(starts[0] === 0 || starts[1] === 0).toBe(true)
    }
  })

  it('uses both shelf 1 and shelf 2 across runs — it is a coin flip, not a fixed shelf', () => {
    const firsts = new Set(seeds.map((seed) => (shelfStarts(lengths, seed)[0] === 0 ? 1 : 2)))
    expect(firsts).toEqual(new Set([1, 2]))
  })

  it('never runs off the end of a shelf', () => {
    for (const seed of seeds) {
      shelfStarts(lengths, seed).forEach((start, i) => {
        expect(start).toBeGreaterThanOrEqual(0)
        expect(start).toBeLessThan(lengths[i])
      })
    }
  })

  it('starts shelves 3 and beyond somewhere of their own, not at the front', () => {
    // Not "never 0" — a random start may land on 0 — but across 200 runs the
    // shelves below the top two must be somewhere else the vast majority of
    // the time, or this is the old stagger wearing a hat.
    const belowTheTop = seeds.flatMap((seed) => shelfStarts(lengths, seed).slice(2))
    const atTheFront = belowTheTop.filter((start) => start === 0).length
    expect(atTheFront / belowTheTop.length).toBeLessThan(0.05)
  })

  it('is not the old 1st/2nd/1st/2nd stagger', () => {
    expect(shelfStarts(lengths, 12345)).not.toEqual([0, 1, 0, 1, 0, 1, 0, 1, 0, 1])
  })

  it('holds still for the same seed and moves for a different one', () => {
    expect(shelfStarts(lengths, 42)).toEqual(shelfStarts(lengths, 42))
    expect(shelfStarts(lengths, 42)).not.toEqual(shelfStarts(lengths, 43))
  })

  it('pins shelf 1 when a lead record was moved to the front of it', () => {
    for (const seed of seeds) expect(shelfStarts(lengths, seed, true)[0]).toBe(0)
  })

  it('leaves shelf 2 free to be random even with a lead', () => {
    const seconds = new Set(seeds.map((seed) => shelfStarts(lengths, seed, true)[1]))
    expect(seconds.size).toBeGreaterThan(1)
  })

  it('opens a lone shelf on its first record', () => {
    expect(shelfStarts([30], 7)).toEqual([0])
    expect(shelfStarts([], 7)).toEqual([])
  })

  it('opens a one-record shelf on the record it has', () => {
    expect(shelfStarts([1, 1, 1], 7)).toEqual([0, 0, 0])
  })
})
