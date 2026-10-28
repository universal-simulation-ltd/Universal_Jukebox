import { describe, expect, it } from 'vitest'
import { possessive } from './personalTitle'

describe('whose Jukebox', () => {
  it('English: James’, not James’s', () => {
    expect(possessive('en-gb', 'James')).toBe('James’')
    expect(possessive('en', 'Bradley')).toBe('Bradley’s')
    expect(possessive('en-GB', 'CHRIS')).toBe('CHRIS’')
    expect(possessive('en', ' Max ')).toBe('Max’s')
  })
  it('German: Annas, but Hans’ and Max’', () => {
    expect(possessive('de', 'Anna')).toBe('Annas')
    expect(possessive('de', 'James')).toBe('James’')
    expect(possessive('de', 'Max')).toBe('Max’')
    expect(possessive('de', 'Fritz')).toBe('Fritz’')
  })
  it('French: de, elided before a vowel or h', () => {
    expect(possessive('fr', 'James')).toBe('de James')
    expect(possessive('fr', 'Anna')).toBe('d’Anna')
    expect(possessive('fr', 'Hélène')).toBe('d’Hélène')
  })
  it('Turkish: the ending follows the last vowel', () => {
    expect(possessive('tr', 'James')).toBe('James’in')
    expect(possessive('tr', 'Kaya')).toBe('Kaya’nın')
    expect(possessive('tr', 'Onur')).toBe('Onur’un')
    expect(possessive('tr', 'Ayşe')).toBe('Ayşe’nin')
    expect(possessive('tr', 'Ümit')).toBe('Ümit’in')
    expect(possessive('tr', 'Gül')).toBe('Gül’ün')
  })
  it('the rest put the name in the sentence as it is', () => {
    expect(possessive('es', 'James')).toBe('James')
    expect(possessive('pt-BR', 'James')).toBe('James')
  })
})
