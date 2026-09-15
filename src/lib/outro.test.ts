import { describe, expect, it } from 'vitest'
import { blocksFromBuffer } from './intro'
import { outroFromBlocks } from './outro'

const blocks = (...runs: [number, number][]) => runs.flatMap(([count, db]) => Array<number>(count).fill(db))

describe('outroFromBlocks', () => {
  it('finds the dead air a song ends on', () => {
    // The song at −12, then 3 s of nothing.
    expect(outroFromBlocks(blocks([50, -12], [15, -60]), 0.2)).toBe(3)
  })
  it('is nothing for a song that ends on its last note', () => {
    expect(outroFromBlocks(blocks([60, -12]), 0.2)).toBe(0)
  })
  it('judges quiet against the song itself, not a fixed level', () => {
    // A soft ending: its own "loud" is −30, so −32 is not dead air.
    expect(outroFromBlocks(blocks([40, -30], [10, -32]), 0.2)).toBe(0)
  })
  it('counts an ending that is silent throughout as all of it', () => {
    expect(outroFromBlocks(blocks([100, -80]), 0.2)).toBe(20)
  })
  it('ignores a quiet passage that the song comes back from', () => {
    // A false ending: quiet in the middle, then the last chorus.
    expect(outroFromBlocks(blocks([20, -12], [15, -60], [25, -12]), 0.2)).toBe(0)
  })
})

describe('blocksFromBuffer, from the far end', () => {
  it('measures the closing seconds rather than the opening', () => {
    const rate = 1000
    const data = new Float32Array(rate * 5)
    data.fill(0.5, 0, rate * 3) // three seconds of sound, then two of silence
    const buffer = { sampleRate: rate, numberOfChannels: 1, length: data.length, getChannelData: () => data }
    // A four-second window starting a second in: two seconds of sound and then
    // the two of silence the file ends on.
    const levels = blocksFromBuffer(buffer, 4, 0.2, 1)
    expect(levels).toHaveLength(20)
    expect(outroFromBlocks(levels, 0.2)).toBe(2)
  })
  it('still measures from the start when no offset is given', () => {
    const rate = 1000
    const data = new Float32Array(rate * 3)
    data.fill(0.5, rate)
    const levels = blocksFromBuffer({ sampleRate: rate, numberOfChannels: 1, length: data.length, getChannelData: () => data }, 20, 0.2)
    expect(levels).toHaveLength(15)
  })
})
