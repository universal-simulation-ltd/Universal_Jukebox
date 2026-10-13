import { useState } from 'react'
import { useT } from '../i18n'
import type { HiddenKind } from '../lib/hidden'
import { removeFromJukebox } from '../lib/removeFromJukebox'

/**
 * "Remove from Jukebox", the last row of every long-press sheet (`TrackOptions`,
 * `CollectionOptions`; `lib/hidden.ts`).
 *
 * ⚠️ IT ASKS FIRST, ON THE SPOT, and says that nothing is deleted and where it
 * comes back from. A long press is easy to land by accident, and a song that
 * vanished with no word about how to get it back would read as lost music.
 */
export default function RemoveRow({ kind, keyOf, name, rowClass, onDone }: {
  kind: HiddenKind
  /** The hidden list's key: a track's path, an album's id, an artist's name. */
  keyOf: string
  /** What the question names. */
  name: string
  rowClass: string
  /** Called once it is removed — the sheet says so and closes. */
  onDone(said: string): void
}) {
  const t = useT()
  const [asking, setAsking] = useState(false)
  if (!asking) {
    return (
      <button type="button" className={rowClass} onClick={() => setAsking(true)}>
        <span className="w-5 text-center text-red-600 dark:text-red-400">⊘</span>
        <span className="text-red-700 dark:text-red-400">{t('library.remove_from_jukebox')}</span>
      </button>
    )
  }
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-3 dark:bg-slate-800/60" role="group" aria-label={t('library.remove_from_jukebox')}>
      <p className="text-[14.5px] font-semibold text-slate-900 dark:text-slate-100">{t('library.remove_confirm', { name })}</p>
      <p className="mt-1 text-[12.5px] leading-relaxed text-slate-600 dark:text-slate-300">{t('library.remove_explain')}</p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => {
            removeFromJukebox(kind, keyOf)
            onDone(t('library.removed'))
          }}
          className="rounded-full bg-red-600 px-4 py-1.5 text-[13.5px] font-semibold text-white hover:bg-red-700"
        >
          {t('library.remove_yes')}
        </button>
        <button
          type="button"
          onClick={() => setAsking(false)}
          className="rounded-full border border-slate-300 px-4 py-1.5 text-[13.5px] font-medium text-slate-700 dark:border-slate-600 dark:text-slate-200"
        >
          {t('common.cancel')}
        </button>
      </div>
    </div>
  )
}
