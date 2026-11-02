import { describe, expect, it } from 'vitest'
import { moveTab, normaliseHidden, normaliseOrder, openingTab, shownTabs, withShownOrder } from './tabs'

describe('the phone tab bar', () => {
  it('makes a stored order whole: unknown names out, each tab once, a missing tab back by its neighbour', () => {
    expect(normaliseOrder(undefined)).toEqual(['artists', 'albums', 'tracks', 'jukebox'])
    expect(normaliseOrder(['jukebox', 'nonsense', 'artists', 'jukebox'])).toEqual(['jukebox', 'artists', 'albums', 'tracks'])
    expect(normaliseOrder(['tracks', 'albums', 'artists'])).toEqual(['tracks', 'jukebox', 'albums', 'artists'])
  })

  it('never hides every tab', () => {
    expect(normaliseHidden(['artists', 'albums', 'tracks', 'jukebox'])).toEqual([])
    expect(normaliseHidden(['tracks', 'tracks', 'settings'])).toEqual(['tracks'])
    expect(normaliseHidden('artists')).toEqual([])
  })

  it('shows the order less the hidden tabs', () => {
    expect(shownTabs(['jukebox', 'artists', 'albums', 'tracks'], ['artists'])).toEqual(['jukebox', 'albums', 'tracks'])
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
})
