// NativeApp.tsx — the phone app's shell (see shell.ts for why it exists).
// Loaded lazily by App.tsx, so the website never downloads it.
//
// Tabs: Albums · Artists · Songs · Shelves · Tune. The top is the suite's
// pulsing light bar and the screen's way back, and nothing else: no navbar,
// suite switcher, actions menu or sign-in (James, 2026-10-10 — an everyday app
// asks for an account only where a feature needs one, and on the phone none
// does). What's playing docks above the tab bar (MiniPlayer); tapping it opens
// the record full screen, which is the website's Now Playing unchanged — the
// turntable is the app.
//
// ⚠️ THE PAGE ITSELF SCROLLS, not an inner box. Now Playing, the shelves, the
// banners and Tune all measure against the window (`window.scrollY`,
// `navBarBottom()` finds this `<header>`), so the bars are `position: fixed`
// and `.jx-main` pads under them. Routing is still `lib/route.ts`'s hash
// routes, so every link inside a reused component lands on the right screen.
//
// Double-tap a tab to make it the one the app opens on (the suite convention;
// `homeTab`, the same setting as the website's starred tab).

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { BedsideHost } from '../components/Bedside'
import ErrorBanner from '../components/ErrorBanner'
import ExampleNotice from '../components/ExampleNotice'
import JukeboxShelves from '../components/JukeboxShelves'
import NowPlaying from '../components/NowPlaying'
import PlayerBar from '../components/PlayerBar'
import ScanBanner from '../components/ScanBanner'
import Settings from '../components/Settings'
import SkippedBanner from '../components/SkippedBanner'
import About from '../components/About'
import Tidy from '../components/Tidy'
import { useBooting } from '../lib/boot'
import { NAVIGATED, arrivedByHistory, currentRoute, goHome, navigate, type Route, type View } from '../lib/route'
import { useLibraryStore } from '../stores/libraryStore'
import { usePlayerStore } from '../stores/playerStore'
import { useSettingsStore, type HomeTab } from '../stores/settingsStore'
import { AlbumScreen, ArtistScreen } from './DetailScreens'
import { IconAlbums, IconArtists, IconBack, IconDown, IconShelves, IconSongs, IconTune } from './icons'
import { AlbumsScreen, ArtistsScreen, SongsScreen } from './LibraryScreens'
import { MiniPlayer } from './MiniPlayer'
import { goBack } from './shell'
import { WelcomeScreen } from './WelcomeScreen'
import './native.css'

type TabView = HomeTab | 'settings'

const TABS: { view: TabView; label: string; Icon: () => JSX.Element }[] = [
  { view: 'albums', label: 'Albums', Icon: IconAlbums },
  { view: 'artists', label: 'Artists', Icon: IconArtists },
  { view: 'tracks', label: 'Songs', Icon: IconSongs },
  { view: 'jukebox', label: 'Shelves', Icon: IconShelves },
  { view: 'settings', label: 'Tune', Icon: IconTune },
]

/** Two taps on one tab within this long are a double tap. */
const DOUBLE_TAP_MS = 350

/** Screens of their own, which open at their top. */
const PAGE_VIEWS = new Set<View>(['playing', 'album', 'artist', 'settings', 'about', 'tidy'])
/** Where each screen was scrolled to, put back when you come back to it. */
const scrollMemory = new Map<string, number>()
const hashKey = () => location.hash || '#/'

const LIBRARY_VIEWS = new Set<View>(['albums', 'artists', 'tracks', 'jukebox', 'album', 'artist'])

function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => currentRoute())
  useEffect(() => {
    const sync = () => setRoute(currentRoute())
    window.addEventListener('popstate', sync)
    window.addEventListener(NAVIGATED, sync)
    window.addEventListener('hashchange', sync)
    return () => {
      window.removeEventListener('popstate', sync)
      window.removeEventListener(NAVIGATED, sync)
      window.removeEventListener('hashchange', sync)
    }
  }, [])
  return route
}

/** Which tab a screen belongs under, so the tab stays lit on an album. */
function tabOf(view: View): TabView | null {
  if (view === 'album') return 'albums'
  if (view === 'artist') return 'artists'
  if (view === 'about' || view === 'tidy') return 'settings'
  if (view === 'playing') return null
  return view as TabView
}

export default function NativeApp() {
  const route = useRoute()
  const status = useLibraryStore((s) => s.status)
  const hydrate = useLibraryStore((s) => s.hydrate)
  const ceremony = usePlayerStore((s) => s.ceremony)
  const skipCeremony = usePlayerStore((s) => s.skipCeremony)
  const homeTab = useSettingsStore((s) => s.homeTab)
  const setSetting = useSettingsStore((s) => s.set)
  const [query, setQuery] = useState('')
  const lastTap = useRef<{ view: TabView; at: number } | null>(null)
  const [homeFlash, setHomeFlash] = useState<TabView | null>(null)

  const view: View = route.home ? homeTab : route.view
  const hasLibrary = status === 'ready' || status === 'scanning'
  const playing = view === 'playing'

  // The phone's own warm grounds, under the page as well as in it.
  useEffect(() => {
    document.documentElement.classList.add('jx-phone')
    return () => document.documentElement.classList.remove('jx-phone')
  }, [])

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  // A new screen opens at its top; one you go back to is as you left it.
  useLayoutEffect(() => {
    if (arrivedByHistory()) {
      const y = scrollMemory.get(hashKey())
      if (y !== undefined) {
        window.scrollTo(0, y)
        requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo(0, y)))
      }
      return
    }
    if (PAGE_VIEWS.has(route.view)) window.scrollTo(0, 0)
  }, [route.view, route.albumId, route.artist])

  useEffect(() => {
    try {
      history.scrollRestoration = 'manual'
    } catch { /* not allowed here */ }
    let frame = 0
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(() => {
        frame = 0
        scrollMemory.set(hashKey(), window.scrollY)
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  // Any tap cuts the ceremony short, as on the website (App.tsx says why).
  useEffect(() => {
    if (!ceremony) return
    const skip = () => skipCeremony()
    const timer = setTimeout(() => document.addEventListener('click', skip), 0)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('click', skip)
    }
  }, [ceremony, skipCeremony])

  useEffect(() => {
    if (!homeFlash) return
    const timer = window.setTimeout(() => setHomeFlash(null), 900)
    return () => window.clearTimeout(timer)
  }, [homeFlash])

  if (useBooting(status === 'loading')) return null

  const welcome = !hasLibrary && LIBRARY_VIEWS.has(view)
  const tab = tabOf(view)
  const showTabs = !playing && !welcome

  const tapTab = (target: TabView) => {
    const now = performance.now()
    const last = lastTap.current
    lastTap.current = { view: target, at: now }
    if (target !== 'settings' && last?.view === target && now - last.at < DOUBLE_TAP_MS) {
      lastTap.current = null
      setSetting('homeTab', target)
      setHomeFlash(target)
    }
    if (tab === target && route.view === target) window.scrollTo({ top: 0, behavior: 'smooth' })
    else navigate({ view: target })
  }

  return (
    <div className={`jx${playing ? ' jx-stage' : ''}${showTabs ? ' jx-tabbed' : ''}`}>
      <header className="jx-top">
        <div className="jx-strip" aria-hidden />
        <TopBar view={view} route={route} />
      </header>

      <main className="jx-main">
        <ErrorBanner />
        {!playing && <SkippedBanner />}
        <ScanBanner showRefusals={LIBRARY_VIEWS.has(view)} />
        {/* "This is the demo", with its way out, on the tab screens only: on a
            phone it is a third of an album page or the record's room. */}
        {tab && tab !== 'settings' && view === tab && <ExampleNotice onLibraryPage />}

        {view === 'settings' ? (
          <div className="jx-page jx-tune"><Settings /></div>
        ) : view === 'about' ? (
          <div className="jx-page jx-tune"><About /></div>
        ) : view === 'tidy' ? (
          <div className="jx-page jx-tune"><Tidy /></div>
        ) : welcome ? (
          <WelcomeScreen />
        ) : view === 'album' && route.albumId ? (
          <AlbumScreen albumId={route.albumId} />
        ) : view === 'artist' && route.artist ? (
          <ArtistScreen name={route.artist} />
        ) : playing ? (
          <div className="jx-playing"><NowPlaying /></div>
        ) : view === 'jukebox' ? (
          <div className="jx-page jx-tune">
            <h1 className="jx-h1">Shelves</h1>
            <JukeboxShelves />
          </div>
        ) : view === 'artists' ? (
          <ArtistsScreen query={query} setQuery={setQuery} />
        ) : view === 'tracks' ? (
          <SongsScreen query={query} setQuery={setQuery} />
        ) : (
          <AlbumsScreen query={query} setQuery={setQuery} />
        )}
      </main>

      {/* On an iPad held sideways Now Playing still wants the website's bar
          (it steps aside below `lg`, where the stage has its own transport). */}
      {playing && <PlayerBar onStage />}

      {showTabs && (
        <div className="jx-dock">
          <MiniPlayer />
          <nav className="jx-tabs" aria-label="Jukebox">
            {TABS.map(({ view: target, label, Icon }) => (
              <button
                key={target}
                type="button"
                className={`jx-tab${homeFlash === target ? ' flash' : ''}`}
                aria-current={tab === target ? 'page' : undefined}
                onClick={() => tapTab(target)}
                title={target === 'settings' ? undefined : homeTab === target ? `${label}: the app opens here` : `Double-tap to open the app on ${label}`}
              >
                <Icon />
                <span>{label}</span>
                {homeTab === target && <i className="jx-home-dot" aria-hidden />}
              </button>
            ))}
          </nav>
        </div>
      )}
      {homeFlash && (
        <p aria-live="polite" className="jx-sr">
          The app now opens on {TABS.find((t) => t.view === homeFlash)?.label}
        </p>
      )}
      <BedsideHost />
    </div>
  )
}

/** The row under the light bar: the way back, or the app's name at the top level. */
function TopBar({ view, route }: { view: View; route: Route }) {
  if (view === 'playing') {
    return (
      <div className="jx-bar">
        <button type="button" className="jx-back" onClick={() => goBack(goHome)} aria-label="Close the record">
          <IconDown />
        </button>
        <span className="jx-bar-title">Now playing</span>
      </div>
    )
  }
  const up: { label: string; to: () => void } | null =
    view === 'album'
      ? { label: 'Albums', to: () => navigate({ view: 'albums' }) }
      : view === 'artist'
        ? { label: 'Artists', to: () => navigate({ view: 'artists' }) }
        : view === 'about' || view === 'tidy'
          ? { label: 'Tune', to: () => navigate({ view: 'settings' }) }
          : null
  if (up) {
    return (
      <div className="jx-bar">
        <button type="button" className="jx-back wide" onClick={() => goBack(up.to)}>
          <IconBack />
          <span>{up.label}</span>
        </button>
        {route.artist && view === 'artist' ? <span className="jx-bar-title">{route.artist}</span> : null}
      </div>
    )
  }
  return (
    <div className="jx-bar">
      <span className="jx-brand">
        <b>Universal</b> Jukebox
      </span>
    </div>
  )
}
