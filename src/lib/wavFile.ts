// wavFile.ts — the head of a 16-bit PCM WAV file, with its name written in.
//
// The Mix tab's recordings are saved as WAV (`mixRecorder.ts`): the PCM the
// decks played, exactly, and a file every player and the library scan read.
// The tags go in a RIFF `LIST/INFO` chunk BEFORE the audio, so the scan finds
// them in the first read of the file (`tags.ts` → `readRiffTags`).
//
// ⚠️ The header holds the audio's length, so it is built when recording stops
// and written first; the recorded chunks are appended after it.

export interface WavInfo {
  title?: string
  artist?: string
  album?: string
  /** ISO date, "2026-11-05". */
  date?: string
}

const INFO_IDS: Array<[keyof WavInfo, string]> = [
  ['title', 'INAM'],
  ['artist', 'IART'],
  ['album', 'IPRD'],
  ['date', 'ICRD'],
]

function ascii(out: Uint8Array, at: number, text: string): void {
  for (let i = 0; i < text.length; i++) out[at + i] = text.charCodeAt(i)
}

/** The INFO list's sub-chunks: UTF-8 text, NUL-terminated, padded to an even size. */
function infoChunk(info: WavInfo): Uint8Array {
  const parts: Uint8Array[] = []
  const enc = new TextEncoder()
  for (const [key, id] of INFO_IDS) {
    const value = info[key]?.trim()
    if (!value) continue
    const text = enc.encode(value)
    const size = text.length + 1
    const chunk = new Uint8Array(8 + size + (size & 1))
    ascii(chunk, 0, id)
    new DataView(chunk.buffer).setUint32(4, size, true)
    chunk.set(text, 8)
    parts.push(chunk)
  }
  if (parts.length === 0) return new Uint8Array()
  const body = parts.reduce((n, p) => n + p.length, 4)
  const out = new Uint8Array(8 + body)
  ascii(out, 0, 'LIST')
  new DataView(out.buffer).setUint32(4, body, true)
  ascii(out, 8, 'INFO')
  let at = 12
  for (const p of parts) {
    out.set(p, at)
    at += p.length
  }
  return out
}

/**
 * Everything in a WAV file before its samples: RIFF, fmt (16-bit PCM), the
 * tags, and the `data` chunk's own header. `dataBytes` must be even (whole
 * 16-bit samples), which interleaved Int16 always is.
 */
export function wavHeader(sampleRate: number, channels: number, dataBytes: number, info: WavInfo = {}): Uint8Array {
  const list = infoChunk(info)
  const out = new Uint8Array(12 + 24 + list.length + 8)
  const view = new DataView(out.buffer)
  ascii(out, 0, 'RIFF')
  view.setUint32(4, out.length - 8 + dataBytes, true)
  ascii(out, 8, 'WAVE')
  ascii(out, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, channels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * channels * 2, true)
  view.setUint16(32, channels * 2, true)
  view.setUint16(34, 16, true)
  out.set(list, 36)
  const data = 36 + list.length
  ascii(out, data, 'data')
  view.setUint32(data + 4, dataBytes, true)
  return out
}
