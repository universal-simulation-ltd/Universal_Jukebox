import { describe, expect, it } from 'vitest'
import { DEFAULT_RINGS, grooveGradient, grooveRings } from './grooves'

describe('grooveRings', () => {
  it('is about a ring every ten seconds', () => {
    expect(grooveRings(180)).toBe(18)
    expect(grooveRings(420)).toBe(42)
    expect(grooveRings(90)).toBe(9)
  })
  it('stays within reason at the extremes', () => {
    expect(grooveRings(20)).toBe(8)
    expect(grooveRings(3600)).toBe(45)
  })
  it('keeps the old look for a song whose length is not known', () => {
    for (const unknown of [undefined, null, 0, NaN, Infinity, -5]) expect(grooveRings(unknown)).toBe(DEFAULT_RINGS)
  })
})

describe('grooveGradient', () => {
  it('fits the rings between the label and the rim', () => {
    // An LP's label is inset 30%: the grooves are the outer 60% of the radius.
    expect(grooveGradient(20, 0.3)).toContain('transparent 0 2.25%, rgba(255,255,255,.5) 2.25% 3%')
    // A 45's label is inset 25%: the outer half.
    expect(grooveGradient(10, 0.25)).toContain('3.75% 5%')
  })
})
