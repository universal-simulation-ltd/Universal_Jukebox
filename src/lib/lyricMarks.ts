// Which tracks and albums get the lyric-sheet mark (`components/LyricsMark.tsx`;
// James, 2026-10-20: "an icon on each album / track to show if there's lyrics
// available"). An album has it when any of its songs does.

import { useCallback, useMemo } from 'react'
import { useLibraryStore } from '../stores/libraryStore'
import { trackHasLyrics, useLyricRecords } from './lyricRecords'
import type { Track } from './types'

/** A test for one track — asked once per list, not per row. */
export function useLyricsCheck(): (track: Track) => boolean {
  const kept = useLyricRecords((s) => s.ids)
  return useCallback((track: Track) => trackHasLyrics(track, kept), [kept])
}

/** The albums with words for at least one song. */
export function useAlbumsWithLyrics(): ReadonlySet<string> {
  const tracks = useLibraryStore((s) => s.tracks)
  const kept = useLyricRecords((s) => s.ids)
  return useMemo(() => {
    const ids = new Set<string>()
    for (const track of tracks) if (trackHasLyrics(track, kept)) ids.add(track.albumId)
    return ids
  }, [tracks, kept])
}
