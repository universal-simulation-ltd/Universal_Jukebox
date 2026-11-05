import { describe, expect, it } from 'vitest'
import { quickTimeMp3Frames } from './quickTimeMp3'

function box(type: string, body: Uint8Array): Uint8Array {
  const out = new Uint8Array(8 + body.length)
  new DataView(out.buffer).setUint32(0, out.length)
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i)
  out.set(body, 8)
  return out
}
const text = (s: string) => Uint8Array.from(s, (c) => c.charCodeAt(0))
const join = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let at = 0
  for (const p of parts) { out.set(p, at); at += p.length }
  return out
}
const file = (...parts: Uint8Array[]) => join(...parts).buffer
const frames = Uint8Array.from([0xff, 0xfb, 0x90, 0x64, 1, 2, 3, 4, 0xff, 0xfb, 0x90, 0x64, 5, 6])

describe('quickTimeMp3Frames', () => {
  it('returns the mdat payload of a single-track MP3-in-QuickTime file (the Music-library copy)', () => {
    const qt = file(box('ftyp', text('qt  \0\0\0\0qt  ')), box('wide', new Uint8Array()), box('mdat', frames),
      box('moov', box('trak', text('....stsd....ms\0U....'))))
    expect(new Uint8Array(quickTimeMp3Frames(qt)!)).toEqual(frames)
  })

  it('also knows the .mp3 sample-entry code', () => {
    const qt = file(box('ftyp', text('qt  ')), box('moov', box('trak', text('stsd.mp3'))), box('mdat', frames))
    expect(new Uint8Array(quickTimeMp3Frames(qt)!)).toEqual(frames)
  })

  it('leaves AAC (an .m4a WebKit decodes itself) alone', () => {
    const qt = file(box('ftyp', text('M4A ')), box('mdat', frames), box('moov', box('trak', text('stsdmp4a'))))
    expect(quickTimeMp3Frames(qt)).toBeNull()
  })

  it('refuses a file with two tracks, whose packets would interleave', () => {
    const qt = file(box('ftyp', text('qt  ')), box('mdat', frames),
      box('moov', join(box('trak', text('.mp3')), box('trak', text('avc1')))))
    expect(quickTimeMp3Frames(qt)).toBeNull()
  })

  it('leaves a plain MP3 and a truncated file alone', () => {
    expect(quickTimeMp3Frames(file(text('ID3'), frames))).toBeNull()
    const cut = join(box('ftyp', text('qt  ')), box('mdat', frames)).slice(0, 20)
    expect(quickTimeMp3Frames(cut.buffer)).toBeNull()
  })
})
