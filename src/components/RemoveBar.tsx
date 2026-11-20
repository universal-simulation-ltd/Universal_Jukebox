import { SelectionBar, type ListSelection } from '@unisim/sdk'
import { useT } from '../i18n'
import { askFirst } from '../lib/selectSeveral'

/** What the ticked rows are, which is also what goes when they are removed. */
export type RemoveWhat = 'songs' | 'albums' | 'artists'

/**
 * The select-several bar for a list whose rows are REMOVED FROM JUKEBOX, never
 * deleted (`lib/selectSeveral.ts`, `lib/hidden.ts`): songs, albums and artists
 * on the website, and the phone screens' lists once a hold has ticked one.
 *
 * ⚠️ ONE PLACE FOR THE WORDS. The button says Remove selected, and the confirm asks "Remove 3 songs from Jukebox?"
 * and says the files stay put; every list that removes draws this bar rather
 * than its own `SelectionBar`, so they all say the same thing.
 *
 * `onRemove` gets the ticked ids, once the person has said yes:
 * `removeManyFromJukebox` for albums (ids) and artists (names), and
 * `removeSongsFromJukebox` for songs, whose key is the path, not the id.
 */
export default function RemoveBar({ sel, what, onRemove, className }: {
  sel: ListSelection
  what: RemoveWhat
  onRemove(ids: string[]): void
  className?: string
}) {
  const t = useT()
  const noun =
    what === 'songs'
      ? { one: t('library.noun_song'), other: t('library.noun_songs') }
      : what === 'albums'
        ? { one: t('library.noun_album'), other: t('library.noun_albums') }
        : { one: t('library.noun_artist'), other: t('library.noun_artists') }
  const question = what === 'songs' ? 'library.remove_songs' : what === 'albums' ? 'library.remove_albums' : 'library.remove_artists'
  return (
    <SelectionBar
      sel={sel}
      // "Remove selected", a secondary button: nothing is deleted (SDK 0.228.0).
      action="remove"
      noun={noun}
      onDelete={onRemove}
      confirm={(_, n) => askFirst(t.plural(question, n), t('library.remove_many_explain'), t('library.remove_yes'), false)}
      className={className}
    />
  )
}
