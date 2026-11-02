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
  it('has all 35 tracks, four of them from the record with no drums', () => {
    // Guards the walk below from quietly testing nothing.
    expect(tracks.length).toBe(35)
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

describe('exampleLyrics', () => {
  it('gives every song timed words, in order, on the beat, inside the song', async () => {
    const { exampleLyrics, exampleTrackPaths } = await import('./exampleLibrary')
    const paths = exampleTrackPaths()
    const sheets = paths.map(({ path }) => exampleLyrics({ path } as Parameters<typeof exampleLyrics>[0]))
    // James, 2026-11-02: "have all songs with lyrics".
    expect(sheets.every((sheet) => sheet !== null)).toBe(true)
    for (const sheet of sheets) {
      expect(sheet!.synced).toBe(true)
      expect(sheet!.lines.length).toBeGreaterThanOrEqual(6)
      const times = sheet!.lines.map((l) => l.timeSec ?? -1)
      // A bar of introduction first: at least a second (the fastest bar is
      // under two), never at zero.
      expect(times[0]).toBeGreaterThan(1)
      // Every song is at least 26 seconds; the last line leaves a bar after it.
      expect(Math.max(...times)).toBeLessThan(44)
      expect(times.every((t, i) => i === 0 || t > times[i - 1])).toBe(true)
    }
  })
})

describe('lyricBeats', () => {
  it('starts on the second bar, puts lines on bars, and pauses a bar halfway when there is room', async () => {
    const { lyricBeats } = await import('./exampleLibrary')
    // 120 bpm: a beat is 0.5 s, a bar 2 s. 40 s = 80 beats, 72 of them for words.
    const times = lyricBeats(8, 40, 120)
    expect(times[0]).toBe(2)
    // 72 / 8 = 9 beats → 8 (two bars) a line; 8 spare → a bar's break after line 4.
    expect(times).toEqual([2, 6, 10, 14, 20, 24, 28, 32])
  })

  it('falls back to a line a beat or two when the song is short and slow', async () => {
    const { lyricBeats } = await import('./exampleLibrary')
    // 60 bpm, 26 s: 26 beats, 18 for words, six lines → 3 beats each, no break.
    expect(lyricBeats(6, 26, 60)).toEqual([4, 7, 10, 13, 16, 19])
  })
})

describe('lyricBeats in waltz time', () => {
  it('counts bars of three', async () => {
    const { lyricBeats } = await import('./exampleLibrary')
    // 120 bpm in 3/4: a bar is 1.5 s. 40 s = 80 beats, 74 for words (a bar
    // in, a bar out); 74 / 8 = 9 beats, three bars a line; 2 spare, no break.
    const times = lyricBeats(8, 40, 120, 3)
    expect(times[0]).toBe(1.5)
    expect(times).toEqual([1.5, 6, 10.5, 15, 19.5, 24, 28.5, 33])
  })
})

describe('the singing', () => {
  it('splits a line into syllables, leaving out a silent final e', async () => {
    const { syllables } = await import('./exampleLibrary')
    expect(syllables('Wax and wane').map((s) => s.vowel)).toEqual(['a', 'a', 'a'])
    expect(syllables('Round again').length).toBe(3)
    expect(syllables('Candle').length).toBe(2)
    // "y" leading a word is a consonant.
    expect(syllables('you').map((s) => s.vowel)).toEqual(['u'])
    expect(syllables('Speak slow')[0].onset).toBe('hiss')
    expect(syllables('Turn')[0].onset).toBe('strike')
  })

  it.each(tracks)('starts singing $path when its first line shows, not before', async ({ path }) => {
    const { exampleLyrics } = await import('./exampleLibrary')
    const sheet = exampleLyrics({ path } as Parameters<typeof exampleLyrics>[0])!
    const first = sheet.lines[0].timeSec!
    const pcm = renderExampleVoice(path, 'vocal')!
    const rate = 22_050
    const before = measure(pcm.subarray(0, Math.floor((first - 0.05) * rate)))
    const after = measure(pcm.subarray(Math.floor(first * rate), Math.floor((first + 1) * rate)))
    expect(before.peak).toBe(0)
    expect(after.peak).toBeGreaterThan(PEAK_FLOOR)
  })
})

describe('examplePlays', () => {
  it('gives some songs from every artist a count of two or more, and only example songs', async () => {
    const { examplePlays } = await import('./exampleLibrary')
    const songs = tracks.map(({ path }, i) => ({
      id: `t${i}`,
      path,
      title: path.split('/').pop()!.replace(/^\d+ /, '').replace(/\.wav$/, ''),
      artist: path.split('/')[1],
    }))
    const mine = { id: 'mine', path: 'Music/Counterweight.mp3', title: 'Counterweight', artist: 'Me' }
    const now = Date.UTC(2026, 10, 2)
    const plays = examplePlays([...songs, mine] as unknown as Parameters<typeof examplePlays>[0], now)
    expect(plays.mine).toBeUndefined()
    const counted = songs.filter((s) => plays[s.id])
    expect(counted.length).toBeGreaterThanOrEqual(10)
    expect(new Set(counted.map((s) => s.artist)).size).toBe(5)
    for (const s of counted) {
      expect(plays[s.id].n).toBeGreaterThanOrEqual(2)
      expect(plays[s.id].last).toBeLessThan(now)
    }
  })
})
