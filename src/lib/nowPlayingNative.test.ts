import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LockArt } from './lockArt'
import type { Track } from './types'

// The one thing about the app's own lock-screen entry (mode `own`) that can be
// checked without a phone: that a TRACK CHANGE goes on being stated after the
// change-over, and not only when the player's own `playing` flag moves.
//
// ⚠️ That distinction is the whole bug. Pressing next on the lock screen
// changed the track and left the ▶ button showing over a playing song (James,
// 2026-09-14), because nothing about playback CHANGED across the change-over —
// a crossfade never stops, and a record change with the screen locked is
// carried rather than reported — so the entry's last word was WebKit's, which
// says paused while the outgoing element is torn down. The assertion below is
// that an unchanged tick still reaches the plugin for as long as that lasts,
// and stops once it is over.

const mocks = vi.hoisted(() => {
  const plugin = {
    show: vi.fn(async () => ({ animated: false, supportedKeys: [] as string[], mode: 'own' })),
    update: vi.fn(async () => {}),
    clear: vi.fn(async () => {}),
    addListener: vi.fn(async () => ({})),
  }
  return { plugin }
})

vi.mock('./nativePlugins', () => ({ pluginRegistered: () => true }))
vi.mock('@capacitor/core', () => ({ registerPlugin: () => mocks.plugin }))
vi.mock('./bgLog', () => ({ noteEvent: () => {} }))
vi.mock('./mediaSession', () => ({ dispatchAction: () => {} }))

/** `base64` reads the artwork through one; Node has no FileReader of its own. */
class StubFileReader {
  result: string | null = null
  error: unknown = null
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  readAsDataURL(): void {
    this.result = 'data:image/png;base64,QUJD'
    queueMicrotask(() => this.onload?.())
  }
}

const track = { id: 't1', title: 'Do You Love Me', artist: 'Nick Cave', album: 'Let Love In' } as Track
const art: LockArt = {
  key: 'album:v3:vinyl',
  stillUrl: 'blob:still',
  stillPng: new Blob(['still']),
  disc: null,
  ground: ['#ffffff', '#eef2ff'],
  spinSeconds: null,
}

async function load() {
  vi.resetModules()
  return import('./nowPlayingNative')
}

beforeEach(() => {
  mocks.plugin.show.mockClear()
  mocks.plugin.update.mockClear()
  vi.stubGlobal('FileReader', StubFileReader)
  // `performance` too: the re-state window is measured with `performance.now`,
  // which sinon leaves alone unless it is asked for by name.
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date', 'performance'] })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('followProgress', () => {
  it('keeps stating a new entry through the change-over, then goes quiet', async () => {
    const { showOnLockScreen, followProgress } = await load()
    const playback = { elapsed: 10, duration: 200, playing: true }

    await showOnLockScreen(track, art, () => playback)
    expect(mocks.plugin.show).toHaveBeenCalledTimes(1)
    mocks.plugin.update.mockClear()

    // Nothing about playback has changed — this is exactly the tick the old
    // guard threw away, and the tick that has to reach iOS.
    followProgress(true, 10, 200)
    followProgress(true, 10, 200)
    expect(mocks.plugin.update).toHaveBeenCalledTimes(2)
    expect(mocks.plugin.update).toHaveBeenLastCalledWith({ elapsed: 10, duration: 200, rate: 1 })

    // Once the change-over is over, an unchanged tick is silence again: iOS
    // runs the clock itself, and a bridge call four times a second all song
    // is what the guard is there to prevent.
    mocks.plugin.update.mockClear()
    vi.advanceTimersByTime(3100)
    followProgress(true, 13.1, 200)
    expect(mocks.plugin.update).not.toHaveBeenCalled()
  })

  it('still speaks up for a real change once the window has passed', async () => {
    const { showOnLockScreen, followProgress } = await load()
    await showOnLockScreen(track, art, () => ({ elapsed: 10, duration: 200, playing: true }))
    vi.advanceTimersByTime(3100)
    mocks.plugin.update.mockClear()

    followProgress(false, 13.1, 200)
    expect(mocks.plugin.update).toHaveBeenCalledWith({ elapsed: 13.1, duration: 200, rate: 0 })
  })
})
