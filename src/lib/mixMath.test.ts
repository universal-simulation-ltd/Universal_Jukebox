import { describe, expect, it } from 'vitest'
import { SEC_PER_REV, angleDelta, bendFromTurn, clampSpeed, crossfadeGains, discAngleDeg, onRim, speedPercent, turnToSec } from './mixMath'

describe('the Mix tab', () => {
  it('crossfades at equal power: one deck at each end, both at ~71% in the middle', () => {
    expect(crossfadeGains(-1)).toEqual([1, 0])
    expect(crossfadeGains(1)).toEqual([0, 1])
    const [a, b] = crossfadeGains(0)
    expect(a).toBeCloseTo(Math.SQRT1_2)
    expect(b).toBeCloseTo(Math.SQRT1_2)
    expect(a * a + b * b).toBeCloseTo(1)
    expect(crossfadeGains(-7)).toEqual([1, 0])
  })

  it('turns the shortest way round, across the ±π seam', () => {
    expect(angleDelta(0, 0.5)).toBeCloseTo(0.5)
    expect(angleDelta(3, -3)).toBeCloseTo(2 * Math.PI - 6)
    expect(angleDelta(-3, 3)).toBeCloseTo(6 - 2 * Math.PI)
  })

  it('a full turn of the record is 1.8 seconds at 33⅓', () => {
    expect(SEC_PER_REV).toBeCloseTo(1.8)
    expect(turnToSec(2 * Math.PI)).toBeCloseTo(1.8)
    expect(turnToSec(-Math.PI)).toBeCloseTo(-0.9)
    expect(discAngleDeg(0.45)).toBeCloseTo(90)
    expect(discAngleDeg(1.8 * 3 + 0.9)).toBeCloseTo(180)
  })

  it('turning the edge bends the speed, capped', () => {
    // At the record's own speed: +35%.
    expect(bendFromTurn((2 * Math.PI) / SEC_PER_REV / 10, 100)).toBeCloseTo(0.35)
    expect(bendFromTurn(-100, 10)).toBe(-0.5)
    expect(bendFromTurn(1, 0)).toBe(0)
    expect(onRim(90, 100)).toBe(true)
    expect(onRim(50, 100)).toBe(false)
  })

  it('keeps the speed in range, snaps to normal, and reads it as a pitch', () => {
    expect(clampSpeed(2)).toBe(1.25)
    expect(clampSpeed(0.1)).toBe(0.75)
    expect(clampSpeed(1.002)).toBe(1)
    expect(speedPercent(1)).toBe('0.0%')
    expect(speedPercent(1.032)).toBe('+3.2%')
    expect(speedPercent(0.92)).toBe('−8.0%')
  })
})
