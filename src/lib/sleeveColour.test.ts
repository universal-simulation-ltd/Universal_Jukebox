import { describe, expect, it } from 'vitest'
import { dominant } from './sleeveColour'

const px = (...rgb: [number, number, number][]) => rgb.flatMap(([r, g, b]) => [r, g, b, 255])

describe('dominant', () => {
  it('picks the colour out of a mostly-black sleeve, not the mud of the average', () => {
    const black = Array.from({ length: 90 }, () => [10, 10, 10] as [number, number, number])
    const red = Array.from({ length: 10 }, () => [220, 30, 30] as [number, number, number])
    const { r, g, b } = dominant(px(...black, ...red))!
    expect(r).toBeGreaterThan(200)
    expect(g).toBeLessThan(50)
    expect(b).toBeLessThan(50)
  })

  it('keeps a colourless sleeve grey rather than inventing a colour', () => {
    expect(dominant(px([200, 200, 200], [100, 100, 100]))).toEqual({ r: 150, g: 150, b: 150 })
  })

  it('ignores transparent pixels and has no answer for an empty picture', () => {
    expect(dominant([255, 0, 0, 0])).toBeNull()
  })
})
