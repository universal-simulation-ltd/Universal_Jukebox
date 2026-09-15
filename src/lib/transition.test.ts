import { describe, expect, it } from 'vitest'
import { artistKey, blendSlideMs, changeBetween, planHandover, rowPose, swipeReach, swipeSteps, type HandoverDecision } from './transition'
import type { Track } from './types'

// The rule that decides what happens between two tracks.
//
// Tested for the same reason `ceremony.test.ts` is: this is the half of the
// feature that cannot be found by clicking. "Does a new album lift the record
// out" is two clicks; "does an eleven-track compilation lift the record out
// eleven times" is a whole album of listening, or the one test at the bottom of
// this file.

function track(over: Partial<Track> = {}): Track {
  return {
    id: 'id',
    path: 'The Tone Arms/Sides A and B/01 Lead-in Groove.flac',
    name: '01 Lead-in Groove.flac',
    size: 1,
    mtime: 0,
    ext: 'flac',
    title: 'Lead-in Groove',
    albumArtist: 'The Tone Arms',
    artist: 'The Tone Arms',
    album: 'Sides A and B',
    albumId: 'the tone arms|sides a and b',
    ...over,
  }
}

describe('what changed', () => {
  it('is a track change within one album', () => {
    expect(changeBetween(track(), track({ id: 'b', title: 'Run-out' }))).toBe('track')
  })

  it('is an album change for another record by the same artist', () => {
    expect(changeBetween(track(), track({ albumId: 'the tone arms|b-sides', album: 'B-Sides' })))
      .toBe('album')
  })

  it('is an artist change for somebody else entirely', () => {
    expect(changeBetween(track(), track({
      albumId: 'lathe|first cut',
      albumArtist: 'Lathe',
      artist: 'Lathe',
    }))).toBe('artist')
  })

  it('treats the first play of a session as an artist change', () => {
    expect(changeBetween(null, track())).toBe('artist')
  })

  // ⚠️ The bug this whole fold exists to prevent: a various-artists record
  // whose every track has a different `artist` must not read as eleven
  // consecutive artist changes on one record that never leaves the deck.
  it('follows the album artist, not the track artist, on a compilation', () => {
    const compilation = { albumId: 'various|now that’s what i call vinyl', albumArtist: 'Various Artists' }
    const a = track({ ...compilation, artist: 'The Tone Arms' })
    const b = track({ ...compilation, artist: 'Lathe', id: 'b' })
    expect(changeBetween(a, b)).toBe('track')
  })

  it('ignores case and stray spaces in an artist name', () => {
    expect(artistKey(track({ albumArtist: '  The Tone Arms ' }))).toBe('the tone arms')
    const a = track({ albumArtist: 'The Tone Arms' })
    const b = track({ albumArtist: 'the tone arms ', albumId: 'the tone arms|b-sides' })
    expect(changeBetween(a, b)).toBe('album')
  })

  it('makes untagged files one artist rather than a change every track', () => {
    const a = track({ albumArtist: undefined, artist: undefined, albumId: 'x|y' })
    const b = track({ albumArtist: undefined, artist: undefined, albumId: 'x|z', id: 'b' })
    expect(changeBetween(a, b)).toBe('album')
  })
})

function decision(over: Partial<HandoverDecision> = {}): HandoverDecision {
  return { mode: 'always', reducedMotion: false, change: 'track', ...over }
}

describe('within one album', () => {
  it('blends the tracks and moves the needle, without changing the record', () => {
    const plan = planHandover(decision({ change: 'track' }))
    expect(plan).toEqual({ crossfade: true, needle: true, cue: true, swap: false })
  })
})

describe('a different record', () => {
  // "fade out, fade in … one record lifting out and fading away with the new
  // one fading in" — a sequence, deliberately not a blend.
  it('changes the record and never blends', () => {
    for (const change of ['album', 'artist'] as const) {
      expect(planHandover(decision({ change }))).toEqual({
        crossfade: false, needle: true, cue: true, swap: true,
      })
    }
  })
})

describe('the animation ladder', () => {
  it('“every time” covers every size of change', () => {
    for (const change of ['track', 'album', 'artist'] as const) {
      expect(planHandover(decision({ mode: 'always', change })).cue).toBe(true)
    }
  })

  it('“a new album” covers albums and artists, but not another track', () => {
    expect(planHandover(decision({ mode: 'album', change: 'track' })).cue).toBe(false)
    expect(planHandover(decision({ mode: 'album', change: 'album' })).cue).toBe(true)
    expect(planHandover(decision({ mode: 'album', change: 'artist' })).cue).toBe(true)
  })

  it('“a new artist” covers artists only', () => {
    expect(planHandover(decision({ mode: 'artist', change: 'track' })).cue).toBe(false)
    expect(planHandover(decision({ mode: 'artist', change: 'album' })).cue).toBe(false)
    expect(planHandover(decision({ mode: 'artist', change: 'artist' })).cue).toBe(true)
  })

  it('“once per visit” animates no change-over at all', () => {
    for (const change of ['track', 'album', 'artist'] as const) {
      expect(planHandover(decision({ mode: 'first', change })).needle).toBe(false)
    }
  })

  it('“never” animates nothing', () => {
    for (const change of ['track', 'album', 'artist'] as const) {
      expect(planHandover(decision({ mode: 'off', change }))).toMatchObject({
        needle: false, cue: false, swap: false,
      })
    }
  })
})

// ⚠️ The judgement call this file's header explains, pinned by a test so that
// "turning the animation off also killed the crossfade" is a failure and not a
// discovery three months later.
describe('the blend is audio, not animation', () => {
  it('survives every setting, including off and reduced motion', () => {
    for (const mode of ['always', 'album', 'artist', 'first', 'off'] as const) {
      expect(planHandover(decision({ mode, change: 'track' })).crossfade).toBe(true)
    }
    expect(planHandover(decision({ reducedMotion: true, change: 'track' })).crossfade).toBe(true)
  })

  it('never blends across a record change with “Crossfade between records” off, whatever the animation setting', () => {
    for (const mode of ['always', 'album', 'artist', 'first', 'off'] as const) {
      expect(planHandover(decision({ mode, change: 'album' })).crossfade).toBe(false)
    }
  })
})

describe('a different record, with “Crossfade between records” on', () => {
  it('blends while it changes the record, needle and start-up sound and all', () => {
    for (const change of ['album', 'artist'] as const) {
      expect(planHandover(decision({ change, recordCrossfade: true }))).toEqual({
        crossfade: true, needle: true, cue: true, swap: true,
      })
    }
  })
  it('still blends with the animation off — the blend is audio', () => {
    expect(planHandover(decision({ mode: 'off', change: 'album', recordCrossfade: true })).crossfade).toBe(true)
  })
})

describe('reduced motion', () => {
  it('stops the picture and the noise, on every size of change', () => {
    for (const change of ['track', 'album', 'artist'] as const) {
      expect(planHandover(decision({ reducedMotion: true, change }))).toMatchObject({
        needle: false, cue: false, swap: false,
      })
    }
  })
})

// The behaviour that is expensive to check by ear, and cheap here.
describe('an album played end to end', () => {
  it('changes the record exactly once, on the way in', () => {
    const album = ['a', 'b', 'c', 'd', 'e']
    const swaps = album.map((_, i) =>
      planHandover(decision({ change: i === 0 ? 'artist' : 'track' })).swap,
    )
    expect(swaps.filter(Boolean)).toHaveLength(1)
    expect(swaps[0]).toBe(true)
  })
})

// The slide that goes with a record crossfade — and, mostly, when NOT to run it
// (James, 2026-09-15: "when choosing a track out of the library it shows the
// correct disc with lyrics but then animates the same track coming in from the
// right").
describe('blendSlideMs', () => {
  const LEAST = 240

  it('a blend that has just started slides for its whole length', () => {
    expect(blendSlideMs({ ms: 1500, at: 1000 }, 1000, LEAST)).toBe(1500)
  })

  it('no blend, no slide', () => {
    expect(blendSlideMs(null, 1000, LEAST)).toBeNull()
  })

  it('⚠️ a blend that is OVER never slides again — the bug itself', () => {
    // The swiper mounts long after the record change: the store should have
    // nulled `blend` by now, and if anything ever leaves one standing again,
    // this is what stops it being replayed over the record already on the deck.
    expect(blendSlideMs({ ms: 1500, at: 1000 }, 2500, LEAST)).toBeNull()
    expect(blendSlideMs({ ms: 1500, at: 1000 }, 900_000, LEAST)).toBeNull()
  })

  it('mounting part way through a real blend slides over what is LEFT of it', () => {
    // 600ms in, so 900ms to go — not another 1500ms, which would land the
    // record in the middle long after the music had finished crossing.
    expect(blendSlideMs({ ms: 1500, at: 1000 }, 1600, LEAST)).toBe(900)
  })

  it('too little left is no slide at all — a flick from the edge is worse than none', () => {
    expect(blendSlideMs({ ms: 1500, at: 1000 }, 2400, LEAST)).toBeNull()
    // Exactly the least is still worth running.
    expect(blendSlideMs({ ms: 1500, at: 1000 }, 1000 + 1500 - LEAST, LEAST)).toBe(LEAST)
  })

  it('never asks for longer than the blend, whatever the clock says', () => {
    // A clock that went backwards (a device waking, a test) must not stretch it.
    expect(blendSlideMs({ ms: 1500, at: 1000 }, 500, LEAST)).toBe(1500)
  })
})

// The row of records moving with a drag (James, 2026-09-15: "Could you queue
// up another 1 or 2 records for the swipe to advance, so the user could do a
// continuous swipe and go 2 records later").
describe('swipeReach', () => {
  const TRAVEL = 200
  const EXTRA = 0.5
  const reach = (px: number, room = 5) => swipeReach(px, TRAVEL, room, EXTRA)

  it('follows the finger exactly across the first record', () => {
    expect(reach(0)).toBe(0)
    expect(reach(TRAVEL / 2)).toBe(0.5)
    expect(reach(TRAVEL)).toBe(1)
  })

  it('runs a record for every half travel after that', () => {
    expect(reach(TRAVEL * 1.5)).toBe(2)
    expect(reach(TRAVEL * 2)).toBe(3)
  })

  it('stops at the last record there is', () => {
    expect(reach(TRAVEL * 10, 2)).toBe(2)
    expect(reach(TRAVEL * 10, 0)).toBe(0)
  })

  it('lands where it is showing — the record nearest the middle', () => {
    // `swipeSteps` is the landing and this is the drawing. If they disagreed,
    // you would let go on one record and arrive at another.
    for (let px = TRAVEL; px < TRAVEL * 4; px += 7) {
      expect(swipeSteps(px, TRAVEL, 5, EXTRA)).toBe(Math.max(1, Math.round(reach(px))))
    }
  })
})

describe('rowPose', () => {
  const SAG = 40
  const PEEK = 0.62
  const pose = (slot: number) => rowPose(slot, SAG, PEEK)
  const close = (slot: number, want: { y: number; scale: number; opacity: number }) => {
    const got = pose(slot)
    expect(got.y).toBeCloseTo(want.y)
    expect(got.scale).toBeCloseTo(want.scale)
    expect(got.opacity).toBeCloseTo(want.opacity)
  }

  it('is the deck at 0 and a peek either side', () => {
    close(0, { y: 0, scale: 1, opacity: 1 })
    close(1, { y: SAG, scale: PEEK, opacity: 0.6 })
    close(-1, { y: SAG, scale: PEEK, opacity: 0.6 })
  })

  it('starts from the medium’s own seat when the machine stays — a CD in its well', () => {
    const seat = { y: -20, scale: 0.85 }
    const at = (slot: number) => rowPose(slot, SAG, PEEK, seat)
    expect(at(0).y).toBeCloseTo(-20)
    expect(at(0).scale).toBeCloseTo(0.85)
    expect(at(1).y).toBeCloseTo(SAG)
    expect(at(-1).scale).toBeCloseTo(PEEK)
    // The same parabola, from the well rather than from the middle.
    expect(at(0.5).y).toBeCloseTo(-20 + (SAG + 20) * 0.25)
    expect(at(0.5).scale).toBeCloseTo(0.85 + (PEEK - 0.85) * 0.5)
  })

  it('keeps a queued record out of sight until it comes up to a peek', () => {
    expect(pose(2).opacity).toBe(0)
    expect(pose(-3).opacity).toBe(0)
    close(1.5, { y: SAG, scale: PEEK, opacity: 0.3 })
  })

  it('never jumps passing through a peek', () => {
    const before = pose(1 - 1e-6)
    const after = pose(1 + 1e-6)
    expect(after.y).toBeCloseTo(before.y)
    expect(after.scale).toBeCloseTo(before.scale)
    expect(after.opacity).toBeCloseTo(before.opacity)
  })

  it('is the arc the neighbours always moved on, leaving and arriving', () => {
    for (let p = 0; p <= 1; p += 0.125) {
      // The deck's record leaving: sinking on progress².
      close(-p, { y: SAG * p * p, scale: 1 - (1 - PEEK) * p, opacity: 1 - 0.4 * p })
      // The peek arriving: rising out of the sag on 1 − (1 − progress)².
      expect(pose(1 - p).y - SAG).toBeCloseTo(-SAG * (1 - (1 - p) ** 2))
    }
  })
})

// The long swipe (James, 2026-09-15: "it would be good if the user could do a
// long swipe to move a few records ahead in one motion").
describe('swipeSteps', () => {
  const TRAVEL = 200
  const EXTRA = 0.5
  const steps = (px: number, room = 5) => swipeSteps(px, TRAVEL, room, EXTRA)

  it('anything short of one travel is the swipe it has always been — one record', () => {
    expect(steps(20)).toBe(1)
    expect(steps(TRAVEL - 1)).toBe(1)
    expect(steps(TRAVEL)).toBe(1)
  })

  it('each record past the first costs half a travel', () => {
    expect(steps(TRAVEL * 1.25)).toBe(2)
    expect(steps(TRAVEL * 1.75)).toBe(3)
    expect(steps(TRAVEL * 2.25)).toBe(4)
    expect(steps(TRAVEL * 2.75)).toBe(5)
  })

  it('a drag just past one travel has not committed to two yet', () => {
    // Otherwise the record you land on flips the instant you overshoot.
    expect(steps(TRAVEL * 1.1)).toBe(1)
  })

  it('never goes further than there are records', () => {
    expect(steps(TRAVEL * 10, 2)).toBe(2)
    expect(steps(TRAVEL * 10, 5)).toBe(5)
    // The end of the queue, with nothing to move to.
    expect(steps(TRAVEL * 10, 0)).toBe(0)
    expect(steps(20, 0)).toBe(0)
  })

  it('never goes backwards or to nothing on a real swipe', () => {
    for (let px = 1; px < TRAVEL * 4; px += 7) {
      const n = steps(px)
      expect(n).toBeGreaterThanOrEqual(1)
      expect(n).toBeLessThanOrEqual(5)
    }
  })

  it('only ever grows as the finger goes further', () => {
    let last = 0
    for (let px = 0; px < TRAVEL * 4; px += 5) {
      const n = steps(px)
      expect(n).toBeGreaterThanOrEqual(last)
      last = n
    }
  })

  it('a travel of nothing is not a divide by zero', () => {
    expect(swipeSteps(100, 0, 5, EXTRA)).toBe(0)
    // No extra cost configured: a long drag is still one record, never NaN.
    expect(swipeSteps(TRAVEL * 3, TRAVEL, 5, 0)).toBe(1)
  })
})
