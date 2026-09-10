import { useMemo } from 'react'
import { rootOf } from './roots'
import type { Root, Track } from './types'
import { needAccessFrom, useLibraryStore } from '../stores/libraryStore'
import { usePlayerStore } from '../stores/playerStore'

// Why the track that would not play would not play — read LIVE, not stored.
//
// ⚠️ A deleted file and a folder whose permission has lapsed used to produce
// the identical message, and only one of them is fixable by the person reading
// it. The difference is whether the track's ROOT is reachable at all: with the
// folder's permission gone, nothing under it has a live file; with one file
// deleted, its neighbours still do. That is exactly what `needAccessFrom`
// already derives per root, so this asks it rather than keeping a second copy
// of the rule.
//
// ⚠️ DERIVED, so it follows the fix. The moment the folder is re-granted its
// files are back in `filesByPath`, `reachableNow` turns true, and the error can
// offer to play the track instead of still asking for a permission that has
// just been given. A stored "reason" would go on saying the old thing.
//
// ⚠️ Subscribed as pieces and memoised, never one selector returning a new
// object — the same trap `needAccessFrom`'s own header describes, which ends in
// "Maximum update depth exceeded".

export interface MissingFile {
  track: Track
  /** The folder it is filed under, when one can be found. */
  root: Root | undefined
  /** The whole folder is unreachable — it needs its permission (or a re-pick) back. */
  folderLapsed: boolean
  /** Its file is reachable again — the folder came back since the error. */
  reachableNow: boolean
}

export function useMissingFile(): MissingFile | null {
  const track = usePlayerStore((s) => s.missingTrack)
  const roots = useLibraryStore((s) => s.roots)
  const tracks = useLibraryStore((s) => s.tracks)
  const filesByPath = useLibraryStore((s) => s.filesByPath)

  return useMemo(() => {
    if (!track) return null
    const root = rootOf(roots, track.path)
    const stranded = root ? needAccessFrom(roots, tracks, filesByPath) : []
    return {
      track,
      root,
      folderLapsed: !!root && stranded.some((r) => r.id === root.id),
      reachableNow: filesByPath.has(track.path),
    }
  }, [track, roots, tracks, filesByPath])
}
