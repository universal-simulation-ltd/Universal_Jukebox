import { describe, expect, it, vi } from 'vitest'
import { canPickOutput, pickOutput, routedAway, type RoutableMedia } from './outputPicker'

// Choosing where the sound comes out (James, 2026-09-15). The picker itself is
// the system's and cannot be opened in a test — what can be checked is the part
// that decides WHETHER there is one and WHICH API to ask, which is the part
// that would otherwise put a dead button on the screen of every engine that
// has neither.

describe('is there a picker to show', () => {
  it('yes on WebKit — Safari, and so the phone app', () => {
    expect(canPickOutput({ webkitShowPlaybackTargetPicker: () => {} })).toBe(true)
  })

  it('yes on an engine with the Remote Playback API', () => {
    expect(canPickOutput({ remote: { prompt: async () => {} } })).toBe(true)
  })

  it('no on an engine with neither — the button is absent, not dead', () => {
    expect(canPickOutput({})).toBe(false)
    expect(canPickOutput(null)).toBe(false)
    expect(canPickOutput(undefined)).toBe(false)
    // A `remote` with no `prompt` is the shape that would slip through a truthy
    // check on the object alone.
    expect(canPickOutput({ remote: {} })).toBe(false)
  })
})

describe('showing it', () => {
  it('asks WebKit first, and does not await anything before it', async () => {
    // ⚠️ The gesture is spent by the time a promise resolves, so the WebKit
    // call has to happen in the same tick as the tap. Proved by reading the
    // spy BEFORE awaiting the result.
    const show = vi.fn()
    const prompt = vi.fn(async () => {})
    const el: RoutableMedia = { webkitShowPlaybackTargetPicker: show, remote: { prompt } }

    const pending = pickOutput(el)
    expect(show).toHaveBeenCalledTimes(1)
    expect(await pending).toBe('shown')
    // The other API is not also asked — two sheets for one tap.
    expect(prompt).not.toHaveBeenCalled()
  })

  it('falls back to Remote Playback where WebKit has no picker to show', async () => {
    const prompt = vi.fn(async () => {})
    const el: RoutableMedia = {
      webkitShowPlaybackTargetPicker: () => { throw new Error('no targets') },
      remote: { prompt },
    }
    expect(await pickOutput(el)).toBe('shown')
    expect(prompt).toHaveBeenCalledTimes(1)
  })

  it('a dismissed sheet is not an error', async () => {
    // `prompt` rejects both when somebody closed it and when there was no
    // gesture. Neither is worth showing: the sound is still coming out of
    // wherever it already was.
    const el: RoutableMedia = { remote: { prompt: async () => { throw new Error('cancelled') } } }
    expect(await pickOutput(el)).toBe('refused')
  })

  it('says so plainly where there is nothing to show', async () => {
    expect(await pickOutput({})).toBe('unsupported')
    expect(await pickOutput(null)).toBe('unsupported')
  })
})

describe('has the sound gone elsewhere', () => {
  it('yes on a wireless WebKit target, or a connected remote', () => {
    expect(routedAway({ webkitCurrentPlaybackTargetIsWireless: true })).toBe(true)
    expect(routedAway({ remote: { state: 'connected' } })).toBe(true)
  })

  it('no while it is coming out of this device', () => {
    expect(routedAway({ webkitCurrentPlaybackTargetIsWireless: false })).toBe(false)
    expect(routedAway({ remote: { state: 'disconnected' } })).toBe(false)
    // Half way there is not there: the button should not light until it is.
    expect(routedAway({ remote: { state: 'connecting' } })).toBe(false)
    expect(routedAway({})).toBe(false)
    expect(routedAway(null)).toBe(false)
  })
})
