import { describe, expect, it } from 'vitest'
import { nextSleep, sleepGain, sleepLeft } from './sleep'

describe('the sleep timer', () => {
  it('a tap steps 15, 30, 45, 60, then off — and a picked time goes off', () => {
    const seen: (number | null)[] = []
    let at: number | null = null
    for (let i = 0; i < 5; i++) seen.push((at = nextSleep(at)))
    expect(seen).toEqual([15, 30, 45, 60, null])
    expect(nextSleep(135)).toBeNull()
  })

  it('holds full volume until the last minute, then fades to nothing', () => {
    expect(sleepGain(600)).toBe(1)
    expect(sleepGain(60)).toBe(1)
    expect(sleepGain(30)).toBeCloseTo(0.25)
    expect(sleepGain(0)).toBe(0)
    expect(sleepGain(-5)).toBe(0)
  })

  it('says what is left in minutes, then hours', () => {
    expect(sleepLeft(14 * 60 + 1)).toBe('15 min')
    expect(sleepLeft(59)).toBe('1 min')
    expect(sleepLeft(135 * 60)).toBe('2h 15')
    expect(sleepLeft(60 * 60)).toBe('1h 00')
  })
})
