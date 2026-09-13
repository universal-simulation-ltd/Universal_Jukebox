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
