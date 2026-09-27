import { describe, expect, it } from 'vitest'
import { clampTrim, formatTrim, trimAttenuation, trimBoost } from './volumeTrim'

describe('the −50 to +50 volume', () => {
  it('leaves the sound alone at zero', () => {
    expect(trimAttenuation(0)).toBe(1)
    expect(trimBoost(0)).toBe(1)
  })

  it('goes down in decibels: −10 halves it, −50 is −30 dB', () => {
    expect(trimAttenuation(-10)).toBeCloseTo(0.5, 2)
    expect(trimAttenuation(-50)).toBeCloseTo(0.0316, 3)
    expect(trimBoost(-30)).toBe(1)
  })

  it('goes up to 150% above zero, through the boost only', () => {
    expect(trimBoost(50)).toBe(1.5)
    expect(trimBoost(20)).toBeCloseTo(1.2)
    expect(trimAttenuation(40)).toBe(1)
  })

  it('clamps and rounds whatever it is given, and signs what it says', () => {
    expect(clampTrim(-80)).toBe(-50)
    expect(clampTrim(12.6)).toBe(13)
    expect(clampTrim(Number.NaN)).toBe(0)
    expect(formatTrim(-12)).toBe('−12')
    expect(formatTrim(30)).toBe('+30')
    expect(formatTrim(0)).toBe('0')
  })
})
