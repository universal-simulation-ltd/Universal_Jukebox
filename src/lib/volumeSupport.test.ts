import { afterEach, describe, expect, it, vi } from 'vitest'
import { canSetElementVolume, resetVolumeSupportForTests } from './volumeSupport'

// The probe, against a stand-in for each of the three engines that matter: one
// that honours `volume`, one that ignores the assignment (iOS), and one that
// throws.
//
// ⚠️ The iOS case is simulated rather than observed, because a Node test cannot
// hold a WKWebView — so what is asserted here is that the PROBE reaches the
// right verdict given that behaviour, not that iOS behaves that way. The real
// device is where the second half is confirmed.

/** An `<audio>` whose `volume` cannot be changed — iOS's behaviour. */
function stubDocument(kind: 'honours' | 'ignores' | 'throws') {
  const createElement = () => {
    if (kind === 'honours') {
      let v = 1
      return { get volume() { return v }, set volume(next: number) { v = next } }
    }
    if (kind === 'ignores') {
      // The assignment is accepted and discarded; reading gives 1.
      return { get volume() { return 1 }, set volume(_next: number) {} }
    }
    return { get volume() { return 1 }, set volume(_next: number) { throw new TypeError('read-only') } }
  }
  vi.stubGlobal('document', { createElement })
}

afterEach(() => {
  resetVolumeSupportForTests()
  vi.unstubAllGlobals()
})

describe('canSetElementVolume', () => {
  it('is true where the assignment sticks', () => {
    stubDocument('honours')
    expect(canSetElementVolume()).toBe(true)
  })

  it('is FALSE where the assignment is silently discarded — the iOS case', () => {
    // The whole point. Nothing throws, nothing warns, and `volume` reads back
    // as a perfectly plausible 1.
    stubDocument('ignores')
    expect(canSetElementVolume()).toBe(false)
  })

  it('is false where the setter throws', () => {
    stubDocument('throws')
    expect(canSetElementVolume()).toBe(false)
  })

  it('probes once and remembers', () => {
    const createElement = vi.fn(() => {
      let v = 1
      return { get volume() { return v }, set volume(next: number) { v = next } }
    })
    vi.stubGlobal('document', { createElement })

    canSetElementVolume()
    canSetElementVolume()
    canSetElementVolume()

    expect(createElement).toHaveBeenCalledTimes(1)
  })

  it('assumes yes with no document at all, rather than disabling fades in Node', () => {
    vi.stubGlobal('document', undefined)
    expect(canSetElementVolume()).toBe(true)
  })

  it('does not probe with 0 or 1, which cannot tell the cases apart', () => {
    // ⚠️ A probe written as `el.volume = 1; return el.volume === 1` passes on
    // iOS, where 1 is what a broken getter returns anyway. Same for 0 against a
    // muted element. The value used has to be one neither case produces.
    const seen: number[] = []
    vi.stubGlobal('document', {
      createElement: () => ({
        get volume() { return 1 },
        set volume(next: number) { seen.push(next) },
      }),
    })
    canSetElementVolume()
    expect(seen.length).toBeGreaterThan(0)
    for (const v of seen) {
      expect(v).not.toBe(0)
      expect(v).not.toBe(1)
    }
  })
})
