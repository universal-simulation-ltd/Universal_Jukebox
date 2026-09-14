import type { Album, Root, SourceFile, Track } from './types'

// More than one music folder, and the arithmetic that makes it safe.
//
// ⚠️ THE PATH COLLISION IS THE WHOLE REASON THIS FILE EXISTS, and it had to be
// fixed before a second folder could be allowed at all.
//
// `trackKey` is path + size + mtime, and until 2026-09-09 the paths a scan
// produced were relative to the chosen folder with nothing in front of them.
// Two folders both holding `Nick Cave/Let Love In/01 Do You Love Me.mp3` — an
// original and a backup, a NAS and a laptop copy — therefore produced the SAME
// track id and the same `filesByPath` key. One silently overwrote the other,
// and which one won depended on the order the scans finished in. With one
// folder that could never happen; with two it happens on the first day.
//
// So every path now carries its root's name: `Music/Nick Cave/…`. That is the
// shape `webkitRelativePath` has always had on the Firefox/Safari path, so the
// two walkers agree for the first time as well.
//
// ⚠️ THE PREFIX IS THE ROOT'S IDENTITY. `Root.prefix` is both what the user sees
// in the folder list and what every one of its tracks is filed under, which is
// what makes "remove this folder" a one-line filter rather than a bookkeeping
// exercise. It follows that prefixes must be unique, and `uniqueLabel` below is
// what guarantees it.
//
// ⚠️ COST, PAID ONCE: track ids change shape, so a stored `album` fix from the
// tidy-up (which is keyed by track id) no longer matches its track and is
// dropped. `applyFixes` already ignores fixes it cannot place, so nothing
// breaks — a person who had merged some tracks by hand has to do it again.
// Cover fixes are keyed by album id, which is derived from tags and unaffected.

/** A root with no prefix at all: everything in the library belongs to it. */
const LEGACY = ''

/**
 * The prefix a stored root files its tracks under.
 *
 * ⚠️ A root written before multi-folder has no `prefix` field, and its tracks
 * have unprefixed paths — so its prefix is the empty string, which `pathUnder`
 * reads as "everything". That is exactly right for the single-root library it
 * came from, and it self-heals: the next scan of that folder writes prefixed
 * paths and a prefix to go with them.
 */
export function prefixOf(root: Root): string {
  return root.prefix ?? LEGACY
}

/** Is this track filed under this prefix? */
export function pathUnder(path: string, prefix: string): boolean {
  if (prefix === LEGACY) return true
  return path === prefix || path.startsWith(`${prefix}/`)
}

/**
 * A folder name that is not already taken.
 *
 * ⚠️ Two folders called "Music" would file their tracks under the same prefix,
 * which is the collision this whole file exists to prevent — one level up from
 * where it was. The second becomes "Music (2)".
 *
 * ⚠️ A NAME MATCH IS TWO FOLDERS, AND BOTH ARE KEPT (James, 2026-09-13). Two
 * folders can share a name without being the same folder — a laptop's "Music"
 * and a USB stick's "Music" — and a name is all the web's pickers give back, so
 * "same name, so refresh that one" would quietly swap one library for the other.
 * The second is added as "Music (2)", in the browser and in the phone apps alike.
 * The one exception is a folder KNOWN to be the same: the phone apps can tell,
 * because a chosen folder has a stable uri (`planNativePick` below), and the
 * web's "Choose folder" for a stranded root asks for that root by name
 * (`isFolderNamed`). Both of those pass the root's id, and so never reach here.
 */
export function uniqueLabel(name: string, taken: string[]): string {
  const trimmed = name.trim() || 'Folder'
  if (!taken.includes(trimmed)) return trimmed
  for (let n = 2; n < 500; n++) {
    const candidate = `${trimmed} (${n})`
    if (!taken.includes(candidate)) return candidate
  }
  return `${trimmed} (${Date.now()})`
}

export interface Library {
  tracks: Track[]
  albums: Album[]
}

/**
 * Fold a freshly scanned root into the library that is already there.
 *
 * ⚠️ It DROPS that root's own tracks first. Re-scanning a folder has to be a
 * replacement of that folder and nothing else: without this, a rescan after
 * deleting an album leaves the deleted album in the library forever, and a
 * rescan after renaming a file leaves both names.
 *
 * ⚠️ Albums are unioned by id and their counts RECOMPUTED, never added up. An
 * album id comes from the tags, so the same record in two folders is one album
 * with tracks from both — and a count carried over from either scan would be
 * half the truth. An album left with no tracks at all (its folder was removed)
 * is dropped, because an empty album is a permanently blank tile.
 */
export function addScan(existing: Library, prefix: string, scanned: Library): Library {
  const kept = existing.tracks.filter((t) => !pathUnder(t.path, prefix))
  const tracks = [...kept, ...scanned.tracks]

  const byId = new Map<string, Album>()
  // Existing first, then scanned — so a newly scanned album's artwork wins for
  // a record that is in both. The new scan is the one that just read the files.
  for (const album of existing.albums) byId.set(album.id, album)
  for (const album of scanned.albums) {
    const before = byId.get(album.id)
    byId.set(album.id, before?.cover && !album.cover ? { ...album, cover: before.cover } : album)
  }

  return { tracks, albums: withCounts(tracks, [...byId.values()]) }
}

/** Everything except one root — "remove this folder". */
export function removeRoot(existing: Library, prefix: string): Library {
  const tracks = existing.tracks.filter((t) => !pathUnder(t.path, prefix))
  return { tracks, albums: withCounts(tracks, existing.albums) }
}

/**
 * Recompute every album's track count from the tracks, and drop the empties.
 *
 * The one place counts are decided, because getting this wrong is invisible
 * until somebody notices an album claiming twelve tracks and listing four.
 */
function withCounts(tracks: Track[], albums: Album[]): Album[] {
  const counts = new Map<string, number>()
  for (const track of tracks) counts.set(track.albumId, (counts.get(track.albumId) ?? 0) + 1)
  return albums
    .filter((album) => (counts.get(album.id) ?? 0) > 0)
    .map((album) => ({ ...album, trackCount: counts.get(album.id) ?? 0 }))
}

/**
 * Which roots cannot currently be played, and so need their folder back.
 *
 * ⚠️ Asked per ROOT rather than once for the library, because with several
 * folders the answer genuinely differs between them: after a reload none of
 * them has live files; after adding a second folder to a session, only the
 * first one does. A banner that says "your library needs permission" when one
 * of three folders does is telling the truth in a way nobody can act on.
 *
 * A root with no tracks at all is not "unreachable" — it is empty, and asking
 * for permission to an empty folder helps nobody.
 */
export function rootsNeedingAccess(
  roots: Root[],
  tracks: Track[],
  filesByPath: Map<string, SourceFile>,
  isGenerated: (root: Root) => boolean,
): Root[] {
  return roots.filter((root) => {
    if (isGenerated(root)) return false
    const prefix = prefixOf(root)
    const mine = tracks.filter((t) => pathUnder(t.path, prefix))
    if (mine.length === 0) return false
    return !mine.some((t) => filesByPath.has(t.path))
  })
}

/**
 * The root a track is filed under.
 *
 * ⚠️ The LONGEST matching prefix, not the first. A legacy root (prefix "")
 * matches every path, so taking the first hit would hand a track in `Music (2)`
 * to whichever root happened to be listed first — and the error that asks for a
 * folder back would then ask for the wrong one.
 */
export function rootOf(roots: Root[], path: string): Root | undefined {
  let best: Root | undefined
  let bestLength = -1
  for (const root of roots) {
    const prefix = prefixOf(root)
    if (!pathUnder(path, prefix)) continue
    if (prefix.length > bestLength) {
      best = root
      bestLength = prefix.length
    }
  }
  return best
}

/**
 * What it takes to get an unreachable folder back, which decides both the
 * button offered and the sentence beside it.
 *
 * - `reopen`  — a stored directory handle: ask the browser for permission again.
 * - `choose`  — no handle (Firefox, Safari, or a library built from picked
 *               files): the folder has to be chosen again with the picker.
 * - `rescan`  — the native app's folder: nothing to grant, so read it again.
 *
 * ⚠️ Native is checked FIRST. A native root has no `handle` either, so without
 * that order it falls into `choose` — whose button opens a `webkitdirectory`
 * picker that iOS ignores.
 */
export type FolderAccess = 'reopen' | 'choose' | 'rescan'

/**
 * Is `name` — the folder somebody just picked — this root's folder?
 *
 * ⚠️ The ONLY identity a re-picked folder has on the `choose` path is its name:
 * `webkitdirectory` hands back files, not a handle that could be compared. A
 * root's label is that name, or that name with a " (2)" on it where two folders
 * shared one. Anything else means somebody picked a different folder in answer
 * to "choose TestMusic again", and that one must be ADDED, not filed under
 * TestMusic's prefix.
 */
export function isFolderNamed(root: Root, name: string): boolean {
  const label = prefixOf(root) || root.label
  if (label === name) return true
  return label.startsWith(`${name} (`) && /^ \(\d+\)$/.test(label.slice(name.length))
}

export function folderAccess(root: Root): FolderAccess {
  if (root.nativePath != null) return 'rescan'
  return root.handle ? 'reopen' : 'choose'
}

/** How many tracks a root actually has in the library right now. */
export function trackCountFor(tracks: Track[], root: Root): number {
  const prefix = prefixOf(root)
  return tracks.reduce((n, t) => (pathUnder(t.path, prefix) ? n + 1 : n), 0)
}

// ── The phone apps' folders ──────────────────────────────────────────────────
//
// ⚠️ THERE CAN BE SEVERAL NATIVE ROOTS TOO (2026-09-14). Until then the phone
// apps had exactly one — `nativePath` marked THE native root, and choosing a
// second folder replaced the first. Now every native root is its own folder,
// filed under its own prefix exactly like a browser folder, and `nativePath` is
// where that one root is walked:
//
//   - `''` — the app's OWN folder (iOS's Documents, "Universal Jukebox" in the
//     Files app). There is at most one root with it: it is one folder.
//   - anything else — a CHOSEN folder's uri (an iOS security-scoped bookmark's
//     key, an Android tree uri). The plugin holds ONE GRANT PER URI, so two
//     roots must never share one: removing either would give back the grant the
//     other still reads. `planNativePick` is what keeps them unique.
//
// ⚠️ NOTHING TO MIGRATE. A library stored by the one-folder build is one root
// with a prefix and a `nativePath` — exactly the shape a root has now — and the
// plugins already kept their grants keyed by that uri. It is simply root #1.

/** The roots the phone app walks — its own folder and every chosen one. */
export function nativeRoots(roots: Root[]): Root[] {
  return roots.filter((r) => r.nativePath != null)
}

/**
 * What picking `picked` in the phone's folder picker should do to the library.
 *
 * - `rescan` — that exact folder is already a root (the same uri). Read it
 *   again; never file it twice. Unlike the web, the phone CAN tell, so here a
 *   re-pick of the same folder is not a guess.
 * - `refile` — the folder somebody was asked to choose again (`intoRootId`, a
 *   chosen folder that can no longer be read), and it carries that root's
 *   name. It takes over that root — same prefix, so every track id is kept —
 *   and the old uri's grant can go.
 * - `add` — anything else, a same-named folder included: a new root, named
 *   "Music (2)" if "Music" is taken (see `uniqueLabel`). A folder picked in
 *   answer to "choose Music again" that is NOT called Music is added too, and
 *   the stranded one stays as it was, which is what the web's `addFiles` does.
 */
export type NativePick =
  | { kind: 'rescan'; root: Root }
  | { kind: 'refile'; root: Root }
  | { kind: 'add' }

export function planNativePick(
  roots: Root[],
  picked: { uri: string; name: string },
  intoRootId?: string,
): NativePick {
  const same = roots.find((r) => r.nativePath === picked.uri)
  if (same) return { kind: 'rescan', root: same }
  const into = intoRootId ? roots.find((r) => r.id === intoRootId) : undefined
  // Only a CHOSEN folder is ever re-chosen: the app's own ('') cannot be lost.
  if (into?.nativePath && isFolderNamed(into, picked.name)) return { kind: 'refile', root: into }
  return { kind: 'add' }
}

/**
 * Which of `uris` no root reads any more — the folder grants to give back.
 *
 * ⚠️ Asked AFTER the library has changed, of the roots as they now are, rather
 * than worked out beforehand. That one rule covers every way a grant becomes
 * unused: a folder removed, a lost folder re-pointed at its new uri, a new
 * folder that turned out to hold no music, and a scan thrown away by "Delete"
 * part-way through. `''` is the app's own folder and has no grant.
 */
export function unusedGrants(roots: Root[], uris: (string | null | undefined)[]): string[] {
  const inUse = new Set(roots.map((r) => r.nativePath).filter((p): p is string => !!p))
  return [...new Set(uris.filter((u): u is string => !!u && !inUse.has(u)))]
}
