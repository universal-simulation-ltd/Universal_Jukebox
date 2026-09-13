import { useRef, useState } from 'react'
import { useLibraryStore } from '../../stores/libraryStore'
import { trackCountFor } from '../../lib/roots'
import { plural } from '../../lib/format'
import { navigate } from '../../lib/route'
import { hasOwnMusicFolder, isNativeShell, usesChosenFolder } from '../../lib/nativeFile'
import { hasMusicLibrary } from '../../lib/appleMusic'
import { hasNativeImporter } from '../../lib/nativeImport'
import { usePageLockWhileShown } from '../../lib/pageScrollLock'
import { useCloseAppMenu } from '@unisim/sdk'

// The app's own rows, folded into the navbar's right-hand profile pill.
//
// `actions` rather than `fileMenu` (the SDK's guidance for a new app): it keeps
// ONE dropdown trigger per side of the bar instead of two.
//
// ⚠️ The SDK themes the bar and the three dropdowns it opens, but NOT these
// rows — they are ours, so they carry their own `dark:` classes. That split is
// documented in `new-universal-app.md` §2 and is easy to forget, because it
// looks fine until someone switches to dark.
//
// ⚠️ This menu is for what you DO to the library — its folders, and adding to
// them — and the way to Settings and About. Everything else lives on the
// Settings page: the theme, "Tidy up library" and "Show the tips again" were
// here and moved there (James, 2026-09-11: "Appearance, tidy, show tips again
// should all go into settings").
//
// ⚠️ THE LIBRARY IS ONE ROW UNTIL IT IS OPENED (James, 2026-09-13: "Have just
// 'Your complete library x songs' button that then shows — current folder(s)
// delete, add tracks, add folder, rescan folder(s), refresh device's Music
// Library"). Shut, the menu is three rows: the library, Settings, About. Open,
// the library row lists its folders, each with Remove, then the four things you
// can do to it. It starts shut every time the menu opens.
//
// ⚠️ EVERY LABEL SAYS WHAT ITS BUTTON DOES, which is why "add folder" is not
// always "Add a folder". In a browser a folder is ADDED (`pickFolder`); in the
// phone apps there is one folder and choosing another REPLACES it
// (`chooseNativeFolder`), so there it says so. An "add" that quietly meant
// "replace" would be the worst kind of button. Likewise "Add tracks…" is only
// offered where the songs are kept: the phone apps copy them into the app's
// own folder, while a browser keeps picked files only until the page reloads.

export default function AppMenu() {
  const rescanFolder = useLibraryStore((s) => s.rescanFolder)
  const removeFolder = useLibraryStore((s) => s.removeFolder)
  const status = useLibraryStore((s) => s.status)
  const roots = useLibraryStore((s) => s.roots)
  const tracks = useLibraryStore((s) => s.tracks)
  const pickFolder = useLibraryStore((s) => s.pickFolder)
  const addFiles = useLibraryStore((s) => s.addFiles)
  const canPersist = useLibraryStore((s) => s.canPersistFolder)
  const scanNativeFolder = useLibraryStore((s) => s.scanNativeFolder)
  const importNativeFiles = useLibraryStore((s) => s.importNativeFiles)
  const chooseNativeFolder = useLibraryStore((s) => s.chooseNativeFolder)
  const importMusicLibrary = useLibraryStore((s) => s.importMusicLibrary)
  const pickNativeFiles = useLibraryStore((s) => s.pickNativeFiles)
  const native = isNativeShell()
  // Android: the folder is chosen, not fixed — see `usesChosenFolder`.
  const chosen = usesChosenFolder()
  // iOS: a folder of the app's own AND the choice of another — see
  // `hasOwnMusicFolder`.
  const own = hasOwnMusicFolder()
  // iOS: the Music app's library, and a native picker for audio files.
  const musicLibrary = hasMusicLibrary()
  const nativePicker = hasNativeImporter()
  const folderInput = useRef<HTMLInputElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  // While the menu is showing, a scroll on it never moves the page behind
  // (James, 2026-09-13) — see `lib/pageScrollLock.ts`. And the library row is
  // shut again as the menu is put away: the SDK keeps this component mounted
  // while the menu is closed, so `open` would otherwise outlive it.
  const menu = useRef<HTMLDivElement>(null)
  usePageLockWhileShown(menu, () => setOpen(false))

  const hasLibrary = status === 'ready'
  // ⚠️ Is the library reading a folder somebody CHOSE (a non-empty
  // `nativePath`) rather than the app's own? Then the importer is wrong here,
  // on iOS as on Android: it copies into the app's own folder, which the
  // library is no longer reading, so imported music would never be found.
  const readingChosen = roots.some((r) => !!r.nativePath)
  // Where adding tracks means copying them INTO the folder the library reads —
  // iOS on its own folder, or a shell whose one folder is fixed.
  const canAddTracks = native && ((own && !readingChosen) || (!own && !chosen))
  const hasMusicRoot = roots.some((r) => r.source === 'music-library')
  const folders = roots.filter((r) => r.source !== 'music-library')

  // ⚠️ The native picker where there is one: the web input offers "Take
  // Photo" on iOS before it offers files — see `lib/nativeImport.ts`.
  const addTracks = () => {
    if (nativePicker) void pickNativeFiles()
    else fileInput.current?.click()
  }

  // A browser ADDS a folder: the real picker where there is one,
  // `webkitdirectory` where there isn't. The phone apps REPLACE theirs.
  const addFolder = () => {
    if (chosen) void chooseNativeFolder()
    else if (canPersist) void pickFolder()
    else folderInput.current?.click()
  }
  const canAddFolder = !native || chosen

  // Every folder, read again. In the phone apps that is their one folder,
  // which the Files app can change without telling anybody; in a browser, each
  // folder in turn. The Music library has its own "Refresh", below.
  const rescan = async () => {
    if (native) {
      await scanNativeFolder()
      return
    }
    for (const root of folders) await rescanFolder(root.id)
  }

  return (
    <div ref={menu} className="min-w-[15rem] py-1 text-[13px] text-slate-700 dark:text-slate-200">
      {hasLibrary && (
        <>
          {/* The one row. It opens here rather than closing the menu, so it is
              a plain button and not a `Row`. */}
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
            className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <span className="min-w-0 flex-1">
              <span className="block font-medium text-slate-800 dark:text-slate-100">Your complete library</span>
              <span className="block text-[11.5px] text-slate-400 dark:text-slate-500">{plural(tracks.length, 'song')}</span>
            </span>
            <svg
              viewBox="0 0 20 20"
              className={`h-4 w-4 shrink-0 text-slate-400 transition-transform dark:text-slate-500 ${open ? 'rotate-180' : ''}`}
              fill="currentColor"
              aria-hidden
            >
              <path d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.58l3.3-3.3a1 1 0 1 1 1.4 1.42l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.42Z" />
            </svg>
          </button>

          {open && (
            <div className="mb-1 ml-3 border-l border-slate-200 pl-1 dark:border-slate-700">
              {/* What the library is made of, each with the one thing you can
                  do to it alone. ⚠️ Remove is offered even for a single folder,
                  where it is the same as forgetting the library: hiding it at
                  one would change the row's shape as soon as there were two. */}
              {roots.map((root) => (
                <div key={root.id} className="flex items-baseline gap-2 px-3 py-1.5">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-slate-800 dark:text-slate-100">{root.label}</span>
                    <span className="block text-[11.5px] text-slate-400 dark:text-slate-500">
                      {plural(trackCountFor(tracks, root), 'song')}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => void removeFolder(root.id)}
                    title="Takes it out of Jukebox — the music files themselves stay where they are"
                    className="shrink-0 text-[11.5px] text-slate-500 underline-offset-2 hover:text-orange-700 hover:underline dark:text-slate-400 dark:hover:text-orange-400"
                  >
                    Remove
                  </button>
                </div>
              ))}
              {canAddTracks && (
                <Row onClick={addTracks} title="Copies the songs you pick into the Universal Jukebox folder">
                  Add tracks…
                </Row>
              )}
              {canAddFolder && (
                <Row
                  onClick={addFolder}
                  title={
                    chosen
                      ? 'Reads a different folder instead of the one the library reads now'
                      : 'Adds a folder to your library — the ones you already have stay'
                  }
                >
                  {chosen ? 'Use a different folder…' : 'Add a folder…'}
                </Row>
              )}
              {(native || folders.length > 0) && (
                <Row onClick={() => void rescan()} title="Picks up anything added or changed since the last scan">
                  {native || folders.length === 1 ? 'Rescan my music folder' : 'Rescan my folders'}
                </Row>
              )}
              {/* The iPhone's Music library — songs synced from a Mac. A sync
                  never tells this app it happened, hence "Refresh". */}
              {musicLibrary && (
                <Row
                  onClick={() => void importMusicLibrary()}
                  title="The songs synced to this iPhone from your computer, as they are in the Music app"
                >
                  {/* Whose library, said (James, 2026-09-13: "Change it to
                      'Refresh my phone's Music Library'") — an iPad's on an iPad. */}
                  {hasMusicRoot ? `Refresh my ${deviceWord()}’s Music Library` : `Add my ${deviceWord()}’s Music Library…`}
                </Row>
              )}
            </div>
          )}
          <Divider />
        </>
      )}

      <Row onClick={() => navigate({ view: 'settings' })}>Settings…</Row>
      <Row onClick={() => navigate({ view: 'about' })}>About Universal Jukebox</Row>

      {/* ⚠️ Always mounted, even when the picker path is the one in use: this is
          also the fallback if `showDirectoryPicker` throws — an iframe, a
          policy, an older Chromium — and a ref to something conditionally
          rendered is a click that silently does nothing. */}
      <input
        ref={folderInput}
        type="file"
        {...({ webkitdirectory: '', directory: '' } as Record<string, string>)}
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) void addFiles(e.target.files)
          e.target.value = ''
        }}
      />
      {/* The native "add tracks" picker — plain multi-file, which iOS does
          support, and the files are copied into the music folder so they last. */}
      <input
        ref={fileInput}
        type="file"
        accept="audio/*,.mp3,.m4a,.flac,.wav,.aiff,.ogg,.opus"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) void importNativeFiles(e.target.files)
          e.target.value = ''
        }}
      />
    </div>
  )
}

function Row({
  onClick, title, children,
}: { onClick(): void; title?: string; children: React.ReactNode }) {
  // ⚠️ EVERY ROW CLOSES THE MENU (James, 2026-09-10: "When clicking actions ->
  // settings - it should close the actions menu"). The dropdown belongs to the
  // SDK's profile pill, which renders these rows as-is and owns the open state,
  // so a row that only navigated left the panel sitting on top of the page it
  // had just opened. `useCloseAppMenu` is the SDK's door for exactly this, and a
  // no-op outside the pill. Closed FIRST, so a row that opens a picker or a
  // dialog is not competing with a menu still on screen.
  const close = useCloseAppMenu()
  return (
    <button
      type="button"
      onClick={() => {
        close()
        onClick()
      }}
      title={title}
      className="block w-full px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
    >
      {children}
    </button>
  )
}

function Divider() {
  return <div className="my-1 border-t border-slate-200 dark:border-slate-700" />
}

/**
 * "phone", or "iPad" on an iPad — whose Music Library the row is about. Only
 * ever asked where there is one (`hasMusicLibrary`: the iPhone and iPad apps).
 * An iPad reports itself as a Mac with a touch screen since iPadOS 13, hence
 * the second test — the same one `mediaSession.ts` uses.
 */
function deviceWord(): 'phone' | 'iPad' {
  if (typeof navigator === 'undefined') return 'phone'
  const iPad = /iPad/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  return iPad ? 'iPad' : 'phone'
}
