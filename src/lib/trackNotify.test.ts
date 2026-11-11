import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// The native half of `trackNotify.ts`, against a stand-in for Capacitor's
// plugin object — which is the whole point: that object is a Proxy answering
// EVERY property with a method, `then` included, and a promise resolved with
// it never settles. The first build returned it from an async function and the
// iPhone's switch could not be turned on (2026-09-13). An unknown method here
// hangs rather than rejects, as the real one effectively does.

const calls: string[] = []

vi.mock('@capacitor/core', () => ({
  registerPlugin: () =>
    new Proxy(
      {},
      {
        get: (_, prop) => () => {
          calls.push(String(prop))
          if (prop === 'permission' || prop === 'request') return Promise.resolve({ state: 'granted' })
          if (prop === 'show' || prop === 'clear') return Promise.resolve()
          return new Promise(() => {})
        },
      },
    ),
}))

/** Fails the test instead of hanging it. */
function settles<T>(p: Promise<T>): Promise<T> {
  return Promise.race([p, new Promise<T>((_, reject) => setTimeout(() => reject(new Error('never settled')), 500))])
}

describe('trackNotify in a native shell', () => {
  beforeEach(() => {
    calls.length = 0
    ;(globalThis as { Capacitor?: unknown }).Capacitor = {
      isNativePlatform: () => true,
      PluginHeaders: [{ name: 'JukeboxNotify' }],
    }
  })
  afterEach(() => {
    delete (globalThis as { Capacitor?: unknown }).Capacitor
  })

  it('sees the plugin', async () => {
    const { notifySupport } = await import('./trackNotify')
    expect(notifySupport()).toBe('native')
  })

  it('answers the permission question rather than waiting forever', async () => {
    const { notifyPermission } = await import('./trackNotify')
    await expect(settles(notifyPermission())).resolves.toBe('granted')
  })

  it('turns on: asking for permission settles', async () => {
    const { askToNotify } = await import('./trackNotify')
    await expect(settles(askToNotify())).resolves.toBe(true)
  })

  it('never touches `then` on the plugin', async () => {
    const { askToNotify, notifyPermission } = await import('./trackNotify')
    await settles(notifyPermission())
    await settles(askToNotify())
    expect(calls).not.toContain('then')
    expect(calls).toEqual(['permission', 'request'])
  })
})

// ⚠️ One card per song, not two (2026-11-11). In the iPhone app the native
// engine posts the card itself while the app is away, so the page must not
// post it as well — the second post under the same identifier alerted again.
describe('announceTrack with the app away', () => {
  const track = (id: string) => ({ id, title: `Song ${id}`, artist: 'Artist', album: 'Album', albumId: 'a' }) as never
  const setShell = (plugins: string[]) => {
    ;(globalThis as { Capacitor?: unknown }).Capacitor = {
      isNativePlatform: () => true,
      PluginHeaders: plugins.map((name) => ({ name })),
    }
  }
  const flush = () => new Promise((resolve) => setTimeout(resolve, 20))
  beforeEach(() => {
    calls.length = 0
  })
  afterEach(() => {
    delete (globalThis as { Capacitor?: unknown }).Capacitor
  })

  it('leaves the card to the iPhone engine, which posts its own', async () => {
    setShell(['JukeboxNotify', 'JukeboxEngine'])
    const { announceTrack } = await import('./trackNotify')
    announceTrack(track('engine-1'), null)
    await flush()
    expect(calls).not.toContain('show')
  })

  it('posts it itself where there is no engine (Android)', async () => {
    setShell(['JukeboxNotify'])
    const { announceTrack } = await import('./trackNotify')
    announceTrack(track('page-1'), null)
    await flush()
    expect(calls.filter((c) => c === 'show')).toHaveLength(1)
  })
})
