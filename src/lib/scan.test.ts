import { describe, expect, it } from 'vitest'
import { REFUSED, extensionOf, isPlayable, titleFromFilename } from './scan'

// The pure half of the scanner: what it will take, what it refuses by name, and
// what it calls a file that carries no tags at all.
//
// The walking and the header reads need a browser and are covered by driving
// the real app against a real folder; these are the decisions that can be
// checked here, and they are the ones a folder of downloads exercises hardest.

describe('extensionOf', () => {
  it('lower-cases and drops the dot', () => {
    expect(extensionOf('Song.MP3')).toBe('mp3')
    expect(extensionOf('a.b.FLAC')).toBe('flac')
  })

  it('has an answer for a file with no extension', () => {
    expect(extensionOf('README')).toBe('')
    // A dotfile is all extension and no name — it must not come back as "flac"
    // for some hidden `.flac` config file.
    expect(extensionOf('.hidden')).toBe('hidden')
  })
})

describe('isPlayable', () => {
  it('takes the four formats every current browser decodes', () => {
    for (const name of ['a.mp3', 'a.m4a', 'a.flac', 'a.wav']) {
      expect(isPlayable(name), name).toBe(true)
    }
  })

  it('takes Ogg and Opus, which play where they play', () => {
    expect(isPlayable('a.ogg')).toBe(true)
    expect(isPlayable('a.opus')).toBe(true)
  })

  it('leaves the things no browser can decode', () => {
    for (const name of ['a.wma', 'a.m4p', 'a.ape', 'a.mid', 'cover.jpg', 'notes.txt']) {
      expect(isPlayable(name), name).toBe(false)
    }
  })
})

describe('REFUSED', () => {
  // ⚠️ Refusing well is a suite convention: a folder of WMA that scans to
  // "0 tracks" tells someone their music is broken, when the truth is that no
  // browser has ever decoded WMA. Every refusal owes the user a sentence.
  it('gives a real sentence for every format it names', () => {
    for (const [ext, why] of Object.entries(REFUSED)) {
      expect(why.length, ext).toBeGreaterThan(20)
      expect(why.trim().endsWith('.'), ext).toBe(true)
    }
  })

  it('points WMA and Monkey’s Audio at the suite app that can convert them', () => {
    expect(REFUSED.wma).toMatch(/Universal Converter/)
    expect(REFUSED.ape).toMatch(/Universal Converter/)
  })

  it('never claims a DRM track can be converted, because it cannot', () => {
    expect(REFUSED.m4p).not.toMatch(/Converter/)
  })

  it('refuses nothing it also claims to play', () => {
    for (const ext of Object.keys(REFUSED)) {
      expect(isPlayable(`a.${ext}`), ext).toBe(false)
    }
  })
})

describe('titleFromFilename', () => {
  // A folder of 400 loose untagged MP3s is a real thing people have, and this
  // is the only title those tracks will ever get.
  it('drops the extension', () => {
    expect(titleFromFilename('Song Name.mp3')).toBe('Song Name')
  })

  it('strips a leading track number in the shapes downloads actually use', () => {
    expect(titleFromFilename('04 - Song Name.mp3')).toBe('Song Name')
    expect(titleFromFilename('04. Song Name.mp3')).toBe('Song Name')
    expect(titleFromFilename('04_Song_Name.mp3')).toBe('Song Name')
    expect(titleFromFilename('4) Song Name.mp3')).toBe('Song Name')
  })

  // ⚠️ The commonest shape of all, and the one with no separator to key off.
  // A leading ZERO is what settles it: nobody zero-pads a number they mean to
  // keep, so "04 Song Name" is track four while "99 Problems" is a song.
  it('strips a zero-padded number followed only by a space', () => {
    expect(titleFromFilename('04 Song Name.mp3')).toBe('Song Name')
    expect(titleFromFilename('01 Everything In Its Right Place.flac')).toBe('Everything In Its Right Place')
  })

  // ⚠️ Deliberately conservative. There is no way to tell "Artist - Title" from
  // a song whose title contains a dash, and a wrong artist is worse than none —
  // so this never invents one, and never eats a number that is part of the name.
  it('does not eat a number that belongs to the title', () => {
    expect(titleFromFilename('1979.mp3')).toBe('1979')
    expect(titleFromFilename('99 Problems.mp3')).toBe('99 Problems')
    expect(titleFromFilename('7 Nation Army.mp3')).toBe('7 Nation Army')
    expect(titleFromFilename('50 Ways To Leave Your Lover.mp3')).toBe('50 Ways To Leave Your Lover')
  })

  it('falls back to the whole name rather than returning nothing', () => {
    // Stripping the number leaves an empty string, which would render as a row
    // with no title at all — the filename is worse but it is something.
    expect(titleFromFilename('05 .mp3')).toBe('05 .mp3')
    expect(titleFromFilename('.mp3')).toBe('.mp3')
  })
})
