import { describe, expect, it } from 'vitest'
import { wavHeader } from './wavFile'
import { readTags } from './tags'
import { mixFileName, mixTitle, recordedSec } from './mixRecorder'
import type { Track } from './types'

const ascii = (b: Uint8Array, at: number, n: number) => String.fromCharCode(...b.subarray(at, at + n))

describe('wavHeader', () => {
  it('writes a 16-bit stereo PCM header whose sizes add up', () => {
    const data = 48000 * 4
    const h = wavHeader(48000, 2, data)
    const v = new DataView(h.buffer)
    expect(ascii(h, 0, 4)).toBe('RIFF')
    expect(ascii(h, 8, 4)).toBe('WAVE')
    expect(v.getUint32(4, true)).toBe(h.length - 8 + data)
    expect(v.getUint16(20, true)).toBe(1)
    expect(v.getUint16(22, true)).toBe(2)
    expect(v.getUint32(24, true)).toBe(48000)
    expect(v.getUint32(28, true)).toBe(48000 * 4)
    expect(ascii(h, h.length - 8, 4)).toBe('data')
    expect(v.getUint32(h.length - 4, true)).toBe(data)
  })

  it('puts the tags before the audio, where the scan reads them back', () => {
    const h = wavHeader(44100, 2, 1_000_000, { title: 'God’s Plan × Say Say Say', artist: 'Mixes', album: 'Mixes', date: '2026-11-05' })
    // The scan reads the head of the file; the audio after it is far longer.
    const head = new Uint8Array(h.length + 4096)
    head.set(h)
    expect(readTags(head)).toMatchObject({ title: 'God’s Plan × Say Say Say', artist: 'Mixes', album: 'Mixes', year: 2026 })
  })

  it('pads an odd-length tag to an even size, and still reads the next one', () => {
    const h = wavHeader(44100, 2, 0, { title: 'Ab', artist: 'Mixes' })
    expect(readTags(h)).toMatchObject({ title: 'Ab', artist: 'Mixes' })
  })
})

describe('readTags on a WAV', () => {
  it('reads a Latin-1 INFO tag as Latin-1', () => {
    const h = wavHeader(44100, 2, 0, { title: 'x' })
    // Overwrite the one-byte title with é in Latin-1 (0xE9), not valid UTF-8.
    const at = h.indexOf('x'.charCodeAt(0), 36)
    h[at] = 0xe9
    expect(readTags(h).title).toBe('é')
  })

  it('gives an untagged WAV nothing, for the filename to name it', () => {
    expect(readTags(wavHeader(44100, 2, 100))).toEqual({})
  })
})

describe('naming a recording', () => {
  const track = (title: string) => ({ title }) as Track
  const at = new Date(2026, 10, 5, 14, 32, 7)

  it('files it by the time it was made', () => {
    expect(mixFileName(at)).toBe('Mixes/Mix 2026-11-05 14.32.07.wav')
  })

  it('names it after the records played into it', () => {
    expect(mixTitle([track('God’s Plan'), track('Say Say Say')], at, () => 'x')).toBe('God’s Plan × Say Say Say')
    expect(mixTitle([track('A'), track('B'), track('A'), track('C'), track('D')], at, () => 'x')).toBe('A × B + 2')
  })

  it('names it by its time when nothing was played', () => {
    expect(mixTitle([], at, (when) => `Mix, ${when}`, 'en-GB')).toMatch(/^Mix, 5 Nov.*14:32$/)
  })

  it('counts its seconds from interleaved stereo', () => {
    expect(recordedSec([new Int16Array(48000 * 2), new Int16Array(48000)], 48000)).toBe(1.5)
  })
})
