import { describe, expect, it } from 'vitest'
import { blocksFromBuffer, introFromBlocks } from './intro'

const blocks = (...runs: [number, number][]) => runs.flatMap(([count, db]) => Array<number>(count).fill(db))

describe('introFromBlocks', () => {
  it('finds where a quiet opening gives way to the music', () => {
    // 3 s at −40 dB, then the song at −12.
    expect(introFromBlocks(blocks([15, -40], [50, -12]), 0.2)).toBe(3)
  })
  it('is nothing for a song that starts straight in', () => {
    expect(introFromBlocks(blocks([60, -12]), 0.2)).toBe(0)
  })
  it('judges quiet against the song itself, not a fixed level', () => {
    // A soft song: its own "loud" is −30, so −32 is not a quiet start.
    expect(introFromBlocks(blocks([10, -32], [40, -30]), 0.2)).toBe(0)
  })
  it('counts an opening that is silent throughout as all of it', () => {
    expect(introFromBlocks(blocks([100, -80]), 0.2)).toBe(20)
  })
})

describe('blocksFromBuffer', () => {
  it('measures a decoded opening block by block', () => {
    const rate = 1000
    const data = new Float32Array(rate * 3)
    data.fill(0.5, rate) // a second of silence, then two of sound
    const levels = blocksFromBuffer({ sampleRate: rate, numberOfChannels: 1, length: data.length, getChannelData: () => data }, 20, 0.2)
    expect(levels).toHaveLength(15)
    expect(introFromBlocks(levels, 0.2)).toBe(1)
  })
})
