import { describe, expect, it } from 'vitest'
import { shuffleIndices, shuffled } from './audio'

describe('shuffleIndices', () => {
  it('shuffles only the indices it is given — removed songs stay removed', () => {
    // Queue of 6, songs 2 and 4 taken out of Up Next.
    const order = [0, 1, 3, 5]
    for (let n = 0; n < 50; n++) {
      const next = shuffleIndices(order, 3)
      expect([...next].sort((a, b) => a - b)).toEqual([0, 1, 3, 5])
      expect(next[0]).toBe(3)
    }
  })

  it('does not touch its input', () => {
    const order = [4, 2, 0]
    shuffleIndices(order)
    expect(order).toEqual([4, 2, 0])
  })

  it('ignores a keepFirst that is not in the list', () => {
    const next = shuffleIndices([0, 1, 2], 9)
    expect([...next].sort()).toEqual([0, 1, 2])
  })

  it('shuffled(n) is still a permutation of 0…n-1', () => {
    expect([...shuffled(10, 4)].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
    expect(shuffled(10, 4)[0]).toBe(4)
  })
})
