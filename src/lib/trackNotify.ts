// A notification each time a new song starts — ONE card, replaced every time,
// never a stack of them (James, 2026-09-13: "add an option for a notification
// everytime a new song plays, replace each notification and don't stack them").
//
// Three ways out, one per kind of shell:
//   - the iPhone and Android apps: `JukeboxNotify`, an app-local plugin
//     (`ios/App/App/NotifyPlugin.swift`, `NotifyPlugin.java`). Neither web view
//     has a Notification API at all;
//   - a browser, and the Windows app (Electron maps the web API onto the
//     system's own toasts): `new Notification`;
//   - Chrome on Android and a Home Screen web app on the iPhone, which refuse
//     that constructor ("Illegal constructor") and will only notify through the
//     service worker: `registration.showNotification`.
//
// ⚠️ REPLACED BY CLOSING, NOT BY `tag`. A tag makes a new card take the old
// one's place, but a same-tag replacement is SILENT unless `renotify` is set —
// the card changes in the notification centre and never pops up, which is not
// "a notification every time" — and `renotify` may not be combined with
// `silent`, so it would also ping over the music. Closing the last card and
// showing a fresh, silent one gets both. The native plugins do the same thing
// in their own terms: one fixed identifier, and no sound.
//
// Off by default, like every setting that asks the system for something.

import { pluginRegistered } from './nativePlugins'
import type { Track } from './types'

const NATIVE = 'JukeboxNotify'
/** The side of the square cover thumbnail sent with each card. */
const THUMB = 192

export type NotifyPermission = 'granted' | 'denied' | 'prompt'

interface NotifyPlugin {
  permission(): Promise<{ state: NotifyPermission }>
  request(): Promise<{ state: NotifyPermission }>
  /** `image` is a base64 PNG, without the `data:` prefix. */
  show(options: { title: string; body: string; image: string | null }): Promise<void>
  clear(): Promise<void>
}

let plugin: NotifyPlugin | null = null

async function native(): Promise<NotifyPlugin> {
  if (!plugin) {
    const { registerPlugin } = await import('@capacitor/core')
    plugin = registerPlugin<NotifyPlugin>(NATIVE)
  }
  return plugin
}

function inNativeShell(): boolean {
  try {
    return (globalThis as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.() === true
  } catch {
    return false
  }
}

/**
 * Can this device show one at all?
 *
 * ⚠️ A native shell WITHOUT the plugin is `none`, not `web`. The bundle ships
 * inside the app, so that should only be a dev build live-reloading newer web
 * code — but its web view has no Notification API either way, and offering the
 * switch there would be a setting that does nothing.
 */
export function notifySupport(): 'native' | 'web' | 'none' {
  if (pluginRegistered(NATIVE)) return 'native'
  if (inNativeShell()) return 'none'
  return typeof Notification === 'undefined' ? 'none' : 'web'
}

/** Has the system been asked, and what did the person say? */
export async function notifyPermission(): Promise<NotifyPermission> {
  const support = notifySupport()
  if (support === 'native') {
    try {
      return (await (await native()).permission()).state
    } catch {
      return 'denied'
    }
  }
  if (support === 'none') return 'denied'
  return Notification.permission === 'default' ? 'prompt' : Notification.permission
}

/**
 * Ask, if it has not been asked. True when notifications may be shown.
 *
 * ⚠️ Call it straight from the tap that turns the setting on. Browsers only
 * show the prompt from a user gesture, and an `await` in front of the request
 * can be enough to lose it.
 */
export async function askToNotify(): Promise<boolean> {
  const support = notifySupport()
  if (support === 'none') return false
  if (support === 'native') {
    try {
      return (await (await native()).request()).state === 'granted'
    } catch {
      return false
    }
  }
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  try {
    return (await Notification.requestPermission()) === 'granted'
  } catch {
    return false
  }
}

/** The card on screen now, when it came from the constructor. */
let shown: Notification | null = null
/** The song the card on screen is for. */
let announced: string | null = null
/**
 * Bumped by every announcement and withdrawal. The cover is drawn before a
 * card goes out, and a song skipped past in the meantime must not overwrite
 * the song that replaced it.
 */
let seq = 0

/**
 * A card for this song, in place of the last one.
 *
 * Once per song: `publishNowPlaying` also runs when a different deck is chosen
 * mid-song, and when the same song is put on again by repeat-one, and neither
 * is a new song.
 */
export function announceTrack(track: Track, coverUrl: string | null): void {
  if (track.id === announced) return
  announced = track.id
  const mine = ++seq
  const title = track.title
  const body = [track.artist ?? track.albumArtist, track.album].filter(Boolean).join(' — ')
  void (async () => {
    const image = await thumbnail(coverUrl)
    if (mine !== seq) return
    const support = notifySupport()
    if (support === 'native') {
      await (await native()).show({ title, body, image: image ? image.slice(image.indexOf(',') + 1) : null })
    } else if (support === 'web' && Notification.permission === 'granted') {
      await showOnWeb(title, { body, icon: image ?? undefined, silent: true })
    }
  })().catch(() => {
    /* a notification is a nicety — never the reason a song does not play */
  })
}

/** Take the card away: the music has stopped, or the setting went off. */
export function withdrawTrack(): void {
  announced = null
  seq += 1
  shown?.close()
  shown = null
  const support = notifySupport()
  if (support === 'native') {
    void native().then((p) => p.clear()).catch(() => {})
  } else if (support === 'web') {
    void closeWorkerCards().catch(() => {})
  }
}

async function showOnWeb(title: string, options: NotificationOptions): Promise<void> {
  shown?.close()
  shown = null
  try {
    const card = new Notification(title, options)
    card.onclick = () => {
      window.focus()
      card.close()
    }
    shown = card
    return
  } catch {
    /* Chrome on Android, a Home Screen web app: only the worker may */
  }
  const registration = await navigator.serviceWorker?.getRegistration()
  if (!registration) return
  await closeWorkerCards(registration)
  await registration.showNotification(title, options)
}

/**
 * Every card the worker is showing. This app shows no other kind, so all of
 * them are the last song's — including one left behind by a previous visit.
 */
async function closeWorkerCards(given?: ServiceWorkerRegistration): Promise<void> {
  const registration = given ?? (await navigator.serviceWorker?.getRegistration())
  if (!registration) return
  for (const card of await registration.getNotifications()) card.close()
}

/**
 * The cover as a small PNG data URL, or null.
 *
 * ⚠️ Redrawn rather than handed over as the object URL `coverUrl` gives. That
 * URL is a blob in the page's memory, of whatever format the file embedded:
 * the system's notification service may fetch it after `art.ts` has revoked
 * it, the iPhone will not take WebP as an attachment, and the native plugins
 * cannot read a blob URL at all. A PNG, inline, works for all of them.
 */
async function thumbnail(url: string | null): Promise<string | null> {
  if (!url || typeof document === 'undefined') return null
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    if (!img.naturalWidth || !img.naturalHeight) return null
    const canvas = document.createElement('canvas')
    canvas.width = THUMB
    canvas.height = THUMB
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    // Cropped to fill, like the covers everywhere else in the app.
    const scale = Math.max(THUMB / img.naturalWidth, THUMB / img.naturalHeight)
    const w = img.naturalWidth * scale
    const h = img.naturalHeight * scale
    ctx.drawImage(img, (THUMB - w) / 2, (THUMB - h) / 2, w, h)
    return canvas.toDataURL('image/png')
  } catch {
    return null
  }
}

// A tab closed for good takes its card with it: the song on it is no longer
// playing anywhere. NOT when the page is merely hidden, or put in the back/
// forward cache (`persisted`) — the background is where this card matters.
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', (event) => {
    if (!event.persisted) withdrawTrack()
  })
}
