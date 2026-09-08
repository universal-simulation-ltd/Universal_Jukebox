import { useRef } from 'react'
import { useLibraryStore } from '../../stores/libraryStore'
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
// ⚠️ THERE ARE EXACTLY THREE LIBRARY ACTIONS, AND "ADD TO LIBRARY" IS NOT ONE
// OF THEM (James, 2026-09-08): the folder you CHOSE, RESCAN it, FORGET it.
//
// That is not a shortfall to be filled in later — it is what the app actually
// does. A scan REPLACES the library (`runScan` in `libraryStore` clears the
// stores and rebuilds from the walk), there is one root, and every id is
// derived from the files themselves so a rescan reproduces exactly what was
// there plus whatever is new. An "add" that quietly meant "replace" would be
// the worst kind of button; a real one would need a second root, merge rules
// and a way to un-add, none of which exist. So the folder row says which folder
// it is, and choosing a different one says out loud that it replaces this.
//
// Tidy-up used to sit in this group and doesn't any more, for the same reason:
// it is a page you visit, like Settings and About, not one of the three things
// you can do to the library itself.

export default function AppMenu() {
  const rescan = useLibraryStore((s) => s.rescan)
  const clear = useLibraryStore((s) => s.clear)
  const status = useLibraryStore((s) => s.status)
  const roots = useLibraryStore((s) => s.roots)
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
            Library
          </p>
          {roots[0] && (
            <p className="truncate px-3 pb-1.5 text-[12px] text-slate-500 dark:text-slate-400">
              {roots[0].label}
            </p>
          )}
          {/* Chosen · rescan · forget. Nothing else, and nothing that adds. */}
          <Row onClick={chooseFolder}>Choose a different folder…</Row>
          <Row onClick={() => void rescan()}>Rescan this folder</Row>
          <Row onClick={() => void clear()}>Forget this library…</Row>
          <p className="px-3 pt-1 pb-2 text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
            One folder at a time — choosing another replaces this library rather
            than adding to it. Rescanning picks up anything new inside it.
          </p>
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

function Row({ onClick, children }: { onClick(): void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
    >
      {children}
    </button>
  )
}

function Divider() {
  return <div className="my-1 border-t border-slate-200 dark:border-slate-700" />
}
