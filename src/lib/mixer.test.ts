import { beforeEach, describe, expect, it } from 'vitest'
import { MAX_DECK_RECORDS, addToDeck, clearDeck, nextOnDeck, unqueueFromDeck, useMixStore } from './mixer'
import type { Track } from './types'

// No AudioContext here, so a record put on a deck ends 'unsupported' — the
// stack's order, which is what these are about, does not care.
const track = (title: string) => ({ id: title, title, path: `${title}.mp3`, albumId: 'x', ext: 'mp3' }) as Track
const deck = () => useMixStore.getState().decks[0]
const names = () => [deck().track?.title, ...deck().waiting.map((t) => t.title)]

describe('a deck holds up to three records', () => {
  beforeEach(() => {
    while (deck().track) clearDeck(0)
  })

  it('the first goes on, the next two wait, a fourth is refused', () => {
    expect(addToDeck(0, track('A'))).toBe(true)
    expect(addToDeck(0, track('B'))).toBe(true)
    expect(addToDeck(0, track('C'))).toBe(true)
    expect(addToDeck(0, track('D'))).toBe(false)
    expect(names()).toEqual(['A', 'B', 'C'])
    expect(MAX_DECK_RECORDS).toBe(3)
  })

  it('⏭ puts the next on and the one that was on to the back, so they go round', async () => {
    for (const t of ['A', 'B', 'C']) addToDeck(0, track(t))
    await nextOnDeck(0)
    expect(names()).toEqual(['B', 'C', 'A'])
    await nextOnDeck(0)
    await nextOnDeck(0)
    expect(names()).toEqual(['A', 'B', 'C'])
  })

  it('⏭ with nothing waiting does nothing', async () => {
    addToDeck(0, track('A'))
    await nextOnDeck(0)
    expect(names()).toEqual(['A'])
  })

  it('✕ takes the record off and the next waiting one goes on', () => {
    for (const t of ['A', 'B', 'C']) addToDeck(0, track(t))
    clearDeck(0)
    expect(names()).toEqual(['B', 'C'])
    clearDeck(0)
    clearDeck(0)
    expect(deck().track).toBeNull()
    expect(deck().waiting).toEqual([])
  })

  it('a waiting record can be taken off on its own', () => {
    for (const t of ['A', 'B', 'C']) addToDeck(0, track(t))
    unqueueFromDeck(0, 0)
    expect(names()).toEqual(['A', 'C'])
  })
})
