import { albumKey, trackKey } from './keys'
import type { Album, Track } from './types'

// An example library, so somebody with no music to hand can take the app for a
// spin (James, 2026-09-09).
//
// ⚠️ EVERY BYTE OF IT IS GENERATED IN THE BROWSER — the music and the sleeves
// both. Nothing is downloaded, nothing is bundled, and the build is not one
// kilobyte bigger for having it. That is not a clever trick for its own sake;
// it is the only honest way for THIS app to have a demo:
//
//   • Shipping real music means licensing real music, and "it's only a demo" is
//     not a licence. Shipping a handful of Creative Commons tracks would mean
//     attribution text somebody has to maintain, and a several-megabyte payload
//     on an app whose whole pitch is that it holds nothing.
//   • The app is about YOUR files. A demo that quietly downloads somebody
//     else's contradicts the front page.
//
// So: four artists, eleven records, thirty-one tracks of synthesised music with
// drawn sleeves, none of which exists until it is asked for.
//
// ⚠️ THE AUDIO IS MADE LAZILY AND THE INDEX IS NOT. The library — titles,
// artists, years, track numbers, durations, artwork — is built in one go when
// the user asks for it, because that is what fills the grid. The WAV for a
// given track is synthesised the first time something tries to PLAY it, which
// is what keeps this from putting fifty megabytes of PCM into the tab to show
// somebody a grid of covers.
//
// ⚠️ AND IT IS DETERMINISTIC. Every note comes from a PRNG seeded with the
// track's own path, so a track sounds the same on Tuesday as it did on Monday,
// survives being evicted from the cache below, and — the one that actually
// matters — still plays after a reload, when the library has come back out of
// IndexedDB and there is nothing on disk for it to point at.

/** The root id, so the library store can tell this apart from a real folder. */
export const EXAMPLE_ROOT_ID = 'example'
export const EXAMPLE_LABEL = 'Example library'

/**
 * The path prefix every generated track carries.
 *
 * It is what `isExampleTrack` recognises after a reload, so it has to be
 * something no real folder produces — a real path is relative to the folder the
 * user chose and never carries a root of its own.
 */
const PREFIX = 'Example library/'

const RATE = 22_050
const CHANNELS = 1
const BYTES_PER_SAMPLE = 2
const WAV_HEADER_BYTES = 44

// ── The records ──────────────────────────────────────────────────────────────

interface Recipe {
  /** MIDI note of the key's root. */
  root: number
  /** Minor keys get the flattened third; it is most of what "sadder" means. */
  minor: boolean
  bpm: number
  /** The lead instrument's brightness — how much odd harmonic is mixed in. */
  bite: number
  /** How busy the lead is, 0–1. */
  density: number
  /** Drums at all. A piano record has none. */
  drums: boolean
  /** How loud the pad sits under everything. */
  pad: number
}

interface ExampleAlbum {
  artist: string
  title: string
  year: number
  genre: string
  recipe: Recipe
  /** Track titles, in running order. Their lengths come from the seed. */
  tracks: string[]
}

/**
 * ⚠️ THE SHAPE OF THIS LIST IS PART OF THE DEMO, not just its contents.
 *
 * Two artists have three or more records, because three is the point at which
 * the album grid folds a run into a fan (`FAN_MIN` in `AlbumGrid.tsx`) — a
 * demo library of eleven one-album artists would show none of that, and the
 * fan and its open state are among the things worth showing. One artist has a
 * single record, so the ungrouped case is on screen too.
 */
const ALBUMS: ExampleAlbum[] = [
  {
    artist: 'The Tone Arms',
    title: 'Sides A and B',
    year: 2019,
    genre: 'Indie',
    recipe: { root: 57, minor: false, bpm: 104, bite: 0.3, density: 0.62, drums: true, pad: 0.5 },
    tracks: ['Lead-in Groove', 'Counterweight', 'Anti-skate', 'The Long Way Round'],
  },
  {
    artist: 'The Tone Arms',
    title: 'Second Pressing',
    year: 2021,
    genre: 'Indie',
    recipe: { root: 55, minor: true, bpm: 96, bite: 0.36, density: 0.55, drums: true, pad: 0.55 },
    tracks: ['Dust Cover', 'Slipmat', 'Forty-five', 'Static on the Inner Groove'],
  },
  {
    artist: 'The Tone Arms',
    title: 'The Long Player',
    year: 2023,
    genre: 'Indie',
    recipe: { root: 60, minor: false, bpm: 88, bite: 0.24, density: 0.48, drums: true, pad: 0.62 },
    tracks: ['Twelve Inches', 'Gatefold', 'Sleeve Notes', 'Repress'],
  },
  {
    artist: 'The Tone Arms',
    title: 'Run-out',
    year: 2025,
    genre: 'Indie',
    recipe: { root: 58, minor: true, bpm: 112, bite: 0.42, density: 0.68, drums: true, pad: 0.42 },
    tracks: ['Locked Groove', 'Matrix Number', 'Fade to Centre'],
  },
  {
    artist: 'Lathe & the Lacquers',
    title: 'Cutting Head',
    year: 2020,
    genre: 'Dub',
    recipe: { root: 45, minor: true, bpm: 72, bite: 0.2, density: 0.4, drums: true, pad: 0.7 },
    tracks: ['Acetate', 'Half-speed', 'Bass Trap'],
  },
  {
    artist: 'Lathe & the Lacquers',
    title: 'Test Pressing',
    year: 2022,
    genre: 'Dub',
    recipe: { root: 43, minor: true, bpm: 68, bite: 0.16, density: 0.34, drums: true, pad: 0.78 },
    tracks: ['One Off', 'Reference Cut', 'Room Tone'],
  },
  {
    artist: 'Lathe & the Lacquers',
    title: 'Master Lacquer',
    year: 2024,
    genre: 'Dub',
    recipe: { root: 47, minor: true, bpm: 76, bite: 0.26, density: 0.44, drums: true, pad: 0.72 },
    tracks: ['Mother', 'Stamper', 'Plating Room'],
  },
  {
    artist: 'Marguerite Vale',
    title: 'Quiet Rooms',
    year: 2018,
    genre: 'Modern classical',
    recipe: { root: 62, minor: false, bpm: 60, bite: 0.1, density: 0.36, drums: false, pad: 0.85 },
    tracks: ['Morning, First Light', 'The Blue Hour', 'Someone Downstairs', 'Nocturne for an Empty House'],
  },
  {
    artist: 'Static Bloom',
    title: 'Surface Noise',
    year: 2024,
    genre: 'Electronic',
    recipe: { root: 52, minor: true, bpm: 124, bite: 0.55, density: 0.8, drums: true, pad: 0.38 },
    tracks: ['Crackle', 'Pop', 'Wow and Flutter'],
  },
]

// ── Building the library ─────────────────────────────────────────────────────

/**
 * The index: everything the grid needs, with the artwork drawn and nothing
 * decoded.
 *
 * Async only because drawing a sleeve ends in `canvas.toBlob`, which is.
 */
export async function buildExampleLibrary(): Promise<{ tracks: Track[]; albums: Album[] }> {
  const tracks: Track[] = []
  const albums: Album[] = []

  for (const entry of ALBUMS) {
    const id = albumKey({ album: entry.title, albumArtist: entry.artist })
    albums.push({
      id,
      title: entry.title,
      artist: entry.artist,
      year: entry.year,
      trackCount: entry.tracks.length,
      cover: await drawSleeve(entry),
    })

    entry.tracks.forEach((title, i) => {
      const path = `${PREFIX}${entry.artist}/${entry.title}/${pad2(i + 1)} ${title}.wav`
      const seconds = trackSeconds(path)
      const size = WAV_HEADER_BYTES + Math.round(seconds * RATE) * CHANNELS * BYTES_PER_SAMPLE
      tracks.push({
        // ⚠️ The same `trackKey` a real scan uses, over path + size + mtime.
        // The mtime is a fixed date rather than `Date.now()` for the reason at
        // the top of this file: the ids have to come out identical next time, or
        // a reload produces a library whose every track is "new".
        id: trackKey({ path, size, mtime: FIXED_MTIME }),
        path,
        name: `${pad2(i + 1)} ${title}.wav`,
        size,
        mtime: FIXED_MTIME,
        ext: 'wav',
        title,
        artist: entry.artist,
        albumArtist: entry.artist,
        album: entry.title,
        trackNo: i + 1,
        year: entry.year,
        genre: entry.genre,
        // Known up front, unlike a real scan's — which is a small gift: the
        // album totals are right before anything has been played.
        durationSec: seconds,
        albumId: id,
      })
    })
  }

  return { tracks, albums }
}

/** 1 January 2020, so every id is reproducible. */
const FIXED_MTIME = Date.UTC(2020, 0, 1)

/** Is this one of ours? Read after a reload, when the store has no idea. */
export function isExampleTrack(track: Track): boolean {
  return track.path.startsWith(PREFIX)
}

/**
 * The audio for one example track, synthesised on demand.
 *
 * ⚠️ SYNCHRONOUS, and it has to be: `libraryStore.fileFor` is synchronous
 * because everything that plays a track calls it inline (see `playerStore`).
 * Making it async would mean an await on the path between "press play" and
 * "sound", i.e. on the path this whole app is about. Rendering thirty seconds
 * of mono at 22 kHz is a few hundred thousand samples of arithmetic — a handful
 * of milliseconds, hidden entirely by the ceremony that is running anyway.
 */
export function exampleFile(track: Track): File | null {
  if (!isExampleTrack(track)) return null

  const cached = cache.get(track.path)
  if (cached) {
    // Touch it, so the least-recently-PLAYED is the one that goes.
    cache.delete(track.path)
    cache.set(track.path, cached)
    return cached
  }

  const entry = ALBUMS.find((a) => track.path.includes(`/${a.title}/`) && track.path.includes(`/${a.artist}/`))
  if (!entry) return null

  const samples = render(track.path, entry.recipe, trackSeconds(track.path))
  const file = new File([wav(samples)], track.name, { type: 'audio/wav' })

  cache.set(track.path, file)
  // ⚠️ A cap, because a File holds its bytes and thirty-one of these is tens of
  // megabytes for a demo. Evicting is safe even mid-play: `audio.ts` has
  // already minted an object URL, and a URL keeps its blob alive regardless of
  // who else is holding the File.
  while (cache.size > CACHE_MAX) {
    const oldest = cache.keys().next().value
    if (oldest === undefined) break
    cache.delete(oldest)
  }
  return file
}

const CACHE_MAX = 4
const cache = new Map<string, File>()

/**
 * How long a track runs.
 *
 * Between 26 and 46 seconds, from the path's own hash — long enough to be a
 * piece of music and to leave room for the 1.8-second crossfade lead, short
 * enough that eleven records is a demo rather than a download.
 */
function trackSeconds(path: string): number {
  return 26 + (hash(path) % 21)
}

// ── The synth ────────────────────────────────────────────────────────────────
//
// Four voices over a four-bar chord loop: a pad, a bass, a lead and (on most
// records) drums. It is not trying to be good; it is trying to be MUSIC — a
// thing with a key, a tempo and a shape, so that the crossfade between two
// tracks of one album sounds like a crossfade rather than like two test tones.
//
// ⚠️ Everything is written straight into one Float32Array and soft-clipped at
// the end. No graph, no `OfflineAudioContext`: a context would be the obvious
// tool and it is asynchronous, which `exampleFile` above cannot be.

/** Degrees of the major and natural minor scales, in semitones. */
const MAJOR = [0, 2, 4, 5, 7, 9, 11]
const MINOR = [0, 2, 3, 5, 7, 8, 10]
/** The pentatonic subset the lead sticks to — it is what makes it hard to play a wrong note. */
const PENTA_MAJOR = [0, 2, 4, 7, 9]
const PENTA_MINOR = [0, 3, 5, 7, 10]

function render(seed: string, recipe: Recipe, seconds: number): Float32Array {
  const random = mulberry32(hash(seed))
  const frames = Math.round(seconds * RATE)
  const out = new Float32Array(frames)

  const scale = recipe.minor ? MINOR : MAJOR
  const penta = recipe.minor ? PENTA_MINOR : PENTA_MAJOR
  const beat = 60 / recipe.bpm
  const bar = beat * 4

  // A four-bar loop of chord degrees. Both progressions below are the ones
  // every listener already knows, which is the point: a demo track has about
  // four seconds to sound deliberate.
  const progression = recipe.minor ? [0, 5, 3, 4] : [0, 4, 5, 3]

  const bars = Math.ceil(seconds / bar)
  for (let b = 0; b < bars; b++) {
    const at = b * bar
    const degree = progression[b % progression.length]
    const rootNote = recipe.root + scale[degree % scale.length]

    // The pad: a triad held for the bar, quiet and slow to arrive.
    for (const interval of [0, recipe.minor ? 3 : 4, 7]) {
      addTone(out, at, bar * 0.98, midi(rootNote + interval), 0.055 * recipe.pad, {
        attack: 0.25, release: bar * 0.5, bite: 0.06,
      })
    }

    // The bass: the root on one and three, an octave down.
    for (const b3 of [0, 2]) {
      addTone(out, at + b3 * beat, beat * 1.6, midi(rootNote - 12), 0.16, {
        attack: 0.008, release: beat * 1.2, bite: 0.04,
      })
    }

    // The lead: eighth notes, some of them, from the pentatonic.
    for (let e = 0; e < 8; e++) {
      if (random() > recipe.density) continue
      const step = penta[Math.floor(random() * penta.length)]
      const octave = random() < 0.25 ? 12 : 0
      addTone(out, at + e * beat * 0.5, beat * 0.5, midi(recipe.root + step + octave + 12), 0.1, {
        attack: 0.006, release: beat * 0.42, bite: recipe.bite,
      })
    }

    if (recipe.drums) {
      for (const k of [0, 2]) addKick(out, at + k * beat)
      for (let e = 0; e < 8; e++) {
        if (e % 2 === 1 || random() < 0.4) addHat(out, at + e * beat * 0.5, e % 2 === 1 ? 0.03 : 0.018)
      }
    }
  }

  // ⚠️ Fade both ends, always. A track that starts or stops mid-waveform is a
  // click, and a click at the seam is precisely what the crossfade this library
  // exists to demonstrate is supposed to be hiding.
  const edge = Math.round(0.4 * RATE)
  for (let i = 0; i < edge && i < frames; i++) {
    const g = i / edge
    out[i] *= g
    out[frames - 1 - i] *= g
  }

  // Soft clip rather than hard limit: four voices can add up past 1, and tanh
  // rounds those peaks off instead of squaring them into distortion.
  for (let i = 0; i < frames; i++) out[i] = Math.tanh(out[i] * 1.25) * 0.82
  return out
}

/** MIDI note number to Hz. */
function midi(note: number): number {
  return 440 * 2 ** ((note - 69) / 12)
}

interface Envelope {
  attack: number
  release: number
  /** How much third harmonic to mix in: 0 is a sine, 0.5 is reedy. */
  bite: number
}

/**
 * One note, mixed in at `at` seconds.
 *
 * A sine plus a third harmonic, with a linear attack and an exponential decay —
 * which is about the cheapest thing that still reads as an instrument rather
 * than as a beep.
 */
function addTone(
  out: Float32Array, at: number, seconds: number, freq: number, gain: number, env: Envelope,
): void {
  const start = Math.round(at * RATE)
  const length = Math.round(seconds * RATE)
  const attack = Math.max(1, Math.round(env.attack * RATE))
  const step = (2 * Math.PI * freq) / RATE
  const decay = 1 / Math.max(0.02, env.release)

  for (let i = 0; i < length; i++) {
    const at2 = start + i
    if (at2 >= out.length) break
    const t = i / RATE
    const amp = (i < attack ? i / attack : 1) * Math.exp(-t * decay)
    if (amp < 0.0008) break
    const phase = step * i
    out[at2] += gain * amp * (Math.sin(phase) + env.bite * Math.sin(phase * 3))
  }
}

/** A kick: a sine swept down fast, which is what a kick drum is. */
function addKick(out: Float32Array, at: number): void {
  const start = Math.round(at * RATE)
  const length = Math.round(0.22 * RATE)
  let phase = 0
  for (let i = 0; i < length; i++) {
    const at2 = start + i
    if (at2 >= out.length) break
    const t = i / RATE
    const freq = 46 + 74 * Math.exp(-t * 26)
    phase += (2 * Math.PI * freq) / RATE
    out[at2] += 0.34 * Math.exp(-t * 13) * Math.sin(phase)
  }
}

/** A hat: noise, differenced to take the bottom off it, with a very fast decay. */
function addHat(out: Float32Array, at: number, gain: number): void {
  const start = Math.round(at * RATE)
  const length = Math.round(0.05 * RATE)
  let previous = 0
  for (let i = 0; i < length; i++) {
    const at2 = start + i
    if (at2 >= out.length) break
    const noise = Math.random() * 2 - 1
    // A one-sample difference is a high-pass filter — the difference between a
    // hat and a burst of pink static.
    const high = noise - previous
    previous = noise
    out[at2] += gain * Math.exp(-(i / RATE) * 90) * high
  }
}

/** Float samples to a 16-bit mono RIFF/WAVE blob. */
function wav(samples: Float32Array): Blob {
  const bytes = new ArrayBuffer(WAV_HEADER_BYTES + samples.length * BYTES_PER_SAMPLE)
  const view = new DataView(bytes)

  const text = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i))
  }
  const dataBytes = samples.length * BYTES_PER_SAMPLE

  text(0, 'RIFF')
  view.setUint32(4, 36 + dataBytes, true)
  text(8, 'WAVE')
  text(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, CHANNELS, true)
  view.setUint32(24, RATE, true)
  view.setUint32(28, RATE * CHANNELS * BYTES_PER_SAMPLE, true)
  view.setUint16(32, CHANNELS * BYTES_PER_SAMPLE, true)
  view.setUint16(34, 8 * BYTES_PER_SAMPLE, true)
  text(36, 'data')
  view.setUint32(40, dataBytes, true)

  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]))
    // ⚠️ Asymmetric on purpose: 16-bit PCM runs -32768…32767, so the two
    // directions scale by different numbers. Using 32768 for both is the usual
    // shortcut and it wraps the loudest positive peak round to full negative —
    // an audible tick on exactly the loudest moment of a track.
    view.setInt16(WAV_HEADER_BYTES + i * 2, clamped < 0 ? clamped * 32768 : clamped * 32767, true)
  }
  return new Blob([bytes], { type: 'audio/wav' })
}

// ── The sleeves ──────────────────────────────────────────────────────────────

/**
 * Draw a cover.
 *
 * ⚠️ It has to be a PICTURE, not a coloured square with the title on it. The
 * app already has a handsome fallback tile for albums with no artwork
 * (`Cover.tsx`), so a demo whose covers looked like that would be showing off
 * the fallback rather than the thing the fallback is for — and the artwork is
 * what the grid, the fan, the deck's centre label and the Now Playing ground
 * are all made of.
 *
 * Each sleeve is one of three constructions over a two-colour ground, chosen by
 * the album's own hash, with the type set on top. Nothing here is random at run
 * time: the same record is the same sleeve every time.
 */
async function drawSleeve(entry: ExampleAlbum): Promise<Blob | null> {
  const size = 480
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const seed = hash(`${entry.artist}|${entry.title}`)
  const random = mulberry32(seed)
  const hue = seed % 360
  const second = (hue + 40 + (seed % 90)) % 360
  const dark = entry.recipe.minor

  const ground = ctx.createLinearGradient(0, 0, size, size)
  ground.addColorStop(0, `hsl(${hue} ${dark ? 40 : 62}% ${dark ? 22 : 58}%)`)
  ground.addColorStop(1, `hsl(${second} ${dark ? 34 : 54}% ${dark ? 12 : 38}%)`)
  ctx.fillStyle = ground
  ctx.fillRect(0, 0, size, size)

  const ink = dark ? 'rgba(255,255,255,' : 'rgba(15,23,42,'
  const style = seed % 3

  if (style === 0) {
    // Concentric rings, off-centre — a record seen from above.
    const cx = size * (0.3 + random() * 0.4)
    const cy = size * (0.3 + random() * 0.4)
    for (let r = size * 0.08; r < size * 0.72; r += size * 0.045) {
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.strokeStyle = `${ink}${(0.05 + random() * 0.14).toFixed(3)})`
      ctx.lineWidth = 1 + random() * 3
      ctx.stroke()
    }
  } else if (style === 1) {
    // A bar chart of the groove, the way a waveform is drawn.
    const bars = 18
    const width = size / bars
    for (let i = 0; i < bars; i++) {
      const height = size * (0.12 + random() * 0.62)
      ctx.fillStyle = `${ink}${(0.06 + random() * 0.16).toFixed(3)})`
      ctx.fillRect(i * width, size - height, width * 0.72, height)
    }
  } else {
    // Diagonals, with one bold stripe through them.
    ctx.save()
    ctx.translate(size / 2, size / 2)
    ctx.rotate((-22 * Math.PI) / 180)
    for (let y = -size; y < size; y += 26) {
      ctx.fillStyle = `${ink}${(0.04 + random() * 0.1).toFixed(3)})`
      ctx.fillRect(-size, y, size * 2, 8 + random() * 10)
    }
    ctx.fillStyle = `hsl(${(hue + 180) % 360} 78% ${dark ? 58 : 46}%)`
    ctx.globalAlpha = 0.85
    ctx.fillRect(-size, size * 0.1, size * 2, 22)
    ctx.restore()
  }

  // The type. Set at the bottom over a soft scrim, because a title laid
  // straight onto a busy sleeve is the one thing that always looks amateur.
  const scrim = ctx.createLinearGradient(0, size * 0.55, 0, size)
  scrim.addColorStop(0, 'rgba(0,0,0,0)')
  scrim.addColorStop(1, 'rgba(0,0,0,0.62)')
  ctx.fillStyle = scrim
  ctx.fillRect(0, size * 0.55, size, size * 0.45)

  ctx.fillStyle = 'rgba(255,255,255,0.78)'
  ctx.font = '500 21px system-ui, -apple-system, Segoe UI, sans-serif'
  ctx.fillText(entry.artist.toUpperCase(), 30, size - 74)

  ctx.fillStyle = '#ffffff'
  ctx.font = '600 34px system-ui, -apple-system, Segoe UI, sans-serif'
  wrapText(ctx, entry.title, 30, size - 36, size - 60, 36)

  return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
}

/** Lay a title out on at most two lines, bottom-anchored. */
function wrapText(
  ctx: CanvasRenderingContext2D, text: string, x: number, bottom: number, width: number, lineHeight: number,
): void {
  const words = text.split(' ')
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (ctx.measureText(candidate).width > width && line) {
      lines.push(line)
      line = word
    } else {
      line = candidate
    }
  }
  if (line) lines.push(line)
  const shown = lines.slice(0, 2)
  shown.forEach((l, i) => {
    ctx.fillText(l, x, bottom - (shown.length - 1 - i) * lineHeight)
  })
}

// ── Determinism ──────────────────────────────────────────────────────────────

/** FNV-1a. Small, fast, and stable across engines — which is the requirement. */
function hash(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** A seeded PRNG, so "random" means "the same every time". */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}
