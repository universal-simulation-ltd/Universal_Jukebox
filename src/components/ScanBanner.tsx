import { useMemo, useState } from 'react'
import { DropRing } from '@unisim/sdk'
import FolderAccessButton from './FolderAccessButton'
import { plural } from '../lib/format'
import { folderAccess } from '../lib/roots'
import { goHome } from '../lib/route'
import { useMissingFile } from '../lib/useMissingFile'
import { needAccessFrom, useLibraryStore } from '../stores/libraryStore'
import { usePlayerStore } from '../stores/playerStore'

// Live scan progress, and the two things a scan has to say afterwards: the
// formats it had to refuse, and whether the folder needs its permission back.

/**
 * "Start a new library" — the secondary action on the permission banner.
 *
 * ⚠️ Deliberately NOT a second filled pill. Two solid buttons side by side make
 * a choice out of what is really one obvious action (get your music back) and
 * one escape hatch, and on a banner that already reads as a warning the second
 * pill is the one people click by mistake. Quiet and underlined, sitting under
 * the list rather than beside any one folder's button — it abandons the whole
 * library, so it belongs to the banner, not to a row.
 *
 * It carries no confirmation, for the same reason the app menu's "Forget this
 * library" doesn't: the library is derived from files on disk and rebuilding it
 * is one folder-pick away. Nothing here can lose anything that isn't already
 * somewhere else.
 */
function StartAgain({ onClick }: { onClick(): void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Forget this library and go back to the start"
      className="shrink-0 text-[13px] font-medium text-orange-900/80 underline-offset-2 hover:underline dark:text-orange-200/80"
    >
      Start a new library
    </button>
  )
}

export default function ScanBanner({ showRefusals = true }: { showRefusals?: boolean }) {
  const progress = useLibraryStore((s) => s.progress)
  const refusals = useLibraryStore((s) => s.refusals)
  // ⚠️ Which folders are unreachable is DERIVED, not stored — see
  // `needAccessFrom`. With several folders a single flag would be cleared by
  // re-granting any one of them, and the other two would go quiet while still
  // being unplayable.
  //
  // ⚠️ Subscribed as three pieces and MEMOISED, never as one selector. A
  // zustand selector that builds a new array every call never compares equal to
  // its last result, so the component re-renders forever — "Maximum update
  // depth exceeded", on the landing page, before there is a library at all.
  const roots = useLibraryStore((s) => s.roots)
  const tracks = useLibraryStore((s) => s.tracks)
  const filesByPath = useLibraryStore((s) => s.filesByPath)
  const unreachable = useMemo(
    () => needAccessFrom(roots, tracks, filesByPath),
    [roots, tracks, filesByPath],
  )
  // ⚠️ Minus the folder the error above is already asking for. A track whose
  // folder lapsed raises an error carrying THAT folder's button (see
  // `ErrorBanner`), and the same button again in here, just below it, reads as
  // two problems. The row comes back the moment the error is dismissed.
  const playerError = usePlayerStore((s) => s.error)
  const missing = useMissingFile()
  const coveredId =
    playerError && missing?.folderLapsed && !missing.reachableNow ? missing.root?.id : undefined
  const stranded = useMemo(
    () => (coveredId ? unreachable.filter((r) => r.id !== coveredId) : unreachable),
    [unreachable, coveredId],
  )
  const rescanFolder = useLibraryStore((s) => s.rescanFolder)
  const stopScan = useLibraryStore((s) => s.stopScan)
  const stoppedEarly = useLibraryStore((s) => s.stoppedEarly)
  const clear = useLibraryStore((s) => s.clear)

  /**
   * The way out of this banner that isn't "find that folder again".
   *
   * ⚠️ Both branches below assume the user still WANTS the folder they chose,
   * and sometimes that is simply not true — the drive is gone, the folder was a
   * mistake, or they would rather start with something else. Without this the
   * only exits were the app menu's "Forget this library" (behind a dropdown, on
   * a screen that is telling you something is wrong) and, on Chromium, a
   * permission dialog for a folder they no longer care about.
   *
   * It forgets the library and goes home, which is the front door: choose a
   * folder, pick files, or load the example library. `goHome` matters as much
   * as the clear — the route survives an empty library, so somebody who was on
   * `#/playing` would get the landing screen under a URL that says otherwise.
   */
  const startAgain = () => {
    void clear().then(goHome)
  }


  return (
    <>
      {progress && !progress.done && (
        <ScanningCard
          progress={progress}
          onKeep={stopScan}
          onDelete={() => {
            stopScan()
            startAgain()
          }}
        />
      )}
      {stoppedEarly && (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-[13px] text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          <p className="min-w-0 flex-1">
            Stopped early — everything found up to that point is in your library and
            plays normally. Scanning again reads the whole folder from the start.
          </p>
          <button
            type="button"
            onClick={() => void rescanFolder(roots[0]?.id ?? '')}
            className="shrink-0 rounded-full border border-slate-300 px-4 py-1.5 text-[13px] font-medium text-slate-700 transition hover:border-orange-500 hover:text-orange-700 dark:border-slate-600 dark:text-slate-200 dark:hover:border-orange-500 dark:hover:text-orange-400"
          >
            Scan the rest
          </button>
        </div>
      )}

      {/* ⚠️ ONE CARD, but ONE BUTTON PER FOLDER, and the difference
          matters. Permission is per handle, so three folders is three prompts
          — a single "Allow access" that looped over them would fire those
          prompts inside one user gesture, which browsers may collapse into a
          single grant, silently leaving the other folders unplayable under a
          banner that has just disappeared. A button each is honest about the
          cost and cannot half-work.

          What was stacked — a whole warning card per folder, each repeating the
          same explanation and its own "Start a new library" — read as several
          separate problems and pushed the page it belongs to off screen. The
          explanation and the escape hatch are said once; only the part that
          genuinely differs per folder (its name, and its button) repeats.

          Naming each folder is the whole difference between "your library needs
          permission" and "Rhianna does", so the names stay. */}
      {stranded.length > 0 && (
        <div className="mb-5 rounded-2xl border border-orange-200 bg-orange-50 px-5 py-4 text-[13px] text-orange-900 dark:border-orange-900/50 dark:bg-orange-950/30 dark:text-orange-200">
          {/* Said once, above the list, only when there is more than one folder
              to say it about — with a single folder the row's own sentence
              already reads as the whole banner, and a heading on top of it just
              says the same thing twice. */}
          {stranded.length > 1 && (
            <p className="mb-3 font-semibold">
              {plural(stranded.length, 'folder')} are still here, but each one has to be
              reconnected before it can be played.
            </p>
          )}

          <ul className="space-y-2.5">
            {stranded.map((root) => {
              // A stored handle is the ONLY thing that makes a folder
              // reopenable — not the browser's capabilities in general, since a
              // library built by picking files has no handle even on Chromium.
              const canReopen = folderAccess(root) === 'reopen'
              // ⚠️ NATIVE IS A THIRD CASE and it must not fall into the one
              // below. A native root has no `handle`, so without this it takes
              // the "choose it again" branch — whose button opens a
              // `webkitdirectory` picker that iOS IGNORES. That is a button
              // which silently does nothing, on the one screen whose entire job
              // is to get a broken library working again.
              //
              // The folder itself can never be unreachable here: it is the app's
              // own Documents directory. Tracks go missing only because the
              // files were deleted or moved in the Files app, and the honest fix
              // for that is a rescan, not a permission.
              const isNative = folderAccess(root) === 'rescan'
              // Grouped, the shared half of each sentence is already in the
              // heading, so a row says only what is true of THIS folder.
              const grouped = stranded.length > 1
              return (
                <li key={root.id} className="flex flex-wrap items-center gap-3">
                  <p className="min-w-0 flex-1">
                    <strong className="font-semibold">{root.label}</strong>
                    {isNative
                      ? ' lists tracks that aren’t in the music folder any more. Rescanning will bring the library back in line with what’s actually there.'
                      : canReopen
                      ? grouped
                        // Nothing: the heading has said why, and the button says
                        // what happens. Repeating "needs your permission again"
                        // on every row is the noise that made the stacked
                        // banners unreadable in the first place.
                        ? ''
                        : ' is here, but the browser needs your permission again before it can be read.'
                      : grouped
                        ? ' — this browser can’t reopen a folder on its own, so choose it again. Nothing has to be read twice.'
                        : ' and its artwork are still here, but this browser can’t reopen a folder on its own — choose it again to play anything from it. It will be quick: nothing has to be read twice.'}
                  </p>
                  {/* This folder's own button — shared with the missing-file
                      error, and one per folder for the reason in its header. */}
                  <FolderAccessButton root={root} />
                </li>
              )
            })}
          </ul>

          {/* One escape hatch for the banner, not one per folder: it forgets the
              whole library, so repeating it beside every row offered the same
              single action several times over. Under the list, away from the
              buttons that undo the problem rather than abandon it. */}
          <div className="mt-3">
            <StartAgain onClick={startAgain} />
          </div>
        </div>
      )}

      {showRefusals && refusals.length > 0 && (
        <div className="mb-5 rounded-2xl border border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-[13px] font-medium text-slate-900 dark:text-slate-100">
            Some files were skipped
          </p>
          <ul className="mt-2 space-y-1.5">
            {refusals.map((r) => (
              <li key={r.ext} className="text-[12.5px] leading-relaxed text-slate-600 dark:text-slate-300">
                <span className="font-medium text-slate-800 uppercase dark:text-slate-200">.{r.ext}</span>
                {' '}({r.count}) — {r.why}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  )
}

/**
 * A scan in progress (James, 2026-09-11: "the right pill doesn't wrap - it could
 * just say 'x tracks done / x tracks' by the wheel and underneath 'stop' and when
 * clicked asks 'Stop and... Keep / Delete'").
 *
 * ⚠️ The old right-hand pill said "Stop and keep 1,234 tracks" on one line, and
 * on a phone it would not wrap. The count now sits by the wheel, a quiet "Stop"
 * under it, and stopping ASKS: keep what has been read so far (everything found
 * is already in the library and plays), or delete it and start again.
 *
 * `seen` is the files the walk has reached; `added`, the tracks taken from them.
 * Nothing knows the total until the walk is over, so this counts rather than
 * pretending to a percentage.
 */
function ScanningCard({
  progress, onKeep, onDelete,
}: {
  progress: { added: number; seen: number; where: string }
  onKeep(): void
  onDelete(): void
}) {
  const [asking, setAsking] = useState(false)
  return (
    <div className="mb-5 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-[13px] text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
      <div className="flex items-center gap-3">
        <DropRing size={34} motion="busy" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-900 tabular-nums dark:text-slate-100" aria-live="polite">
            {progress.added.toLocaleString()} / {progress.seen.toLocaleString()} tracks
          </p>
          {/* The folder currently being walked — honest and specific. */}
          <p className="truncate text-[12px] text-slate-500 dark:text-slate-400">{progress.where || 'Starting…'}</p>
          {!asking && (
            <button
              type="button"
              onClick={() => setAsking(true)}
              className="mt-1 text-[12.5px] font-medium text-slate-600 underline-offset-2 hover:text-orange-700 hover:underline dark:text-slate-300 dark:hover:text-orange-400"
            >
              Stop
            </button>
          )}
        </div>
      </div>
      {asking && (
        <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label="Stop reading your folder">
          <span className="mr-1 text-[13px] font-medium text-slate-800 dark:text-slate-100">Stop and…</span>
          <button
            type="button"
            onClick={onKeep}
            className="rounded-full bg-gradient-to-br from-[#FE8C01] to-[#E05504] px-4 py-1.5 text-[13px] font-semibold text-white shadow-sm transition hover:brightness-105"
          >
            {progress.added > 0 ? `Keep ${plural(progress.added, 'track')}` : 'Keep what’s read'}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-full border border-red-300 px-4 py-1.5 text-[13px] font-medium text-red-700 transition hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={() => setAsking(false)}
            className="px-2 py-1.5 text-[12.5px] text-slate-500 underline-offset-2 hover:underline dark:text-slate-400"
          >
            Carry on
          </button>
        </div>
      )}
    </div>
  )
}
