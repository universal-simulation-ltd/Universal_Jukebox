import { describe, expect, it } from 'vitest'
import { compareName, sortName } from './collate'

describe('compareName (Apple-style A–Z)', () => {
  it('files "The Beatles" under B', () => {
    const names = ['Coldplay', 'The Beatles', 'Abba', 'Blur', 'A Tribe Called Quest', 'An Horse']
    expect([...names].sort(compareName)).toEqual(['Abba', 'The Beatles', 'Blur', 'Coldplay', 'An Horse', 'A Tribe Called Quest'])
  })
  it('keeps a name that is only the article', () => {
    expect(sortName('The')).toBe('The')
    expect(sortName('A')).toBe('A')
    expect(sortName('Theatre of Tragedy')).toBe('Theatre of Tragedy')
  })
  it('breaks a tie on the full name', () => {
    expect(['The Band', 'Band'].sort(compareName)).toEqual(['Band', 'The Band'])
  })
})
