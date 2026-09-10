import { useEffect, useMemo, useState } from 'react'
import { UniversalAppsNavBar, UpdateNotice } from '@unisim/sdk'
// <UsageTracker /> sends one "session.opened" row for a signed-in visitor, and
// that is the only event this app will ever send. No event may carry a
// filename, an artist, an album, a track count or a byte count: this app reads
// someone's whole music collection, and the front page promises we never
// build a picture of what people own.
import { UsageTracker } from '@unisim/sdk'
import AppMenu from './components/Header/AppMenu'
import ProductLogo from './components/Header/ProductLogo'
import About from './components/About'
import AlbumGrid from './components/AlbumGrid'
import AlbumView from './components/AlbumView'
import ArtistList from './components/ArtistList'
import ErrorBanner from './components/ErrorBanner'
import Landing from './components/Landing'
import NowPlaying from './components/NowPlaying'
import PlayerBar from './components/PlayerBar'
import ScanBanner from './components/ScanBanner'
import Settings from './components/Settings'
import Tidy from './components/Tidy'
import TrackList from './components/TrackList'
import { NAVIGATED, currentRoute, goHome, navigate, type Route, type View } from './lib/route'
import { tabCounts } from './lib/search'
import { useLibraryStore } from './stores/libraryStore'
import { usePlayerStore } from './stores/playerStore'
import { useSettingsStore, type HomeTab } from './stores/settingsStore'
import { useThemeStore } from './stores/themeStore'

// The single page container. The navbar (via the SDK's `contentClassName`), the
// page body and the player bar all share it, so the suite switcher lines up
// with the left edge of the page content — and the profile cluster with its
// right edge — at every breakpoint.
//
// Without it the navbar falls back to the SDK's standalone default: a fixed
// 1280px row with the profile cluster pinned 12px off the VIEWPORT edge, which
// at 1440px overhangs the content by ~128px a side.
export const CONTAINER = 'mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8'

const REPO_URL = 'https://github.com/universal-simulation-ltd/Universal_Jukebox'

/** The views the skipped-files report belongs on: the library itself. */
const LIBRARY_VIEWS = new Set<View>(['albums', 'artists', 'tracks', 'album'])

const TABS: { view: HomeTab; label: string }[] = [
  { view: 'albums', label: 'Albums' },
  { view: 'artists', label: 'Artists' },
  { view: 'tracks', label: 'Tracks' },
]

function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => currentRoute())
  useEffect(() => {
    const sync = () => setRoute(currentRoute())
    window.addEventListener('popstate', sync)
    // Our own pushState does NOT fire popstate — miss this and the URL and the
    // screen disagree.
    window.addEventListener(NAVIGATED, sync)
    // ⚠️ And `hashchange`, because this app routes on the HASH. Assigning
    // `location.hash` — a pasted or hand-edited URL, an anchor with an
    // `href="#/artists"`, anything outside our own `navigate()` — fires
    // hashchange and NOT popstate. Without this the address bar changes and the
    // screen does not, which is the worst of both: it looks like the app
    // ignored you, and a reload then "fixes" it.
    window.addEventListener('hashchange', sync)
    return () => {
      window.removeEventListener('popstate', sync)
      window.removeEventListener(NAVIGATED, sync)
      window.removeEventListener('hashchange', sync)
    }
  }, [])
  return route
}

/**
 * ⚠️ Tier T6 (< 430px) is a REAL MODE, not a layout that happens to collapse.
 *
 * An empty stage under a full navbar reads as a bug, so at this width the stage
 * is removed entirely and the player bar grows to become the app. Tracked in
 * React rather than CSS because the decision is "render something else", not
 * "hide something" — hiding it would still mount the deck and run its
 * animation behind a `display:none`.
 *
 * ⚠️ BUT ONLY FOR A NARROW WINDOW ON A DESKTOP — `(pointer: fine)` — and never
 * on a phone. The tier was settled with the owner on 2026-09-07 as "simplified
 * view as the WINDOW gets smaller", i.e. a desktop window dragged thin, where a
 * record squeezed into a sliver is decoration fighting the controls for room.
 * A phone is not a thin window: a portrait iPhone is 393px, so it sat in T6
 * permanently and the app shipped to the phone with NO RECORD AT ALL — reported
 * on the first test of the native build (2026-09-10). At that width the deck
 * still fits at ~244px (`clampDeck`), which is the screen, not a sliver.
 *
 * `pointer: coarse` is the test rather than `isNativeShell()` on purpose: the
 * same phone in Safari at the same width should get the same record, and a
 * touchscreen laptop window dragged thin still reports a fine pointer from its
 * trackpad and keeps the mini player the tier was written for.
 */
const MINI_QUERY = '(max-width: 429px) and (pointer: fine)'

function useMiniMode(): boolean {
  const [mini, setMini] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(MINI_QUERY).matches,
  )
  useEffect(() => {
    const query = window.matchMedia(MINI_QUERY)
    const sync = () => setMini(query.matches)
    sync()
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])
  return mini
}

export default function App() {
  const route = useRoute()
  const mini = useMiniMode()
  const theme = useThemeStore((s) => s.effective)

  const status = useLibraryStore((s) => s.status)
  const albums = useLibraryStore((s) => s.albums)
  const tracks = useLibraryStore((s) => s.tracks)
  const hydrate = useLibraryStore((s) => s.hydrate)

  const ceremony = usePlayerStore((s) => s.ceremony)
  const skipCeremony = usePlayerStore((s) => s.skipCeremony)
  const toggle = usePlayerStore((s) => s.toggle)
  const next = usePlayerStore((s) => s.next)
  const previous = usePlayerStore((s) => s.previous)
  const queueLength = usePlayerStore((s) => s.queue.length)

  const homeTab = useSettingsStore((s) => s.homeTab)
  const setSetting = useSettingsStore((s) => s.set)

  const [query, setQuery] = useState('')

  /**
   * The view actually on screen.
   *
   * ⚠️ `route.home` — the hash naming no view at all — is where the starred tab
   * takes over. An explicit `#/albums` is still albums, so the Albums tab does
   * what its label says even for somebody who has starred Tracks.
   */
  const view: View = route.home ? homeTab : route.view

  /**
   * How many results each tab holds, computed only while there is a query.
   *
   * ⚠️ From `lib/search`, which is also what the three views filter with — a
   * count that came from its own copy of the rule would drift silently, and
   * "Tracks (2)" over a list of three is worse than no count at all.
   */
  const counts = useMemo(
    () => (query.trim() ? tabCounts(albums, tracks, query) : null),
    [albums, tracks, query],
  )

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  /**
   * ⚠️ Any click or key cuts the ceremony short — nobody is trapped in an
   * animation. Registered on `document` while the ceremony is running and
   * nowhere else, so the rest of the time there is no global listener at all.
   *
   * The play button calls `stopPropagation`, because the very click that starts
   * the ceremony would otherwise bubble up here and cancel it instantly.
   */
  useEffect(() => {
    if (!ceremony) return
    const skip = () => skipCeremony()
    // ⚠️ ATTACHED ON THE NEXT TICK, and this is the whole fix for a bug §22.11
    // predicted and that duly happened.
    //
    // React flushes the state update inside the click handler synchronously, so
    // this effect runs — and the listener attaches — while the ORIGINATING
    // click is still bubbling up towards `document`. The very click that starts
    // the ceremony then reaches this handler and instantly cancels it: the
    // countdown never appears and the music simply begins.
    //
    // The spec's suggested fix was `stopPropagation` on the play button, and
    // `PlayerBar` does that. But it is the wrong place to rely on: every future
    // way of starting playback — an album row, a track row, a queue entry, a
    // media key — would have to remember, and forgetting is invisible. Deferring
    // the LISTENER by a tick fixes it once, for every caller.
    const timer = setTimeout(() => {
      document.addEventListener('click', skip)
      document.addEventListener('keydown', skip)
    }, 0)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('click', skip)
      document.removeEventListener('keydown', skip)
    }
  }, [ceremony, skipCeremony])

  // The keys every player has. Ignored while typing, or the search box would
  // pause the music on every space.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null
      if (el && /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === ' ') {
        e.preventDefault()
        toggle()
      } else if (e.key === 'ArrowRight' && e.shiftKey) {
        next()
      } else if (e.key === 'ArrowLeft' && e.shiftKey) {
        previous()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggle, next, previous])

  const hasLibrary = status === 'ready' || status === 'scanning'

  // ⚠️ No background class on the root div. The page colour is on `<html>` —
  // see the note in `index.css`: an opaque background here is what made Now
  // Playing's cover ground invisible for the whole time it existed.
  return (
    // ⚠️ `pt-[env(safe-area-inset-top)]` IS REQUIRED BY THE NAVBAR, and leaving
    // it off does not merely push the chrome up — it makes the bar PAINT OVER
    // THE PAGE. `UniversalAppsNavBar`'s sticky wrapper takes the inset onto
    // itself as `paddingTop` and cancels this padding with an equal negative
    // `marginTop`; the SDK documents the page wrapper's half as the app's job.
    //
    // Without it the bar's natural box top is ABOVE the viewport top (that is
    // what the negative margin means), so `position: sticky; top: 0` engages
    // immediately and pins the box at y=0 — while the flow below it has only
    // reserved the un-padded height. The bar is then `inset` pixels taller than
    // its own gap and covers the first `inset` pixels of `<main>`.
    //
    // ⚠️ Measured, on the day the phone build shipped without it: with a 59px
    // inset the navbar ran 0..123 while the landing artwork stayed at y=88 —
    // 35px of the record hidden under the bar. ⚠️ AND IT IS INVISIBLE ON A MAC:
    // `env(safe-area-inset-top)` is 0 in every browser and every emulator, both
    // terms vanish, and the layout is pixel-identical to the web. The SDK's own
    // note claims it "repairs an app that FORGOT the wrapper padding" — that is
    // true of the old static bar and NOT true of the sticky one.
    <div className="flex min-h-screen flex-col pt-[env(safe-area-inset-top)]">
      <UniversalAppsNavBar
        contentClassName={CONTAINER}
        product="jukebox"
        productLogo={<ProductLogo />}
        actions={<AppMenu />}
        actionsLabel="Jukebox"
        theme={theme}
        suiteSwitcherIconSrc={`${import.meta.env.BASE_URL}unisim-icon.png`}
      />

      {/* `empty:hidden` is load-bearing: UpdateNotice renders null unless this
          tab is running superseded code, and without it the padding sits there
          as a dead band under the navbar. */}
      <div className={`${CONTAINER} pt-4 empty:hidden`}>
        <UpdateNotice />
      </div>

      <UsageTracker />

      <main className={`${CONTAINER} flex-1 py-6 ${hasLibrary ? '' : 'flex flex-col justify-center'}`}>
        {/* The error slot — and, for a track whose file was not there, the
            way back to its folder. See `ErrorBanner`. */}
        <ErrorBanner />

        {/* ⚠️ Only on the LIBRARY views. The skipped-files list is a report
            about a scan and belongs with the library it describes. Parked above
            the deck it turns the one screen meant to be left open into a page
            of warnings; parked above Settings or About it is just noise on a
            page about something else. Progress and the folder-permission prompt
            are a different matter — those are about whether the app works at
            all, so they follow you everywhere. */}
        <ScanBanner showRefusals={LIBRARY_VIEWS.has(view)} />

        {view === 'tidy' ? (
          <Tidy />
        ) : view === 'settings' ? (
          <Settings />
        ) : view === 'about' ? (
          <About />
        ) : !hasLibrary ? (
          <Landing />
        ) : view === 'album' && route.albumId ? (
          <AlbumView albumId={route.albumId} />
        ) : view === 'playing' ? (
          // At T6 the stage is gone and the bar is the app — so Now Playing
          // sends you back to the library rather than rendering an empty stage.
          mini ? <MiniStageNote /> : <NowPlaying />
        ) : (
          <>
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <nav className="flex items-center gap-0.5" aria-label="Library views">
                {TABS.map((tab) => {
                  const starred = homeTab === tab.view
                  return (
                    <span key={tab.view} className="flex items-center">
                      <button
                        type="button"
                        onClick={() => navigate({ view: tab.view })}
                        aria-current={view === tab.view ? 'page' : undefined}
                        className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition ${
                          view === tab.view
                            ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                            : 'text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800'
                        }`}
                      >
                        {tab.label}
                        {/* Only while searching. A permanent count is a number
                            nobody asked for; during a search it is the only way
                            to know the tab you are NOT looking at has answers. */}
                        {counts && (
                          <span className="ml-1 tabular-nums opacity-70">
                            ({counts[tab.view].toLocaleString()})
                          </span>
                        )}
                      </button>
                      {/* ⚠️ A separate button, not a click target inside the tab
                          — a button cannot be nested in a button, and starring a
                          tab must not also switch to it. Always visible rather
                          than hover-revealed: on a touch screen there is no
                          hover, and a control that never appears is not one. */}
                      <button
                        type="button"
                        onClick={() => setSetting('homeTab', starred ? 'albums' : tab.view)}
                        aria-pressed={starred}
                        title={
                          starred
                            ? `${tab.label} is what the library opens on`
                            : `Open the library on ${tab.label}`
                        }
                        aria-label={
                          starred
                            ? `${tab.label} is what the library opens on`
                            : `Open the library on ${tab.label}`
                        }
                        className={`mr-1 inline-flex h-6 w-6 items-center justify-center rounded-full transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#E05504] ${
                          starred
                            ? 'text-orange-500 dark:text-orange-400'
                            : 'text-slate-300 hover:text-orange-500 dark:text-slate-600 dark:hover:text-orange-400'
                        }`}
                      >
                        <StarGlyph filled={starred} />
                      </button>
                    </span>
                  )
                })}
              </nav>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search your library"
                aria-label="Search your library"
                className="ml-auto w-full max-w-xs rounded-full border border-slate-300 bg-white px-4 py-1.5 text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
              {queueLength > 0 && !mini && (
                <button
                  type="button"
                  onClick={() => navigate({ view: 'playing' })}
                  className="rounded-full border border-slate-300 px-3.5 py-1.5 text-[13px] font-medium text-slate-700 hover:border-orange-500 hover:text-orange-700 dark:border-slate-700 dark:text-slate-200 dark:hover:text-orange-400"
                >
                  Now playing
                </button>
              )}
            </div>

            {view === 'artists' ? (
              <ArtistList query={query} />
            ) : view === 'tracks' ? (
              <TrackList query={query} />
            ) : (
              <AlbumGrid query={query} />
            )}
          </>
        )}
      </main>

      <PlayerBar />

      <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className={`${CONTAINER} flex flex-row items-center gap-3 py-4 text-xs text-slate-500 sm:gap-4 dark:text-slate-400`}>
          <span>
            With{' '}
            <span aria-hidden="true" className="text-orange-600 dark:text-orange-400">&hearts;</span>
            <span className="sr-only">love</span>{' '}
            from{' '}
            <a href="https://www.unisim.co.uk" target="_blank" rel="noreferrer" className="text-slate-700 underline-offset-2 hover:text-orange-700 hover:underline dark:text-slate-300 dark:hover:text-orange-400">
              UNISIM.co.uk
            </a>
          </span>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="Universal Jukebox on GitHub"
            title="View source on GitHub"
            className="ml-auto inline-flex shrink-0 items-center gap-1.5 text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
              <path d="M12 .5C5.65.5.5 5.65.5 12.02c0 5.09 3.29 9.4 7.86 10.92.57.1.78-.25.78-.55 0-.27-.01-1-.02-1.96-3.2.69-3.87-1.54-3.87-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.7 1.25 3.36.95.1-.74.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.18-3.08-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.18 1.18.92-.26 1.91-.39 2.89-.39.98 0 1.97.13 2.89.39 2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.18 1.82 1.18 3.08 0 4.42-2.69 5.39-5.26 5.68.41.35.77 1.05.77 2.12 0 1.53-.01 2.76-.01 3.14 0 .3.21.66.79.55 4.57-1.52 7.86-5.83 7.86-10.92C23.5 5.65 18.35.5 12 .5z" />
            </svg>
            <span className="hidden sm:inline">GitHub</span>
          </a>
        </div>
      </footer>
    </div>
  )
}

function MiniStageNote() {
  return (
    <div className="py-10 text-center">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        The player is at the bottom of the screen.
      </p>
      <button
        type="button"
        onClick={goHome}
        className="mt-3 text-sm font-medium text-orange-700 underline-offset-2 hover:underline dark:text-orange-400"
      >
        Back to your library
      </button>
    </div>
  )
}

/**
 * The star beside a library tab: "this is the one I want to land on".
 *
 * Outlined until it is chosen, then filled — the same shape either way, so the
 * row does not move when you press it.
 */
function StarGlyph({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-[13px] w-[13px]"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 1.6}
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M10 2.6l2.32 4.7 5.18.75-3.75 3.66.885 5.16L10 14.44l-4.635 2.43.885-5.16L2.5 8.05l5.18-.75L10 2.6Z" />
    </svg>
  )
}
