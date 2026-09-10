// Routing, such as it is: which view is on screen, and which album is open.
//
// Held in the URL hash rather than the path. The app is served from a Workers
// static-assets Worker with an SPA fallback, so a path would work — but the
// hash costs nothing, survives the portal's `/jukebox` prefix without any of
// this file needing to know about it, and makes an album a link somebody can
// send to themselves. `Universal_Video/src/lib/route.ts` is the same shape.

export type View = 'albums' | 'artists' | 'tracks' | 'album' | 'artist' | 'playing' | 'about' | 'settings' | 'tidy'

export interface Route {
  view: View
  /** The album id, when `view` is 'album'. */
  albumId?: string
  /** The artist's name, when `view` is 'artist'. */
  artist?: string
  /**
   * True when the hash named no view at all — the app's front door.
   *
   * ⚠️ `view` is still filled in ('albums') so every caller can read it without
   * a special case. This flag exists so the STARRED tab can take over home
   * without hijacking an explicit `#/albums`: somebody who has starred Tracks
   * should still get albums when they press the Albums tab, and the only thing
   * that tells those two apart is whether a view was named.
   */
  home?: boolean
}

/**
 * ⚠️ Our own `pushState` does NOT fire `popstate`. Miss this event and the URL
 * and the screen disagree — which is worse than having no routing at all, since
 * the back button then appears to skip a step.
 */
export const NAVIGATED = 'jukebox:navigated'

export function currentRoute(): Route {
  return routeFromHash(typeof location === 'undefined' ? '' : location.hash)
}

/** A hash — `#/album/x`, `#/tracks`, `''` — as a route. Pure. */
export function routeFromHash(rawHash: string): Route {
  const hash = rawHash.replace(/^#\/?/, '')
  if (hash.startsWith('album/')) {
    // The id is encoded because an album key is "artist album" — it contains
    // spaces, and anything else a tag happens to hold.
    return { view: 'album', albumId: safeDecode(hash.slice('album/'.length)) }
  }
  if (hash.startsWith('artist/')) return { view: 'artist', artist: safeDecode(hash.slice('artist/'.length)) }
  if (hash === 'albums') return { view: 'albums' }
  if (hash === 'artists') return { view: 'artists' }
  if (hash === 'tracks') return { view: 'tracks' }
  if (hash === 'playing') return { view: 'playing' }
  if (hash === 'about') return { view: 'about' }
  if (hash === 'settings') return { view: 'settings' }
  if (hash === 'tidy') return { view: 'tidy' }
  // No view named — the front door, and whatever the user starred wins here.
  return { view: 'albums', home: true }
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
      : route.view === 'artist' && route.artist
        ? `#/artist/${encodeURIComponent(route.artist)}`
        : `#/${route.view}`
  go(hash)
}

/**
 * The front door — the library, showing whichever tab the user starred.
 *
 * ⚠️ Not the same as `navigate({ view: 'albums' })`, and the difference is the
 * whole of the starred-tab feature. This clears the hash, so the app picks the
 * starred tab; that names albums out loud, so the Albums tab keeps working for
 * somebody who starred Tracks. Every "back to your library" is a way HOME and
 * therefore belongs here.
 */
export function goHome(): void {
  go('#/')
}

// ── Back goes UP a level, not back in time ───────────────────────────────────
//
// ⚠️ James, 2026-09-10: "The back swipe should go back a stage, not necessarily
// previous page e.g library -> album -> now playing -> album should then go to
// library NOT now playing."
//
// The iPhone's edge swipe is WKWebView's own back gesture, and like a
// browser's Back button it walks HISTORY — which is chronological. So instead of
// teaching the gesture about the app, the history is kept SHAPED LIKE THE APP:
// at any moment it holds exactly one entry per level you are standing below —
// the library, then (if you went down) an album or a settings page, then Now
// Playing. Going somewhere that belongs at a level you are already standing at
// or above does not push; it steps back to that level first and replaces it.
// A swipe, the browser button, and `history.back()` are then all "up a level",
// with no code of their own.
//
//   library → album A → Now Playing → album A   is one step BACK, to album A
//   library → album A → Now Playing → album B   steps back to the library,
//                                                then opens album B on top of it
//   Albums → Artists → Tracks (tabs)            REPLACE each other: a tab is the
//                                                same level seen differently

/**
 * 0 the library (any tab), 1 a page off it, 2 Now Playing — and an artist's
 * page at 0.5, BETWEEN the library and an album. "All albums by …" from an
 * album is UP (back from the artist is the library, not the album you left),
 * and an album opened from the artist's page comes back to it.
 */
export type Level = number

export function levelOf(hash: string): Level {
  const { view } = routeFromHash(hash)
  if (view === 'playing') return 2
  if (view === 'artist') return 0.5
  if (view === 'album' || view === 'settings' || view === 'about' || view === 'tidy') return 1
  return 0
}

export interface NavigationPlan {
  /** How many entries to step back first. */
  back: number
  /** Then: add the target, write it over the entry landed on, or nothing. */
  then: 'push' | 'replace' | 'none'
}

/**
 * How to get from `stack` (our history entries, oldest first) to `target`.
 * Pure, and the whole of the rule above.
 */
export function planNavigation(stack: string[], target: string): NavigationPlan {
  const level = levelOf(target)
  let keep = 0
  while (keep < stack.length && levelOf(stack[keep]) < level) keep++
  if (keep >= stack.length) return { back: 0, then: 'push' }
  const back = stack.length - 1 - keep
  return { back, then: stack[keep] === target ? 'none' : 'replace' }
}

const STACK_KEY = 'jukebox:history'
const home = (hash: string) => (hash === '' || hash === '#' ? '#/' : hash)

/** Our entries, oldest first; the last is the one on screen. */
let stack: string[] = []
/** Where a multi-step move is going, while its `history.go(-n)` lands. */
let pending: { then: 'push' | 'replace'; hash: string } | null = null

function save(): void {
  try {
    sessionStorage.setItem(STACK_KEY, JSON.stringify(stack))
  } catch { /* private mode — the stack still works for this page's life */ }
}

function depthOfState(): number | null {
  const depth = (history.state as { jbDepth?: unknown } | null)?.jbDepth
  return typeof depth === 'number' ? depth : null
}

function apply(then: 'push' | 'replace', hash: string): void {
  if (then === 'push') {
    history.pushState({ jbDepth: stack.length }, '', hash)
    stack.push(hash)
  } else {
    history.replaceState({ jbDepth: Math.max(0, stack.length - 1) }, '', hash)
    stack[Math.max(0, stack.length - 1)] = hash
  }
  save()
  window.dispatchEvent(new Event(NAVIGATED))
}

function go(rawHash: string): void {
  const hash = home(rawHash)
  if (pending === null && home(location.hash) === hash) return
  const plan = planNavigation(stack, hash)
  if (plan.back === 0) {
    if (plan.then !== 'none') apply(plan.then, hash)
    return
  }
  // ⚠️ `history.go` is ASYNCHRONOUS. The push or replace has to wait for it to
  // land (the `popstate` below), or it would be written onto the entry being
  // left and then thrown away by the back step.
  stack = stack.slice(0, stack.length - plan.back)
  pending = plan.then === 'none' ? null : { then: plan.then, hash }
  save()
  history.go(-plan.back)
}

if (typeof window !== 'undefined' && typeof history !== 'undefined') {
  // The entry the app opened on. After a reload it already carries its depth,
  // and the stack comes back from this tab's session storage.
  const depth = depthOfState()
  const here = home(location.hash)
  if (depth === null) {
    stack = [here]
    history.replaceState({ jbDepth: 0 }, '', location.href)
  } else {
    let saved: string[] = []
    try {
      saved = JSON.parse(sessionStorage.getItem(STACK_KEY) ?? '[]')
    } catch { /* nothing kept */ }
    stack = Array.from({ length: depth + 1 }, (_, i) => (Array.isArray(saved) && typeof saved[i] === 'string' ? saved[i] : '#/'))
    stack[depth] = here
  }
  save()

  // ⚠️ Registered at module load, so it runs BEFORE `useRoute`'s own popstate
  // listener in App.tsx. A multi-step move therefore completes — replaced and
  // announced — before the app re-reads the hash, and the level it passed
  // through on the way is never drawn.
  window.addEventListener('popstate', () => {
    if (pending) {
      const move = pending
      pending = null
      apply(move.then, move.hash)
      return
    }
    // A real back or forward: the swipe, a browser button, a hash typed in.
    const at = depthOfState()
    const hash = home(location.hash)
    if (at === null) {
      history.replaceState({ jbDepth: stack.length }, '', location.href)
      stack.push(hash)
    } else {
      stack = stack.slice(0, at + 1)
      while (stack.length < at + 1) stack.push('#/')
      stack[at] = hash
    }
    save()
  })
}
