// HeldSheet.tsx — the sheet a held artist or album opens (`CollectionHold`):
// play, shuffle, queue or shelve all of it, then the pages it has.

import CollectionOptions, { type CollectionLink } from '../components/CollectionOptions'
import { byYearThenTitle } from '../lib/libraryView'
import { shownName } from '../lib/format'
import { navigate } from '../lib/route'
import type { Track } from '../lib/types'
import { sortAlbumTracks, useLibraryStore } from '../stores/libraryStore'
import { useT } from '../i18n'
import type { Held } from './CollectionHold'

export function HeldSheet({ held, onClose }: { held: Held; onClose(): void }) {
  const t = useT()
  const albums = useLibraryStore((s) => s.albums)
  const tracks = useLibraryStore((s) => s.tracks)

  if (held.kind === 'album') {
    const { album } = held
    const songs = sortAlbumTracks(tracks.filter((track) => track.albumId === album.id))
    const links: CollectionLink[] = [
      { label: t('library.open_album'), icon: '▤', go: () => navigate({ view: 'album', albumId: album.id }) },
    ]
    if (album.artist) {
      links.push({ label: t('library.go_to_artist', { artist: shownName(album.artist) }), icon: '♪', go: () => navigate({ view: 'artist', artist: album.artist }) })
    }
    return <CollectionOptions title={shownName(album.title)} subtitle={[shownName(album.artist), album.year].filter(Boolean).join(' · ')} tracks={songs} links={links} onClose={onClose} />
  }

  const { name } = held
  const theirs = albums.filter((a) => a.artist === name).sort(byYearThenTitle)
  const byAlbum = new Map(theirs.map((a) => [a.id, [] as Track[]]))
  for (const track of tracks) byAlbum.get(track.albumId)?.push(track)
  const songs = theirs.flatMap((a) => sortAlbumTracks(byAlbum.get(a.id) ?? []))
  const links: CollectionLink[] = [
    { label: t('library.view_albums'), icon: '▤', go: () => navigate({ view: 'artist', artist: name }) },
    { label: t('library.all_songs_by', { artist: shownName(name) }), icon: '♫', go: () => navigate({ view: 'artist', artist: name, songs: true }) },
  ]
  return <CollectionOptions title={shownName(name)} subtitle={t.plural('common.albums', theirs.length)} tracks={songs} links={links} onClose={onClose} />
}
