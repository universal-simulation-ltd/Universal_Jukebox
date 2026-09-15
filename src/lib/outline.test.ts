import { describe, expect, it } from 'vitest'
import { SHAPES } from '../components/decks/face'
import { bottomPath, cornerRadii, isCircle, loopPath, topPath } from './outline'

// The machines' outlines, for the words round them to follow (James,
// 2026-09-15: "check how lyrics are handled for the other type of players e.g.
// casette and have them follow an appropiate path").

describe('cornerRadii', () => {
  it('reads one value for every corner, a percentage across of the width and down of the height', () => {
    const c = cornerRadii('16%', 100, 110)
    expect(c.tl).toEqual({ rx: 16, ry: expect.closeTo(17.6) })
    expect(c.br).toEqual(c.tl)
  })

  it('reads pixels as pixels', () => {
    expect(cornerRadii('14px', 300, 198).bl).toEqual({ rx: 14, ry: 14 })
  })

  it('reads a separate vertical radius after the slash', () => {
    const c = cornerRadii('12% / 8.6%', 100, 140)
    expect(c.tr.rx).toBeCloseTo(12)
    expect(c.tr.ry).toBeCloseTo(12.04)
  })

  it('reads four corners each way — the jukebox’s arch', () => {
    const c = cornerRadii('46% 46% 10% 10% / 30% 30% 7% 7%', 100, 124)
    expect(c.tl.rx).toBeCloseTo(46)
    expect(c.tl.ry).toBeCloseTo(37.2)
    expect(c.br.rx).toBeCloseTo(10)
    expect(c.bl.ry).toBeCloseTo(8.68)
  })

  it('scales radii that do not fit, as CSS does — which is how 50% of a square is a circle', () => {
    expect(cornerRadii('80%', 100, 100).tl).toEqual({ rx: 50, ry: 50 })
    expect(isCircle(100, 100, cornerRadii('50%', 100, 100))).toBe(true)
    expect(isCircle(100, 110, cornerRadii('16%', 100, 110))).toBe(false)
  })
})

describe('loopPath', () => {
  it('is a circle’s circumference round a record', () => {
    const loop = loopPath(100, 100, cornerRadii('50%', 100, 100), 18)
    expect(loop.length).toBeCloseTo(2 * Math.PI * 68, 1)
    expect(loop.top).toBeCloseTo(loop.length / 2, 6)
  })

  it('is the perimeter of a square-cornered box, starting at the middle of its bottom', () => {
    const loop = loopPath(100, 60, cornerRadii('0px', 100, 60), 0)
    expect(loop.length).toBeCloseTo(320)
    // Half way along the bottom, up the left side, half way along the top.
    expect(loop.top).toBeCloseTo(50 + 60 + 50)
    expect(loop.d.startsWith('M 50 60')).toBe(true)
  })

  it('reads the middle of the top half way round, for every machine', () => {
    // Every machine is the same on the left as on the right, so the reading
    // point — the middle of the top — is half a lap from the start.
    for (const [name, { frame }] of Object.entries(SHAPES)) {
      const width = 300
      const height = Math.round(width * frame.ratio)
      const loop = loopPath(width, height, cornerRadii(frame.radius, width, height), 18)
      expect(loop.top, name).toBeCloseTo(loop.length / 2, 6)
      expect(loop.length, name).toBeGreaterThan(2 * (width + height) * 0.75)
    }
  })
})

describe('topPath and bottomPath', () => {
  it('each go half way round a record', () => {
    const c = cornerRadii('50%', 100, 100)
    expect(topPath(100, 100, c, 12).length).toBeCloseTo(Math.PI * 62, 1)
    expect(bottomPath(100, 100, c, 20).length).toBeCloseTo(Math.PI * 70, 1)
  })

  it('run level across a cassette, past its corners and down to half its height', () => {
    const width = 300
    const height = 198
    const c = cornerRadii('14px', width, height)
    const top = topPath(width, height, c, 12)
    // Up from half-way down the side, round the corner, across, round, down.
    const corner = (Math.PI / 2) * 26
    expect(top.length).toBeCloseTo(2 * (height / 2 + 12 - 26) + 2 * corner + (width + 24 - 52), 1)
    expect(top.d.startsWith(`M -12 ${height / 2}`)).toBe(true)
  })
})
