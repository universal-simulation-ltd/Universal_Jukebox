// quickTimeMp3.ts — the MP3 inside a QuickTime file, as a plain MP3 the
// Web Audio decoder can read.
//
// ⚠️ WHY THIS EXISTS: an MP3 from the iPhone's Music library is copied for
// playback by `AppleMusicPlugin.swift`, and MP3 cannot be remuxed into M4A, so
// the copy is a QuickTime `.mov` with the MP3 packets passed through untouched.
// `<audio>` plays it (AVFoundation underneath), but WebKit's
// `decodeAudioData` refuses MP3-in-QuickTime with "EncodingError: Decoding
// failed" — so every Music-library MP3 came back "This song can't be mixed"
// on iPhone JPM (James, 2026-11-05; the saved log read stage=decode, ext=mp3).
// Chromium decodes the same file, so a browser test never sees it; WebKit
// decodes the very same packets as soon as they are a bare MP3 stream.
//
// MP3 frames carry their own sync headers, so a single-track file's `mdat`
// payload IS a playable MP3 stream: on the failing song it was exactly the
// "audio bytes" `afinfo` reports. Anything else — not QuickTime, not MP3, more
// than one track (interleaved packets of another track would land in the
// middle) — returns null and is decoded as it came.

const MP3_FORMATS = ['.mp3', 'ms\u0000U'] // the QuickTime sample-entry codes for MPEG layer 3

function fourcc(view: DataView, at: number): string {
  return String.fromCharCode(view.getUint8(at), view.getUint8(at + 1), view.getUint8(at + 2), view.getUint8(at + 3))
}

function count(haystack: Uint8Array, needle: string): number {
  let n = 0
  outer: for (let i = 0; i + needle.length <= haystack.length; i++) {
    for (let j = 0; j < needle.length; j++) if (haystack[i + j] !== needle.charCodeAt(j)) continue outer
    n++
  }
  return n
}

/** The MP3 stream inside a single-track QuickTime/MP4 file, or null when this isn't one. */
export function quickTimeMp3Frames(bytes: ArrayBuffer): ArrayBuffer | null {
  const view = new DataView(bytes)
  const mdats: Array<[number, number]> = []
  let moov: Uint8Array | null = null
  let at = 0
  while (at + 8 <= bytes.byteLength) {
    let size = view.getUint32(at)
    const type = fourcc(view, at + 4)
    let header = 8
    if (size === 1) {
      if (at + 16 > bytes.byteLength) return null
      size = Number(view.getBigUint64(at + 8))
      header = 16
    } else if (size === 0) {
      size = bytes.byteLength - at
    }
    if (size < header || at + size > bytes.byteLength) return null
    if (at === 0 && type !== 'ftyp' && type !== 'wide' && type !== 'mdat' && type !== 'moov') return null
    if (type === 'mdat') mdats.push([at + header, at + size])
    else if (type === 'moov') moov = new Uint8Array(bytes, at + header, size - header)
    at += size
  }
  if (!moov || mdats.length === 0) return null
  if (count(moov, 'trak') !== 1) return null
  if (!MP3_FORMATS.some((f) => count(moov!, f) > 0)) return null
  const total = mdats.reduce((sum, [from, to]) => sum + (to - from), 0)
  const out = new Uint8Array(total)
  let put = 0
  for (const [from, to] of mdats) {
    out.set(new Uint8Array(bytes, from, to - from), put)
    put += to - from
  }
  return out.buffer
}
