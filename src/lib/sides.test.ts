import { describe, expect, it } from 'vitest'
import { sideBStarts, turnsOver } from './sides'
import type { Album, Track } from './types'

const album = { id: 'a', title: 'LP', artist: 'X', trackCount: 10, cover: null } as Album
const t = (trackNo: number, albumId = 'a') => ({ id: `${albumId}-${trackNo}`, albumId, trackNo }) as Track

describe('sides', () => {
  it('splits an album in half by track number', () => {
    expect(sideBStarts(10)).toBe(6)
    expect(sideBStarts(9)).toBe(5)
    expect(sideBStarts(3)).toBeNull()
  })

  it('turns over only from the last of side A straight into the first of side B', () => {
    expect(turnsOver(t(5), t(6), album)).toBe(true)
    expect(turnsOver(t(4), t(6), album)).toBe(false)
    expect(turnsOver(t(6), t(7), album)).toBe(false)
    expect(turnsOver(t(6), t(5), album)).toBe(false)
  })

  it('never across albums or on a short one', () => {
    expect(turnsOver(t(5, 'b'), t(6), album)).toBe(false)
    expect(turnsOver(t(1), t(2), { ...album, trackCount: 3 })).toBe(false)
  })
})
