import { describe, expect, it } from 'vitest'
import { groundFor, hslToHex } from './lockArt'

describe('hslToHex', () => {
  it('matches the CSS conversions', () => {
    expect(hslToHex(0, 100, 50)).toBe('#ff0000')
    expect(hslToHex(120, 100, 25)).toBe('#008000')
    expect(hslToHex(240, 100, 50)).toBe('#0000ff')
    expect(hslToHex(0, 0, 100)).toBe('#ffffff')
  })
})

describe('groundFor', () => {
  it('is white at the top and a light tint at the bottom — a record stands out on it', () => {
    const [top, bottom] = groundFor(210)
    const lum = (hex: string) => parseInt(hex.slice(1, 3), 16) + parseInt(hex.slice(3, 5), 16) + parseInt(hex.slice(5, 7), 16)
    expect(top).toBe('#ffffff')
    expect(lum(bottom)).toBeGreaterThan(3 * 200)
    expect(lum(bottom)).toBeLessThan(lum(top))
  })
})
