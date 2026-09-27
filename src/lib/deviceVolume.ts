// The phone's own volume, finer than its buttons — the iPhone app's Volume
// slider on Now Playing. `ios/App/App/DeviceVolumePlugin.swift` does the work
// and says why: in the iPhone app the page's audio takes a `volume` and plays
// no quieter for it (James, 2026-09-27: "Turning down not working on iPhone"),
// so the −50 to +50 trim (`volumeTrim.ts`) can't be heard there. The phone's
// volume can be, and to any value — a button step is 1/16, this goes to 1/100.

import { pluginRegistered } from './nativePlugins'

const NAME = 'JukeboxDeviceVolume'

interface DeviceVolumePlugin {
  get(): Promise<{ volume: number }>
  set(options: { volume: number }): Promise<{ volume: number }>
  addListener(event: 'change', fn: (data: { volume: number }) => void): Promise<{ remove(): Promise<void> }>
}

let plugin: DeviceVolumePlugin | null = null

/**
 * Registered lazily and never returned through a promise — a Capacitor plugin
 * is a Proxy that answers `then` with a native call (see `appleMusic.ts`).
 */
async function load(): Promise<void> {
  if (plugin) return
  const { registerPlugin } = await import('@capacitor/core')
  plugin = registerPlugin<DeviceVolumePlugin>(NAME)
}

/** Is the phone's volume the one to show? The iPhone app only; synchronous. */
export function hasDeviceVolume(): boolean {
  return pluginRegistered(NAME)
}

export async function getDeviceVolume(): Promise<number | null> {
  try {
    await load()
    return (await plugin!.get()).volume
  } catch {
    return null
  }
}

export async function setDeviceVolume(volume: number): Promise<void> {
  try {
    await load()
    await plugin!.set({ volume: Math.max(0, Math.min(1, volume)) })
  } catch { /* the slider stays where it was put; the buttons still work */ }
}

/** Follow the buttons. Returns the unsubscribe. */
export function onDeviceVolume(fn: (volume: number) => void): () => void {
  let handle: { remove(): Promise<void> } | null = null
  let gone = false
  void load().then(async () => {
    const h = await plugin!.addListener('change', (d) => fn(d.volume))
    if (gone) void h.remove()
    else handle = h
  }).catch(() => {})
  return () => {
    gone = true
    if (handle) void handle.remove()
  }
}
