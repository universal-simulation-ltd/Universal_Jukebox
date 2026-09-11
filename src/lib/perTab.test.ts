import { describe, expect, it } from 'vitest'
import { perTab } from './perTab'

const isBool = (v: unknown): v is boolean => typeof v === 'boolean'
const off = { artists: false, albums: false, tracks: false }

describe('perTab', () => {
  it('reads each tab on its own, falling back tab by tab', () => {
    expect(perTab({ artists: true, albums: 'nonsense' }, isBool, off)).toEqual({ artists: true, albums: false, tracks: false })
  })
  it('turns the old single value into every tab’s starting point', () => {
    expect(perTab(true, isBool, off)).toEqual({ artists: true, albums: true, tracks: true })
  })
  it('falls back whole when nothing usable was stored', () => {
    expect(perTab(undefined, isBool, off)).toEqual(off)
    expect(perTab([true], isBool, off)).toEqual(off)
  })
})
