import { describe, expect, it } from 'vitest'
import { fadeLevel } from './fadeCurve'

describe('fadeLevel', () => {
  it('starts and ends where it is told, both ways', () => {
    for (const curve of ['linear', 'equal-power'] as const) {
      expect(fadeLevel(0, 1, 0, curve)).toBeCloseTo(0)
      expect(fadeLevel(0, 1, 1, curve)).toBeCloseTo(1)
      expect(fadeLevel(1, 0, 0, curve)).toBeCloseTo(1)
      expect(fadeLevel(1, 0, 1, curve)).toBeCloseTo(0)
    }
  })

  it('a crossfade holds the loudness of one track all the way across', () => {
    for (let t = 0; t <= 1; t += 0.05) {
      const rising = fadeLevel(0, 1, t, 'equal-power')
      const falling = fadeLevel(1, 0, t, 'equal-power')
      expect(rising ** 2 + falling ** 2).toBeCloseTo(1, 6)
    }
  })

  it('keeps the old track up early on — it no longer falls away before the next arrives', () => {
    // It used to be 1 − √0.25 = 0.5 a quarter of the way through.
    expect(fadeLevel(1, 0, 0.25, 'equal-power')).toBeGreaterThan(0.9)
    expect(fadeLevel(1, 0, 0.5, 'equal-power')).toBeCloseTo(Math.SQRT1_2, 6)
  })

  it('only ever moves one way, and clamps t', () => {
    let last = 1
    for (let t = 0; t <= 1; t += 0.1) {
      const v = fadeLevel(1, 0, t, 'equal-power')
      expect(v).toBeLessThanOrEqual(last + 1e-12)
      last = v
    }
    expect(fadeLevel(0, 1, 2, 'equal-power')).toBeCloseTo(1)
    expect(fadeLevel(0, 1, -1, 'equal-power')).toBeCloseTo(0)
  })
})
