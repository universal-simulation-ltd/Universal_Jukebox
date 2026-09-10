// The iPhone app's own lock-screen entry — for iOS 26's ANIMATED artwork: the
// record on the lock screen actually turning. `MPMediaItemAnimatedArtwork` is
// native-only, so this talks to `JukeboxNowPlaying`
// (`ios/App/App/NowPlayingPlugin.swift`), which makes the looping video from
// `lockArt.ts`'s disc.
//
// ⚠️ WEBKIT ALREADY PUBLISHES A NOW-PLAYING ENTRY FOR THE <audio>, and whether
// it does so through the app's own `MPNowPlayingInfoCenter` decides how this
// works. The plugin looks the first time it is called and says which it found:
//   - `merge`: WebKit's entry IS the app's — the plugin only adds the animated
//     artwork to it, and puts it back if WebKit's next update drops it;
//   - `own`: it is not — the plugin publishes a whole entry of its own, so it
//     must also carry the progress (`followProgress`) and answer the buttons
//     (the `command` events, handed to the page's Media Session handlers).
// The mode is in `[jukebox:diag]` as `lockArt`.

import { pluginRegistered } from './nativePlugins'
import { dispatchAction } from './mediaSession'
import { noteEvent } from './bgLog'
import type { LockArt } from './lockArt'
import type { Track } from './types'

const NAME = 'JukeboxNowPlaying'

interface ShowOptions {
  artworkId: string
  still: string
  disc: string | null
  ground: [string, string]
  spinSeconds: number | null
  title: string
  artist: string
  album: string
  elapsed: number
  duration: number
  rate: number
}

interface NowPlayingPlugin {
  show(options: ShowOptions): Promise<{ animated: boolean; supportedKeys: string[]; mode: string }>
  update(options: { elapsed: number; duration: number; rate: number }): Promise<void>
  clear(): Promise<void>
  addListener(event: 'command', fn: (e: { action: string; position?: number }) => void): Promise<unknown>
}

let plugin: NowPlayingPlugin | null = null
let mode = 'unknown'
let report = 'not called'
let listening = false

export function nativeNowPlayingAvailable(): boolean {
  return pluginRegistered(NAME)
}

/** One line for `[jukebox:diag]`. */
export function describeNativeNowPlaying(): string {
  return report
}

async function load(): Promise<void> {
  if (plugin) return
  const { registerPlugin } = await import('@capacitor/core')
  plugin = registerPlugin<NowPlayingPlugin>(NAME)
}

export async function showOnLockScreen(
  track: Track,
  art: LockArt,
  now: { elapsed: number; duration: number; playing: boolean },
): Promise<void> {
  if (!nativeNowPlayingAvailable()) return
  try {
    await load()
    const result = await plugin!.show({
      artworkId: art.key,
      still: await base64(art.stillPng),
      disc: art.disc ? await base64(art.disc) : null,
      ground: art.ground,
      spinSeconds: art.spinSeconds,
      title: track.title,
      artist: track.artist ?? track.albumArtist ?? '',
      album: track.album ?? '',
      elapsed: now.elapsed,
      duration: now.duration,
      rate: now.playing ? 1 : 0,
    })
    mode = result.mode
    report = `mode=${result.mode} animated=${result.animated} keys=${result.supportedKeys.join(',') || 'none'}`
    if (mode === 'own' && !listening) {
      listening = true
      await plugin!.addListener('command', (e) => {
        noteEvent('lock-command', { action: e.action })
        dispatchAction(e.action, e.position)
      })
    }
    sent = { playing: now.playing, at: performance.now(), sec: now.elapsed, duration: now.duration }
  } catch (error) {
    report = `failed: ${error instanceof Error ? error.message : String(error)}`
  }
  noteEvent('lock-art', { report })
}

export async function clearLockScreen(): Promise<void> {
  if (!plugin) return
  try {
    await plugin.clear()
  } catch {
    /* nothing to clear */
  }
}

let sent = { playing: false, at: 0, sec: 0, duration: 0 }

/**
 * Keep an `own` entry's progress honest. iOS runs the clock itself from the
 * last elapsed time and rate, so this only speaks when that clock would be
 * wrong: play or pause, a new duration, or a jump (a seek) of over two seconds.
 */
export function followProgress(playing: boolean, sec: number, duration: number): void {
  if (mode !== 'own' || !plugin) return
  const now = performance.now()
  const expected = sent.playing ? sent.sec + (now - sent.at) / 1000 : sent.sec
  const jumped = Math.abs(sec - expected) > 2
  if (playing === sent.playing && duration === sent.duration && !jumped) return
  sent = { playing, at: now, sec, duration }
  void plugin.update({ elapsed: sec, duration, rate: playing ? 1 : 0 }).catch(() => {})
}

function base64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const url = String(reader.result)
      resolve(url.slice(url.indexOf(',') + 1))
    }
    reader.onerror = () => reject(reader.error ?? new Error('could not read the image'))
    reader.readAsDataURL(blob)
  })
}
