import { describe, expect, it } from 'vitest'
import { SYNC_RANGE, bpmLabel, effectiveBpm, syncPlan } from './mixSync'

describe('syncPlan', () => {
  it('matches a close tempo exactly', () => {
    const p = syncPlan(126, 128)!
    expect(p.relation).toBe('same')
    expect(126 * p.rate).toBeCloseTo(128, 6)
  })

  it('slows a faster deck down to a slower one', () => {
    const p = syncPlan(130, 125)!
    expect(p.rate).toBeLessThan(1)
    expect(130 * p.rate).toBeCloseTo(125, 6)
  })

  it('allows the edge of the range, and refuses just past it', () => {
    expect(syncPlan(100, 100 * (1 + SYNC_RANGE))).not.toBeNull()
    expect(syncPlan(100, 100 * (1 - SYNC_RANGE))).not.toBeNull()
    expect(syncPlan(100, 100 * (1 + SYNC_RANGE) + 0.5)).toBeNull()
    expect(syncPlan(100, 100 * (1 - SYNC_RANGE) - 0.5)).toBeNull()
  })

  it('lands on half of the other: 70 against 140 is already in step', () => {
    const p = syncPlan(70, 140)!
    expect(p.relation).toBe('half')
    expect(p.rate).toBe(1)
    expect(70 * p.rate * 2).toBeCloseTo(140, 6)
  })

  it('lands on half of the other, with a stretch: 68 against 140', () => {
    const p = syncPlan(68, 140)!
    expect(p.relation).toBe('half')
    expect(68 * p.rate * 2).toBeCloseTo(140, 6)
  })

  it('lands on double the other: 174 against 87', () => {
    const p = syncPlan(174, 87)!
    expect(p.relation).toBe('double')
    expect(p.rate).toBe(1)
    expect(174 * p.rate).toBeCloseTo(2 * 87, 6)
  })

  it('takes the smallest stretch when two relations fit', () => {
    // 100 against 101: same tempo (1%) beats anything else.
    expect(syncPlan(100, 101)!.relation).toBe('same')
  })

  it('cannot sync tempos that are too far apart', () => {
    expect(syncPlan(90, 128)).toBeNull()
    expect(syncPlan(100, 150)).toBeNull()
  })

  it('does nothing without both tempos', () => {
    expect(syncPlan(null, 120)).toBeNull()
    expect(syncPlan(120, null)).toBeNull()
    expect(syncPlan(0, 120)).toBeNull()
    expect(syncPlan(undefined, undefined)).toBeNull()
  })

  it('every rate it returns is inside the range', () => {
    for (let a = 70; a <= 180; a += 3.7) {
      for (let b = 70; b <= 180; b += 2.9) {
        const p = syncPlan(a, b)
        if (p) expect(Math.abs(p.rate - 1)).toBeLessThanOrEqual(SYNC_RANGE + 1e-9)
      }
    }
  })
})

describe('effectiveBpm and bpmLabel', () => {
  it('the other deck is followed at the speed it is running', () => {
    expect(effectiveBpm(120, 1.05)).toBeCloseTo(126, 6)
    expect(effectiveBpm(null, 1.05)).toBeNull()
  })

  it('syncing to a deck that has been sped up matches the sped-up tempo', () => {
    const other = effectiveBpm(120, 1.05)
    const p = syncPlan(124, other)!
    expect(124 * p.rate).toBeCloseTo(126, 6)
  })

  it('shows one decimal at most', () => {
    expect(bpmLabel(128)).toBe('128')
    expect(bpmLabel(127.54)).toBe('127.5')
    expect(bpmLabel(127.96)).toBe('128')
  })
})
