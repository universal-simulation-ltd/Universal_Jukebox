import { describe, expect, it } from 'vitest'
import { outerTangent, packRadius, revolutionSeconds, sectorPath } from './reels'

// The reel-to-reel deck's arithmetic: tape conserved between the two packs,
// the reels turning at the rate a constant tape speed makes them, and the tape
// leaving each pack along a true tangent as the pack changes size.

describe('packRadius', () => {
  it('runs from the bare hub to a full reel', () => {
    expect(packRadius(0, 10, 20)).toBe(10)
    expect(packRadius(1, 10, 20)).toBe(20)
  })

  it('conserves tape: the two packs always hold one reel’s worth between them', () => {
    const area = (r: number) => Math.PI * (r * r - 10 * 10)
    const whole = area(20)
    for (const f of [0, 0.1, 0.37, 0.5, 0.9, 1]) {
      expect(area(packRadius(1 - f, 10, 20)) + area(packRadius(f, 10, 20))).toBeCloseTo(whole, 6)
    }
  })

  it('grows fast at first and slowly at the end, as tape does', () => {
    const early = packRadius(0.1, 10, 20) - packRadius(0, 10, 20)
    const late = packRadius(1, 10, 20) - packRadius(0.9, 10, 20)
    expect(early).toBeGreaterThan(late * 1.5)
  })

  it('never hands the drawing a NaN or a pack outside its reel', () => {
    expect(packRadius(Number.NaN, 10, 20)).toBe(10)
    expect(packRadius(-1, 10, 20)).toBe(10)
    expect(packRadius(4, 10, 20)).toBe(20)
  })
})

describe('revolutionSeconds', () => {
  it('turns a small pack faster than a big one, at one tape speed', () => {
    expect(revolutionSeconds(10, 40)).toBeLessThan(revolutionSeconds(20, 40))
    expect(revolutionSeconds(20, 40) / revolutionSeconds(10, 40)).toBeCloseTo(2, 6)
  })

  it('is one circumference of tape a turn', () => {
    expect(revolutionSeconds(1, 2 * Math.PI)).toBeCloseTo(1, 9)
  })

  it('does not turn at all with nothing to turn', () => {
    expect(revolutionSeconds(0, 40)).toBe(Infinity)
    expect(revolutionSeconds(10, 0)).toBe(Infinity)
  })
})

describe('outerTangent', () => {
  const onCircle = (p: { x: number; y: number }, c: { x: number; y: number }, r: number) =>
    expect(Math.hypot(p.x - c.x, p.y - c.y)).toBeCloseTo(r, 6)

  it('touches both circles, at right angles to each radius', () => {
    const a = { x: 26, y: 25 }
    const b = { x: 6, y: 57 }
    for (const side of ['left', 'right'] as const) {
      const [p, q] = outerTangent(a, 18, b, 2.5, side)
      onCircle(p, a, 18)
      onCircle(q, b, 2.5)
      const run = { x: q.x - p.x, y: q.y - p.y }
      expect(run.x * (p.x - a.x) + run.y * (p.y - a.y)).toBeCloseTo(0, 6)
      expect(run.x * (q.x - b.x) + run.y * (q.y - b.y)).toBeCloseTo(0, 6)
    }
  })

  it('puts the tape on the side asked for', () => {
    // Straight down from one circle to another: left of travel is +x on screen.
    const [p, q] = outerTangent({ x: 0, y: 0 }, 5, { x: 0, y: 50 }, 2, 'left')
    expect(p.x).toBeGreaterThan(0)
    expect(q.x).toBeGreaterThan(0)
    const [r, s] = outerTangent({ x: 0, y: 0 }, 5, { x: 0, y: 50 }, 2, 'right')
    expect(r.x).toBeLessThan(0)
    expect(s.x).toBeLessThan(0)
  })

  it('keeps the tape on the outside of the supply reel as it empties', () => {
    // The deck's own supply side: the tape comes off the LEFT of the pack.
    const hub = { x: 26, y: 25 }
    const guide = { x: 6.2, y: 57 }
    for (const r of [10, 15, 20.6]) {
      const [p] = outerTangent(hub, r, guide, 2.6, 'right')
      expect(p.x).toBeLessThan(hub.x)
    }
  })

  it('gives numbers, not NaN, for circles that overlap', () => {
    const [p, q] = outerTangent({ x: 0, y: 0 }, 10, { x: 3, y: 0 }, 2, 'left')
    for (const n of [p.x, p.y, q.x, q.y]) expect(Number.isFinite(n)).toBe(true)
  })
})

describe('sectorPath', () => {
  it('is a closed ring segment with no NaN in it', () => {
    const d = sectorPath({ x: 50, y: 50 }, 10, 20, 10, 100)
    expect(d.startsWith('M ')).toBe(true)
    expect(d.endsWith('Z')).toBe(true)
    expect(d).not.toContain('NaN')
    // Starts at the outer radius, `from` degrees clockwise of 12 o'clock.
    const [x, y] = d.slice(2).split(' ').map(Number)
    expect(Math.hypot(x - 50, y - 50)).toBeCloseTo(20, 2)
    expect(x).toBeGreaterThan(50)
  })
})
