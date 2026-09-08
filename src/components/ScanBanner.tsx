import { useRef } from 'react'
import { DropRing } from '@unisim/sdk'
import { plural } from '../lib/format'
import { useLibraryStore } from '../stores/libraryStore'

// Live scan progress, and the two things a scan has to say afterwards: the
// formats it had to refuse, and whether the folder needs its permission back.

export default function ScanBanner({ showRefusals = true }: { showRefusals?: boolean }) {
  const progress = useLibraryStore((s) => s.progress)
  const refusals = useLibraryStore((s) => s.refusals)
  const needsRegrant = useLibraryStore((s) => s.needsRegrant)
  const regrant = useLibraryStore((s) => s.regrant)
  const rescan = useLibraryStore((s) => s.rescan)
  const stopScan = useLibraryStore((s) => s.stopScan)
  const stoppedEarly = useLibraryStore((s) => s.stoppedEarly)
  const addFiles = useLibraryStore((s) => s.addFiles)
  const roots = useLibraryStore((s) => s.roots)
  const folderInput = useRef<HTMLInputElement>(null)

  // A stored handle is the ONLY thing that makes a folder reopenable — not the
  // browser's capabilities in general, since a library built by picking files
  // has no handle even on Chromium.
  const canReopen = !!roots[0]?.handle

  return (
    <>
      {progress && !progress.done && (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-[13px] text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          <DropRing size={34} motion="busy" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-slate-900 dark:text-slate-100">
              Reading your folder — {plural(progress.added, 'track')} so far
            </p>
            {/* The folder currently being walked. Honest and specific beats a
                percentage we cannot compute: nothing knows the total until the
                walk is finished, and a bar that fills to 90% and stops is worse
                than no bar. */}
            <p className="truncate text-[12px] text-slate-500 dark:text-slate-400">
              {progress.where || 'Starting…'}
            </p>
          </div>
          {/* ⚠️ "Stop", not "Cancel", and the difference is the whole point: it
              KEEPS everything found so far. A big library takes minutes, and
              somebody who realises halfway through that they pointed at their
              whole drive wants out with what they have — not a choice between
              waiting and starting again. Everything scanned is already in the
              store and in IndexedDB, so stopping just stops adding. */}
          <button
            type="button"
            onClick={stopScan}
            className="shrink-0 rounded-full border border-slate-300 px-4 py-1.5 text-[13px] font-medium text-slate-700 transition hover:border-orange-500 hover:text-orange-700 dark:border-slate-600 dark:text-slate-200 dark:hover:border-orange-500 dark:hover:text-orange-400"
          >
            {/* The count is live, so for the first moment of a scan it is
                genuinely zero — and "Stop and keep 0 tracks" is a strange thing
                to offer somebody. Say plain "Stop" until there is something to
                keep. */}
            {progress.added > 0 ? `Stop and keep ${plural(progress.added, 'track')}` : 'Stop'}
          </button>
        </div>
      )}

      {stoppedEarly && (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-[13px] text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          <p className="min-w-0 flex-1">
            Stopped early — everything found up to that point is in your library and
            plays normally. Scanning again reads the whole folder from the start.
          </p>
          <button
            type="button"
            onClick={() => void rescan()}
            className="shrink-0 rounded-full border border-slate-300 px-4 py-1.5 text-[13px] font-medium text-slate-700 transition hover:border-orange-500 hover:text-orange-700 dark:border-slate-600 dark:text-slate-200 dark:hover:border-orange-500 dark:hover:text-orange-400"
          >
            Scan the rest
          </button>
        </div>
      )}

      {needsRegrant && (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-orange-200 bg-orange-50 px-5 py-4 text-[13px] text-orange-900 dark:border-orange-900/50 dark:bg-orange-950/30 dark:text-orange-200">
          {/* ⚠️ Two different sentences, because there are two different
              situations and only one of them can be fixed by a click.

              With a stored directory handle (Chromium) the browser just wants
              the permission confirmed. WITHOUT one (Firefox, Safari, or a
              library added by picking files) there is nothing to re-grant —
              the folder has to be chosen again, and saying "allow access"
              there would be a button that cannot do what it says. */}
          {canReopen ? (
            <>
              <p className="min-w-0 flex-1">
                Your library is here, but the browser needs your permission again before it
                can read{' '}
                {roots[0]?.label ? <strong className="font-semibold">{roots[0].label}</strong> : 'the folder'}.
              </p>
              {/* ⚠️ This MUST be a click. A permission request with no user
                  gesture behind it is dropped silently, which presents as a
                  button that does nothing — so it can never move into an effect. */}
              <button
                type="button"
                onClick={() => void regrant()}
                className="shrink-0 rounded-full bg-gradient-to-br from-[#FE8C01] to-[#E05504] px-4 py-1.5 text-[13px] font-semibold text-white shadow-sm transition hover:brightness-105"
              >
                Allow access
              </button>
            </>
          ) : (
            <>
              <p className="min-w-0 flex-1">
                Your library and its artwork are still here, but this browser can’t reopen a
                folder on its own — choose{' '}
                {roots[0]?.label ? <strong className="font-semibold">{roots[0].label}</strong> : 'your music folder'}{' '}
                again to play anything. It will be quick: nothing has to be read twice.
              </p>
              <button
                type="button"
                onClick={() => folderInput.current?.click()}
                className="shrink-0 rounded-full bg-gradient-to-br from-[#FE8C01] to-[#E05504] px-4 py-1.5 text-[13px] font-semibold text-white shadow-sm transition hover:brightness-105"
              >
                Choose folder
              </button>
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
            </>
          )}
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
