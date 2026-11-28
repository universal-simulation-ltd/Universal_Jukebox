import { describe, expect, it } from 'vitest'
import { estimateBpm, excerptMono } from './bpm'

const SR = 44100

/** Deterministic noise in [-1, 1). */
function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return (s / 2 ** 32) * 2 - 1
  }
}

/** A click track: a short decaying 1.5 kHz burst on every beat. */
function clicks(bpm: number, sec = 40, sr = SR): Float32Array {
  const out = new Float32Array(Math.floor(sec * sr))
  const period = (60 / bpm) * sr
  for (let t = 0; t < out.length; t += period) {
    const at = Math.round(t)
    for (let i = 0; i < 1200 && at + i < out.length; i++) out[at + i] += Math.exp(-i / 250) * Math.sin((2 * Math.PI * 1500 * i) / sr)
  }
  return out
}

/** A kick drum: a falling sine thump. */
function kickAt(out: Float32Array, at: number, sr = SR) {
  for (let i = 0; i < 0.18 * sr && at + i < out.length; i++) {
    const t = i / sr
    out[at + i] += Math.exp(-t / 0.06) * Math.sin(2 * Math.PI * (45 * t + (110 * 0.03) * (1 - Math.exp(-t / 0.03))))
  }
}

/** Four on the floor with off-beat hats and a bass note under it, so it is not just clicks. */
function fourOnTheFloor(bpm: number, sec = 40, sr = SR, everyBeats = 1): Float32Array {
  const out = new Float32Array(Math.floor(sec * sr))
  const beat = (60 / bpm) * sr
  const noise = rng(7)
  for (let b = 0; b * beat < out.length; b++) {
    if (b % everyBeats === 0) kickAt(out, Math.round(b * beat), sr)
    const hat = Math.round((b + 0.5) * beat)
    for (let i = 0; i < 700 && hat + i < out.length; i++) out[hat + i] += 0.25 * noise() * Math.exp(-i / 150)
  }
  for (let i = 0; i < out.length; i++) out[i] += 0.1 * Math.sin((2 * Math.PI * 55 * i) / sr)
  return out
}

describe('estimateBpm: click tracks', () => {
  for (const bpm of [70, 90, 100, 120, 128, 140, 150, 160, 174]) {
    it(`finds ${bpm} BPM`, () => {
      const r = estimateBpm(clicks(bpm), SR)
      expect(r.bpm).not.toBeNull()
      expect(Math.abs(r.bpm! - bpm)).toBeLessThanOrEqual(1)
      expect(r.confidence).toBeGreaterThan(0.3)
    })
  }

  it('reads 48 kHz audio the same', () => {
    const r = estimateBpm(clicks(128, 40, 48000), 48000)
    expect(Math.abs(r.bpm! - 128)).toBeLessThanOrEqual(1)
  })

  it('does not care how loud it is', () => {
    const quiet = clicks(128).map((v) => v * 0.01)
    expect(Math.abs(estimateBpm(quiet, SR).bpm! - 128)).toBeLessThanOrEqual(1)
  })
})

describe('estimateBpm: drum patterns', () => {
  for (const bpm of [70, 90, 120, 128, 174]) {
    it(`finds ${bpm} BPM in a kick and hat pattern`, () => {
      const r = estimateBpm(fourOnTheFloor(bpm), SR)
      expect(r.bpm).not.toBeNull()
      expect(Math.abs(r.bpm! - bpm)).toBeLessThanOrEqual(1.5)
    })
  }

  it('a kick on every second beat is read as that pulse or its double, never something unrelated', () => {
    const bpm = 140
    const r = estimateBpm(fourOnTheFloor(bpm, 40, SR, 2), SR)
    expect(r.bpm).not.toBeNull()
    const near = (a: number, b: number) => Math.abs(a - b) <= 1.5
    expect(near(r.bpm!, bpm) || near(r.bpm!, bpm / 2)).toBe(true)
  })

  it('a middle-of-the-song excerpt is enough', () => {
    const full = fourOnTheFloor(128, 200)
    const part = excerptMono(full, null, SR, 45)
    expect(part.length).toBe(45 * SR)
    expect(Math.abs(estimateBpm(part, SR).bpm! - 128)).toBeLessThanOrEqual(1.5)
  })
})

describe('estimateBpm: no tempo', () => {
  it('silence is unknown', () => {
    expect(estimateBpm(new Float32Array(SR * 30), SR).bpm).toBeNull()
  })

  it('white noise is unknown', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const n = rng(seed)
      const x = new Float32Array(SR * 30).map(() => n() * 0.3)
      expect(estimateBpm(x, SR).bpm, `seed ${seed}`).toBeNull()
    }
  })

  it('a steady hum with a slow swell (ambient) is unknown', () => {
    const x = new Float32Array(SR * 30)
    for (let i = 0; i < x.length; i++) {
      x[i] = 0.3 * Math.sin((2 * Math.PI * 220 * i) / SR) * (0.6 + 0.4 * Math.sin((2 * Math.PI * 0.07 * i) / SR))
    }
    expect(estimateBpm(x, SR).bpm).toBeNull()
  })

  it('a clip too short to hold a tempo is unknown', () => {
    expect(estimateBpm(clicks(120, 1), SR).bpm).toBeNull()
  })

  it('click irregularly spaced (no steady beat) is unknown', () => {
    const n = rng(11)
    const out = new Float32Array(SR * 40)
    for (let t = 0; t < out.length - 2000; t += Math.round(SR * (0.2 + 0.5 * Math.abs(n())))) {
      for (let i = 0; i < 1200; i++) out[t + i] += Math.exp(-i / 250) * Math.sin((2 * Math.PI * 1500 * i) / SR)
    }
    expect(estimateBpm(out, SR).bpm).toBeNull()
  })
})
