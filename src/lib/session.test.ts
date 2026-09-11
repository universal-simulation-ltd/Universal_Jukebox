import { describe, expect, it } from 'vitest'
import { windowAround } from './session'

describe('windowAround', () => {
  const ids = Array.from({ length: 50 }, (_, i) => `t${i}`)
  it('keeps a short queue whole', () => {
    expect(windowAround(ids, 7, 100)).toEqual({ ids, cursor: 7 })
  })
  it('keeps a window around the position in a long one, still pointing at the same track', () => {
    const kept = windowAround(ids, 30, 10)
    expect(kept.ids).toHaveLength(10)
    expect(kept.ids[kept.cursor]).toBe('t30')
  })
  it('does not run off either end', () => {
    expect(windowAround(ids, 2, 10).ids[0]).toBe('t0')
    const end = windowAround(ids, 49, 10)
    expect(end.ids.at(-1)).toBe('t49')
    expect(end.ids[end.cursor]).toBe('t49')
  })
})
