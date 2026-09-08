// Self-tests for the tag and cover-art reader — the half of this app that
// fails SILENTLY.
//
//   node scripts/selftest.mjs
//
// Node 24 strips the TypeScript types on import, so the source is tested
// directly with no build step (the same arrangement as Universal Converter's
// selftest, which this follows).
//
// ── Why the fixtures are not built here ──────────────────────────────────────
//
// Every file read below was written by **mutagen** — the tag library behind
// picard, beets and quodlibet — via `scripts/make-fixtures.py`, and the covers
// by Pillow. That is the whole point. A round-trip through our own writer
// proves that two halves of one misunderstanding agree with each other; it
// cannot tell you the misunderstanding is there. Converter's selftest opens
// with the same sentence for the same reason.
//
// The fixtures are committed, so this runs in CI with no Python.
//
// ── Why it matters more here than usual ──────────────────────────────────────
//
// A tag misread is not an exception. It is an album filed under the wrong
// artist, or a cover that decodes to 300 bytes of nothing and draws as an empty
// grey square — outcomes that look like "that file must not have any artwork"
// to everyone including the person who wrote the parser. There is no way to
// know this works other than to assert on known bytes.

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'

import { readTags } from '../src/lib/tags.ts'
import { albumKey, trackKey } from '../src/lib/keys.ts'

const HERE = dirname(fileURLToPath(import.meta.url))
const FIXTURES = join(HERE, '..', 'src', 'lib', '__fixtures__')

const read = (name) => new Uint8Array(readFileSync(join(FIXTURES, name)))

let checks = 0
function check(what, fn) {
  fn()
  checks++
  console.log(`  ✓ ${what}`)
}

function sameBytes(a, b) {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

// The values make-fixtures.py wrote. ALBUM_ARTIST differs from ARTIST on
// purpose: it is what a compilation groups by, and conflating the two is how
// one album becomes eleven.
const TITLE = 'Needle Drop'
const ARTIST = 'The Tone Arms'
const ALBUM_ARTIST = 'Various Artists'
const ALBUM = 'Sides A and B'
const GENRE = 'Shoegaze'

const JPEG = read('cover.jpg')
const PNG = read('cover.png')

console.log('\nID3v2 — MP3')

for (const [name, label] of [['id3v23.mp3', 'v2.3'], ['id3v24.mp3', 'v2.4']]) {
  const t = readTags(read(name), true)
  check(`${label}: every text field`, () => {
    assert.equal(t.title, TITLE)
    assert.equal(t.artist, ARTIST)
    assert.equal(t.albumArtist, ALBUM_ARTIST)
    assert.equal(t.album, ALBUM)
    assert.equal(t.genre, GENRE)
  })
  // v2.3 and v2.4 encode frame sizes differently — v2.4's are synchsafe. Read
  // the wrong one and the walk lands mid-frame and stops, which shows up as
  // "only the first tag was found". Asserting the LAST field in the block is
  // what catches that; asserting the title alone would pass either way.
  check(`${label}: "7/12" is track 7, "2/2" is disc 2`, () => {
    assert.equal(t.trackNo, 7)
    assert.equal(t.discNo, 2)
  })
  check(`${label}: the year is a number, not a date string`, () => {
    assert.equal(t.year, 1997)
  })
  check(`${label}: the cover is the exact JPEG that went in`, () => {
    assert.ok(t.picture, 'no picture found')
    assert.equal(t.picture.mime, 'image/jpeg')
    assert.ok(sameBytes(t.picture.bytes, JPEG),
      `cover differs: got ${t.picture.bytes.length} bytes, wrote ${JPEG.length}`)
  })
}

// ⚠️ The one that catches the classic APIC bug. A UTF-16 description ends with
// a DOUBLE NUL on an even boundary; a reader scanning for a single zero byte
// stops inside the first character, and the image data then starts at the wrong
// offset. The failure is a cover that "exists" and draws as nothing.
check('UTF-16 description: the double NUL is honoured, cover intact', () => {
  const t = readTags(read('id3v23-utf16.mp3'), true)
  assert.equal(t.title, TITLE)
  assert.equal(t.artist, ARTIST)
  assert.ok(t.picture, 'no picture found')
  assert.equal(t.picture.mime, 'image/png')
  assert.ok(sameBytes(t.picture.bytes, PNG),
    `cover differs: got ${t.picture.bytes.length} bytes, wrote ${PNG.length}`)
})

console.log('\nVorbis comments + PICTURE block — FLAC')

{
  const t = readTags(read('vorbis.flac'), true)
  check('every text field', () => {
    assert.equal(t.title, TITLE)
    assert.equal(t.artist, ARTIST)
    assert.equal(t.albumArtist, ALBUM_ARTIST)
    assert.equal(t.album, ALBUM)
    assert.equal(t.genre, GENRE)
    assert.equal(t.trackNo, 7)
    assert.equal(t.discNo, 2)
  })
  // The fixture's DATE is "1997-08-04", so this also proves the year is pulled
  // out of a real date rather than parsed as an integer and truncated.
  check('a full DATE yields the year alone', () => {
    assert.equal(t.year, 1997)
  })
  check('the PICTURE block is the exact PNG that went in', () => {
    assert.ok(t.picture, 'no picture found')
    assert.equal(t.picture.mime, 'image/png')
    assert.ok(sameBytes(t.picture.bytes, PNG),
      `cover differs: got ${t.picture.bytes.length} bytes, wrote ${PNG.length}`)
  })
}

console.log('\nMP4 ilst — M4A')

{
  const t = readTags(read('mp4.m4a'), true)
  check('every text field', () => {
    assert.equal(t.title, TITLE)
    assert.equal(t.artist, ARTIST)
    assert.equal(t.albumArtist, ALBUM_ARTIST)
    assert.equal(t.album, ALBUM)
    assert.equal(t.genre, GENRE)
    assert.equal(t.year, 1997)
  })
  // trkn and disk are BINARY atoms, not text: 16-bit words [0, index, total, 0].
  // Decoding them as UTF-8 gives control characters, which is how a track number
  // silently becomes undefined on every M4A in a library.
  check('trkn/disk are read as binary, not text', () => {
    assert.equal(t.trackNo, 7)
    assert.equal(t.discNo, 2)
  })
  check('covr is the exact JPEG that went in', () => {
    assert.ok(t.picture, 'no picture found')
    assert.equal(t.picture.mime, 'image/jpeg')
    assert.ok(sameBytes(t.picture.bytes, JPEG),
      `cover differs: got ${t.picture.bytes.length} bytes, wrote ${JPEG.length}`)
  })
}

console.log('\nThe cases that must not throw')

check('a file with no tag block at all returns {}', () => {
  const t = readTags(read('untagged.mp3'), true)
  assert.equal(t.title, undefined)
  assert.equal(t.picture, undefined)
})

check('random bytes return {} rather than throwing', () => {
  const junk = new Uint8Array(4096)
  for (let i = 0; i < junk.length; i++) junk[i] = (i * 37) & 0xff
  assert.deepEqual(readTags(junk, true), {})
})

check('an empty file returns {}', () => {
  assert.deepEqual(readTags(new Uint8Array(0), true), {})
})

// A truncated read is the NORMAL case, not an edge case: scan.ts hands this
// parser the first ~256 KB of a 40 MB file. Every walk has to stop at the end of
// the slice instead of running off it.
check('a truncated file stops cleanly at the end of the slice', () => {
  for (const name of ['id3v23.mp3', 'vorbis.flac', 'mp4.m4a']) {
    const full = read(name)
    for (const cut of [64, 200, 512, 1024]) {
      const t = readTags(full.subarray(0, cut), true)
      assert.equal(typeof t, 'object', `${name} @${cut} did not return an object`)
    }
  }
})

check('wantArt=false skips the picture but keeps the text', () => {
  const t = readTags(read('id3v23.mp3'), false)
  assert.equal(t.title, TITLE)
  assert.equal(t.picture, undefined)
})

console.log('\nLibrary keys')

// The keys decide what counts as "the same album" and "the same file". Both are
// pure string functions and both are load-bearing: a key that varies between two
// scans rebuilds the whole library, and one that collides merges two albums.
check('albumKey groups by album ARTIST, not track artist', () => {
  const a = albumKey({ album: ALBUM, albumArtist: ALBUM_ARTIST, artist: 'Guest One' })
  const b = albumKey({ album: ALBUM, albumArtist: ALBUM_ARTIST, artist: 'Guest Two' })
  assert.equal(a, b, 'two tracks on one compilation produced two albums')
})

check('albumKey ignores case and surrounding space', () => {
  assert.equal(albumKey({ album: 'Kid A', albumArtist: 'Radiohead' }),
               albumKey({ album: ' kid a ', albumArtist: 'RADIOHEAD' }))
})

check('albumKey separates two albums of the same name by different artists', () => {
  assert.notEqual(albumKey({ album: 'Greatest Hits', albumArtist: 'A' }),
                  albumKey({ album: 'Greatest Hits', albumArtist: 'B' }))
})

check('albumKey falls back to the track artist when there is no album artist', () => {
  assert.equal(albumKey({ album: ALBUM, artist: ARTIST }),
               albumKey({ album: ALBUM, albumArtist: ARTIST }))
})

// ⚠️ The collision a naive separator produces. With parts joined by a space,
// album artist "a b" + album "c" and album artist "a" + album "b c" are the same
// string — two different records silently become one, which is the one failure
// mode `albumKey` cannot recover from afterwards. Found by the id turning up in
// a URL as %00 (the first fix was a NUL separator, which worked and made the
// source a binary file); kept because the collision is the real point.
check('albumKey cannot be made to collide by moving a space', () => {
  assert.notEqual(albumKey({ albumArtist: 'a b', album: 'c' }),
                  albumKey({ albumArtist: 'a', album: 'b c' }))
  assert.notEqual(albumKey({ albumArtist: 'The Best', album: 'Of Times' }),
                  albumKey({ albumArtist: 'The', album: 'Best Of Times' }))
})

check('keys are printable — no control characters in an id that reaches a URL', () => {
  const key = albumKey({ albumArtist: 'Hollow Coast', album: 'Unsleeved' })
  assert.ok(!/[ -]/.test(key), `control character in ${JSON.stringify(key)}`)
  assert.equal(key, decodeURIComponent(encodeURIComponent(key)))
})

check('trackKey is stable across scans and unique per file', () => {
  const f = { path: 'Music/a.mp3', size: 4_011_233, mtime: 1_725_000_000_000 }
  assert.equal(trackKey(f), trackKey({ ...f }))
  assert.notEqual(trackKey(f), trackKey({ ...f, size: f.size + 1 }))
  assert.notEqual(trackKey(f), trackKey({ ...f, path: 'Music/b.mp3' }))
  assert.notEqual(trackKey(f), trackKey({ ...f, mtime: f.mtime + 1000 }))
})

console.log(`\n${checks} checks passed.\n`)
