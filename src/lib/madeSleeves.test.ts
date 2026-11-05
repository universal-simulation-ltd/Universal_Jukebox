import { describe, expect, it } from 'vitest'
import { sleeveChoice } from './madeSleeves'

describe('made sleeves for albums with no artwork', () => {
  it('picks the same photo and lettering for an album every time', () => {
    expect(sleeveChoice('Mika Life in Cartoon Motion', 10)).toEqual(sleeveChoice('Mika Life in Cartoon Motion', 10))
  })

  it('spreads albums across all the photos', () => {
    const used = new Set<number>()
    for (let i = 0; i < 200; i++) {
      const { photo } = sleeveChoice(`Artist ${i % 17} Album ${i}`, 10)
      expect(photo).toBeGreaterThanOrEqual(0)
      expect(photo).toBeLessThan(10)
      used.add(photo)
    }
    expect(used.size).toBe(10)
  })
})
