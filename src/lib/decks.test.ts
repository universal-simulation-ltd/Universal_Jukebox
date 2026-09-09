import { describe, expect, it } from 'vitest'
import { DECKS, DECK_ROTATION, deckCopy, resolveDeck } from './decks'
import { DECK_SETTINGS, type DeckStyle } from '../stores/settingsStore'

// `resolveDeck` is the only crossing between what the user chose and what gets
// drawn, so it is the one piece of the deck machinery worth a test: everything
// else in `decks.ts` is a table of words, and everything downstream of it is a
// picture. A rotation that is off by one puts the wrong machine on screen while
// the row of records waiting to go on promises a different one — which is
// exactly the failure nobody would think to look for, because both halves
// individually look fine.

describe('resolveDeck', () => {
  it('leaves a real machine alone, at any position', () => {
    for (const style of DECK_ROTATION) {
      for (const at of [-1, 0, 1, 7, 4096]) {
        expect(resolveDeck(style, at)).toBe(style)
      }
    }
  })

  it('walks the rotation in order and wraps', () => {
    const walked = Array.from({ length: DECK_ROTATION.length * 2 }, (_, i) => resolveDeck('random', i))
    expect(walked).toEqual([...DECK_ROTATION, ...DECK_ROTATION])
  })

  it('starts at vinyl when nothing has played yet', () => {
    // The cursor is -1 before the first play, and an empty deck showing the
    // app's own default is the right answer — not a negative index.
    expect(resolveDeck('random', -1)).toBe('vinyl')
    expect(resolveDeck('random', -99)).toBe('vinyl')
  })

  it('survives a position that is not a whole number', () => {
    // Nothing passes a fraction today, but the cursor is arithmetic and a NaN
    // index would return `undefined` and render a blank deck rather than throw.
    expect(resolveDeck('random', 1.7)).toBe(DECK_ROTATION[1])
    expect(resolveDeck('random', Number.NaN)).toBe(DECK_ROTATION[0])
    expect(resolveDeck('random', Number.POSITIVE_INFINITY)).toBe(DECK_ROTATION[0])
  })

  it('never returns the setting that is not a machine', () => {
    for (let at = 0; at < 40; at += 1) {
      expect(DECK_ROTATION).toContain(resolveDeck('random', at) as DeckStyle)
    }
  })
})

describe('the deck tables', () => {
  it('has copy for every setting the store will accept', () => {
    // The store validates against `DECK_SETTINGS`, and the Settings page builds
    // its radio list from the same array. A value that validates but has no
    // copy is a chooser with a blank row in it.
    for (const setting of DECK_SETTINGS) {
      expect(DECKS[setting]).toBeDefined()
      expect(deckCopy(setting).label.length).toBeGreaterThan(0)
    }
  })

  it('rotates through every machine, and only machines', () => {
    const machines = DECK_SETTINGS.filter((v) => v !== 'random')
    expect([...DECK_ROTATION].sort()).toEqual([...machines].sort())
  })
})
