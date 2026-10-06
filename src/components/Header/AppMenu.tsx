import { useRef, useState } from 'react'
import { useLibraryStore } from '../../stores/libraryStore'
import { trackCountFor } from '../../lib/roots'
import { plural } from '../../lib/format'
import { goHome, navigate } from '../../lib/route'
import { hasOwnMusicFolder, isNativeShell, usesChosenFolder } from '../../lib/nativeFile'
import { hasMusicLibrary } from '../../lib/appleMusic'
import { hasNativeImporter } from '../../lib/nativeImport'
import { useWhenPanelHides } from '../../lib/whenPanelHides'
import { KnowledgeBaseDialog, useCloseAppMenu } from '@unisim/sdk'
import { KNOWLEDGE_BASE } from '../../knowledge'
import { useThemeStore } from '../../stores/themeStore'

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
// ⚠️ EVERY LABEL SAYS WHAT ITS BUTTON DOES. "Add a folder…" ADDS, in a browser
// (`pickFolder`) and — since 2026-09-14 — in the phone apps too
// (`addNativeFolder`). Until then the phones had one folder, choosing another
// REPLACED it, and this row honestly read "Use a different folder…". Replacing
// is now what it is on the web: Remove on the folder's own line, then Add. An
// "add" that quietly meant "replace" would be the worst kind of button.
// Likewise "Add tracks…" is only offered where the songs are kept: the iPhone
// app copies them into its own folder (which then joins the library if it was
// not in it), while a browser keeps picked files only until the page reloads.

export default function AppMenu() {
  const rescanFolder = useLibraryStore((s) => s.rescanFolder)
  const removeFolder = useLibraryStore((s) => s.removeFolder)
  const status = useLibraryStore((s) => s.status)
  const roots = useLibraryStore((s) => s.roots)
  const tracks = useLibraryStore((s) => s.tracks)
  const pickFolder = useLibraryStore((s) => s.pickFolder)
  const addFiles = useLibraryStore((s) => s.addFiles)
  const canPersist = useLibraryStore((s) => s.canPersistFolder)
  const rescanNativeFolders = useLibraryStore((s) => s.rescanNativeFolders)
  const importNativeFiles = useLibraryStore((s) => s.importNativeFiles)
  const addNativeFolder = useLibraryStore((s) => s.addNativeFolder)
  const importMusicLibrary = useLibraryStore((s) => s.importMusicLibrary)
  const pickNativeFiles = useLibraryStore((s) => s.pickNativeFiles)
  const trying = useLibraryStore((s) => s.trying)
  const leaveExample = useLibraryStore((s) => s.leaveExample)
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
  /** The Advanced row, opened (it shuts with the menu, as the library row does). */
  const [advanced, setAdvanced] = useState(false)
  /** The knowledge base (SDK 0.163.0), when Advanced opened it. */
  const [kb, setKb] = useState(false)
  const theme = useThemeStore((s) => s.effective)
  // The library row is shut again as the menu is put away: the SDK keeps this
  // component mounted while the menu is closed, so `open` would otherwise
  // outlive it. (A scroll on the menu no longer moves the page behind — the
  // SDK's own panel does that since 0.141.4; see `lib/whenPanelHides.ts`.)
  const menu = useRef<HTMLDivElement>(null)
  useWhenPanelHides(menu, () => {
    setOpen(false)
    setAdvanced(false)
  })

  const hasLibrary = status === 'ready'
  // Where adding tracks means copying them into a folder of the app's own —
  // iOS, or a shell whose one folder is fixed. ⚠️ On iOS that holds even when
  // the library reads only CHOSEN folders: it used to be hidden then, because
  // with one phone folder the copies landed somewhere the library did not
  // read. With several, the import rescans the app's own folder, adding it as
  // a folder of the library if it was not one (`scanNativeFolder()`). Never on
  // Android, whose "Documents" is the phone's shared one and is never read.
  const canAddTracks = native && (own || !chosen)
  const hasMusicRoot = roots.some((r) => r.source === 'music-library')
  const folders = roots.filter((r) => r.source !== 'music-library')

  // ⚠️ The native picker where there is one: the web input offers "Take
  // Photo" on iOS before it offers files — see `lib/nativeImport.ts`.
  const addTracks = () => {
    if (nativePicker) void pickNativeFiles()
    else fileInput.current?.click()
  }

  // Everywhere, a folder is ADDED: the phone's own picker in the apps, the
  // real picker in a browser where there is one, `webkitdirectory` where there
  // isn't.
  const addFolder = () => {
    if (chosen) void addNativeFolder()
    else if (canPersist) void pickFolder()
    else folderInput.current?.click()
  }
  const canAddFolder = !native || chosen

  // Every folder, read again, each in turn — the Files app can change a phone
  // folder without telling anybody. The Music library has its own "Refresh",
  // below.
  const rescan = async () => {
    if (native) {
      await rescanNativeFolders()
      return
    }
    for (const root of folders) await rescanFolder(root.id)
  }

  return (
    <div ref={menu} className="min-w-[15rem] py-1 text-[13px] text-slate-700 dark:text-slate-200">
      {/* ⚠️ THE WAY HOME ON A PHONE (James, 2026-10-06: "on now playing I can't
          access the menu to get back to the library … I don't like the back
          button … put 'Jukebox Home' in the actions dropdown", then "Jukebox
          Library"). Phones have no back links (2026-09-11), and the edge swipe
          is invisible and has nothing to go back to when the app opens on Now
          Playing. Always here, first, so it is in the same place on every page. */}
      <Row onClick={goHome}>
        <span className="block font-medium text-slate-800 dark:text-slate-100">Jukebox Library</span>
      </Row>
      <Divider />
      {/* ⚠️ TRYING THE EXAMPLE LIBRARY, THE LIBRARY ROW IS THE WAY BACK
          (`libraryStore.tryExample`). Its folders and "Add…" rows would all be
          about the demo standing in for your library — "Remove" on it, "Rescan"
          of it — and the one thing anybody in a trial needs from this menu is
          the way out. Adding your own music still works: from your library,
          once you are back in it. */}
      {trying && (
        <>
          <Row
            onClick={() => {
              leaveExample()
              goHome()
            }}
            title="Puts your own library back, exactly as you left it"
          >
            <span className="block font-medium text-slate-800 dark:text-slate-100">Back to my music</span>
            <span className="block text-[11.5px] text-slate-400 dark:text-slate-500">Leave the example library</span>
          </Row>
          <Divider />
        </>
      )}
      {hasLibrary && !trying && (
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
                <Row onClick={addFolder} title="Adds a folder to your library — the ones you already have stay">
                  Add a folder…
                </Row>
              )}
              {(native || folders.length > 0) && (
                <Row onClick={() => void rescan()} title="Picks up anything added or changed since the last scan">
                  {folders.length > 1 ? 'Rescan my folders' : 'Rescan my music folder'}
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

      {/* ⚠️ ONE "TUNE THIS APP" (James, 2026-09-27: "Combine settings and
          tune this app (called tune this app for both), have the sub menu of
          'Advanced' to house About jukebox, tune this app / global"). It is
          Jukebox's own Settings page, under the SDK's name for it; the SDK's
          row is switched off on the navbar (`showAppPreferences={false}`), and
          its two dialogs — this app's language and colour, and Global Tuning —
          open from Advanced. About Universal Jukebox was the first row of
          Advanced until later the same day, when About moved into "Tune this
          app" suite-wide.
          ⚠️ REVISED 2026-09-28 (James: "Tune this app / Advanced > About this
          app > Knowledge base"). Advanced holds only About and the knowledge
          base. The second "Tune this app — language & colour" row went (the
          colour is Settings ▸ Appearance; the app is English-only until 1.1),
          and Global Tuning went to the SDK's account panel, for signed-in
          users only (the SDK's rule since 0.165.0). */}
      <Row onClick={() => navigate({ view: 'settings' })}>Tune this app…</Row>
      <button
        type="button"
        aria-expanded={advanced}
        onClick={() => setAdvanced(!advanced)}
        className="flex w-full items-center gap-3 px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        <span className="flex-1">Advanced</span>
        <svg
          viewBox="0 0 20 20"
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform dark:text-slate-500 ${advanced ? 'rotate-180' : ''}`}
          fill="currentColor"
          aria-hidden
        >
          <path d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.58l3.3-3.3a1 1 0 1 1 1.4 1.42l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.42Z" />
        </svg>
      </button>
      {advanced && (
        <div className="mb-1 ml-3 border-l border-slate-200 pl-1 dark:border-slate-700">
          <Row onClick={() => navigate({ view: 'about' })}>About Universal Jukebox</Row>
          {/* The suite's knowledge base lives in Advanced (James, 2026-09-27:
              "more discreet e.g. in advanced in the actions pill"). Jukebox
              hand-rolls this section, so it mounts the SDK's dialog itself
              rather than taking the navbar's `knowledgeBase`, which would draw
              a second Advanced. */}
          <Row onClick={() => setKb(true)} title="How music files, lyrics and background play work">
            Knowledge base…
          </Row>
        </div>
      )}
      <KnowledgeBaseDialog {...KNOWLEDGE_BASE} open={kb} onClose={() => setKb(false)} theme={theme} />

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
