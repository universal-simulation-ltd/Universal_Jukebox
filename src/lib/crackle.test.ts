import { describe, expect, it } from 'vitest'
import { wav } from './crackle'

describe('wav', () => {
  it('writes a 16-bit mono PCM header and clamps the samples', async () => {
    const samples = new Float32Array([0, 1, -1, 2, -2])
    const blob = wav({ sampleRate: 44100, getChannelData: () => samples })
    const view = new DataView(await blob.arrayBuffer())
    const text = (at: number, n: number) => String.fromCharCode(...Array.from({ length: n }, (_, i) => view.getUint8(at + i)))
    expect(text(0, 4)).toBe('RIFF')
    expect(text(8, 4)).toBe('WAVE')
    expect(view.getUint16(22, true)).toBe(1)
    expect(view.getUint32(24, true)).toBe(44100)
    expect(view.getUint16(34, true)).toBe(16)
    expect(view.getUint32(40, true)).toBe(samples.length * 2)
    expect(view.getInt16(44 + 2, true)).toBe(0x7fff)
    expect(view.getInt16(44 + 6, true)).toBe(0x7fff)
    expect(view.getInt16(44 + 8, true)).toBe(-0x8000)
    expect(blob.type).toBe('audio/wav')
  })
})
