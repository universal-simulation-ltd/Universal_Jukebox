// bpm.ts — a tempo estimate from decoded audio, on the device, from nothing but
// the samples (the Mix tab's BPM readout and Sync button).
//
// Method: squash the audio to ~11 kHz and cut it into short overlapping frames;
// take each frame's loudness on a log scale; the half-wave-rectified rise from
// one frame to the next is the ONSET curve (where a drum, a pluck or a chord
// starts). A steady tempo shows as that curve resembling itself shifted by one
// beat, so the autocorrelation of the curve peaks at the beat length. The peak
// is picked between `BPM_MIN` and `BPM_MAX`, with the double-length lag (every
// second beat) helping it so a steady 4/4 is not read as half of itself, then
// refined to a fraction of a frame.
//
// No peak that stands clearly out of the curve means NO TEMPO: speech, ambient
// pads, rain and silence come back `null`, never a made-up number.
//
// Pure and synchronous — `bpmWorker.ts` runs it off the main thread.

export const BPM_MIN = 65
export const BPM_MAX = 190

/** The autocorrelation peak, as a share of the curve's own energy, below which there is no tempo. */
export const MIN_CONFIDENCE = 0.2
/** Where an ambiguous octave is settled: the range music is usually counted in. */
const PREFER_MIN = 87.5
const PREFER_MAX = 175
/** The loudest onsets must rise at least this much on the log-loudness scale (about a sixth louder). */
const MIN_ONSET = 0.15
const TARGET_RATE = 11025
const WINDOW = 256
const HOP = 64

export interface BpmResult {
  /** Beats a minute, to one decimal; null when no steady tempo was found. */
  bpm: number | null
  /** 0–1: how strongly the onsets repeat at that tempo (0 when none). */
  confidence: number
}

const UNKNOWN: BpmResult = { bpm: null, confidence: 0 }

/** The onset curve of `samples` (mono), and its frames a second. */
function onsetCurve(samples: Float32Array, sampleRate: number): { curve: Float32Array; frameRate: number; strength: number } | null {
  const factor = Math.max(1, Math.round(sampleRate / TARGET_RATE))
  const rate = sampleRate / factor
  const n = Math.floor(samples.length / factor)
  if (n < WINDOW * 8) return null
  // Block-average: a cheap low-pass and decimate in one.
  const small = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    let s = 0
    for (let k = 0; k < factor; k++) s += samples[i * factor + k]
    small[i] = s / factor
  }
  const frames = Math.floor((n - WINDOW) / HOP)
  if (frames < 64) return null
  const rms = new Float32Array(frames)
  for (let f = 0; f < frames; f++) {
    let e = 0
    const at = f * HOP
    for (let i = 0; i < WINDOW; i++) e += small[at + i] * small[at + i]
    rms[f] = Math.sqrt(e / WINDOW)
  }
  // Scale by a near-peak loudness so the log means the same on a quiet file.
  const sorted = Float32Array.from(rms).sort()
  const ref = sorted[Math.floor(sorted.length * 0.95)]
  if (!(ref > 1e-4)) return null
  const curve = new Float32Array(frames)
  let prev = Math.log1p((100 * rms[0]) / ref)
  for (let f = 1; f < frames; f++) {
    const now = Math.log1p((100 * rms[f]) / ref)
    curve[f] = Math.max(0, now - prev)
    prev = now
  }
  // How hard the loudest onsets hit: the loudness only wobbles a few percent in
  // noise or a held tone, but jumps in anything with drums or plucks.
  const rises = Float32Array.from(curve).sort()
  const strength = rises[Math.floor(rises.length * 0.99)]
  // Take away the slow average (a swell or a fade is not a beat).
  const frameRate = rate / HOP
  const half = Math.round(frameRate * 0.5)
  const flat = new Float32Array(frames)
  let sum = 0
  let lo = 0
  let hi = 0
  for (let f = 0; f < frames; f++) {
    while (hi < Math.min(frames, f + half + 1)) sum += curve[hi++]
    while (lo < f - half) sum -= curve[lo++]
    flat[f] = Math.max(0, curve[f] - sum / (hi - lo))
  }
  // A light smoothing, so an onset that falls between two frames still lines up with the next beat's.
  const soft = new Float32Array(frames)
  for (let f = 0; f < frames; f++) soft[f] = 0.25 * flat[Math.max(0, f - 1)] + 0.5 * flat[f] + 0.25 * flat[Math.min(frames - 1, f + 1)]
  return { curve: soft, frameRate, strength }
}

/** Mean of c[i]·c[i+lag] over the curve, lag a fraction of a frame (linear interpolation). */
function corrAt(c: Float32Array, lag: number): number {
  const whole = Math.floor(lag)
  const frac = lag - whole
  const n = c.length - whole - 1
  if (n <= 0) return 0
  let s = 0
  for (let i = 0; i < n; i++) s += c[i] * (c[i + whole] * (1 - frac) + c[i + whole + 1] * frac)
  return s / n
}

/**
 * The tempo of mono `samples` at `sampleRate`, or no tempo. A minute or so of
 * music is plenty; more only costs time.
 */
export function estimateBpm(samples: Float32Array, sampleRate: number): BpmResult {
  const onset = onsetCurve(samples, sampleRate)
  if (!onset) return UNKNOWN
  const { curve, frameRate, strength } = onset
  if (strength < MIN_ONSET) return UNKNOWN
  // Centre it: a curve that is all positive correlates with itself at every lag.
  let mean = 0
  for (let i = 0; i < curve.length; i++) mean += curve[i]
  mean /= curve.length
  for (let i = 0; i < curve.length; i++) curve[i] -= mean
  let energy = 0
  for (let i = 0; i < curve.length; i++) energy += curve[i] * curve[i]
  const r0 = energy / curve.length
  if (!(r0 > 1e-9)) return UNKNOWN

  const minLag = Math.floor((60 * frameRate) / BPM_MAX)
  const maxLag = Math.ceil((60 * frameRate) / BPM_MIN)
  if (curve.length < maxLag * 4) return UNKNOWN
  // A mild lean towards the tempi music mostly lives at, an octave either way.
  let best = -1
  let bestScore = 0
  for (let l = minLag; l <= maxLag; l += 0.25) {
    const bpm = (60 * frameRate) / l
    const lean = Math.exp(-0.5 * Math.pow(Math.log2(bpm / 120) / 1.2, 2))
    const score = (corrAt(curve, l) + 0.5 * corrAt(curve, 2 * l)) * lean
    if (score > bestScore) {
      bestScore = score
      best = l
    }
  }
  if (best < 0) return UNKNOWN

  // Refine to a fraction of a frame, around a peak.
  const refine = (at: number) => {
    let lag = at
    let top = -Infinity
    for (let d = -0.5; d <= 0.5001; d += 0.02) {
      const v = corrAt(curve, at + d) + 0.5 * corrAt(curve, 2 * (at + d))
      if (v > top) {
        top = v
        lag = at + d
      }
    }
    return { lag, raw: top }
  }
  let pick = refine(best)
  // A pulse and its double (or half) look the same to an autocorrelation. When
  // another octave is about as well supported, and sits in the range music is
  // usually counted in, that is the one reported.
  const tempoOf = (lag: number) => (60 * frameRate) / lag
  const inRange = (lag: number) => tempoOf(lag) >= PREFER_MIN && tempoOf(lag) <= PREFER_MAX
  const options = [pick]
  for (const at of [best / 2, best * 2]) if (at >= minLag && at <= maxLag) options.push(refine(at))
  const strongest = Math.max(...options.map((o) => o.raw))
  const preferred = options.filter((o) => inRange(o.lag) && o.raw >= 0.92 * strongest).sort((x, y) => y.raw - x.raw)[0]
  if (preferred && !inRange(pick.lag)) pick = preferred
  else if (preferred && preferred.raw > pick.raw) pick = preferred
  const lag = pick.lag
  const confidence = Math.min(1, Math.max(0, corrAt(curve, lag) / r0))
  if (confidence < MIN_CONFIDENCE) return { bpm: null, confidence }
  const bpm = Math.round(((60 * frameRate) / lag) * 10) / 10
  return { bpm, confidence }
}

/** Mono excerpt for estimation: the middle `sec` seconds (intros and outros are not the tempo). */
export function excerptMono(left: Float32Array, right: Float32Array | null, sampleRate: number, sec = 60): Float32Array {
  const len = Math.min(left.length, Math.floor(sec * sampleRate))
  const start = Math.max(0, Math.floor((left.length - len) / 2))
  const out = new Float32Array(len)
  for (let i = 0; i < len; i++) out[i] = right ? (left[start + i] + right[start + i]) / 2 : left[start + i]
  return out
}
