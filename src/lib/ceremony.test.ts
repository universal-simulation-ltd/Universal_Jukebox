import { describe, expect, it } from 'vitest'
import { CEREMONY_COOLDOWN_MS, shouldRunCeremony, type CeremonyDecision } from './ceremony'

// ⚠️ The cooldown is currently ZERO — the gate is deliberately off (see
// `ceremony.ts`). The tests that are ABOUT the cooldown therefore pass their
// own value: they exist to prove the knob still works, so that putting a real
// number back is one edit and not an archaeology exercise. Every other test
// runs against the shipping constant.
const A_MINUTE_AND_A_HALF = 90_000

// The rule that decides when the record-changing animation runs.
//
// This is tested hard because it is the half of the feature that cannot be
// seen by clicking. "Does it fire on a new album" takes two clicks; "does it
// stay quiet through a shuffled library" takes an hour of listening — or the
// two tests at the bottom of this file.

const NOW = 1_757_000_000_000

function decision(over: Partial<CeremonyDecision> = {}): CeremonyDecision {
  return {
    mode: 'album',
    reducedMotion: false,
    ceremonyDone: false,
    lastAlbumId: null,
    lastArtist: null,
    lastAt: 0,
    albumId: 'the tone arms|sides a and b',
    artist: 'the tone arms',
    now: NOW,
    ...over,
  }
}

describe('mode: always (the default)', () => {
  // ⚠️ The behaviour James asked for on 2026-09-08: pressing play anywhere
  // takes you to the deck and cues the arm. `shouldRunCeremony` is only ever
  // asked on an EXPLICIT start, so a running queue is still silent — that
  // separation lives in `playerStore.advance`, not here.
  it('runs on every explicit play, same record or not', () => {
    expect(shouldRunCeremony(decision({ mode: 'always' }))).toBe(true)
    expect(shouldRunCeremony(decision({
      mode: 'always',
      ceremonyDone: true,
      lastAlbumId: 'the tone arms|sides a and b',
      lastAt: NOW - 500,
    }))).toBe(true)
  })

  it('still yields to reduced motion', () => {
    expect(shouldRunCeremony(decision({ mode: 'always', reducedMotion: true }))).toBe(false)
  })
})

describe('mode: album', () => {
  it('runs on the very first play — there is no last album', () => {
    expect(shouldRunCeremony(decision())).toBe(true)
  })

  it('runs when a different record is put on', () => {
    expect(shouldRunCeremony(decision({
      lastAlbumId: 'longform|both halves',
      lastAt: NOW - CEREMONY_COOLDOWN_MS - 1,
    }))).toBe(true)
  })

  // The gate is off as shipped, so back-to-back records each get their arrival.
  // This is the test that FAILS the moment somebody puts a cooldown back
  // without meaning to.
  it('with the gate off, runs again immediately for another record', () => {
    expect(CEREMONY_COOLDOWN_MS).toBe(0)
    expect(shouldRunCeremony(decision({
      lastAlbumId: 'longform|both halves',
      lastAt: NOW - 1,
    }))).toBe(true)
  })

  // ⚠️ The behaviour the whole feature is named for. Starting another track
  // from the record already playing is not putting a record on.
  it('stays quiet for another track from the SAME record', () => {
    expect(shouldRunCeremony(decision({
      lastAlbumId: 'the tone arms|sides a and b',
      lastAt: NOW - 10_000,
    }))).toBe(false)
  })
})

// ── The knob, proved separately ─────────────────────────────────────────────
//
// These pass their own cooldown rather than reading the constant, so they go on
// proving the limit works while the shipping value is zero — and so that James
// setting `CEREMONY_COOLDOWN_MS` to whatever he finds by ear gets the behaviour
// these describe, with no other edit anywhere.

describe('the cooldown, when one is set', () => {
  it('stays quiet for a different record inside it', () => {
    expect(shouldRunCeremony(decision({
      cooldownMs: A_MINUTE_AND_A_HALF,
      lastAlbumId: 'longform|both halves',
      lastAt: NOW - 1_000,
    }))).toBe(false)
  })

  it('runs again the moment it is up', () => {
    const base = { cooldownMs: A_MINUTE_AND_A_HALF, lastAlbumId: 'longform|both halves' }
    expect(shouldRunCeremony(decision({ ...base, lastAt: NOW - A_MINUTE_AND_A_HALF + 1 }))).toBe(false)
    expect(shouldRunCeremony(decision({ ...base, lastAt: NOW - A_MINUTE_AND_A_HALF }))).toBe(true)
  })
})

// ⚠️ `artist` is the rung James added on 2026-09-09, and its whole point is
// that it is RARER than `album`: a discography played through should cue the
// arm when the artist changes and stay quiet through their records.
describe('mode: artist', () => {
  it('runs for somebody new', () => {
    expect(shouldRunCeremony(decision({
      mode: 'artist',
      lastArtist: 'lathe',
      artist: 'the tone arms',
    }))).toBe(true)
  })

  it('stays quiet for another record by the same artist', () => {
    expect(shouldRunCeremony(decision({
      mode: 'artist',
      lastArtist: 'the tone arms',
      artist: 'the tone arms',
      albumId: 'the tone arms|b-sides',
    }))).toBe(false)
  })

  it('runs the first time anything is played', () => {
    expect(shouldRunCeremony(decision({ mode: 'artist', lastArtist: null }))).toBe(true)
  })
})

describe('mode: first', () => {
  it('runs once, then never again — even on a new album', () => {
    expect(shouldRunCeremony(decision({ mode: 'first' }))).toBe(true)
    expect(shouldRunCeremony(decision({
      mode: 'first',
      ceremonyDone: true,
      albumId: 'somebody else|a different record',
      lastAt: NOW - CEREMONY_COOLDOWN_MS * 100,
    }))).toBe(false)
  })
})

describe('mode: off', () => {
  it('never runs, whatever else is true', () => {
    expect(shouldRunCeremony(decision({ mode: 'off' }))).toBe(false)
    expect(shouldRunCeremony(decision({
      mode: 'off', lastAlbumId: 'x', lastAt: 0, ceremonyDone: false,
    }))).toBe(false)
  })
})

describe('reduced motion', () => {
  // The end state has to be reachable without the transition, so the arm is
  // simply down and the music starts. Beats every mode.
  it('overrides every mode', () => {
    for (const mode of ['always', 'album', 'first'] as const) {
      expect(shouldRunCeremony(decision({ mode, reducedMotion: true })), mode).toBe(false)
    }
  })
})

// ── The two behaviours the cooldown exists for ──────────────────────────────
//
// Both run with a cooldown passed in, because that is what they are about. With
// the gate off (as shipped) both fire every time, which is exactly the thing
// James wants to hear before choosing a number.

describe('a shuffled library, where almost every track is a new album', () => {
  it('⚠️ fires ONCE, not on every track', () => {
    // Ten tracks, each from a different album, three minutes apart is not the
    // shape of shuffle — they arrive back to back. Model that: a new album
    // every ~4 minutes of listening would be fine, but shuffle hands us one
    // every few seconds, and only the first should be heard.
    let lastAlbumId: string | null = null
    let lastAt = 0
    let fired = 0
    for (let i = 0; i < 10; i++) {
      const now = NOW + i * 3_000
      const albumId = `artist ${i}|album ${i}`
      if (shouldRunCeremony(decision({ cooldownMs: A_MINUTE_AND_A_HALF, albumId, lastAlbumId, lastAt, now }))) {
        fired++
        lastAlbumId = albumId
        lastAt = now
      }
    }
    expect(fired).toBe(1)
  })
})

describe('browsing the grid, clicking album after album', () => {
  it('⚠️ fires once for the burst, then again once you settle', () => {
    let lastAlbumId: string | null = null
    let lastAt = 0
    const fired: number[] = []
    // Five albums clicked over 20 seconds, then one put on properly 5 min later.
    const clicks = [0, 4_000, 9_000, 14_000, 20_000, 320_000]
    clicks.forEach((offset, i) => {
      const now = NOW + offset
      const albumId = `artist ${i}|album ${i}`
      if (shouldRunCeremony(decision({ cooldownMs: A_MINUTE_AND_A_HALF, albumId, lastAlbumId, lastAt, now }))) {
        fired.push(offset)
        lastAlbumId = albumId
        lastAt = now
      }
    })
    expect(fired).toEqual([0, 320_000])
  })
})
