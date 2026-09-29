import { describe, expect, it } from 'vitest'
import { cueSeconds, wav } from './crackle'
import { DECK_SETTINGS, type DeckStyle } from '../stores/settingsStore'

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

describe('the start-up cues', () => {
  // Rule 3 at the top of `crackle.ts`: a sound nobody asked for lasts under a
  // second and sits under the first bar. Every machine, the reel-to-reel's
  // longer mechanism included.
  const machines = DECK_SETTINGS.filter((s): s is DeckStyle => s !== 'automatic')

  it('is over inside a second, on every machine', () => {
    for (const style of machines) {
      const seconds = cueSeconds(style)
      expect(seconds, style).toBeGreaterThan(0)
      expect(seconds, style).toBeLessThan(1)
    }
  })
})
