import { describe, expect, it } from 'vitest'
import { NEW_SHELF, parseShelves, shelvesToShow, toggleOnShelf } from './shelves'

describe('jukebox shelves', () => {
  it('always shows one empty shelf after the ones with songs on', () => {
    expect(shelvesToShow([])).toEqual([{ id: NEW_SHELF, trackIds: [] }])
    expect(shelvesToShow([{ id: 'a', trackIds: ['t1'] }]).map((s) => s.id)).toEqual(['a', NEW_SHELF])
  })

  it('a song for the empty shelf starts a new shelf, and the next goes on it', () => {
    const first = toggleOnShelf([], NEW_SHELF, 't1', 's1')
    expect(first).toEqual({ shelves: [{ id: 's1', trackIds: ['t1'] }], shelfId: 's1' })
    const second = toggleOnShelf(first.shelves, first.shelfId, 't2', 'unused')
    expect(second.shelves).toEqual([{ id: 's1', trackIds: ['t1', 't2'] }])
  })

  it('a song already on the shelf comes off, and an emptied shelf goes', () => {
    const on = [{ id: 's1', trackIds: ['t1', 't2'] }, { id: 's2', trackIds: ['t3'] }]
    expect(toggleOnShelf(on, 's1', 't1', 'x').shelves).toEqual([{ id: 's1', trackIds: ['t2'] }, { id: 's2', trackIds: ['t3'] }])
    expect(toggleOnShelf(on, 's2', 't3', 'x').shelves).toEqual([{ id: 's1', trackIds: ['t1', 't2'] }])
  })

  it('reads back only well-formed shelves', () => {
    expect(parseShelves([{ id: 's1', trackIds: ['t1', 3] }, { id: 7 }, null, { id: 's2', trackIds: [] }])).toEqual([{ id: 's1', trackIds: ['t1'] }])
    expect(parseShelves('nonsense')).toEqual([])
  })
})
