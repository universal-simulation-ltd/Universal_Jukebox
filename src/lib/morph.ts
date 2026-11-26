// Now Playing ↔ the playing album, as one movement (James, 2026-11-23: "make
// going from Now Playing to the playing song's album view a smooth, animated
// transition, so the album view grows out of Now Playing instead of jumping to
// a new screen … it should play back the other way when you go back").
//
// The View Transitions API: the browser photographs the page, React draws the
// new screen inside `startViewTransition`, and the two photographs are blended.
// One element on each side carries `data-morph="sleeve"`: the machine on Now
// Playing (`Deck`) and the album page's cover (`AlbumView`, the phone's
// `AlbumScreen`). Named `jb-sleeve` for the length of the change only
// (`index.css`, `html.jb-morph`), they become ONE thing in the blend, so the
// record travels up into the album's header and the page grows round it. Back
// to Now Playing is the same blend with the two ends swapped: the header
// shrinks back down onto the deck.
//
// ⚠️ ONLY between Now Playing and the album that is PLAYING, and only when the
// app moved the screen itself (a tap: the album's name, the deck, the cover,
// the mini player). Not on the edge swipe back: WKWebView draws its own slide
// for that, and two animations at once look broken (`appMovedRecently`).
//
// ⚠️ Reduced motion: no blend at all, the screen just changes (BRANDING.md →
// Motion). And where the API is missing (Firefox before 144, old WebViews) the
// screen changes as it always did.

import { flushSync } from 'react-dom'
import { appMovedRecently, forgetAppMove, type Route } from './route'
import { currentTrack, usePlayerStore } from '../stores/playerStore'

export type MorphWay = 'open' | 'close'

/** Which way the sleeve travels between these two screens, if it does. Pure. */
export function morphWay(from: Route, to: Route, playingAlbumId: string | undefined): MorphWay | null {
  if (!playingAlbumId) return null
  if (from.view === 'playing' && to.view === 'album' && to.albumId === playingAlbumId) return 'open'
  if (from.view === 'album' && from.albumId === playingAlbumId && to.view === 'playing') return 'close'
  return null
}

let morphs = 0
/** The sleeve's journey, as `index.css` times it. */
const MORPH_MS = 520

const sameRoute = (a: Route, b: Route) => JSON.stringify(a) === JSON.stringify(b)

type ViewTransitionDoc = Document & {
  startViewTransition?: (update: () => void) => { finished: Promise<void>; skipTransition: () => void }
}

function reducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Put `next` on screen, as a morph when it is one. `shown` holds the route on
 * screen now (the `useRoute` hooks keep it); `set` is their state setter.
 */
export function showRoute(shown: { current: Route }, next: Route, set: (route: Route) => void): void {
  const from = shown.current
  // popstate, hashchange and our own event can all announce one change.
  if (sameRoute(from, next)) return
  shown.current = next
  const byApp = appMovedRecently()
  forgetAppMove()
  if (!byApp) {
    set(next)
    return
  }
  // ⚠️ Playing an album from its own cover goes to Now Playing BEFORE the
  // queue changes (`playTracks` calls `showTheDeck` first), so at this moment
  // that album isn't the one playing yet. Asked again a microtask later, once
  // the queue is in, it is, and the cover travels down onto its own record.
  if (from.view === 'album' && next.view === 'playing') queueMicrotask(() => {
    // Unless something else went on screen in the meantime.
    if (shown.current === next) morphTo(from, next, set)
  })
  else morphTo(from, next, set)
}

function morphTo(from: Route, next: Route, set: (route: Route) => void): void {
  const doc = document as ViewTransitionDoc
  const way = morphWay(from, next, currentTrack(usePlayerStore.getState())?.albumId)
  if (!way || typeof doc.startViewTransition !== 'function' || reducedMotion() || document.hidden) {
    set(next)
    return
  }
  const root = document.documentElement
  // A second tap mid-morph skips the first to its end; only the newest morph
  // may take the classes off again.
  const mine = ++morphs
  root.classList.remove('jb-morph-open', 'jb-morph-close')
  root.classList.add('jb-morph', `jb-morph-${way}`)
  try {
    const transition = doc.startViewTransition(() => {
      flushSync(() => set(next))
    })
    // ⚠️ While a morph runs the page takes no taps, and it waits for a frame
    // to be painted. A web view that has stopped painting (put away mid-tap)
    // would hold it, and the app, frozen. Long after it should have ended, it
    // is skipped to its end: the new screen, as if there had been no morph.
    const stuck = window.setTimeout(() => transition.skipTransition(), MORPH_MS + 1000)
    const done = () => {
      window.clearTimeout(stuck)
      if (mine === morphs) root.classList.remove('jb-morph', 'jb-morph-open', 'jb-morph-close')
    }
    transition.finished.then(done, done)
  } catch {
    root.classList.remove('jb-morph', 'jb-morph-open', 'jb-morph-close')
    set(next)
  }
}
