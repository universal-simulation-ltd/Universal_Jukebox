import { describe, expect, it } from 'vitest'
import { NEW_SHELF, addToShelf, moveOnShelf, parseShelves, renameShelf, shelfName, shelvesToShow, toggleOnShelf } from './shelves'

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

describe('naming, moving and adding many', () => {
  const two = [{ id: 's1', trackIds: ['a', 'b', 'c'] }, { id: 's2', trackIds: ['d'], name: 'Road trip' }]
  it('names a shelf, and an empty name goes back to its place', () => {
    expect(shelfName(two[0], 0)).toBe('Shelf 1')
    expect(shelfName(two[1], 1)).toBe('Road trip')
    const named = renameShelf(two, 's1', '  Sunday  ')
    expect(named[0].name).toBe('Sunday')
    expect('name' in renameShelf(named, 's1', '   ')[0]).toBe(false)
  })
  it('moves a song one place, and not past either end', () => {
    expect(moveOnShelf(two, 's1', 'b', -1)[0].trackIds).toEqual(['b', 'a', 'c'])
    expect(moveOnShelf(two, 's1', 'b', 1)[0].trackIds).toEqual(['a', 'c', 'b'])
    expect(moveOnShelf(two, 's1', 'a', -1)[0].trackIds).toEqual(['a', 'b', 'c'])
    expect(moveOnShelf(two, 's1', 'c', 1)[0].trackIds).toEqual(['a', 'b', 'c'])
  })
  it('adds an album without doubling what is already there, or starts a shelf', () => {
    expect(addToShelf(two, 's1', ['c', 'e', 'e', 'f'], 'x').shelves[0].trackIds).toEqual(['a', 'b', 'c', 'e', 'f'])
    const fresh = addToShelf(two, NEW_SHELF, ['g', 'h'], 's3')
    expect(fresh.shelfId).toBe('s3')
    expect(fresh.shelves[2]).toEqual({ id: 's3', trackIds: ['g', 'h'] })
  })
  it('keeps a stored name', () => {
    expect(parseShelves([{ id: 's2', trackIds: ['d'], name: 'Road trip' }])).toEqual([{ id: 's2', trackIds: ['d'], name: 'Road trip' }])
  })
})
