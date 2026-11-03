import { compareNumeric } from './collate'
import type { Track } from './types'

// No store behind it, so Siri's planner (`src/siri/planner.ts`) plays an album
// in exactly the order the page does. Re-exported by `stores/libraryStore.ts`.

/** Tracks in the order an album should play: disc, then track, then title. */
export function sortAlbumTracks(tracks: Track[]): Track[] {
  return [...tracks].sort((a, b) => {
    const disc = (a.discNo ?? 1) - (b.discNo ?? 1)
    if (disc !== 0) return disc
    const no = (a.trackNo ?? Number.MAX_SAFE_INTEGER) - (b.trackNo ?? Number.MAX_SAFE_INTEGER)
    if (no !== 0) return no
    // Untagged files fall through to filename order, which for a folder of
    // "01 ...", "02 ..." is the right order anyway.
    return compareNumeric(a.path, b.path)
  })
}
