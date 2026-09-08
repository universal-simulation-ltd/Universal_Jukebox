import { useLibraryStore } from '../../stores/libraryStore'
import { usePlayerStore } from '../../stores/playerStore'
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

export default function AppMenu() {
  const rescan = useLibraryStore((s) => s.rescan)
  const clear = useLibraryStore((s) => s.clear)
  const status = useLibraryStore((s) => s.status)
  const roots = useLibraryStore((s) => s.roots)
  const crackle = usePlayerStore((s) => s.crackle)
  const setCrackle = usePlayerStore((s) => s.setCrackle)
  const pref = useThemeStore((s) => s.pref)
  const setPref = useThemeStore((s) => s.setPref)

  const hasLibrary = status === 'ready'

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
          <Row onClick={() => void rescan()}>Rescan folder</Row>
          <Row onClick={() => void clear()}>Forget this library…</Row>
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
      <label className="flex cursor-pointer items-start gap-2.5 px-3 py-2">
        <input
          type="checkbox"
          checked={crackle}
          onChange={(e) => setCrackle(e.target.checked)}
          className="mt-0.5 h-3.5 w-3.5 accent-orange-600"
        />
        <span>
          Needle-drop sound
          <span className="block text-[11px] text-slate-500 dark:text-slate-400">
            A thunk and a little crackle before the first track.
          </span>
        </span>
      </label>

      <Divider />
      <Row onClick={() => navigate({ view: 'about' })}>About Universal Jukebox</Row>
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
