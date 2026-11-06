import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HOLD_MS, STEP_MS, STEP_SEC, holdToSeek } from './holdToSeek'

describe('holdToSeek', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  const make = (direction: 1 | -1 = 1) => {
    const seeks: number[] = []
    const tap = vi.fn()
    return { seeks, tap, c: holdToSeek(direction, (s) => seeks.push(s), tap) }
  }

  it('a tap changes song and seeks nothing', () => {
    const { seeks, tap, c } = make()
    c.down()
    vi.advanceTimersByTime(HOLD_MS - 50)
    c.up()
    c.click()
    expect(tap).toHaveBeenCalledOnce()
    expect(seeks).toEqual([])
  })

  it('a hold runs on through the song, and letting go does not also change song', () => {
    const { seeks, tap, c } = make()
    c.down()
    vi.advanceTimersByTime(HOLD_MS + STEP_MS * 3)
    c.up()
    c.click()
    vi.advanceTimersByTime(STEP_MS * 5)
    expect(seeks).toEqual([STEP_SEC, STEP_SEC, STEP_SEC, STEP_SEC])
    expect(tap).not.toHaveBeenCalled()
  })

  it('⏮ held runs backwards', () => {
    const { seeks, c } = make(-1)
    c.down()
    vi.advanceTimersByTime(HOLD_MS)
    c.up()
    expect(seeks).toEqual([-STEP_SEC])
  })

  it('a tap after a hold that ended off the button is a tap again', () => {
    const { tap, c } = make()
    c.down()
    vi.advanceTimersByTime(HOLD_MS + 10)
    c.up() // slid off: no click follows
    c.down()
    c.up()
    c.click()
    expect(tap).toHaveBeenCalledOnce()
  })
})
