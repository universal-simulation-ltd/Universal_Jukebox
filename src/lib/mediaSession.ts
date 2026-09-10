// The Media Session API — the thirty lines that make this a player rather than
// a web page with sound.
//
// With this wired up the track name and cover appear on the phone's lock
// screen, the keyboard's media keys work while the tab is in the background,
// the headphone button skips, and the car's dashboard shows what is on. Without
// it, all of that is dead and the app is a tab you have to go and find.
//
// Nothing else in the UNI·SIM suite uses this API, so the whole of it is here.

import type { Track } from './types'

export interface MediaSessionHandlers {
  onPlay(): void
  onPause(): void
  onNext(): void
  onPrevious(): void
  /** Jump to an absolute position, in seconds from the start. */
  onSeekTo(seconds: number): void
  /**
   * Move by a relative offset — negative for backwards.
   *
   * ⚠️ Separate from `onSeekTo` on purpose. The API hands `seekto` an ABSOLUTE
   * time and `seekbackward`/`seekforward` a RELATIVE offset, and routing both
   * through one callback means the receiver gets a number whose meaning depends
   * on which button was pressed — a trap in the API's design that is free to
   * remove here and expensive to debug once it has been passed on.
   */
  onSeekBy(offset: number): void
  onStop(): void
}

function supported(): boolean {
  return typeof navigator !== 'undefined' && 'mediaSession' in navigator
}

/**
 * iPhone and iPad. Offered both, iOS gives the lock screen's previous/next
 * slots to ±10 s skip — seen on the phone (2026-09-10) the moment the actions
 * reached the lock screen at all. A music player wants the track buttons, so
 * iOS is not offered the seek-by pair. The scrubber (`seekto`) stays.
 */
function appleTouchDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

/** The actions this platform accepted, for the iPhone launch diagnostics. */
let accepted: MediaSessionAction[] = []

/** The handlers last passed to `setHandlers`, re-applied when playback starts. */
let current: MediaSessionHandlers | null = null
let wasPlaying = false
let reapplied = 0

/**
 * What the OS has been told, in one line — for `[jukebox:diag]`. On the iPhone
 * the lock screen showed play/pause only (2026-09-10); this says whether the
 * Media Session exists in the WebView at all, which actions it accepted, and
 * whether the track's metadata reached it.
 */
export function describeMediaSession(): string {
  if (!supported()) return 'no navigator.mediaSession'
  const title = navigator.mediaSession.metadata?.title ?? null
  return `actions=${accepted.join(',') || 'none'} reapplied=${reapplied} state=${navigator.mediaSession.playbackState} title=${title === null ? 'none' : JSON.stringify(title)}`
}

/**
 * Tell the OS what is playing.
 *
 * `artwork` wants a URL, and the one we have is an object URL for a blob in
 * IndexedDB. That works — the OS fetches it from the page's origin while the
 * page is alive, which is exactly as long as the lock-screen art needs to
 * exist.
 */
export function setMetadata(track: Track | null, coverUrl: string | null, type = 'image/webp'): void {
  if (!supported()) return
  if (!track) {
    navigator.mediaSession.metadata = null
    return
  }
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist ?? track.albumArtist ?? 'Unknown artist',
      album: track.album ?? 'Unknown album',
      // Several sizes are declared from ONE image because that is what the spec
      // wants and every consumer picks the closest. Declaring a size we don't
      // have would be a lie; declaring one size means some platforms ignore it.
      artwork: coverUrl
        ? [
            { src: coverUrl, sizes: '96x96', type },
            { src: coverUrl, sizes: '256x256', type },
            { src: coverUrl, sizes: '512x512', type },
          ]
        : [],
    })
  } catch {
    // Some browsers throw on an artwork URL they cannot fetch. Losing the
    // picture must not lose the title as well.
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist ?? 'Unknown artist',
        album: track.album ?? '',
      })
    } catch {
      /* no media session on this platform after all */
    }
  }
}

export function setPlaybackState(playing: boolean): void {
  if (!supported()) return
  try {
    navigator.mediaSession.playbackState = playing ? 'playing' : 'paused'
  } catch {
    /* ignore */
  }
  // ⚠️ Registered again every time playback STARTS, not just once at load. The
  // iPhone lock screen showed play/pause alone (2026-09-10) though the WebView
  // accepted all eight actions — and they were all set at module load, before
  // any media element existed. WebKit links the page's Media Session to the
  // lock screen once something plays; handlers set before that do not reach
  // it, leaving only its defaults. Set again here, they appeared at once.
  if (playing && !wasPlaying && current) {
    register(current)
    reapplied += 1
  }
  wasPlaying = playing
}

/**
 * Keep the OS's scrub bar in step.
 *
 * ⚠️ Guarded hard, and every guard is load-bearing. `setPositionState` THROWS a
 * TypeError if position exceeds duration, if duration is not finite, or if
 * playbackRate is zero — and it is called on a timer, so one bad value is not
 * one exception but a stream of them for as long as the track is playing.
 * A track whose duration is not yet known is the normal case for the first
 * second of every single track.
 */
export function setPosition(currentSec: number, durationSec: number, rate = 1): void {
  if (!supported() || !('setPositionState' in navigator.mediaSession)) return
  if (!Number.isFinite(durationSec) || durationSec <= 0) return
  if (!Number.isFinite(currentSec) || currentSec < 0) return
  try {
    navigator.mediaSession.setPositionState({
      duration: durationSec,
      position: Math.min(currentSec, durationSec),
      playbackRate: rate > 0 ? rate : 1,
    })
  } catch {
    /* a platform that declares the method and rejects the values */
  }
}

/**
 * A button pressed on the iPhone app's OWN lock-screen entry
 * (`nowPlayingNative.ts`, mode `own`), run through the same handlers as the
 * Media Session's — so the two routes can never disagree about what "next" does.
 */
export function dispatchAction(action: string, position?: number): void {
  const handlers = current
  if (!handlers) return
  switch (action) {
    case 'play':
      handlers.onPlay()
      break
    case 'pause':
      handlers.onPause()
      break
    case 'toggle':
      if (wasPlaying) handlers.onPause()
      else handlers.onPlay()
      break
    case 'nexttrack':
      handlers.onNext()
      break
    case 'previoustrack':
      handlers.onPrevious()
      break
    case 'seekto':
      if (typeof position === 'number') handlers.onSeekTo(position)
      break
  }
}

/**
 * Wire the hardware buttons up.
 *
 * ⚠️ Each handler is registered in its own try/catch. A browser that does not
 * know one action name throws on THAT `setActionHandler` call, and a single
 * try/catch around the loop would abandon every remaining action — so an
 * unsupported `seekto` would cost you play and pause too.
 *
 * Returns a teardown that clears them all again.
 */
export function setHandlers(handlers: MediaSessionHandlers): () => void {
  if (!supported()) return () => {}
  current = handlers
  const registered = register(handlers)
  return () => {
    current = null
    for (const action of registered) {
      try {
        navigator.mediaSession.setActionHandler(action, null)
      } catch {
        /* ignore */
      }
    }
  }
}

/**
 * Set every action, clearing each first — so a re-application is a real
 * remove-then-add on the platform side, not a no-op replacement.
 */
function register(handlers: MediaSessionHandlers): MediaSessionAction[] {

  const actions: [MediaSessionAction, MediaSessionActionHandler][] = [
    ['play', () => handlers.onPlay()],
    ['pause', () => handlers.onPause()],
    ['stop', () => handlers.onStop()],
    ['nexttrack', () => handlers.onNext()],
    ['previoustrack', () => handlers.onPrevious()],
    ['seekto', (details) => {
      if (typeof details.seekTime === 'number') handlers.onSeekTo(details.seekTime)
    }],
    ['seekbackward', (details) => handlers.onSeekBy(-(details.seekOffset ?? 10))],
    ['seekforward', (details) => handlers.onSeekBy(details.seekOffset ?? 10)],
  ]

  const offered = appleTouchDevice()
    ? actions.filter(([action]) => action !== 'seekbackward' && action !== 'seekforward')
    : actions

  const registered: MediaSessionAction[] = []
  for (const [action, handler] of offered) {
    try {
      navigator.mediaSession.setActionHandler(action, null)
      navigator.mediaSession.setActionHandler(action, handler)
      registered.push(action)
    } catch {
      /* this platform doesn't know this action */
    }
  }
  accepted = registered
  return registered
}
