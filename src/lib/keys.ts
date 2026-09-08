// The two identity functions the library is built on: what counts as the same
// FILE, and what counts as the same ALBUM.
//
// Both are pure, both are boring, and both are load-bearing in a way that is
// easy to miss:
//
//   • A track key that varies between two scans of an unchanged folder means
//     every rescan rebuilds the whole library and re-extracts every cover —
//     the difference between a rescan that takes a second and one that takes
//     four minutes.
//   • An album key that is too LOOSE merges two different records into one; too
//     STRICT and a compilation explodes into one album per guest vocalist,
//     which is the single most common complaint about every music player ever
//     written.
//
// They live in their own file, away from React and away from IndexedDB, so
// `scripts/selftest.mjs` can assert on them directly.

/** What we know about a file before its tags are read. */
export interface FileIdentity {
  path: string
  size: number
  mtime: number
}

/** The subset of tags that decides which album a track belongs to. */
export interface AlbumIdentity {
  album?: string
  albumArtist?: string
  artist?: string
}

/**
 * A stable id for one file.
 *
 * path + size + mtime, which is the same triple every incremental build system
 * uses and for the same reason: it is cheap (all three come from the directory
 * entry, with no read at all) and it changes exactly when the file's contents
 * might have.
 *
 * ⚠️ `path` is in there as well as size and mtime because two copies of the same
 * track in two folders are two library entries, not one. Dropping it makes a
 * duplicate silently overwrite the original, and the second folder's copy wins
 * at random.
 *
 * Not a hash of the audio: hashing 40 GB to find out nothing changed is the
 * exact cost this key exists to avoid.
 */
export function trackKey(file: FileIdentity): string {
  return join(file.path, String(file.size), String(file.mtime))
}

/**
 * A stable id for one album.
 *
 * Album artist first, track artist only as a fallback. That order is the whole
 * function: on a compilation every track has a different ARTIST and the same
 * ALBUMARTIST ("Various Artists"), so grouping by track artist turns one record
 * into fourteen. Tag writers have agreed on this field for twenty years
 * precisely because it is the only thing that makes compilations work.
 *
 * Case and surrounding whitespace are normalised because they vary between
 * rippers for the same record — "Kid A" and "kid a" are one album, and a
 * library that disagrees looks broken to the person who can see both.
 *
 * Deliberately NOT normalised: punctuation and accents. "Björk" and "Bjork"
 * stay separate. Folding them would need a table, the table would be wrong for
 * somebody, and a wrongly MERGED album cannot be told apart afterwards, whereas
 * a wrongly split one is visible and fixable in the tags.
 */
export function albumKey(tags: AlbumIdentity): string {
  const artist = norm(tags.albumArtist || tags.artist)
  const album = norm(tags.album)
  // A track with no album tag at all is not "the empty album" shared with every
  // other untagged file on the disk — see `UNKNOWN_ALBUM` below.
  return join(artist, album)
}

/**
 * Join key parts unambiguously.
 *
 * ⚠️ NOT `parts.join(' ')`, and the reason is a real collision rather than
 * tidiness: with a plain separator, album artist "a b" + album "c" and album
 * artist "a" + album "b c" produce the SAME key, and two different records
 * silently become one. A wrongly merged album cannot be told apart afterwards,
 * which is exactly the failure `albumKey` above says it is avoiding.
 *
 * Length-prefixing each part makes the key unambiguous for any input, while
 * staying printable. The first version of this used a NUL byte, which worked
 * and cost three things that were not worth it: the source file counted as
 * BINARY to git and grep, the id ended up in the URL as `%00`, and nothing in
 * between would have shown it was there.
 */
function join(...parts: string[]): string {
  return parts.map((p) => `${p.length}:${p}`).join('|')
}

function norm(text: string | undefined): string {
  return (text ?? '').trim().replace(/\s+/g, ' ').toLowerCase()
}

/**
 * The album key for a track with nothing to group it by.
 *
 * A folder of 400 loose untagged MP3s is a real thing people have, and the two
 * obvious handlings are both wrong: one album of 400 tracks called "" is a lie,
 * and 400 albums of one track each is unusable. This names the bucket, and the
 * UI shows it as "Unknown album" with the tracks in filename order — findable,
 * honestly labelled, and not pretending to be a record.
 */
export const UNKNOWN_ALBUM = albumKey({})

/** Is this track's album the unknown bucket? */
export function isUnknownAlbum(key: string): boolean {
  return key === UNKNOWN_ALBUM
}
