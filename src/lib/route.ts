// Routing, such as it is: which view is on screen, and which album is open.
//
// Held in the URL hash rather than the path. The app is served from a Workers
// static-assets Worker with an SPA fallback, so a path would work — but the
// hash costs nothing, survives the portal's `/jukebox` prefix without any of
// this file needing to know about it, and makes an album a link somebody can
// send to themselves. `Universal_Video/src/lib/route.ts` is the same shape.

export type View = 'albums' | 'artists' | 'tracks' | 'album' | 'playing' | 'about' | 'settings' | 'tidy'

export interface Route {
  view: View
  /** The album id, when `view` is 'album'. */
  albumId?: string
}

/**
 * ⚠️ Our own `pushState` does NOT fire `popstate`. Miss this event and the URL
 * and the screen disagree — which is worse than having no routing at all, since
 * the back button then appears to skip a step.
 */
export const NAVIGATED = 'jukebox:navigated'

export function currentRoute(): Route {
  const hash = typeof location === 'undefined' ? '' : location.hash.replace(/^#\/?/, '')
  if (hash.startsWith('album/')) {
    // The id is encoded because an album key is "artist album" — it contains
    // spaces, and anything else a tag happens to hold.
    return { view: 'album', albumId: safeDecode(hash.slice('album/'.length)) }
  }
  if (hash === 'artists') return { view: 'artists' }
  if (hash === 'tracks') return { view: 'tracks' }
  if (hash === 'playing') return { view: 'playing' }
  if (hash === 'about') return { view: 'about' }
  if (hash === 'settings') return { view: 'settings' }
  if (hash === 'tidy') return { view: 'tidy' }
  return { view: 'albums' }
}

function safeDecode(text: string): string {
  try {
    return decodeURIComponent(text)
  } catch {
    // A hand-edited URL with a stray % is a bad album id, not an exception.
    return text
  }
}

export function navigate(route: Route): void {
  const hash =
    route.view === 'album' && route.albumId
      ? `#/album/${encodeURIComponent(route.albumId)}`
      : route.view === 'albums'
        ? '#/'
        : `#/${route.view}`
  if (location.hash === hash) return
  history.pushState(null, '', hash)
  window.dispatchEvent(new Event(NAVIGATED))
}
