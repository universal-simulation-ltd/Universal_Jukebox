import { describe, expect, it } from 'vitest'
import { rotary, rotaryDetents, turnShare } from './scrub'

describe('turnShare', () => {
  it('is thirty seconds a lap', () => {
    expect(turnShare(300)).toBeCloseTo(0.1)
  })

  it('is never more than a third of a short song', () => {
    expect(turnShare(45)).toBeCloseTo(1 / 3)
  })

  it('is nothing for a song with no length', () => {
    expect(turnShare(0)).toBe(0)
  })
})

describe('rotaryDetents', () => {
  it('is one every 30° of a lap', () => {
    expect(rotaryDetents(300)).toBe(120)
  })
})

describe('rotary', () => {
  // A circle of radius 100 about (0, 0); in screen terms y grows downwards, so
  // going from 3 o'clock to 6 o'clock is clockwise.
  const at = (deg: number): [number, number] => [100 * Math.cos((deg * Math.PI) / 180), 100 * Math.sin((deg * Math.PI) / 180)]

  it('moves on going clockwise and back going anticlockwise', () => {
    const map = rotary(0, 0, ...at(0), 0.5, 0.1)
    expect(map(...at(90))).toBeCloseTo(0.525)
    expect(map(...at(-90))).toBeCloseTo(0.475)
  })

  it('keeps counting past the top of the circle, lap after lap', () => {
    const map = rotary(0, 0, ...at(0), 0, 0.1)
    let last = 0
    for (let deg = 30; deg <= 720; deg += 30) last = map(...at(deg)) ?? last
    expect(last).toBeCloseTo(0.2)
  })

  it('stops at the ends of the song', () => {
    const map = rotary(0, 0, ...at(0), 0.99, 0.5)
    expect(map(...at(90))).toBe(1)
  })

  it('ignores a finger right on the middle', () => {
    const map = rotary(0, 0, ...at(0), 0.5, 0.1)
    expect(map(1, 1)).toBeNull()
  })

  it('reports the turn for a face that draws it', () => {
    const turns: number[] = []
    const map = rotary(0, 0, ...at(0), 0.5, 0.1, (d) => turns.push(d))
    map(...at(45))
    expect(turns.at(-1)).toBeCloseTo(45)
  })
})
