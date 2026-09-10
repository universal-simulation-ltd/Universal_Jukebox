import { describe, expect, it } from 'vitest'
import { DECKS, DEFAULT_ERAS, ERA_ORDER, deckCopy, deckForYear, resolveDeck, sanitiseEras } from './decks'
import { DECK_SETTINGS, type DeckStyle } from '../stores/settingsStore'

// `resolveDeck` is the only crossing between what the user chose and what gets
// drawn. `automatic` (James, 2026-09-10) puts each album on the machine of its
// day, by year, with the years the person chose.

describe('resolveDeck', () => {
  it('leaves a real machine alone, whatever the album', () => {
    for (const style of ERA_ORDER) {
      expect(resolveDeck(style, { year: 1955 })).toBe(style)
      expect(resolveDeck(style, null)).toBe(style)
    }
  })

  it('puts each album on the machine of its year under automatic', () => {
    expect(resolveDeck('automatic', { year: 1958 })).toBe('jukebox')
    expect(resolveDeck('automatic', { year: 1973 })).toBe('vinyl')
    expect(resolveDeck('automatic', { year: 1986 })).toBe('cassette')
    expect(resolveDeck('automatic', { year: 1997 })).toBe('cd')
    expect(resolveDeck('automatic', { year: 2022 })).toBe('pocket')
  })

  it('uses the years the person chose', () => {
    const eras = { ...DEFAULT_ERAS, cd: 1985 }
    expect(resolveDeck('automatic', { year: 1986 }, eras)).toBe('cd')
  })

  it('puts an album with no year on vinyl', () => {
    expect(resolveDeck('automatic', {})).toBe('vinyl')
    expect(resolveDeck('automatic', null)).toBe('vinyl')
  })

  it('never returns the setting that is not a machine', () => {
    for (const year of [undefined, 1900, 1963, 1990, 2004, 2100]) {
      expect(ERA_ORDER).toContain(resolveDeck('automatic', { year }) as DeckStyle)
    }
  })
})

describe('deckForYear boundaries', () => {
  it('starts each machine ON its year, not after it', () => {
    expect(deckForYear(DEFAULT_ERAS.vinyl - 1)).toBe('jukebox')
    expect(deckForYear(DEFAULT_ERAS.vinyl)).toBe('vinyl')
    expect(deckForYear(DEFAULT_ERAS.pocket)).toBe('pocket')
  })
})

describe('sanitiseEras', () => {
  it('falls back to the defaults for anything missing or unreadable', () => {
    expect(sanitiseEras(undefined)).toEqual(DEFAULT_ERAS)
    expect(sanitiseEras({ cd: 'soon' })).toEqual(DEFAULT_ERAS)
  })

  it('never lets a later machine start before an earlier one', () => {
    const eras = sanitiseEras({ vinyl: 1970, cassette: 1960, cd: 1995, pocket: 1990 })
    expect(eras.cassette).toBeGreaterThanOrEqual(eras.vinyl)
    expect(eras.pocket).toBeGreaterThanOrEqual(eras.cd)
  })

  it('keeps years in range and whole', () => {
    const eras = sanitiseEras({ vinyl: 1800, cassette: 1983.6, cd: 1991, pocket: 3000 })
    expect(eras.vinyl).toBe(1900)
    expect(eras.cassette).toBe(1984)
    expect(eras.pocket).toBe(2100)
  })
})

describe('the deck tables', () => {
  it('has copy for every setting the store will accept', () => {
    for (const setting of DECK_SETTINGS) {
      expect(DECKS[setting].label.length).toBeGreaterThan(0)
      expect(deckCopy(setting)).toBe(DECKS[setting])
    }
  })

  it('offers automatic and the pocket player, and no longer random', () => {
    expect(DECK_SETTINGS).toContain('automatic')
    expect(DECK_SETTINGS).toContain('pocket')
    expect(DECK_SETTINGS as string[]).not.toContain('random')
  })
})
