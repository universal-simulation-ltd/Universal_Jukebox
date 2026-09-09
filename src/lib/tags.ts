// Reading the tags — and the embedded cover art — out of a music file.
//
// ⚠️ THIS FILE IS A PORT, AND ITS TWIN IS
//    Universal_Apps/Universal_Converter/src/lib/tags.ts
//
// Converter's copy is the original: it reads title/artist/album so they survive
// a conversion, and it also writes ID3v2.3. This copy drops the writing (Jukebox
// never edits a file — see the refusals in README) and adds everything a LIBRARY
// needs that a converter doesn't: cover art, track and disc numbers, year, genre,
// the album artist, and the LYRICS the file was tagged with.
//
// The rule-of-two says copy and the rule-of-three says extract. This is the
// second consumer, so it is a copy — but it is a copy with its eyes open, and
// the failure it is copying towards has a name in this suite:
// `qr-design-port-drift`. Universal PDF took a hand copy of Universal QR's
// design model and a later change there rendered a DIFFERENT PICTURE here
// rather than raising an error. The same shape of bug is available: if
// Converter's ID3 frame walk gains a fix for some malformed tag and this one
// doesn't, Jukebox shows the wrong artist and nothing anywhere fails.
//
// So: **when a third app wants tags, extract this into `@unisim/media`** rather
// than taking a third copy. Until then, a change to the parsing in either file
// should be applied to both, and Converter's copy carries the mirror-image note.
//
// Everything here is byte-level and pure — `Uint8Array` in, plain objects out,
// no DOM, no `Image`, no canvas. That is what lets `scripts/selftest.mjs`
// exercise it in Node without a browser, and it is deliberate: a cover that
// decodes to the wrong bytes is a missing picture rather than an exception, so
// the only way to know it works is a test that reads known bytes back out.

export interface Tags {
  title?: string
  artist?: string
  /** The ALBUM artist, which is what a library groups by — see `albumKey`. */
  albumArtist?: string
  album?: string
  trackNo?: number
  discNo?: number
  year?: number
  genre?: string
}

/** An embedded picture, exactly as it sat in the file. */
export interface Picture {
  mime: string
  bytes: Uint8Array
}

export interface TagsAndArt extends Tags {
  picture?: Picture
  /**
   * The lyric sheet the file was tagged with, exactly as it was stored — which
   * may be plain text or may be LRC, with a timestamp at the head of each line.
   * `lib/lyrics.ts` is what tells the two apart; this file only fetches bytes.
   *
   * ⚠️ NOT part of `Tags`, and never read during a scan. A lyric sheet is a few
   * kilobytes of text, so a 5,000-track library that carried one per `Track`
   * would hold ~15 MB of strings in the store and write them all to IndexedDB —
   * for text that is only ever looked at one track at a time. It is read on
   * demand for the track on the deck instead, which is one range read when
   * somebody opens the panel. Same reasoning as `wantArt`, same shape.
   */
  lyrics?: string
}

export function hasTags(tags: Tags): boolean {
  return Boolean(tags.title || tags.artist || tags.album)
}

// ── The entry point ──────────────────────────────────────────────────────────

/**
 * Pull tags (and the cover, if `wantArt`) out of whatever container this is.
 *
 * Deliberately forgiving: an unreadable or absent tag block returns `{}` rather
 * than throwing. In Converter that was so losing metadata could never fail a
 * conversion; here it is so one corrupt file in a folder of four thousand
 * cannot stop the scan. A file with no readable tags still becomes a track —
 * `scan.ts` falls back to the filename.
 *
 * `wantArt` is not an optimisation detail, it is a memory decision. Art is
 * extracted once per ALBUM (see `art.ts`); asking for it on every track of a
 * 5,000-file library is how you hold 2.5 GB of JPEG. `wantLyrics` is the same
 * decision about a smaller thing — see the field on `TagsAndArt`. Both default
 * to off, so the scan pays for neither.
 */
export function readTags(bytes: Uint8Array, wantArt = false, wantLyrics = false): TagsAndArt {
  try {
    if (startsWith(bytes, 'ID3')) return readId3(bytes, wantArt, wantLyrics)
    if (startsWith(bytes, 'fLaC')) return readFlac(bytes, wantArt, wantLyrics)
    if (startsWith(bytes, 'OggS')) return readOggOpusTags(bytes, wantLyrics)
    if (bytes.length > 12 && ascii(bytes, 4, 4) === 'ftyp') return readMp4Tags(bytes, wantArt, wantLyrics)
    return {}
  } catch {
    return {}
  }
}

/**
 * Just the lyric sheet, for the one track somebody is looking at.
 *
 * The whole tag walk runs anyway — it is the same pass — but nothing else it
 * finds is kept, which makes the caller's intent unmistakable at the call site.
 */
export function readLyrics(bytes: Uint8Array): string | undefined {
  return readTags(bytes, false, true).lyrics
}

// ── Shared helpers ───────────────────────────────────────────────────────────

function startsWith(bytes: Uint8Array, text: string): boolean {
  if (bytes.length < text.length) return false
  for (let i = 0; i < text.length; i++) if (bytes[i] !== text.charCodeAt(i)) return false
  return true
}

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  let out = ''
  for (let i = 0; i < length; i++) out += String.fromCharCode(bytes[offset + i])
  return out
}

/** ID3 sizes are "synchsafe": 7 bits per byte, so a size byte never looks like a frame sync. */
function synchsafe(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] << 21) | (bytes[offset + 1] << 14) | (bytes[offset + 2] << 7) | bytes[offset + 3]
}

/**
 * "3/12" → 3. Track and disc numbers are conventionally written as
 * position-of-total in every one of the three containers, and the total is the
 * album's business rather than the track's.
 */
function leadingNumber(text: string | undefined): number | undefined {
  if (!text) return undefined
  const n = parseInt(text.trim(), 10)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

/**
 * A year out of whatever a date field happens to hold — "1997", "1997-08-04",
 * "04/08/1997". Only a four-digit run that could plausibly be a year counts;
 * anything else is dropped rather than guessed at, because a wrong year sorts
 * an album into the wrong decade silently.
 */
function yearFrom(text: string | undefined): number | undefined {
  if (!text) return undefined
  const m = /(\d{4})/.exec(text)
  if (!m) return undefined
  const y = parseInt(m[1], 10)
  return y >= 1000 && y <= 2999 ? y : undefined
}

/** Sniff an image's type from its own bytes. */
function sniffImageMime(bytes: Uint8Array): string | null {
  if (bytes.length < 12) return null
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png'
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') return 'image/webp'
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return 'image/gif'
  return null
}

/**
 * Take the declared MIME only if the bytes agree with it, and fall back to what
 * the bytes actually are.
 *
 * ⚠️ This is not defensive tidying. Tag writers put genuine rubbish in this
 * field — "PNG", "JPG", "image/jpeg\0", "-->" (the ID3 spec's marker for "this
 * frame holds a URL, not a picture"), and empty strings — and a `Blob` created
 * with a wrong type is not a decode error, it is a picture the browser silently
 * refuses to draw. The bytes cannot lie about what they are; the string can.
 */
function resolveMime(declared: string | undefined, bytes: Uint8Array): string | null {
  const sniffed = sniffImageMime(bytes)
  if (!sniffed) return null
  if (!declared) return sniffed
  const d = declared.trim().toLowerCase().replace(/\0+$/, '')
  if (d === 'jpeg' || d === 'jpg') return 'image/jpeg'
  if (d === 'png') return 'image/png'
  if (!d.startsWith('image/')) return sniffed
  // Declared and sniffed disagree — the bytes win.
  return d === sniffed ? d : sniffed
}

/**
 * A picture, once the bytes are in hand.
 *
 * The real gate is `sniffImageMime`, not the length: a frame holding a URL
 * instead of a picture (ID3 spells that MIME type `-->`), an empty frame, or a
 * run of bytes landed on from a bad offset all fail to sniff, because none of
 * them starts with a PNG, JPEG, WebP or GIF signature.
 *
 * ⚠️ The length floor is only a backstop against a few sniffable bytes followed
 * by nothing, and it is 64 rather than something rounder because a valid PNG
 * genuinely can be that small — an 8x8 solid square is 77 bytes, and the first
 * version of this guard was 100, which silently rejected two of the fixtures in
 * `src/lib/__fixtures__`. The failure looked exactly like a cover that wasn't
 * there. Anything above the low tens of bytes is guessing at what a "real"
 * cover is, and the guess is wrong for somebody.
 */
function picture(declaredMime: string | undefined, bytes: Uint8Array): Picture | undefined {
  if (bytes.length < 64) return undefined
  const mime = resolveMime(declaredMime, bytes)
  if (!mime) return undefined
  return { mime, bytes }
}

// ── Which of two lyric sheets to keep ────────────────────────────────────────

/**
 * A cheap "does this look like LRC" test — a `[mm:ss` at the start of any line.
 *
 * ⚠️ Deliberately NOT the parser. `lib/lyrics.ts` decides what a lyric sheet
 * actually is, with a proportion rule and an offset and everything else; this
 * regex exists only to answer the one question this file has to answer, which
 * is which of two candidate frames to keep. Kept here rather than imported so
 * that this file goes on depending on nothing, which is what lets
 * `scripts/selftest.mjs` run it under Node.
 */
const LOOKS_SYNCED = /^\s*\[\d{1,3}:\d{2}/m

/**
 * Keep the better of two sheets: a timed one beats an untimed one, and
 * otherwise the first one found wins.
 *
 * A file quite often carries both — a tagger that fetches synced lyrics tends
 * to leave the plain sheet it replaced sitting in a second frame — and which
 * one the walk meets first is an accident of how the tag was written. Without
 * this the same track shows timed lyrics or untimed lyrics depending on the
 * order two frames happen to sit in.
 */
function preferLyrics(current: string | undefined, next: string): string | undefined {
  const trimmed = next.trim()
  if (!trimmed) return current
  if (!current) return trimmed
  if (!LOOKS_SYNCED.test(current) && LOOKS_SYNCED.test(trimmed)) return trimmed
  return current
}

/**
 * The field names that hold a lyric sheet — as a Vorbis comment key, or as the
 * description of an ID3 `TXXX` frame.
 *
 * ⚠️ `LYRICIST` is a different field and must never match: it holds the name of
 * the person who wrote the words, so accepting it puts a songwriter's name on
 * screen where a song should be. Membership of this set, not a prefix test.
 */
const LYRIC_KEYS = new Set(['LYRICS', 'UNSYNCEDLYRICS', 'SYNCEDLYRICS'])

/** Tag writers vary the spacing and the case — "Unsynced Lyrics", "unsyncedlyrics". */
function isLyricKey(key: string): boolean {
  return LYRIC_KEYS.has(key.toUpperCase().replace(/[\s_-]+/g, ''))
}

// ── ID3v2 (MP3, and often AIFF) ──────────────────────────────────────────────

function readId3(bytes: Uint8Array, wantArt: boolean, wantLyrics: boolean): TagsAndArt {
  const major = bytes[3]
  const size = synchsafe(bytes, 6)
  const end = Math.min(bytes.length, 10 + size)
  const out: TagsAndArt = {}

  // v2.2 used 3-character frame ids and 3-byte sizes; v2.3+ uses 4 and 4.
  const idLength = major <= 2 ? 3 : 4
  const headerLength = major <= 2 ? 6 : 10

  // Text frames, by version. `TPE2` is the album artist and it is the field a
  // library lives or dies by: without it every compilation explodes into one
  // "album" per guest vocalist. `TSOP`/`TPOS` are disc, `TDRC`/`TYER` the year.
  const text: Record<string, keyof Tags> = major <= 2
    ? { TT2: 'title', TP1: 'artist', TP2: 'albumArtist', TAL: 'album', TRK: 'trackNo', TPA: 'discNo', TYE: 'year', TCO: 'genre' }
    : {
        TIT2: 'title', TPE1: 'artist', TPE2: 'albumArtist', TALB: 'album',
        TRCK: 'trackNo', TPOS: 'discNo', TYER: 'year', TDRC: 'year', TCON: 'genre',
      }
  const artFrame = major <= 2 ? 'PIC' : 'APIC'
  // v2.2's three-character names for the same two frames.
  const lyricFrame = major <= 2 ? 'ULT' : 'USLT'
  const userFrame = major <= 2 ? 'TXX' : 'TXXX'

  let at = 10
  while (at + headerLength <= end) {
    const id = ascii(bytes, at, idLength)
    if (!/^[A-Z0-9]+$/.test(id)) break // padding
    const frameSize = major <= 2
      ? (bytes[at + 3] << 16) | (bytes[at + 4] << 8) | bytes[at + 5]
      : major === 4
        ? synchsafe(bytes, at + 4)
        : (bytes[at + 4] << 24) | (bytes[at + 5] << 16) | (bytes[at + 6] << 8) | bytes[at + 7]
    if (frameSize <= 0 || at + headerLength + frameSize > end) break

    const body = bytes.subarray(at + headerLength, at + headerLength + frameSize)
    const field = text[id]
    if (field) {
      const value = decodeId3Text(body)
      if (field === 'trackNo') out.trackNo = leadingNumber(value)
      else if (field === 'discNo') out.discNo = leadingNumber(value)
      else if (field === 'year') out.year ??= yearFrom(value)
      else if (value) out[field] = value as never
    } else if (wantArt && id === artFrame && !out.picture) {
      out.picture = major <= 2 ? readPicFrame(body) : readApicFrame(body)
    } else if (wantLyrics && id === lyricFrame) {
      const value = readUsltFrame(body)
      if (value) out.lyrics = preferLyrics(out.lyrics, value)
    } else if (wantLyrics && id === userFrame) {
      const pair = readTxxxFrame(body)
      if (pair && isLyricKey(pair.description)) out.lyrics = preferLyrics(out.lyrics, pair.value)
    }
    at += headerLength + frameSize
  }
  return out
}

// The first byte of a text frame names its encoding: 0 = ISO-8859-1, 1 = UTF-16
// with a BOM, 2 = UTF-16BE, 3 = UTF-8.
function decodeId3Text(body: Uint8Array): string {
  if (body.length < 2) return ''
  return decodeId3String(body[0], body.subarray(1))
}

function id3Label(encoding: number): string {
  return encoding === 1 ? 'utf-16' : encoding === 2 ? 'utf-16be' : encoding === 3 ? 'utf-8' : 'iso-8859-1'
}

function decodeId3String(encoding: number, data: Uint8Array): string {
  try {
    return new TextDecoder(id3Label(encoding)).decode(data).replace(/\0+$/, '').trim()
  } catch {
    return new TextDecoder('utf-8').decode(data).replace(/\0+$/, '').trim()
  }
}

/**
 * Find the end of a NUL-terminated string inside a frame.
 *
 * ⚠️ The two-byte encodings terminate with a DOUBLE NUL on an even boundary,
 * not a single one — a UTF-16 'A' is `41 00`, so scanning for one zero byte
 * stops in the middle of the first character and every subsequent offset in the
 * frame is wrong. That is the classic APIC bug: the cover is "found", the
 * picture data starts a few bytes early or late, and the browser draws nothing.
 * Returns the index of the first byte AFTER the terminator.
 */
function afterTerminator(body: Uint8Array, start: number, encoding: number): number {
  const wide = encoding === 1 || encoding === 2
  if (wide) {
    for (let i = start; i + 1 < body.length; i += 2) {
      if (body[i] === 0 && body[i + 1] === 0) return i + 2
    }
    return body.length
  }
  for (let i = start; i < body.length; i++) {
    if (body[i] === 0) return i + 1
  }
  return body.length
}

/**
 * APIC: encoding byte, NUL-terminated MIME string, one picture-type byte, a
 * NUL-terminated description in that encoding, then the image bytes.
 */
function readApicFrame(body: Uint8Array): Picture | undefined {
  if (body.length < 6) return undefined
  const encoding = body[0]
  // The MIME string is always ISO-8859-1 regardless of the encoding byte, which
  // governs the DESCRIPTION only.
  const mimeEnd = afterTerminator(body, 1, 0)
  const mime = new TextDecoder('iso-8859-1').decode(body.subarray(1, Math.max(1, mimeEnd - 1)))
  const typeByte = mimeEnd
  if (typeByte >= body.length) return undefined
  const dataStart = afterTerminator(body, typeByte + 1, encoding)
  if (dataStart >= body.length) return undefined
  return picture(mime, body.subarray(dataStart))
}

/**
 * v2.2's PIC is APIC's older sibling: the MIME string is replaced by a fixed
 * THREE-character image format ("JPG", "PNG") with no terminator.
 */
function readPicFrame(body: Uint8Array): Picture | undefined {
  if (body.length < 6) return undefined
  const encoding = body[0]
  const format = ascii(body, 1, 3)
  const dataStart = afterTerminator(body, 5, encoding)
  if (dataStart >= body.length) return undefined
  return picture(format, body.subarray(dataStart))
}

/**
 * USLT (v2.2: ULT), the unsynchronised lyric frame: encoding byte, a
 * THREE-BYTE language code, a NUL-terminated content descriptor in that
 * encoding, then the sheet itself — newlines and all — to the end of the frame.
 *
 * ⚠️ The language bytes are three regardless of encoding. They are raw ASCII
 * ("eng", "und", and quite often three NULs or three spaces from a lazy
 * tagger), NOT text in the frame's encoding, so the descriptor scan starts at
 * 4 and a UTF-16 descriptor is still even-aligned from there.
 *
 * ⚠️ A file may hold SEVERAL of these — one per language, which is what the
 * spec intends, and in practice one plain and one LRC from two different
 * taggers. The walk keeps whichever `preferLyrics` says is better rather than
 * the first, because the order they sit in means nothing.
 */
function readUsltFrame(body: Uint8Array): string | undefined {
  if (body.length < 5) return undefined
  const encoding = body[0]
  const textStart = afterTerminator(body, 4, encoding)
  if (textStart >= body.length) return undefined
  return decodeId3String(encoding, body.subarray(textStart)) || undefined
}

/**
 * TXXX (v2.2: TXX), the user-defined text frame: encoding, a NUL-terminated
 * description, then the value. Only interesting here because some taggers put
 * the sheet in `TXXX:LYRICS` instead of `USLT` — Picard and a handful of
 * scripts do — and a file tagged that way otherwise shows nothing at all.
 */
function readTxxxFrame(body: Uint8Array): { description: string; value: string } | undefined {
  if (body.length < 3) return undefined
  const encoding = body[0]
  const valueStart = afterTerminator(body, 1, encoding)
  if (valueStart >= body.length) return undefined
  const terminatorLength = encoding === 1 || encoding === 2 ? 2 : 1
  const description = decodeId3String(encoding, body.subarray(1, Math.max(1, valueStart - terminatorLength)))
  const value = decodeId3String(encoding, body.subarray(valueStart))
  if (!description || !value) return undefined
  return { description, value }
}

// ── FLAC ─────────────────────────────────────────────────────────────────────

/**
 * FLAC: a 4-byte magic then a chain of metadata blocks. Type 4 is the Vorbis
 * comment; type 6 is PICTURE, which is the same layout as an ID3 APIC written
 * as big-endian length-prefixed fields instead of NUL-terminated ones.
 *
 * Walked once for both rather than twice, because the chain is a linked list —
 * finding the second block means walking past the first anyway.
 */
function readFlac(bytes: Uint8Array, wantArt: boolean, wantLyrics: boolean): TagsAndArt {
  let out: TagsAndArt = {}
  let at = 4
  while (at + 4 <= bytes.length) {
    const isLast = (bytes[at] & 0x80) !== 0
    const type = bytes[at] & 0x7f
    const length = (bytes[at + 1] << 16) | (bytes[at + 2] << 8) | bytes[at + 3]
    const bodyStart = at + 4

    if (type === 4) {
      const tags = readVorbisComment(bytes, bodyStart, wantArt, wantLyrics)
      out = { ...tags, ...out, picture: out.picture ?? tags.picture, lyrics: out.lyrics ?? tags.lyrics }
    } else if (type === 6 && wantArt && !out.picture) {
      out.picture = readFlacPicture(bytes.subarray(bodyStart, Math.min(bytes.length, bodyStart + length)))
    }
    if (isLast) break
    at = bodyStart + length
    // A truncated header read (we only ever hold the first slice of the file)
    // walks off the end rather than looping — stop cleanly.
    if (length <= 0 || at > bytes.length) break
  }
  return out
}

/**
 * FLAC PICTURE block, and the payload of a base64 METADATA_BLOCK_PICTURE
 * comment: picture type, then length-prefixed MIME and description, then
 * width/height/depth/colours, then the length-prefixed image itself. All
 * big-endian, unlike the Vorbis comment block that surrounds it — which is a
 * genuine oddity of the format and not a mistake here.
 */
function readFlacPicture(block: Uint8Array): Picture | undefined {
  if (block.length < 32) return undefined
  const view = new DataView(block.buffer, block.byteOffset, block.byteLength)
  let at = 4 // picture type
  const mimeLength = view.getUint32(at); at += 4
  if (mimeLength > block.length) return undefined
  const mime = new TextDecoder('iso-8859-1').decode(block.subarray(at, at + mimeLength)); at += mimeLength
  const descLength = view.getUint32(at); at += 4
  if (at + descLength + 20 > block.length) return undefined
  at += descLength
  at += 16 // width, height, depth, colours
  const dataLength = view.getUint32(at); at += 4
  const end = Math.min(block.length, at + dataLength)
  return picture(mime, block.subarray(at, end))
}

// ── Vorbis comments (FLAC, Ogg, Opus) ────────────────────────────────────────

function readVorbisComment(bytes: Uint8Array, offset: number, wantArt: boolean, wantLyrics = false): TagsAndArt {
  if (offset < 0) return {}
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let at = offset
  const vendorLength = view.getUint32(at, true)
  at += 4 + vendorLength
  if (at + 4 > bytes.length) return {}
  const count = view.getUint32(at, true)
  at += 4

  const out: TagsAndArt = {}
  const decoder = new TextDecoder('utf-8')
  let date: string | undefined
  for (let i = 0; i < count && at + 4 <= bytes.length; i++) {
    const length = view.getUint32(at, true)
    at += 4
    if (at + length > bytes.length) break
    const entry = decoder.decode(bytes.subarray(at, at + length))
    at += length
    const eq = entry.indexOf('=')
    if (eq < 0) continue
    const key = entry.slice(0, eq).toUpperCase()
    const value = entry.slice(eq + 1)
    if (key === 'TITLE') out.title ??= value
    else if (key === 'ARTIST') out.artist ??= value
    else if (key === 'ALBUMARTIST' || key === 'ALBUM ARTIST') out.albumArtist ??= value
    else if (key === 'ALBUM') out.album ??= value
    else if (key === 'TRACKNUMBER') out.trackNo ??= leadingNumber(value)
    else if (key === 'DISCNUMBER') out.discNo ??= leadingNumber(value)
    else if (key === 'DATE' || key === 'YEAR') date ??= value
    else if (key === 'GENRE') out.genre ??= value
    else if (wantLyrics && isLyricKey(key)) out.lyrics = preferLyrics(out.lyrics, value)
    else if (wantArt && key === 'METADATA_BLOCK_PICTURE' && !out.picture) {
      // An Ogg file has no PICTURE block, so the whole block is base64'd into a
      // comment. Decoding it costs a full copy of the image as a string first,
      // which is why it is behind `wantArt` like everything else.
      out.picture = readFlacPicture(base64ToBytes(value))
    }
  }
  out.year ??= yearFrom(date)
  return out
}

/**
 * Base64 without `atob`, so this file stays runnable in Node as well as a tab —
 * which is the whole reason `scripts/selftest.mjs` can prove the cover reader
 * without a browser.
 */
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
function base64ToBytes(text: string): Uint8Array {
  const clean = text.replace(/[^A-Za-z0-9+/]/g, '')
  const out = new Uint8Array((clean.length * 3) >> 2)
  let bits = 0
  let acc = 0
  let at = 0
  for (let i = 0; i < clean.length; i++) {
    const v = B64.indexOf(clean[i])
    if (v < 0) continue
    acc = (acc << 6) | v
    bits += 6
    if (bits >= 8) {
      bits -= 8
      out[at++] = (acc >> bits) & 0xff
    }
  }
  return out.subarray(0, at)
}

/** Ogg/Opus: the comment packet is `OpusTags` + a Vorbis comment body. */
function readOggOpusTags(bytes: Uint8Array, wantLyrics = false): TagsAndArt {
  for (let at = 0; at + 8 < Math.min(bytes.length, 65_536); at++) {
    if (ascii(bytes, at, 8) === 'OpusTags') return readVorbisComment(bytes, at + 8, false, wantLyrics)
    if (ascii(bytes, at, 7) === '\x03vorbis') return readVorbisComment(bytes, at + 7, false, wantLyrics)
  }
  return {}
}

// ── MP4 / M4A ────────────────────────────────────────────────────────────────

/**
 * MP4: tags live in moov > udta > meta > ilst, with four-character atom names
 * (©nam, ©ART, ©alb). Rather than walking the whole box tree, scan for `ilst`
 * and read the atoms inside it — the structure below that point is flat.
 *
 * ⚠️ `moov` is sometimes at the END of the file, which is why `scan.ts` reads a
 * tail slice as well as a head slice for MP4s. This function doesn't care which
 * slice it was handed; it just won't find an `ilst` in the wrong one, and
 * returns `{}` rather than failing.
 */
function readMp4Tags(bytes: Uint8Array, wantArt: boolean, wantLyrics: boolean): TagsAndArt {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let ilst = -1
  for (let at = 0; at + 8 <= bytes.length; at++) {
    if (ascii(bytes, at, 4) === 'ilst') {
      ilst = at + 4
      break
    }
  }
  if (ilst < 0) return {}

  const text: Record<string, keyof Tags> = {
    '©nam': 'title', '©ART': 'artist', aART: 'albumArtist',
    '©alb': 'album', '©day': 'year', '©gen': 'genre',
  }
  const out: TagsAndArt = {}
  let at = ilst
  // The art atom can be megabytes, so unlike Converter's copy this walk is not
  // capped at 64 KB — it runs to whatever slice it was given.
  const end = bytes.length
  while (at + 8 <= end) {
    const size = view.getUint32(at)
    if (size < 8 || at + size > end) break
    const name = String.fromCharCode(bytes[at + 4], bytes[at + 5], bytes[at + 6], bytes[at + 7])
    const field = text[name]
    if (field && size > 24) {
      // atom > data box: 4 size + 4 'data' + 4 type + 4 locale, then the text.
      const value = new TextDecoder('utf-8').decode(bytes.subarray(at + 24, at + size)).replace(/\0+$/, '').trim()
      if (field === 'year') out.year ??= yearFrom(value)
      else if (value) out[field] = value as never
    } else if ((name === 'trkn' || name === 'disk') && size >= 28) {
      // trkn/disk are BINARY, not text: a payload of 16-bit words laid out as
      // [0, index, total, 0]. Reading them as UTF-8 gives control characters,
      // which is how a track number becomes `undefined` on every M4A.
      //
      // ⚠️ 28, not 32. The payload's LENGTH VARIES: iTunes writes all four
      // words (an atom of 32 bytes), mutagen writes only [0, index, total] (30),
      // and both are read by every player. A floor of 32 accepts `trkn` and
      // silently rejects `disk` from the same file — which is exactly what this
      // line did until the fixtures caught it, and it presents as "my library
      // has no disc numbers" rather than as any kind of error. 28 is what it
      // actually takes to reach the index word at +26.
      const n = view.getUint16(at + 26)
      if (n > 0) {
        if (name === 'trkn') out.trackNo ??= n
        else out.discNo ??= n
      }
    } else if (wantLyrics && name === '©lyr' && size > 24) {
      // The one text atom that is not in the map above, because it must not be
      // read on a scan — see `lyrics` on `TagsAndArt`.
      const value = new TextDecoder('utf-8').decode(bytes.subarray(at + 24, at + size)).replace(/\0+$/, '')
      out.lyrics = preferLyrics(out.lyrics, value)
    } else if (wantArt && name === 'covr' && size > 24 && !out.picture) {
      // The `data` box's type word says 13 = JPEG, 14 = PNG. Both are sniffed
      // anyway; the declared value is only a hint.
      const kind = view.getUint32(at + 16)
      const declared = kind === 13 ? 'image/jpeg' : kind === 14 ? 'image/png' : undefined
      out.picture = picture(declared, bytes.subarray(at + 24, at + size))
    }
    at += size
  }
  return out
}
