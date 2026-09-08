import { describe, expect, it } from 'vitest'
import { clock, fold, plural, totalTime } from './format'

// The formatting nobody thinks is worth testing, and the two places it lies if
// it is written the obvious way: an unknown duration printed as a measured
// number, and a total that quietly counts unknowns as zero.

describe('clock', () => {
  it('formats minutes and seconds', () => {
    expect(clock(0)).toBe('0:00')
    expect(clock(7)).toBe('0:07')
    expect(clock(187)).toBe('3:07')
  })

  it('grows an hours field only when there is one', () => {
    expect(clock(3599)).toBe('59:59')
    expect(clock(3600)).toBe('1:00:00')
    expect(clock(3764)).toBe('1:02:44')
  })

  // ⚠️ The point of the function. Durations are not in the tags — a track that
  // has never been played has none — and printing "0:00" for "we don't know
  // yet" is a number that looks measured. A dash reads as pending.
  it('shows a dash for an unknown duration rather than 0:00', () => {
    expect(clock(undefined)).toBe('—')
    expect(clock(null)).toBe('—')
    expect(clock(NaN)).toBe('—')
    expect(clock(Infinity)).toBe('—')
    expect(clock(-5)).toBe('—')
  })
})

describe('totalTime', () => {
  it('sums what it knows', () => {
    expect(totalTime([{ durationSec: 180 }, { durationSec: 240 }])).toBe('7 min')
  })

  it('uses hours past sixty minutes', () => {
    expect(totalTime([{ durationSec: 3600 }, { durationSec: 720 }])).toBe('1 hr 12 min')
    expect(totalTime([{ durationSec: 3600 }])).toBe('1 hr')
  })

  // ⚠️ An album showing "31 min" while four of its tracks have never been
  // played is a wrong number presented as a right one. The "+" is the whole
  // difference between a total and a lower bound.
  it('marks the total as a lower bound when some durations are unknown', () => {
    expect(totalTime([{ durationSec: 180 }, {}])).toBe('3 min+')
  })

  it('says nothing at all when it knows nothing', () => {
    expect(totalTime([{}, {}])).toBe('')
    expect(totalTime([])).toBe('')
  })
})

describe('fold', () => {
  // Accents ARE folded for search even though `albumKey` deliberately does not
  // fold them: a search box must find "Bjork" when the tag says "Björk", while
  // a key must never merge two records that differ.
  it('strips accents so a search finds the tagged spelling', () => {
    expect(fold('Björk')).toBe('bjork')
    expect(fold('Sigur Rós')).toBe('sigur ros')
    expect(fold('Beyoncé')).toBe('beyonce')
  })

  it('flattens punctuation to single spaces', () => {
    expect(fold('AC/DC')).toBe('ac dc')
    expect(fold('  ...And Justice For All  ')).toBe('and justice for all')
    expect(fold('Godspeed You! Black Emperor')).toBe('godspeed you black emperor')
  })

  it('survives a title that is only punctuation', () => {
    expect(fold('( )')).toBe('')
    expect(fold('')).toBe('')
  })
})

describe('plural', () => {
  it('agrees with its number', () => {
    expect(plural(1, 'track')).toBe('1 track')
    expect(plural(2, 'track')).toBe('2 tracks')
    expect(plural(0, 'track')).toBe('0 tracks')
  })

  it('takes an irregular plural', () => {
    expect(plural(1, 'is', 'are')).toBe('1 is')
    expect(plural(3, 'is', 'are')).toBe('3 are')
  })

  it('groups thousands, because a library reaches them', () => {
    expect(plural(5000, 'track')).toBe('5,000 tracks')
  })
})
