import { useEffect, useState } from 'react'

// Opening on NOTHING, on purpose.
//
// The library lives in IndexedDB, and reading it back is asynchronous — so for
// the first few hundred milliseconds of every visit `libraryStore.status` is
// `'loading'`, which the app used to render as `hasLibrary === false`, i.e. the
// LANDING PAGE. Somebody with a library therefore saw "Plays your whole music
// library — Scan my music folder" flash up and vanish on every single open, as
// though the app had forgotten their music and then remembered it. Measured at
// ~400ms of front door on a 6×-throttled desktop before the shelves arrived
// (2026-09-12); a phone cold-starting the WebView is worse.
//
// The fix is the same one `isNativeShell()` uses one level down (see
// `lib/nativeFile.ts`, "instead of flashing 'choose a folder'"): do not render a
// screen you already know might be the wrong one. Here there is nothing to
// render synchronously in its place — whether there is a library is precisely
// what we are waiting to find out — so the app renders NOTHING and the page
// keeps the ground colour `index.css` puts on `<html>`. One paint, the finished
// app, no front door in between.
//
// ⚠️ The ground colour is only right from the first paint because `index.html`
// puts the theme class on `<html>` during head parsing. Read the note there
// before touching either.

/**
 * How long the blank is allowed to last before the app is shown regardless.
 *
 * ⚠️ THIS IS NOT BELT AND BRACES, and deleting it turns a slow read into a dead
 * app. `hydrate()` cannot reject (see the store), but "cannot reject" is not
 * "always settles": `indexedDB.open` is documented to hang without firing any
 * event at all in Safari private windows and after an eviction, and `library.ts`
 * already resolves-rather-than-rejects precisely because a music player must
 * work when storage does not. Before this gate existed, a database that never
 * opened cost the user nothing — they got the landing page and could pick a
 * folder. With it, they would get an empty page forever.
 *
 * 2.5s is longer than any healthy hydrate (a 5,000-track library reads back in
 * tens of milliseconds) and shorter than a person's patience with a blank
 * window.
 */
export const BOOT_MAX_MS = 2500

/**
 * True while the app should render nothing at all.
 *
 * Pass `libraryStore.status === 'loading'`. Goes false the moment the library
 * is back — or after `BOOT_MAX_MS`, whichever comes first, and never goes true
 * again for the life of the page.
 */
export function useBooting(hydrating: boolean): boolean {
  const [waited, setWaited] = useState(false)
  useEffect(() => {
    if (waited) return
    const timer = window.setTimeout(() => setWaited(true), BOOT_MAX_MS)
    return () => window.clearTimeout(timer)
  }, [waited])
  return hydrating && !waited
}
