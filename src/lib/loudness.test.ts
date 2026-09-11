import { describe, expect, it } from 'vitest'
import { gainForDb, gatedRmsDb, MIN_GAIN, TARGET_DB } from './loudness'

describe('gainForDb', () => {
  it('turns a loud song down to the target, and leaves a quiet one alone', () => {
    expect(gainForDb(TARGET_DB)).toBeCloseTo(1)
    expect(gainForDb(TARGET_DB + 6)).toBeCloseTo(0.501, 2)
    expect(gainForDb(TARGET_DB - 10)).toBe(1)
  })
  it('never goes below the floor', () => {
    expect(gainForDb(0)).toBe(MIN_GAIN)
  })
})

describe('gatedRmsDb', () => {
  const buffer = (samples: Float32Array) => ({ sampleRate: 1000, numberOfChannels: 1, length: samples.length, getChannelData: () => samples })
  it('measures a full-scale square wave at 0 dB', () => {
    const s = new Float32Array(4000).map((_, i) => (i % 2 ? 1 : -1))
    expect(gatedRmsDb(buffer(s))).toBeCloseTo(0, 1)
  })
  it('leaves silence out rather than letting it drag the figure down', () => {
    const s = new Float32Array(8000).map((_, i) => (i < 4000 ? 0 : i % 2 ? 0.5 : -0.5))
    expect(gatedRmsDb(buffer(s))).toBeCloseTo(20 * Math.log10(0.5), 1)
  })
  it('is null for silence', () => {
    expect(gatedRmsDb(buffer(new Float32Array(4000)))).toBeNull()
  })
})
