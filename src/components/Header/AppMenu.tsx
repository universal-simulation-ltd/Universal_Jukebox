import { useRef } from 'react'
import { useLibraryStore } from '../../stores/libraryStore'
import { trackCountFor } from '../../lib/roots'
import { plural } from '../../lib/format'
import { useThemeStore, type ThemePref } from '../../stores/themeStore'
import { navigate } from '../../lib/route'

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
// ⚠️ This menu is for what you reach FOR — the library actions and the theme
// switch you flip in the evening. Everything you set once and leave lives on
// the Settings page. The needle-drop toggle was here and moved there when it
// stopped being the only preference; a dropdown that grows a settings panel
// inside it is a settings page with worse ergonomics.
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
// Tidy-up used to sit in this group and doesn't any more, for the same reason:
// it is a page you visit, like Settings and About, not one of the three things
// you can do to the library itself.

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
  const pref = useThemeStore((s) => s.pref)
  const setPref = useThemeStore((s) => s.setPref)
  const folderInput = useRef<HTMLInputElement>(null)

  const hasLibrary = status === 'ready'

  // Same two paths as the landing screen: the real picker where the browser
  // has one, and `webkitdirectory` where it hasn't.
  const chooseFolder = () => {
    if (canPersist) void pickFolder()
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
            title="Adds to your library — the folders you already have stay where they are"
          >
            Add a folder…
          </Row>
          {roots.length > 1 && (
            <Row onClick={() => void clear()}>Forget all of them…</Row>
          )}
          <Divider />
        </>
      )}

      <p className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wide text-slate-400 uppercase dark:text-slate-500">
        Appearance
      </p>
      <div className="flex gap-1 px-3 pb-2">
        {(['light', 'dark', 'system'] as ThemePref[]).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setPref(option)}
            aria-pressed={pref === option}
            className={`flex-1 rounded-md border px-2 py-1 text-[12px] capitalize transition ${
              pref === option
                ? 'border-orange-500 bg-orange-50 font-medium text-orange-700 dark:bg-orange-950/40 dark:text-orange-300'
                : 'border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300'
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      <Divider />
      {hasLibrary && <Row onClick={() => navigate({ view: 'tidy' })}>Tidy up library…</Row>}
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
    </div>
  )
}

function Row({
  onClick, title, children,
}: { onClick(): void; title?: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
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
