import { beforeEach, describe, expect, it } from 'vitest'
import { MAX_DECK_RECORDS, addToDeck, clearDeck, nextOnDeck, setDeckSpeed, syncDeck, unqueueFromDeck, useMixStore } from './mixer'
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

describe('Sync on the decks', () => {
  const known = (id: 0 | 1, bpm: number, speed = 1) =>
    useMixStore.setState((s) => {
      const decks = [...s.decks] as typeof s.decks
      decks[id] = { ...decks[id], bpm: { state: 'known', value: bpm }, speed, sync: null }
      return { decks }
    })
  const d = (id: 0 | 1) => useMixStore.getState().decks[id]

  it('matches one deck to the other, and pressing again puts the speed back', () => {
    known(0, 128)
    known(1, 125, 1.02)
    expect(syncDeck(0)).toBe('synced')
    expect(128 * d(0).speed).toBeCloseTo(125 * 1.02, 2)
    expect(d(0).sync).not.toBeNull()
    expect(syncDeck(0)).toBe('undone')
    expect(d(0).speed).toBe(1)
    expect(d(0).sync).toBeNull()
  })

  it('says it cannot, and changes nothing, when the tempos are too far apart', () => {
    known(0, 90)
    known(1, 128)
    expect(syncDeck(0)).toBe('cannot')
    expect(d(0).speed).toBe(1)
    expect(d(0).sync).toBeNull()
  })

  it('cannot when the other deck has no tempo', () => {
    known(0, 120)
    useMixStore.setState((s) => {
      const decks = [...s.decks] as typeof s.decks
      decks[1] = { ...decks[1], bpm: { state: 'unknown' } }
      return { decks }
    })
    expect(syncDeck(0)).toBe('cannot')
  })

  it('moving the speed slider by hand lets go of Sync', () => {
    known(0, 128)
    known(1, 125)
    syncDeck(0)
    setDeckSpeed(0, 1.05)
    expect(d(0).sync).toBeNull()
  })
})
