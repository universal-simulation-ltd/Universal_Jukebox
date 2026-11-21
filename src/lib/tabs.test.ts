import { describe, expect, it } from 'vitest'
import { hiddenLast, moveTab, normaliseHidden, normaliseOrder, openingTab, setTabHidden, shownTabs, withShownOrder } from './tabs'

describe('the phone tab bar', () => {
  it('makes a stored order whole: unknown names out, each tab once, a missing tab back by its neighbour', () => {
    expect(normaliseOrder(undefined)).toEqual(['artists', 'albums', 'tracks', 'jukebox', 'mix'])
    expect(normaliseOrder(['jukebox', 'nonsense', 'artists', 'jukebox'])).toEqual(['jukebox', 'mix', 'artists', 'albums', 'tracks'])
    expect(normaliseOrder(['tracks', 'albums', 'artists'])).toEqual(['tracks', 'jukebox', 'mix', 'albums', 'artists'])
    // An order saved before Mix existed (2026-11-05) gets it after Shelves.
    expect(normaliseOrder(['albums', 'artists', 'tracks', 'jukebox'])).toEqual(['albums', 'artists', 'tracks', 'jukebox', 'mix'])
  })

  it('never hides every tab', () => {
    expect(normaliseHidden(['artists', 'albums', 'tracks', 'jukebox', 'mix'])).toEqual([])
    expect(normaliseHidden(['tracks', 'tracks', 'settings'])).toEqual(['tracks'])
    expect(normaliseHidden('artists')).toEqual([])
  })

  it('shows the order less the hidden tabs', () => {
    expect(shownTabs(['jukebox', 'artists', 'albums', 'tracks', 'mix'], ['artists'])).toEqual(['jukebox', 'albums', 'tracks', 'mix'])
  })

  it('moves one tab', () => {
    expect(moveTab(['artists', 'albums', 'tracks', 'jukebox'], 'jukebox', 0)).toEqual(['jukebox', 'artists', 'albums', 'tracks'])
    expect(moveTab(['artists', 'albums', 'tracks', 'jukebox'], 'artists', 9)).toEqual(['albums', 'tracks', 'jukebox', 'artists'])
  })

  it('writes a dragged order back round the hidden tabs, which keep their slots', () => {
    // Albums hidden in slot 2; the bar's three are dragged into a new order.
    expect(withShownOrder(['artists', 'albums', 'tracks', 'jukebox'], ['jukebox', 'artists', 'tracks'])).toEqual(['jukebox', 'albums', 'artists', 'tracks'])
  })

  it('opens on the first shown tab while the chosen one is hidden', () => {
    expect(openingTab('albums', ['artists', 'albums', 'tracks', 'jukebox'], [])).toBe('albums')
    expect(openingTab('albums', ['tracks', 'albums', 'artists', 'jukebox'], ['albums'])).toBe('tracks')
  })

  it('puts the hidden tabs last, in the order they were hidden, leaving the bar as it was', () => {
    // An order from the Hide tick box days: Albums and Artists hidden in their slots, Albums first.
    const order = hiddenLast(['artists', 'albums', 'tracks', 'jukebox', 'mix'], ['albums', 'artists'])
    expect(order).toEqual(['tracks', 'jukebox', 'mix', 'albums', 'artists'])
    expect(shownTabs(order, ['albums', 'artists'])).toEqual(shownTabs(['artists', 'albums', 'tracks', 'jukebox', 'mix'], ['albums', 'artists']))
    // Idempotent, and nothing hidden changes nothing.
    expect(hiddenLast(order, ['albums', 'artists'])).toEqual(order)
    expect(hiddenLast(['mix', 'artists', 'albums', 'tracks', 'jukebox'], [])).toEqual(['mix', 'artists', 'albums', 'tracks', 'jukebox'])
  })

  it('the eye and the bin: hide drops a tab to the bottom of Hidden, show brings it back at the end of the shown tabs', () => {
    const all: ['artists', 'albums', 'tracks', 'jukebox', 'mix'] = ['artists', 'albums', 'tracks', 'jukebox', 'mix']
    const a = setTabHidden(all, [], 'albums', true)
    expect(a).toEqual({ tabOrder: ['artists', 'tracks', 'jukebox', 'mix', 'albums'], hiddenTabs: ['albums'] })
    const b = setTabHidden(a.tabOrder, a.hiddenTabs, 'artists', true)
    expect(b).toEqual({ tabOrder: ['tracks', 'jukebox', 'mix', 'albums', 'artists'], hiddenTabs: ['albums', 'artists'] })
    const c = setTabHidden(b.tabOrder, b.hiddenTabs, 'artists', false)
    expect(c).toEqual({ tabOrder: ['tracks', 'jukebox', 'mix', 'artists', 'albums'], hiddenTabs: ['albums'] })
    expect(shownTabs(c.tabOrder, c.hiddenTabs)).toEqual(['tracks', 'jukebox', 'mix', 'artists'])
    // What it writes is already in the stored shape.
    expect(hiddenLast(c.tabOrder, c.hiddenTabs)).toEqual(c.tabOrder)
  })
})
