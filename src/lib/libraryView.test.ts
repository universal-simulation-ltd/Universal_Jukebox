import { describe, expect, it } from 'vitest'
import { isFullAlbum, seededOrder } from './libraryView'
import type { Album } from './types'

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
