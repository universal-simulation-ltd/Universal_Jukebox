import { describe, expect, it } from 'vitest'
import { lufsFromR128, lufsFromReplayGain, readTags } from './tags'
import { gainForDb } from './loudness'

const enc = new TextEncoder()

/** An ID3v2.3 tag holding one TXXX frame. */
function id3WithTxxx(description: string, value: string): Uint8Array {
  const body = new Uint8Array([3, ...enc.encode(description), 0, ...enc.encode(value)])
  const frame = new Uint8Array(10 + body.length)
  frame.set(enc.encode('TXXX'), 0)
  new DataView(frame.buffer).setUint32(4, body.length)
  frame.set(body, 10)
  const out = new Uint8Array(10 + frame.length + 16)
  out.set(enc.encode('ID3'), 0)
  out[3] = 3
  // A synchsafe size: small enough here to fit the last byte.
  out[9] = frame.length + 16
  out.set(frame, 10)
  return out
}

/** A FLAC file that is only a Vorbis comment block. */
function flacWithComments(comments: string[]): Uint8Array {
  const parts = comments.map((c) => enc.encode(c))
  const length = 4 + 4 + parts.reduce((n, p) => n + 4 + p.length, 0)
  const out = new Uint8Array(4 + 4 + length)
  const view = new DataView(out.buffer)
  out.set(enc.encode('fLaC'), 0)
  out[4] = 0x84 // last block, type 4
  out[5] = (length >> 16) & 0xff
  out[6] = (length >> 8) & 0xff
  out[7] = length & 0xff
  let at = 8
  view.setUint32(at, 0, true) // no vendor string
  at += 4
  view.setUint32(at, parts.length, true)
  at += 4
  for (const p of parts) {
    view.setUint32(at, p.length, true)
    out.set(p, at + 4)
    at += 4 + p.length
  }
  return out
}

describe('ReplayGain', () => {
  it('reads the gain as written, sign and unit and all', () => {
    expect(lufsFromReplayGain('-7.43 dB')).toBeCloseTo(-10.57)
    expect(lufsFromReplayGain('+1.20 dB')).toBeCloseTo(-19.2)
    expect(lufsFromReplayGain('-3,5')).toBeCloseTo(-14.5)
    expect(lufsFromReplayGain('loud')).toBeUndefined()
  })
  it('reads Opus R128 gain (Q7.8 against −23 LUFS)', () => {
    expect(lufsFromR128('-1280')).toBeCloseTo(-18)
    expect(lufsFromR128('x')).toBeUndefined()
  })
  it('finds it in an ID3 TXXX frame', () => {
    expect(readTags(id3WithTxxx('REPLAYGAIN_TRACK_GAIN', '-6.00 dB')).loudnessLufs).toBeCloseTo(-12)
    expect(readTags(id3WithTxxx('replaygain_track_gain', '-6.00 dB')).loudnessLufs).toBeCloseTo(-12)
    expect(readTags(id3WithTxxx('REPLAYGAIN_ALBUM_GAIN', '-6.00 dB')).loudnessLufs).toBeUndefined()
  })
  it('finds it in a Vorbis comment, the track gain over the R128 one', () => {
    const flac = flacWithComments(['TITLE=x', 'REPLAYGAIN_TRACK_GAIN=-4 dB', 'R128_TRACK_GAIN=0'])
    expect(readTags(flac).loudnessLufs).toBeCloseTo(-14)
    expect(readTags(flacWithComments(['R128_TRACK_GAIN=-1280'])).loudnessLufs).toBeCloseTo(-18)
  })
  it('lands a tagged song where Stable volume would: down only', () => {
    // −18 LUFS reference + 2 dB = the −16 dB target, so a gain of −2 is level.
    expect(gainForDb(lufsFromReplayGain('-2 dB')!)).toBeCloseTo(1)
    expect(gainForDb(lufsFromReplayGain('-8 dB')!)).toBeCloseTo(10 ** (-6 / 20))
    expect(gainForDb(lufsFromReplayGain('+4 dB')!)).toBe(1)
  })
})
