import { folderAccess, shownRootLabel } from '../lib/roots'
import type { Root } from '../lib/types'
import { useMissingFile, type MissingFile } from '../lib/useMissingFile'
import { useLibraryStore } from '../stores/libraryStore'
import { usePlayerStore } from '../stores/playerStore'
import { useSettingsStore } from '../stores/settingsStore'
import FolderAccessButton from './FolderAccessButton'
import { isDesktopApp } from '../lib/host'
import { useT, type Translator } from '../i18n'

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
  const t = useT()
  const playerError = usePlayerStore((s) => s.error)
  const dismissPlayerError = usePlayerStore((s) => s.dismissError)
  const replayMissing = usePlayerStore((s) => s.replayMissing)
  const libraryError = useLibraryStore((s) => s.error)
  const dismissLibraryError = useLibraryStore((s) => s.dismissError)
  const missing = useMissingFile()

  // Settings › Messages › "Show error messages" (unticked by default).
  const hidden = useSettingsStore((s) => s.hideErrors)

  const error = playerError ?? libraryError
  if (!error || hidden) return null

  // Only the player's error is about a missing file; a library error that
  // happens to be showing alongside a stale `missingTrack` must not be
  // reworded into one.
  const said = playerError && missing?.root ? explain(t, missing, missing.root) : null

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
          {t('app.play_it')}
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
        {t('app.dismiss')}
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
  t: Translator,
  { track, folderLapsed, reachableNow }: MissingFile,
  root: Root,
): { text: string; action: 'folder' | 'play' | null } {
  // The song's and the folder's names go in as they are; the quotes round the
  // song are in each sentence, so a language can use its own.
  const vars = { title: track.title, folder: shownRootLabel(root.label) }
  // "the browser" or "the app" (the Windows app): a sentence each, never a word
  // dropped into one — see `lib/host.ts`.
  const desktop = isDesktopApp()

  // ⚠️ The Music library has no folder to reopen or rescan, so none of the
  // folder wording below is true of it. Its songs fail for two reasons only,
  // and the second is permanent: the song left the library, or it is an Apple
  // Music download — DRM-protected, and iOS gives no third-party player a copy.
  if (root.source === 'music-library') {
    return {
      text: t('app.missing_music_library', vars),
      action: null,
    }
  }

  if (reachableNow) {
    return { text: t('app.missing_back', vars), action: 'play' }
  }

  if (folderLapsed) {
    switch (folderAccess(root)) {
      case 'reopen':
        return {
          text: t(desktop ? 'app.missing_reopen_app' : 'app.missing_reopen_browser', vars),
          action: 'folder',
        }
      case 'choose':
        return {
          text: t(desktop ? 'app.missing_choose_app' : 'app.missing_choose_browser', vars),
          action: 'folder',
        }
      case 'rescan':
        return {
          text: t('app.missing_rescan', vars),
          action: 'folder',
        }
    }
  }

  return {
    text: t('app.missing_gone', vars),
    action: null,
  }
}
