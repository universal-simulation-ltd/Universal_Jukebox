import { folderAccess } from '../lib/roots'
import type { Root } from '../lib/types'
import { useMissingFile, type MissingFile } from '../lib/useMissingFile'
import { useLibraryStore } from '../stores/libraryStore'
import { usePlayerStore } from '../stores/playerStore'
import FolderAccessButton from './FolderAccessButton'

// The one error slot at the top of every page — and, when a track would not
// play because its file could not be found, the way back.
//
// ⚠️ A DELETED FILE AND A LAPSED FOLDER MUST NOT READ ALIKE. They used to: the
// same "that file isn't reachable any more" for both, when only one of them is
// fixable by the person reading it. `useMissingFile` tells them apart from the
// library itself — a folder with no live files at all has lost its permission;
// a folder whose other files are fine has lost this one — and only the first
// gets a button, because only the first has something to press.
//
// ⚠️ THAT FOLDER'S OWN BUTTON, never "reconnect everything". It is the same
// per-folder `FolderAccessButton` the permission banner uses, and the banner
// drops that folder's row while this error is up, so one folder never has two
// buttons stacked on top of each other. See `FolderAccessButton` for why one
// button must never loop over several folders.

export default function ErrorBanner() {
  const playerError = usePlayerStore((s) => s.error)
  const dismissPlayerError = usePlayerStore((s) => s.dismissError)
  const replayMissing = usePlayerStore((s) => s.replayMissing)
  const libraryError = useLibraryStore((s) => s.error)
  const dismissLibraryError = useLibraryStore((s) => s.dismissError)
  const missing = useMissingFile()

  const error = playerError ?? libraryError
  if (!error) return null

  // Only the player's error is about a missing file; a library error that
  // happens to be showing alongside a stale `missingTrack` must not be
  // reworded into one.
  const said = playerError && missing?.root ? explain(missing, missing.root) : null

  return (
    <div
      role="alert"
      className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-red-50 px-5 py-4 text-[13px] leading-relaxed text-red-900 dark:bg-red-950/40 dark:text-red-200"
    >
      <p className="min-w-0 flex-1 basis-64">{said?.text ?? error}</p>
      {said?.action === 'folder' && missing?.root && <FolderAccessButton root={missing.root} />}
      {said?.action === 'play' && (
        <button
          type="button"
          onClick={(e) => {
            // The same reason as the transport's play button: this click must
            // not bubble up and skip the ceremony it is about to start.
            e.stopPropagation()
            replayMissing()
          }}
          className="shrink-0 rounded-full bg-gradient-to-br from-[#FE8C01] to-[#E05504] px-4 py-1.5 text-[13px] font-semibold text-white shadow-sm transition hover:brightness-105"
        >
          Play it
        </button>
      )}
      <button
        type="button"
        onClick={() => {
          dismissPlayerError()
          dismissLibraryError()
        }}
        className="shrink-0 font-medium underline-offset-2 hover:underline"
      >
        Dismiss
      </button>
    </div>
  )
}

/**
 * What to say about a track whose file was not there, and what to offer.
 *
 * Three cases, and they are the whole feature: the folder came back (play it),
 * the folder lapsed (that folder's button), or the file itself went (nothing to
 * press — the rest of the folder is fine, which is worth saying).
 */
function explain(
  { track, folderLapsed, reachableNow }: MissingFile,
  root: Root,
): { text: string; action: 'folder' | 'play' | null } {
  const name = `“${track.title}”`
  const folder = root.label

  if (reachableNow) {
    return { text: `${folder} is back, and ${name} with it.`, action: 'play' }
  }

  if (folderLapsed) {
    switch (folderAccess(root)) {
      case 'reopen':
        return {
          text: `${name} is in ${folder}, and the browser needs your permission again before anything in that folder can play. Nothing was lost.`,
          action: 'folder',
        }
      case 'choose':
        return {
          text: `${name} is in ${folder}, which this browser can’t reopen on its own — choose the folder again and it will play. Nothing has to be read twice.`,
          action: 'folder',
        }
      case 'rescan':
        return {
          text: `${name} is listed under ${folder}, but nothing in that folder can be found any more. Rescanning brings the library back in line with what’s there.`,
          action: 'folder',
        }
    }
  }

  return {
    text: `${name} isn’t in ${folder} any more — it was moved, renamed or deleted since the folder was last read. Everything else in ${folder} still plays.`,
    action: null,
  }
}
