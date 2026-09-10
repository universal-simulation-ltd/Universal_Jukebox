import { describe, expect, it } from 'vitest'
import { exampleTrackPaths, renderExampleVoice, VOICES, type Voice } from './exampleLibrary'

// Does the example library make a SOUND — every part of it, on every track?
//
// ⚠️ This test exists because the answer was once "no", for a week, and every
// other check agreed it was fine. `addTone` ran its "has this note died away"
// test during the attack, where the envelope is exactly 0, and broke out on the
// first sample of every note. The pad, the bass and the lead wrote nothing.
// Eight of the nine records played as a drum machine and "Quiet Rooms" was
// thirty-eight seconds of digital silence — while every file had the right
// length, decoded cleanly and fired `ended` on time.
//
// ⚠️ PER VOICE, NOT PER TRACK, and that is the whole design. A floor on the
// finished track would have PASSED that bug: the drums are built by separate
// functions, were never affected, and put a kick at -9 dBFS on every bar. The
// only measurement that hears a missing melody is one that listens to the
// melody on its own.
//
// Negative control (2026-09-10): with the unguarded `if (amp < 0.0008) break`
// put back, this file failed the pad, the bass and the lead on all 31 tracks
// (93 failures) and passed the drums on the 27 that have them. Measured the
// same way, the WHOLE-TRACK peak of those 27 drums-only tracks was never below
// 0.34 and their RMS never below 0.035 — comfortably over both floors below, so
// a whole-track version of this test would have caught "Quiet Rooms" (true
// silence) and waved the other eight records through. Restored, this passes.

/**
 * The quietest a voice may peak, as a linear sample value.
 *
 * About -34 dBFS. The quietest real voice in the library — the pad on "Surface
 * Noise", whose recipe sits it lowest — peaks at about 0.046, so this is a
 * little over half of that: low enough that retuning a recipe does not trip it,
 * and a very long way above the 0 the bug produced.
 */
const PEAK_FLOOR = 0.02

/**
 * The quietest a voice may be on AVERAGE, as RMS (about -46 dBFS).
 *
 * Catches the bug's near relation, which a peak alone would miss: a voice that
 * sounds one note and then stops. The quietest real voice's RMS is about 0.011.
 */
const RMS_FLOOR = 0.005

function measure(pcm: Float32Array): { peak: number; rms: number } {
  let peak = 0
  let sum = 0
  for (const sample of pcm) {
    const a = Math.abs(sample)
    if (a > peak) peak = a
    sum += sample * sample
  }
  return { peak, rms: Math.sqrt(sum / pcm.length) }
}

const tracks = exampleTrackPaths()

describe('the example library', () => {
  it('has all 31 tracks, four of them from the record with no drums', () => {
    // Guards the walk below from quietly testing nothing.
    expect(tracks.length).toBe(31)
    expect(tracks.filter((t) => !t.drums).length).toBe(4)
  })

  describe.each(tracks)('$path', ({ path, drums }) => {
    const voices: Voice[] = VOICES.filter((voice) => voice !== 'drums' || drums)

    it.each(voices)('its %s is audible', (voice) => {
      const pcm = renderExampleVoice(path, voice)
      expect(pcm).not.toBeNull()
      const { peak, rms } = measure(pcm!)
      expect(peak, `${voice} peak`).toBeGreaterThan(PEAK_FLOOR)
      expect(rms, `${voice} RMS`).toBeGreaterThan(RMS_FLOOR)
    })

    if (!drums) {
      // Proves the solo render really is one voice. If `only` were ignored,
      // this record's "drums" would be the whole mix and this would fail.
      it('has no drums, because its record has none', () => {
        expect(measure(renderExampleVoice(path, 'drums')!).peak).toBe(0)
      })
    }
  })
})
