import { describe, expect, it } from 'vitest'
import { CEREMONY_COOLDOWN_MS, shouldRunCeremony, type CeremonyDecision } from './ceremony'

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
    lastAt: 0,
    albumId: 'the tone arms|sides a and b',
    now: NOW,
    ...over,
  }
}

describe('mode: album (the default)', () => {
  it('runs on the very first play — there is no last album', () => {
    expect(shouldRunCeremony(decision())).toBe(true)
  })

  it('runs when a different record is put on', () => {
    expect(shouldRunCeremony(decision({
      lastAlbumId: 'longform|both halves',
      lastAt: NOW - CEREMONY_COOLDOWN_MS - 1,
    }))).toBe(true)
  })

  // ⚠️ The behaviour the whole feature is named for. Starting another track
  // from the record already playing is not putting a record on.
  it('stays quiet for another track from the SAME record', () => {
    expect(shouldRunCeremony(decision({
      lastAlbumId: 'the tone arms|sides a and b',
      lastAt: NOW - CEREMONY_COOLDOWN_MS * 10,
    }))).toBe(false)
  })

  it('stays quiet for a different record inside the cooldown', () => {
    expect(shouldRunCeremony(decision({
      lastAlbumId: 'longform|both halves',
      lastAt: NOW - 1_000,
    }))).toBe(false)
  })

  it('runs again the moment the cooldown is up', () => {
    const base = { lastAlbumId: 'longform|both halves' }
    expect(shouldRunCeremony(decision({ ...base, lastAt: NOW - CEREMONY_COOLDOWN_MS + 1 }))).toBe(false)
    expect(shouldRunCeremony(decision({ ...base, lastAt: NOW - CEREMONY_COOLDOWN_MS }))).toBe(true)
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
    for (const mode of ['album', 'first'] as const) {
      expect(shouldRunCeremony(decision({ mode, reducedMotion: true })), mode).toBe(false)
    }
  })
})

// ── The two behaviours the cooldown exists for ──────────────────────────────

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
      if (shouldRunCeremony(decision({ albumId, lastAlbumId, lastAt, now }))) {
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
      if (shouldRunCeremony(decision({ albumId, lastAlbumId, lastAt, now }))) {
        fired.push(offset)
        lastAlbumId = albumId
        lastAt = now
      }
    })
    expect(fired).toEqual([0, 320_000])
  })
})
