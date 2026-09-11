import { useRef } from 'react'
import { useLibraryStore } from '../../stores/libraryStore'
import { trackCountFor } from '../../lib/roots'
import { plural } from '../../lib/format'
import { navigate } from '../../lib/route'
import { hasOwnMusicFolder, isNativeShell, usesChosenFolder } from '../../lib/nativeFile'
import { hasMusicLibrary } from '../../lib/appleMusic'
import { hasNativeImporter } from '../../lib/nativeImport'
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
// should all go into settings"). The needle-drop toggle went the same way
// earlier; a dropdown that grows a settings panel inside it is a settings page
// with worse ergonomics.
//
// ⚠️ THERE IS AN "ADD A FOLDER" NOW, AND THERE DELIBERATELY WASN'T (2026-09-09).
//
// This comment used to say the opposite at length: three actions, no adding,
// "a real one would need a second root, merge rules and a way to un-add, none
// of which exist". All three exist as of 2026-09-09 — `lib/roots.ts` is the
// merge rules, `Root.prefix` is the second root, and "Remove" below is the way
// to un-add. The paragraph is kept in this shortened form because the REASON it
// said no is still the standard the feature had to meet: an "add" that quietly
// meant "replace" would be the worst kind of button.
//
// So the folder list is now a list, each row with its own rescan and remove,
// and adding one adds. Removing the last one leaves an empty library rather
// than a broken one.
//
// Tidy-up used to sit in this group and doesn't any more: it is a page you
// visit, not one of the things you do to a folder — reached from Settings'
// "Your library" now.

export default function AppMenu() {
  const rescanFolder = useLibraryStore((s) => s.rescanFolder)
  const removeFolder = useLibraryStore((s) => s.removeFolder)
  const clear = useLibraryStore((s) => s.clear)
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

  const hasLibrary = status === 'ready'
  // ⚠️ Is the library reading a folder somebody CHOSE (a non-empty
  // `nativePath`) rather than the app's own? Then the importer is wrong here
  // too, on iOS as on Android: it copies into the app's own folder, which the
  // library is no longer reading, so imported music would never be found.
  const readingChosen = roots.some((r) => !!r.nativePath)
  // Where "add" means copy files INTO the folder the library reads.
  const canImport = native && own && !readingChosen

  // Same paths as the landing screen: the real picker where the browser has
  // one, `webkitdirectory` where it hasn't — and inside the native shell,
  // neither, because there is one fixed folder and it cannot be chosen. There
  // "add" means "put files INTO it", which is the import.
  const chooseFolder = () => {
    // Android: a different folder, through the system picker. The importer
    // would copy into the phone's SHARED Documents, which the library does not
    // read there — see `usesChosenFolder`.
    // ⚠️ The native picker where there is one: the web input offers "Take Photo"
    // on iOS before it offers files — see `lib/nativeImport.ts`.
    const importFiles = () => {
      if (nativePicker) void pickNativeFiles()
      else fileInput.current?.click()
    }
    if (canImport) importFiles()
    else if (chosen) void chooseNativeFolder()
    else if (native) importFiles()
    else if (canPersist) void pickFolder()
    else folderInput.current?.click()
  }

  return (
    <div className="min-w-[15rem] py-1 text-[13px] text-slate-700 dark:text-slate-200">
      {hasLibrary && (
        <>
          <p className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wide text-slate-400 uppercase dark:text-slate-500">
            {roots.length > 1 ? 'Your folders' : 'Your library'}
          </p>
          {/* One row per folder: what it is, how much of the library is its,
              and the two things you can do to it on its own. */}
          {roots.map((root) => (
            <div key={root.id} className="px-3 py-1.5">
              <p className="truncate text-[13px] font-medium text-slate-800 dark:text-slate-100">
                {root.label}
              </p>
              <div className="mt-0.5 flex items-baseline gap-2">
                <span className="text-[11.5px] text-slate-400 dark:text-slate-500">
                  {plural(trackCountFor(tracks, root), 'track')}
                </span>
                <button
                  type="button"
                  onClick={() => void rescanFolder(root.id)}
                  className="text-[11.5px] text-slate-500 underline-offset-2 hover:text-orange-700 hover:underline dark:text-slate-400 dark:hover:text-orange-400"
                >
                  Rescan
                </button>
                {/* ⚠️ Offered per folder even when there is only one, where it
                    is the same thing as forgetting the library. Hiding it at
                    one folder would mean the row's controls changed shape as
                    soon as you added a second, which is the kind of small
                    inconsistency that makes a menu feel unreliable. */}
                <button
                  type="button"
                  onClick={() => void removeFolder(root.id)}
                  className="text-[11.5px] text-slate-500 underline-offset-2 hover:text-orange-700 hover:underline dark:text-slate-400 dark:hover:text-orange-400"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          <Row
            onClick={chooseFolder}
            title={
              canImport
                ? 'Copies the files you pick into the Universal Jukebox folder, then re-scans'
                : chosen
                  ? 'Reads a different folder instead of the one the library reads now'
                  : native
                    ? 'Copies the files you pick into the Universal Jukebox folder, then re-scans'
                    : 'Adds to your library — the folders you already have stay where they are'
            }
          >
            {canImport ? 'Add music…' : chosen ? 'Choose a different folder…' : native ? 'Add music…' : 'Add a folder…'}
          </Row>
          {/* iOS, reading its own folder: choosing another is offered BESIDE
              "Add music…", not instead of it. Once a chosen folder is being read
              the row above already is "Choose a different folder…". */}
          {canImport && chosen && (
            <Row
              onClick={() => void chooseNativeFolder()}
              title="Read a folder of your own instead — iCloud Drive, On My iPhone, or a connected drive"
            >
              Choose a different folder…
            </Row>
          )}
          {/* ⚠️ Native only, and it is not a duplicate of the row above. Music
              put in through the FILES APP — copied, AirDropped, synced from a
              computer — never touches this app, so nothing tells the library it
              is there. Without a rescan the only way to see it would be to
              reinstall. */}
          {native && (
            <Row
              onClick={() => void scanNativeFolder()}
              title="Picks up anything added through the Files app since the last scan"
            >
              Rescan my music folder
            </Row>
          )}
          {/* The iPhone's Music library — songs synced from a Mac. "Refresh"
              once it is in, because a sync never tells this app it happened. */}
          {musicLibrary && (
            <Row
              onClick={() => void importMusicLibrary()}
              title="The songs synced to this iPhone from your computer, as they are in the Music app"
            >
              {roots.some((r) => r.source === 'music-library') ? 'Refresh my Music library' : 'Add my Music library…'}
            </Row>
          )}
          {roots.length > 1 && (
            <Row onClick={() => void clear()}>Forget all of them…</Row>
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
      {/* The native "add music" picker — plain multi-file, which iOS does
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
